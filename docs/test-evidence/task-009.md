# Task 009 — Work Management analytical data foundation

`app/src/data/syntheticWorkOrders.test.ts` checks 2,000 repeatable records, SITE-A's unchanged 560 count, the original six dimensions, allowed and uneven PM/CM/EM work types, lifecycle and target-date invariants, four controlled signal populations, and unchanged seven-field preview/CSV boundaries. The full existing UI, exploration, adapter, persistence, pagination, export, and Node Intelligence regression suite also passed.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 57 tests in 8 files (`npm test -- --run`) | AX-FR-DATA-001, AX-NFR-DATA-002, existing GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch smoke check | Vite served root, entry module, and synthetic module with HTTP 200 at `http://127.0.0.1:5174/` | AX-UX-001 |

Development-only fixture report at fixed reference `2026-09-01T00:00:00.000Z`: 2,000 total; PM 564, CM 1,215, EM 221. Aged SITE-A Electrical WAPPR records with 90+ days in current status and past target finish: 29 of 109. Recent reactive A-PUMP-01 records reported within 31 days: 15 of 51 asset-history records. Long-current-status SITE-C WSCH PM records at 75+ days: 9 of 28 scheduled SITE-C records. SITE-D reactive share: 239/280 (85.4%) versus 1,436/2,000 (71.8%) overall. These are fixture-verification observations only and are not shown as Axeon findings. No real Maximo authorization or MAS deployment was tested.
