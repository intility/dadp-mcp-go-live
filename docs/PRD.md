# Product Requirements Document: MCP Go-Live Service (POC)

**Version:** 1.0 (POC)
**Status:** Draft
**Last Updated:** 2025-10-20
**Owner:** DevEx Team

---

## Executive Summary

The MCP Go-Live Service POC validates whether we can effectively capture, store, and review MCP server go-live reports through a simple workflow.

### Problem Statement

Deploying MCP servers to production at Intility requires:
- Security assessment (lethal trifecta, OBO, etc.)
- Policy compliance verification
- Infrastructure setup validation

Currently, this process is:
- **Manual**: Developer must remember all checks
- **Undocumented**: No record of what was verified
- **Inconsistent**: No standardized review process

### Solution (POC Scope)

A minimal service to validate the concept:

1. **Developer uses existing MCP go-live skill** in Claude Code
   - Skill guides through 6-phase checklist
   - Skill generates markdown report at the end

2. **Developer submits report via MCP tool**
   - `submit_report()` sends report to our API
   - Report stored with status "pending_review"

3. **Platform team reviews manually**
   - `list_servers()` shows pending submissions
   - Team reviews report via API
   - Team approves/rejects via API

### Success Metrics (POC)

- ✅ Developer can complete go-live skill and submit report
- ✅ Report is stored correctly in database
- ✅ Platform team can list, view, and approve reports
- ✅ End-to-end flow takes < 10 minutes to validate

---

## User Personas (POC)

### Primary: MCP Server Developer
**Name:** Alex
**Role:** Backend Developer

**User Story:**
> "As a developer, I want to submit my completed go-live report to the platform team, so they can review and approve my MCP server for production."

**Acceptance Criteria:**
- Can call `submit_report()` from Claude Code
- Receives confirmation with report ID
- Report includes all security/compliance information

### Secondary: Platform Team Member
**Name:** Morgan
**Role:** Platform Engineer

**User Story:**
> "As a platform team member, I want to review pending MCP server submissions, so I can approve them for production deployment."

**Acceptance Criteria:**
- Can call `list_servers()` to see pending reports
- Can retrieve full report via API
- Can approve or reject with notes

---

## Functional Requirements (POC)

### FR-001: Submit Go-Live Report
**Priority:** P0 (Must Have)

The system SHALL accept go-live reports from MCP server with:
- Server name
- Repository URL
- Developer email
- Full markdown report (from skill)

**Technical:**
- MCP tool: `submit_report()`
- API endpoint: `POST /api/v1/reports`
- Response: Report ID + status "pending_review"

### FR-002: List Submitted Reports
**Priority:** P0 (Must Have)

The system SHALL list reports filtered by status:
- `pending_review`
- `approved`
- `rejected`
- `all` (no filter)

**Technical:**
- MCP tool: `list_servers(status)`
- API endpoint: `GET /api/v1/reports?status={status}`
- Response: Array of reports (summary view)

### FR-003: Retrieve Full Report
**Priority:** P0 (Must Have)

The system SHALL return full report details including markdown.

**Technical:**
- API endpoint: `GET /api/v1/reports/{id}`
- Response: Complete report object with markdown

### FR-004: Update Report Status
**Priority:** P0 (Must Have)

The system SHALL allow platform team to approve/reject reports with notes.

**Technical:**
- API endpoint: `PATCH /api/v1/reports/{id}/status`
- Input: status, reviewed_by, review_notes
- Response: Updated report object

---

## Non-Functional Requirements (POC)

### NFR-001: Performance (Relaxed for POC)
- API response time < 2s (not optimized yet)
- Can handle 10 concurrent requests (no load testing)

### NFR-002: Reliability (Minimal for POC)
- No uptime guarantees (local development only)
- Data persisted to PostgreSQL (no backups)

### NFR-003: Security (Deferred for POC)
- ❌ No authentication (add post-POC)
- ❌ No authorization (add post-POC)
- ❌ No input validation (basic only)
- ❌ No rate limiting (add post-POC)

### NFR-004: Observability (Minimal for POC)
- Console logging only (no structured logs)
- No metrics or tracing (add post-POC)

---

## Technical Stack (POC)

| Component | Technology | Version | Why |
|-----------|-----------|---------|-----|
| API Backend | Rust + Axum | 0.8+ | Fast, type-safe, async |
| Database | PostgreSQL | 16 | Reliable, standard |
| DB Driver | sqlx | 0.8+ | Type-checked queries |
| MCP Server | Python | 3.11+ | MCP SDK support |
| Package Manager | uv | Latest | Fast dependency management |
| MCP Framework | mcp | 0.1+ | Official MCP SDK |
| HTTP Client | httpx | 0.27+ | Async HTTP |

---

## API Specification (POC)

**Base URL:** `http://localhost:8080/api/v1`

### POST /reports
Create a new report.

