use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::collections::HashMap;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

// ============================================================================
// Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct Report {
    id: Uuid,
    server_name: String,
    repository_url: String,
    developer_email: String,
    report_data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    report_json: Option<JsonValue>,
    status: String,
    submitted_at: DateTime<Utc>,
    reviewed_at: Option<DateTime<Utc>>,
    reviewed_by: Option<String>,
    review_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateReportRequest {
    server_name: String,
    repository_url: String,
    developer_email: String,
    report_data: String,
    #[serde(default)]
    report_json: Option<JsonValue>,
}

#[derive(Debug, Deserialize)]
struct UpdateStatusRequest {
    status: String,
    reviewed_by: String,
    review_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    status: Option<String>,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

// Phase 3: Analytics Models

#[derive(Debug, Serialize)]
struct Issue {
    severity: String,
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    impact: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recommendation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    phase_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct IssuesResponse {
    report_id: Uuid,
    server_name: String,
    critical_issues: Vec<Issue>,
    warnings: Vec<Issue>,
    recommendations: Vec<Issue>,
}

#[derive(Debug, Serialize)]
struct AnalyticsSummary {
    total_reports: i64,
    with_structured_data: i64,
    by_status: std::collections::HashMap<String, i64>,
    by_risk_level: std::collections::HashMap<String, i64>,
    recent_submissions_24h: i64,
}

// ============================================================================
// Handlers
// ============================================================================

async fn health_check() -> &'static str {
    "OK"
}

async fn create_report(
    State(pool): State<PgPool>,
    Json(req): Json<CreateReportRequest>,
) -> Result<(StatusCode, Json<Report>), (StatusCode, Json<ErrorResponse>)> {
    let report = sqlx::query_as::<_, Report>(
        r#"
        INSERT INTO mcp_server_reports (server_name, repository_url, developer_email, report_data, report_json)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(&req.server_name)
    .bind(&req.repository_url)
    .bind(&req.developer_email)
    .bind(&req.report_data)
    .bind(&req.report_json)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create report: {}", e);
        let error_msg = if e.to_string().contains("unique_repository") {
            format!(
                "Report already exists for repository: {}",
                req.repository_url
            )
        } else {
            "Failed to create report".to_string()
        };
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: error_msg }),
        )
    })?;

    let json_status = if report.report_json.is_some() {
        "with structured JSON"
    } else {
        "markdown only"
    };
    tracing::info!(
        "Created report: {} for {} ({})",
        report.id,
        report.server_name,
        json_status
    );
    Ok((StatusCode::CREATED, Json(report)))
}

async fn list_reports(
    State(pool): State<PgPool>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Report>>, (StatusCode, Json<ErrorResponse>)> {
    let reports = if let Some(status) = query.status {
        sqlx::query_as::<_, Report>(
            "SELECT * FROM mcp_server_reports WHERE status = $1 ORDER BY submitted_at DESC",
        )
        .bind(status)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, Report>("SELECT * FROM mcp_server_reports ORDER BY submitted_at DESC")
            .fetch_all(&pool)
            .await
    }
    .map_err(|e| {
        tracing::error!("Failed to list reports: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to list reports".to_string(),
            }),
        )
    })?;

    tracing::info!("Listed {} reports", reports.len());
    Ok(Json(reports))
}

async fn get_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Report>, (StatusCode, Json<ErrorResponse>)> {
    let report = sqlx::query_as::<_, Report>("SELECT * FROM mcp_server_reports WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get report {}: {}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: format!("Report not found: {}", id),
                }),
            )
        })?;

    tracing::info!("Retrieved report: {}", report.id);
    Ok(Json(report))
}

async fn update_status(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<Report>, (StatusCode, Json<ErrorResponse>)> {
    // Validate status
    if !["approved", "rejected"].contains(&req.status.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Status must be 'approved' or 'rejected'".to_string(),
            }),
        ));
    }

    let report = sqlx::query_as::<_, Report>(
        r#"
        UPDATE mcp_server_reports
        SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
        WHERE id = $4
        RETURNING *
        "#,
    )
    .bind(&req.status)
    .bind(&req.reviewed_by)
    .bind(&req.review_notes)
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update status for {}: {}", id, e);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Report not found: {}", id),
            }),
        )
    })?;

    tracing::info!(
        "Updated report {} status to {} by {}",
        report.id,
        report.status,
        report.reviewed_by.as_ref().unwrap()
    );
    Ok(Json(report))
}

// ============================================================================
// Phase 3: Analytics Handlers
// ============================================================================

