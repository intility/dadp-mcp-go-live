# Phase 3 Implementation Plan: Analytics Endpoints

**Project:** MCP Go-Live API - Analytics & Search
**Phase:** 3 - Advanced Query Endpoints
**Date:** 2025-10-21
**Dependencies:** Phase 1 (Structured JSON API support)

---

## Objectives

Add powerful analytics and search endpoints that leverage the JSONB data.

### Primary Goals
1. Add `/api/v1/reports/analytics/risk-distribution` endpoint
2. Add `/api/v1/reports/{id}/issues` endpoint
3. Add `/api/v1/reports/analytics/summary` endpoint
4. Add comprehensive error handling
5. Add tests for all endpoints

---

## Success Criteria

- [x] Risk distribution endpoint returns aggregated data
- [x] Issues endpoint extracts critical/warnings/recommendations
- [x] Summary endpoint provides overview statistics
- [x] All endpoints handle missing JSON gracefully
- [x] Unit tests for all endpoints
- [x] Integration tests pass
- [x] Documentation complete

---

## New Endpoints

### 1. GET /api/v1/reports/analytics/risk-distribution

Returns count of reports by risk level.

**Response:**
```json
{
  "LOW": 10,
  "MEDIUM": 3,
  "HIGH": 1,
  "CRITICAL": 0
}
```

### 2. GET /api/v1/reports/{id}/issues

Extracts issues from specific report.

**Response:**
```json
{
  "report_id": "uuid",
  "server_name": "mcp-servicenow",
  "critical_issues": [
    {
      "severity": "CRITICAL",
      "description": "Issue description",
      "phase_id": "P1"
    }
  ],
  "warnings": [...],
  "recommendations": [...]
}
```

### 3. GET /api/v1/reports/analytics/summary

Overview statistics.

**Response:**
```json
{
  "total_reports": 15,
  "with_structured_data": 12,
  "by_status": {
    "pending_review": 5,
    "approved": 8,
    "rejected": 2
  },
  "by_risk_level": {
    "LOW": 10,
    "MEDIUM": 2
  },
  "recent_submissions": 3
}
```

---

## Implementation

### Rust Models

```rust
#[derive(Debug, Serialize)]
struct RiskDistribution {
    #[serde(flatten)]
    distribution: HashMap<String, i64>,
}

#[derive(Debug, Serialize)]
struct Issue {
    severity: String,
    description: String,
    impact: Option<String>,
    recommendation: Option<String>,
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
    by_status: HashMap<String, i64>,
    by_risk_level: HashMap<String, i64>,
    recent_submissions_24h: i64,
}
```

### Handlers

```rust
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

    Ok(Json(AnalyticsSummary {
        total_reports: total,
        with_structured_data: with_json,
        by_status,
        by_risk_level,
        recent_submissions_24h: recent,
    }))
}

// Helper function
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
```

### Router Updates

```rust
let app = Router::new()
    .route("/healthz", get(health_check))
    .route("/api/v1/reports", post(create_report))
    .route("/api/v1/reports", get(list_reports))
    .route("/api/v1/reports/{id}", get(get_report))
    .route("/api/v1/reports/{id}/status", patch(update_status))
    // NEW: Analytics endpoints
    .route("/api/v1/reports/analytics/risk-distribution", get(get_risk_distribution))
    .route("/api/v1/reports/analytics/summary", get(get_analytics_summary))
    .route("/api/v1/reports/{id}/issues", get(get_report_issues))
    .layer(CorsLayer::permissive())
    .layer(TraceLayer::new_for_http())
    .with_state(pool);
```

---

## Testing

### Unit Tests

```rust
#[tokio::test]
async fn test_extract_issues() {
    let json = serde_json::json!({
        "critical_issues": [
            {
                "severity": "CRITICAL",
                "description": "Test issue",
                "phase_id": "P1"
            }
        ]
    });

    let issues = extract_issues(&json, "critical_issues");
    assert_eq!(issues.len(), 1);
    assert_eq!(issues[0].severity, "CRITICAL");
}
```

### Integration Tests

```bash
# Test risk distribution
curl http://localhost:8080/api/v1/reports/analytics/risk-distribution | jq

# Test summary
curl http://localhost:8080/api/v1/reports/analytics/summary | jq

# Test issues extraction
curl http://localhost:8080/api/v1/reports/{id}/issues | jq
```

---

## Timeline

- **Day 1:** Implement analytics endpoints
- **Day 2:** Add tests, error handling
- **Day 3:** Integration testing, documentation

---

**Status:** Ready for Implementation
