# Task 010 — Deterministic Analytics Engine I

`app/src/analytics/analyzeContext.test.ts` checks exact adapter path/scope use, structured findings and rule IDs, empty results, replaceable reference time, the four planted fixture signals, ordinary/nonqualifying cases, null/blank asset exclusion, PM exclusion from repeat work, adapter-supplied work-mix baseline, and no baseline-driven finding near parity. Existing UI/exploration, Node Intelligence, records, pagination, CSV, Saved/Recent, and Task 009 fixture tests remain in the full suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full test suite | Passed, 65 tests in 9 files (`npm test -- --run`) | AX-FR-ANA-001/002, AX-NFR-AI-005, prior GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite served root and entry modules with HTTP 200; no analytical UI integration | AX-UX-001 |

## Development-only calculated report

The analytics service was executed against the Mock Adapter at its fixed `2026-09-01T00:00:00.000Z` reference. This is fixture verification, not a UI finding or authorized Maximo result.

| Context | Rule result |
| --- | --- |
| Site: SITE-A | Backlog & Aging: 29 aged WAPPR orders of 225 approval orders (12.89%); oldest current-status age 112 days. |
| Asset: A-PUMP-01 | Repeat Work: 15 reactive orders in the 31-day window; CM 11, EM 4; reports August 3–23, 2026. |
| Site: SITE-C | Process Bottleneck: 9 long-current-status WSCH PM orders of 13 unstarted scheduled PM orders; longest 95 days. |
| Site: SITE-D | Work Mix: 239 reactive and 41 planned of 280 eligible; reactive share 85.36%, 13.56 percentage points above baseline. |
| Mock authorized-population baseline | 1,436 reactive and 564 planned of 2,000 eligible; reactive share 71.8%. |

The SITE-A context also produces generic repeat-work findings for other assets meeting the same rule. This confirms the engine does not encode the planted asset name as an exception. No findings are rendered in Axeon. The local current-user marker is not real authorization; MAS validation remains outstanding.