**Request:**
```json
{
  "server_name": "mcp-servicenow",
  "repository_url": "https://github.com/intility/mcp-servicenow",
  "developer_email": "alex@intility.no",
  "report_data": "# Go-Live Report\n\n## Phase 1: Security...\n\n..."
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "server_name": "mcp-servicenow",
  "repository_url": "https://github.com/intility/mcp-servicenow",
  "developer_email": "alex@intility.no",
  "report_data": "...",
  "status": "pending_review",
  "submitted_at": "2025-10-20T10:00:00Z",
  "reviewed_at": null,
  "reviewed_by": null,
  "review_notes": null
}
```

### GET /reports?status={status}
List reports.

**Query Parameters:**
- `status` (optional): `pending_review`, `approved`, `rejected`

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "server_name": "mcp-servicenow",
    "repository_url": "https://github.com/intility/mcp-servicenow",
    "status": "pending_review",
    "submitted_at": "2025-10-20T10:00:00Z"
  }
]
```

### GET /reports/{id}
Get full report details.

**Response:** `200 OK` (same as POST response, with full markdown)

### PATCH /reports/{id}/status
Update approval status.

**Request:**
```json
{
  "status": "approved",
  "reviewed_by": "platform@intility.no",
  "review_notes": "All checks passed. Approved for production."
}
```

**Response:** `200 OK` (returns updated report)

---

## MCP Tools Specification (POC)

### Tool: submit_report

**Description:** Submit a completed MCP go-live report for platform team review.

**Input Schema:**
```typescript
{
  server_name: string;
  repository_url: string;
  developer_email: string;
  report_markdown: string;
}
```

**Output:**
```
✅ Report submitted successfully!

**Report ID:** {id}
**Status:** pending_review
**Submitted at:** {timestamp}

Your go-live report is now pending platform team review.
```

### Tool: list_servers

**Description:** List submitted MCP servers (for platform team to review).

**Input Schema:**
```typescript
{
  status?: "pending_review" | "approved" | "rejected" | "all";
}
```

**Output:**
```
## MCP Servers (pending_review)

| Server Name     | Repository                          | Status         | Submitted  |
|----------------|-------------------------------------|----------------|------------|
| mcp-servicenow | github.com/intility/mcp-servicenow | pending_review | 2025-10-20 |
```

---

## User Workflows (POC)

### Workflow 1: Developer Submits Report

```
1. Developer: "I need to deploy my MCP server to production"

2. Claude Code (with mcp-go-live skill):
   - Loads skill
   - Guides through Phase 1: Security Assessment
   - Guides through Phase 2: Policy Compliance
   - Guides through Phase 3: Infrastructure
   - Guides through Phase 4: Observability
   - Guides through Phase 5: Authentication
   - Guides through Phase 6: Final Verification
   - Generates go-live-report.md

3. Developer: "Submit this report"

4. Claude Code:
   - Extracts server name, repo URL, email from report
   - Calls: submit_report(
       server_name="mcp-servicenow",
       repository_url="https://github.com/intility/mcp-servicenow",
       developer_email="alex@intility.no",
       report_markdown="[full markdown]"
     )

5. System:
   - Stores report in database
   - Sets status to "pending_review"
   - Returns confirmation

6. Developer sees:
   "✅ Report submitted successfully! Report ID: abc-123"
```

### Workflow 2: Platform Team Reviews

```
1. Platform Team Member: "Show me pending MCP server reviews"

2. Claude Code:
   - Calls: list_servers(status="pending_review")

3. System returns list of pending reports

4. Platform Team Member: "Show me the full report for mcp-servicenow"

5. Claude Code (or direct API):
   - Calls: GET /api/v1/reports/{id}
   - Displays full markdown report

6. Platform Team Member reviews report:
   - Checks all 6 phases completed
   - Verifies lethal trifecta compliance
   - Reviews OBO implementation notes
   - Checks infrastructure setup

7. Platform Team Member: "Approve this"

8. System (via API):
   - curl -X PATCH /api/v1/reports/{id}/status \
       -d '{"status": "approved", "reviewed_by": "platform@intility.no"}'

