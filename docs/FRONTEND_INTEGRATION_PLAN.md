# Frontend Integration Plan - PR #1

**Status:** In Progress
**Created:** 2025-10-21
**Branch:** `frontend` → `main`
**Strategy:** Frontend-First Update (Option A)

---

## Executive Summary

This document outlines the plan to integrate the frontend branch (PR #1) with the main branch, which now requires `report_json` as a mandatory field across the entire stack (per PR #3).

**Core Challenge:** The frontend was built before `report_json` was made required. A direct merge would cause runtime errors because the API expects `report_json` but the frontend doesn't send it.

**Solution:** Update the frontend to support `report_json` BEFORE merging into main.

---

## Current State Analysis

### Main Branch (After PR #3)
- **Database:** `report_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- **Rust API:** `report_json: JsonValue` (required field, no Option wrapper)
- **MCP Server:** `report_json: str` (required parameter)
- **All Tests:** Updated to include valid `report_json` data
- **Status:** ✅ All working, tests passing (9/9)

### Frontend Branch (PR #1)
- **TypeScript Types:** Only has `report_data: string` (markdown)
- **API Client:** No awareness of `report_json` field
- **Components:** Only render markdown from `report_data`
- **Dependencies:** React Router 7, TanStack Query, Bifrost UI
- **Status:** ✅ Works with old API schema (before PR #3)

### Conflict
If we merge frontend → main without updates:
```typescript
// Frontend sends this:
{
  server_name: "test",
  repository_url: "https://github.com/test/test",
  developer_email: "test@test.com",
  report_data: "# Report..."
  // ❌ Missing report_json!
}

// API expects this:
{
  server_name: "test",
  repository_url: "https://github.com/test/test",
  developer_email: "test@test.com",
  report_data: "# Report...",
  report_json: { ... }  // ✅ Required field
}
```

**Result:** HTTP 500 or database constraint violation.

---

## Integration Strategy: Frontend-First Update

### Why This Approach?

1. **Prevents Breaking Changes:** Frontend works immediately after merge
2. **Maintains Architecture:** Keeps "report_json required everywhere" from PR #3
3. **Clean Implementation:** No backward compatibility code needed
4. **POC-Friendly:** Test data only, can update entire stack at once

### Alternative Approaches Considered

**Option B: Minimal Merge + Post-Integration**
- ❌ Rejected: Would break immediately after merge
- ❌ Harder to debug and fix post-merge

**Option C: Make report_json Optional Again**
- ❌ Rejected: Undoes architectural decision from PR #3
- ❌ Adds complexity we explicitly removed

---

## Implementation Plan

### Phase 1: Update TypeScript Types ✅
**File:** `frontend/src/types/api.ts`

**Changes:**
```typescript
interface Report {
  id: string
  server_name: string
  repository_url: string
  developer_email: string
  report_data: string
  report_json: Record<string, any>  // ADD: Required structured data
  status: ReportStatus
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
}

interface CreateReportRequest {
  server_name: string
  repository_url: string
  developer_email: string
  report_data: string
  report_json: Record<string, any>  // ADD: Required field
}
```

### Phase 2: Update API Client ✅
**File:** `frontend/src/api/client.ts`

**Changes:**
- Ensure `submit()` method includes `report_json` in request body
- Verify `list()`, `get()` methods handle `report_json` in responses

```typescript
submit: async (data: CreateReportRequest): Promise<Report> => {
  return await apiClient.post('reports', {
    json: {
      server_name: data.server_name,
      repository_url: data.repository_url,
      developer_email: data.developer_email,
      report_data: data.report_data,
      report_json: data.report_json,  // ENSURE: Included in POST
    },
  }).json<Report>()
}
```

### Phase 3: Update Components (Optional Enhancement) 🎨
**Primary Files:**
- `frontend/src/routes/ReportDetail.tsx`
- `frontend/src/routes/Dashboard.tsx`

**Goal:** Display structured data from `report_json` alongside markdown.

**Example Enhancement for ReportDetail.tsx:**
```typescript
{/* ADD: Structured Data Section */}
{report.report_json && (
  <Card>
    <CardHeader>
      <CardTitle>Structured Analysis</CardTitle>
    </CardHeader>
    <CardContent>
      {report.report_json.executive_summary && (
        <div className="space-y-2">
          <div>
            <strong>Overall Status:</strong>{' '}
            <Badge variant={
              report.report_json.executive_summary.overall_status === 'APPROVED'
                ? 'success'
                : 'warning'
            }>
              {report.report_json.executive_summary.overall_status}
            </Badge>
          </div>
          <div>
            <strong>Critical Issues:</strong>{' '}
            {report.report_json.executive_summary.critical_issues_count}
          </div>
        </div>
      )}
      {report.report_json.phase1_security && (
        <div>
          <strong>Risk Level:</strong>{' '}
          <Badge variant={
            report.report_json.phase1_security.risk_level === 'LOW'
              ? 'success'
              : 'destructive'
          }>
            {report.report_json.phase1_security.risk_level}
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### Phase 4: Testing ✅
**Environment Setup:**
1. Start Rust API from main branch: `cd rust-api && just run`
2. Start frontend dev server: `cd frontend && npm run dev`

**Test Scenarios:**
1. **List Reports:** Verify table displays all fields including `report_json` data
2. **View Detail:** Check both markdown and structured data render correctly
3. **Submit Report:** Test POST with `report_json` field
4. **Filter by Status:** Ensure filtering works (pending_review, approved, rejected)
5. **Approve/Reject:** Test status update workflow

**Test Commands:**
```bash
# Terminal 1: Start API
cd rust-api
just db-reset
just run

# Terminal 2: Submit test data
just test-submit

# Terminal 3: Start frontend
cd frontend
npm install
npm run dev

# Browser: http://localhost:5173
# Verify all reports display correctly
```

### Phase 5: Merge Strategy ✅
```bash
# 1. Ensure frontend branch is up to date
git checkout frontend
git fetch origin
git pull origin frontend

# 2. Rebase onto latest main (resolve conflicts if any)
git rebase origin/main

# 3. Run tests
cd frontend && npm run build && npm run type-check
cd ../rust-api && just check

# 4. Merge into main
git checkout main
git merge frontend --no-ff -m "Merge PR #1: Add React frontend with report_json support"

# 5. Push
git push origin main
```

### Phase 6: Documentation ✅
**File:** `CLAUDE.md`

**Add section:**
```markdown
## Frontend

### Tech Stack
- React 18 + TypeScript
- React Router 7
- TanStack Query (React Query v5)
- Bifrost Design System
- Vite 6

### Quick Start
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

### Environment Variables
Create `frontend/.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id>
```

### Build
```bash
npm run build       # Production build
npm run preview     # Preview production build
npm run type-check  # TypeScript validation
```
```

---

## Success Criteria

### Phase 1-2: Core Integration (MUST PASS)
- ✅ TypeScript types include `report_json: Record<string, any>`
- ✅ API client sends `report_json` in POST requests
- ✅ API client receives and types `report_json` in responses
- ✅ No TypeScript compilation errors
- ✅ `npm run build` succeeds without errors

### Phase 3: Component Updates (OPTIONAL BUT RECOMMENDED)
- ✅ ReportDetail displays structured data from `report_json`
- ✅ Dashboard shows risk levels or status indicators
- ✅ UI gracefully handles missing or malformed `report_json`

### Phase 4: Testing (MUST PASS)
- ✅ Frontend can fetch and display reports from main branch API
- ✅ Submit report with `report_json` succeeds (HTTP 201)
- ✅ Report detail page renders both markdown and structured data
- ✅ Approve/reject workflow works end-to-end
- ✅ No console errors in browser dev tools
- ✅ No runtime errors when navigating the app

### Phase 5: Merge (MUST PASS)
- ✅ Git rebase completes with all conflicts resolved
- ✅ `npm run build` succeeds on merged main branch
- ✅ `cargo test` passes on merged main branch
- ✅ `just test-integration` passes on merged main branch

### Phase 6: Documentation (MUST COMPLETE)
- ✅ CLAUDE.md includes frontend setup instructions
- ✅ Environment variables documented
- ✅ Build commands documented

---

## Testing Checklist

### Manual Testing
- [ ] **Happy Path:** Submit report → View in list → Click detail → Approve → Verify status
- [ ] **Validation:** Try submitting invalid data → See error messages
- [ ] **Filtering:** Filter by pending_review → See only pending reports
- [ ] **Markdown Rendering:** View report detail → Verify markdown displays correctly
- [ ] **Structured Data:** View report detail → Verify JSON data displays correctly
- [ ] **Error Handling:** Stop API → Frontend shows error state gracefully

### Automated Testing
- [ ] TypeScript compilation: `npm run type-check`
- [ ] Build production: `npm run build`
- [ ] Rust tests: `cargo test`
- [ ] Integration test: `just test-integration`

---

## Rollback Plan

If critical issues arise after merge:

### Option 1: Quick Fix
```bash
git checkout main
# Fix the issue
git commit -m "fix: resolve frontend integration issue"
git push origin main
```

### Option 2: Revert Merge
```bash
git checkout main
git revert -m 1 HEAD  # Revert the merge commit
git push origin main
```

### Option 3: Revert to Pre-Merge State
```bash
git checkout main
git reset --hard <commit-before-merge>
git push origin main --force  # ⚠️ Only for POC/dev environment
```

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: TypeScript Types | 5-10 min | Low |
| Phase 2: API Client | 10-15 min | Low |
| Phase 3: Component Updates | 20-30 min | Medium |
| Phase 4: Testing | 15-20 min | Medium |
| Phase 5: Merge | 5-10 min | Low |
| Phase 6: Documentation | 10 min | Low |
| **Total** | **65-95 min** | **~1.5 hours** |

---

## Risk Assessment

### Low Risk ✅
- TypeScript type updates (compile-time checked)
- API client updates (straightforward, well-typed)
- Documentation updates

### Medium Risk ⚠️
- Component updates (requires UI testing)
- Merge conflicts (frontend branch might be behind main)

### Mitigation Strategies
- **For Components:** Keep changes minimal; just display `report_json` data, don't restructure
- **For Merge Conflicts:** Rebase regularly; test after each conflict resolution

---

## Post-Integration Tasks

After successful merge:

1. **Close PR #1** with reference to merge commit
2. **Tag Release** (optional): `git tag v0.2.0-frontend-integration`
3. **Update Project README** with frontend instructions
4. **Deploy** (if applicable): Update deployment scripts to build frontend
5. **Monitor** for any runtime errors or user feedback

---

## Notes

- This is a **POC environment** - we can afford to be aggressive with changes
- Only **test data** in database - safe to reset/migrate as needed
- **No production users** - can iterate quickly without breaking prod
- Architecture decision from PR #3 (required `report_json`) is **intentional and correct**

---

## Sign-Off

**Document Author:** Claude Code
**Reviewed By:** _Pending_
**Approved By:** _Pending_
**Date Approved:** _Pending_

---

**End of Frontend Integration Plan**
