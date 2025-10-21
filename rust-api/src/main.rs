use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
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
        INSERT INTO mcp_server_reports (server_name, repository_url, developer_email, report_data)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(&req.server_name)
    .bind(&req.repository_url)
    .bind(&req.developer_email)
    .bind(&req.report_data)
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

    tracing::info!("Created report: {} for {}", report.id, report.server_name);
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
}