/// Helper function to extract issues from JSON arrays
fn extract_issues(json: &JsonValue, field: &str) -> Vec<Issue> {
    json.get(field)
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    Some(Issue {
                        severity: item.get("severity")?.as_str()?.to_string(),
                        description: item.get("description")?.as_str()?.to_string(),
                        impact: item.get("impact").and_then(|v| v.as_str()).map(String::from),
                        recommendation: item.get("recommendation").and_then(|v| v.as_str()).map(String::from),
                        phase_id: item.get("phase_id").and_then(|v| v.as_str()).map(String::from),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

async fn get_risk_distribution(
    State(pool): State<PgPool>,
) -> Result<Json<HashMap<String, i64>>, (StatusCode, Json<ErrorResponse>)> {
    let results = sqlx::query!(
        r#"
        SELECT
            report_json->'phase1_security'->>'risk_level' as "risk_level?",
            COUNT(*) as "count!"
        FROM mcp_server_reports
        WHERE report_json IS NOT NULL
          AND report_json->'phase1_security'->>'risk_level' IS NOT NULL
        GROUP BY report_json->'phase1_security'->>'risk_level'
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get risk distribution: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to query risk distribution".to_string(),
            }),
        )
    })?;

    let mut distribution = HashMap::new();
    for row in results {
        if let Some(risk) = row.risk_level {
            distribution.insert(risk, row.count);
        }
    }

    tracing::info!("Retrieved risk distribution with {} levels", distribution.len());
    Ok(Json(distribution))
}

async fn get_report_issues(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<IssuesResponse>, (StatusCode, Json<ErrorResponse>)> {
    let report = sqlx::query_as::<_, Report>(
        "SELECT * FROM mcp_server_reports WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Report not found: {}", id),
            }),
        )
    })?;

    let json_data = report.report_json.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "No structured data available for this report".to_string(),
            }),
        )
    })?;

    // Extract issues from JSON
    let critical = extract_issues(&json_data, "critical_issues");
    let warnings = extract_issues(&json_data, "warnings");
    let recommendations = extract_issues(&json_data, "recommendations");

    tracing::info!("Retrieved {} critical issues, {} warnings, {} recommendations for report {}",
        critical.len(), warnings.len(), recommendations.len(), id);

    Ok(Json(IssuesResponse {
        report_id: report.id,
        server_name: report.server_name,
        critical_issues: critical,
        warnings,
        recommendations,
    }))
}