9. Report status updated to "approved"
```

---

## Out of Scope (POC)

The following are explicitly **NOT** included in the POC:

### Automation
- ❌ Automated validation (GitHub API, kubectl, etc.)
- ❌ Code analysis tools
- ❌ Pipeline checks
- ❌ Dependency scanning

### Advanced Features
- ❌ Web UI for platform team (use API/curl)
- ❌ Email notifications
- ❌ Slack integration
- ❌ PDF export
- ❌ Workflow state tracking (phase-by-phase)

### Security
- ❌ OBO authentication
- ❌ User authorization
- ❌ Input validation
- ❌ Rate limiting
- ❌ Audit logging

### Observability
- ❌ OpenTelemetry traces
- ❌ Logfire integration
- ❌ Structured logging
- ❌ Metrics/dashboards

### Infrastructure
- ❌ Kubernetes deployment
- ❌ CI/CD pipeline
- ❌ Production environment

---

## Success Criteria (POC)

### Launch Criteria
- [x] Database schema created
- [x] Rust API implemented with 4 endpoints
- [x] Python MCP server with 2 tools
- [x] Docker Compose setup for local testing
- [x] Documentation (PRD, Architecture, CLAUDE.md)

### Validation Criteria (Test)
- [ ] Developer can submit report via MCP tool
- [ ] Report appears in database with correct status
- [ ] Platform team can list pending reports
- [ ] Platform team can retrieve full report
- [ ] Platform team can approve/reject report
- [ ] Status updates correctly in database
- [ ] End-to-end flow takes < 10 minutes

### Success Metrics (Post-Test)
- Developer feedback: "This workflow makes sense" ✅
- Platform team feedback: "We can review efficiently" ✅
- Technical validation: "The architecture is sound" ✅

---

## Timeline (POC)

### Week 1: Setup & Core API
- Day 1-2: Database schema + migrations
- Day 3-4: Rust API implementation (4 endpoints)
- Day 5: Testing + documentation

### Week 2: MCP Server & Integration
- Day 1-2: Python MCP server (2 tools)
- Day 3: Integration testing
- Day 4-5: Documentation + demo

### Week 3: Validation
- Day 1-3: Internal testing with real go-live reports
- Day 4-5: Feedback collection + decision on next steps

---

## Future Enhancements (Post-POC)

If POC is successful, prioritize:

### Phase 2: Automation
1. Automated validation (GitHub API, pipeline checks)
2. Code analysis for OBO patterns
3. kubectl infrastructure checks

### Phase 3: Enhanced UX
1. Web UI for platform team
2. Email/Slack notifications
3. PDF report export

### Phase 4: Security & Compliance
1. OBO authentication
2. User authorization
3. Audit logging
4. Rate limiting

### Phase 5: Production Readiness
1. OpenTelemetry + Logfire
2. Kubernetes deployment
3. CI/CD pipeline
4. Monitoring + alerting

---

## Open Questions

1. **Q:** Should the MCP server also provide a tool to check report status?
   **A:** Not for POC. Developer can ask Claude Code to call `list_servers()`.

2. **Q:** How should platform team access the API? curl or Web UI?
   **A:** POC uses curl/API. Web UI post-POC if needed.

3. **Q:** Should we send notifications when report is approved?
   **A:** Not for POC. Post-POC feature.

4. **Q:** What happens if developer submits duplicate report (same repo)?
   **A:** POC: Database constraint prevents duplicates (unique on repository_url). Returns error.

5. **Q:** Can platform team reject and ask for changes?
   **A:** POC: Yes, via `status="rejected"` + `review_notes`. Developer must resubmit.

---

## Risks & Mitigations

### Risk 1: MCP skill generates inconsistent report format
**Impact:** Medium
**Mitigation:**
- Use strict template in skill (go-live-report.md)
- Store full markdown (no parsing required)
- Platform team reviews manually

### Risk 2: Developers bypass skill and submit incomplete reports
**Impact:** Low (POC only tests with real skill)
**Mitigation:**
- Post-POC: Add validation that report contains required sections
- Post-POC: Require report to be signed/hashed by skill

### Risk 3: Platform team overwhelmed with manual reviews
**Impact:** Low (POC expects < 5 submissions)
**Mitigation:**
- Post-POC: Add automation for common checks
- Post-POC: Build web UI with filtering/search

---

## Appendix: Database Schema

```sql
CREATE TABLE mcp_server_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL UNIQUE,
    developer_email VARCHAR(255) NOT NULL,
    report_data TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected')),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT
);

CREATE INDEX idx_reports_status ON mcp_server_reports(status);
CREATE INDEX idx_reports_submitted_at ON mcp_server_reports(submitted_at DESC);
```

---

## Appendix: Example Report

```markdown
# MCP Go-Live Production Readiness Report

**MCP Server Name:** mcp-servicenow
**Repository:** https://github.com/intility/mcp-servicenow
**Developer:** alex@intility.no
**Review Date:** 2025-10-20
**Review Duration:** 4 hours

---

## Phase 1: Security Assessment

### Lethal Trifecta Compliance
**Risk Level:** 🟢 LOW

| Component | Status | Notes |
|-----------|--------|-------|
| Access to private data | ✅ OBO only | Using Azure AD tokens |
| Untrusted content | ✅ Not in LLM context | Only returns aggregated results |
| External communication | ✅ None | All calls internal |

### Prohibited Content Types
- ✅ No audio content
- ✅ No resource links
- ✅ No image content

**Security Assessment:** PASS

---

## Phase 2: Policy Compliance

[... rest of report ...]
```

---

## References

- **Architecture Doc:** `docs/ARCHITECTURE.md`
- **Claude Code Guide:** `CLAUDE.md`
- **MCP Go-Live Skill:** (existing skill in Claude Code)
- **MCP Protocol:** https://modelcontextprotocol.io/

---

**End of PRD (POC)**
