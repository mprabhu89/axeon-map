# Task 011 — Contextual Operational Findings

## Automated verification

`app/src/App.analytics.test.tsx` verifies that only the active non-root context is analyzed, inspected candidates use prospective paths without changing the committed breadcrumb, Inspect → Explore does not duplicate an unchanged-path request, sibling selection changes context, stale completions are discarded, loading does not disable exploration or Open Records, errors stay local, Retry uses the current path, and saved-path resume recalculates findings without persisting them. `app/src/components/OperationalFindings.test.tsx` verifies all four structured presentations, supplied severity, neutral empty output, evidence disclosure, and absence of raw Work Order identifiers or AI labelling. The existing exploration, Investigation Spine, records, pagination, CSV, persistence, and question tests remain in the full suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full test suite | Passed, 72 tests in 11 files (`npm test -- --run`) | AX-FR-ANA-003/004, AX-NFR-ANA-001, prior GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build`; 50 modules transformed | AX-PR-001 |
| Local runtime | Vite served the app at `http://127.0.0.1:5181/` | AX-UX-001 |

## Codex browser verification

Automated in installed Microsoft Edge against the local Vite app:

- Inspected SITE-A without Explore: breadcrumb remained `Work Orders`, the panel showed `PROSPECTIVE PATH`, `29 of 225 approvals`, and `Aged ≥ 90 days`.
- Expanded **Evidence and rule**: rule `AX-ANA-AGE-001`, population `225 Work Orders`, and structured calculation details were present; no `SYN-WO-` raw record identifiers appeared.
- Opened records from inspected SITE-A: the broader prospective context displayed `Showing 1–20 of 560` for `Site: SITE-A`.
- Switched directly to SITE-D: breadcrumb still remained `Work Orders`; the panel displayed `85.4% reactive` and `Baseline 71.8% · +13.6 pts`.
- Switched to SITE-B: the panel displayed the neutral `No qualifying operational findings for this context.` state and no broad safety or health claim.
- Committed SITE-A, saved it, reset, and reopened it: `Work Orders → Site: SITE-A` was reconstructed and the aging finding appeared after recalculation. Browser storage contained path metadata only and no analytical rule, metric, evidence, or finding data.

The browser run used synthetic local data. It did not validate real Maximo authorization, MAF deployment, or AI. User manual acceptance remains required for this user-visible checkpoint.