async fn get_analytics_summary(
    State(pool): State<PgPool>,
) -> Result<Json<AnalyticsSummary>, (StatusCode, Json<ErrorResponse>)> {
    // Total reports
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM mcp_server_reports")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    // With structured data
    let with_json: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mcp_server_reports WHERE report_json IS NOT NULL"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    // By status
    let status_results = sqlx::query!(
        "SELECT status, COUNT(*) as count FROM mcp_server_reports GROUP BY status"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut by_status = HashMap::new();
    for row in status_results {
        by_status.insert(row.status, row.count.unwrap_or(0));
    }

    // By risk level
    let risk_results = sqlx::query!(
        r#"
        SELECT
            report_json->'phase1_security'->>'risk_level' as "risk?",
            COUNT(*) as "count!"
        FROM mcp_server_reports
        WHERE report_json IS NOT NULL
        GROUP BY report_json->'phase1_security'->>'risk_level'
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut by_risk_level = HashMap::new();
    for row in risk_results {
        if let Some(risk) = row.risk {
            by_risk_level.insert(risk, row.count);
        }
    }

    // Recent submissions (24h)
    let recent: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mcp_server_reports WHERE submitted_at > NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    tracing::info!("Retrieved analytics summary: {} total reports, {} with JSON", total, with_json);

    Ok(Json(AnalyticsSummary {
        total_reports: total,
        with_structured_data: with_json,
        by_status,
        by_risk_level,
        recent_submissions_24h: recent,
    }))
}

// ============================================================================
// Main
// ============================================================================

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "golive_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Get database URL from environment
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Create connection pool
    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("Migrations complete");

    // Build router
    let app = Router::new()
        .route("/healthz", get(health_check))
        .route("/api/v1/reports", post(create_report))
        .route("/api/v1/reports", get(list_reports))
        .route("/api/v1/reports/{id}", get(get_report))
        .route("/api/v1/reports/{id}/status", patch(update_status))
        // Phase 3: Analytics endpoints
        .route("/api/v1/reports/analytics/risk-distribution", get(get_risk_distribution))
        .route("/api/v1/reports/analytics/summary", get(get_analytics_summary))
        .route("/api/v1/reports/{id}/issues", get(get_report_issues))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    // Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("Server running on http://{}", addr);

    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let result = health_check().await;
        assert_eq!(result, "OK");
    }

    #[test]
    fn test_create_report_request_deserialize() {
        let json = r##"{"server_name":"test","repository_url":"https://github.com/test/test","developer_email":"test@test.com","report_data":"# Test"}"##;
        let req: CreateReportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.server_name, "test");
    }

    #[test]
    fn test_update_status_request_deserialize() {
        let json = r#"{"status":"approved","reviewed_by":"platform@test.com"}"#;
        let req: UpdateStatusRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status, "approved");
    }

    // New tests for JSON support
    #[test]
    fn test_create_report_request_without_json() {
        let json = r##"{
            "server_name": "test-server",
            "repository_url": "https://github.com/test/test",
            "developer_email": "test@example.com",
            "report_data": "Test Report"
        }"##;

        let req: CreateReportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.server_name, "test-server");
        assert!(req.report_json.is_none());
    }

    #[test]
    fn test_create_report_request_with_json() {
        let json = r##"{
            "server_name": "test-server",
            "repository_url": "https://github.com/test/test",
            "developer_email": "test@example.com",
            "report_data": "Test Report",
            "report_json": {
                "report_version": "1.0",
                "server_info": {
                    "server_name": "test-server"
                }
            }
        }"##;

        let req: CreateReportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.server_name, "test-server");
        assert!(req.report_json.is_some());

        let json_data = req.report_json.unwrap();
        assert_eq!(json_data["report_version"], "1.0");
    }

    #[test]
    fn test_report_serialization_with_json() {
        let report = Report {
            id: Uuid::new_v4(),
            server_name: "test-server".to_string(),
            repository_url: "https://github.com/test/test".to_string(),
            developer_email: "test@example.com".to_string(),
            report_data: "# Test".to_string(),
            report_json: Some(serde_json::json!({
                "report_version": "1.0",
                "server_info": {
                    "server_name": "test-server"
                }
            })),
            status: "pending_review".to_string(),
            submitted_at: Utc::now(),
            reviewed_at: None,
            reviewed_by: None,
            review_notes: None,
        };

        let json_str = serde_json::to_string(&report).unwrap();
        assert!(json_str.contains("report_json"));
        assert!(json_str.contains("report_version"));
    }

    #[test]
    fn test_report_serialization_without_json() {
        let report = Report {
            id: Uuid::new_v4(),
            server_name: "test-server".to_string(),
            repository_url: "https://github.com/test/test".to_string(),
            developer_email: "test@example.com".to_string(),
            report_data: "# Test".to_string(),
            report_json: None,
            status: "pending_review".to_string(),
            submitted_at: Utc::now(),
            reviewed_at: None,
            reviewed_by: None,
            review_notes: None,
        };

        let json_str = serde_json::to_string(&report).unwrap();
        // With skip_serializing_if, null fields are omitted
        assert!(!json_str.contains("report_json") || json_str.contains("\"report_json\":null"));
    }

    // Phase 3: Analytics tests
    #[test]
    fn test_extract_issues() {
        let json = serde_json::json!({
            "critical_issues": [
                {
                    "severity": "CRITICAL",
                    "description": "Test issue",
                    "phase_id": "P1"
                }
            ],
            "warnings": [
                {
                    "severity": "WARNING",
                    "description": "Test warning"
                }
            ]
        });

        let critical = extract_issues(&json, "critical_issues");
        assert_eq!(critical.len(), 1);
        assert_eq!(critical[0].severity, "CRITICAL");
        assert_eq!(critical[0].description, "Test issue");

        let warnings = extract_issues(&json, "warnings");
        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0].severity, "WARNING");
    }

    #[test]
    fn test_extract_issues_empty() {
        let json = serde_json::json!({});
        let issues = extract_issues(&json, "critical_issues");
        assert_eq!(issues.len(), 0);
    }

    #[test]
    fn test_issues_response_serialization() {
        let response = IssuesResponse {
            report_id: Uuid::new_v4(),
            server_name: "test-server".to_string(),
            critical_issues: vec![Issue {
                severity: "CRITICAL".to_string(),
                description: "Test".to_string(),
                impact: Some("High".to_string()),
                recommendation: None,
                phase_id: Some("P1".to_string()),
            }],
            warnings: vec![],
            recommendations: vec![],
        };

        let json_str = serde_json::to_string(&response).unwrap();
        assert!(json_str.contains("critical_issues"));
        assert!(json_str.contains("CRITICAL"));
    }

    #[test]
    fn test_analytics_summary_serialization() {
        let mut by_status = HashMap::new();
        by_status.insert("pending_review".to_string(), 5);
        by_status.insert("approved".to_string(), 3);

        let mut by_risk = HashMap::new();
        by_risk.insert("LOW".to_string(), 8);

        let summary = AnalyticsSummary {
            total_reports: 10,
            with_structured_data: 8,
            by_status,
            by_risk_level: by_risk,
            recent_submissions_24h: 2,
        };

        let json_str = serde_json::to_string(&summary).unwrap();
        assert!(json_str.contains("total_reports"));
        assert!(json_str.contains("by_status"));
        assert!(json_str.contains("by_risk_level"));
    }
}
