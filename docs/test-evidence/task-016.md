# Task 016 — Contextual Investigation Filters

## Scope verified

- Structured filters remain separate from the Investigation Spine and support Site, Status, Priority, Classification, Location, Asset, and Work Type.
- Multiple values within a dimension use OR; dimensions and path constraints use AND.
- Filter discovery is a bounded adapter operation and returns only value/count DTOs.
- Apply is staged; Cancel preserves active filters; Clear, individual removal, Back, and Reset follow the documented rules.
- Map/spine/candidate counts, analytics, AI Context Packs, record pages, CSV, persistence, and reports consume the same path-plus-filter context.
- Saved/Recent schema 2 retains minimal filter metadata and reads legacy schema 1 entries.
- Changed filters invalidate AI context; reports reject AI snapshots whose filters do not exactly match.

## Automated evidence

| Check | Result | Requirements |
| --- | --- | --- |
| Focused Task 016/016A/016B suite | Passed, 29 tests in 6 files | AX-FR-FIL-001, AX-FR-REC-001/002/003, AX-FR-INV-001/002, AX-FR-AI-005, AX-FR-REP-001 |
| Full suite | Passed, 142 tests in 23 files (`npm test -- --run`) | AX-PR-001 |
| Strict TypeScript | Passed after Task 016B correction (`npm run typecheck`) | AX-PR-001 |
| Production build | Passed after Task 016B correction, 65 modules transformed (`npm run build`) | AX-PR-001 |
| Runtime smoke | Vite started on `http://127.0.0.1:5186/`; root returned HTTP 200 | AX-UX-001 |

## Known-context checks

- Root Site filter `SITE-A` changes the represented Work Orders count from 2,000 to 560 while the breadcrumb remains Work Orders.
- Prospective `Work Orders → SITE-A → WAPPR` with `Work Type = CM OR EM` returns 178 matching records and keeps WAPPR uncommitted.
- A filtered SITE-D `Work Type = PM` context removes the otherwise qualifying Work Mix finding without changing detector thresholds.
- Record preview remains capped at 20 rows. CSV record count equals the exact filtered aggregate. The report displays filters and uses filtered populations/charts.

Mock mode demonstrates the contract with fictitious data. The current-user marker does not enforce real Maximo authorization, and AX-DEP-001 remains unvalidated in MAS.

## Task 016A manual-acceptance correction

Manual acceptance reported that Work Type was not visible. Real-browser reproduction at 1366×768 confirmed the complete data path was already working: adapter discovery returned `CM 1,215`, `PM 564`, and `EM 221`, and the Work Type fieldset existed in the DOM. The two-column grid placed the seventh fieldset at vertical coordinates 760–893 while the viewport ended at 768; the sticky action footer began at 651 and obscured the lower rows. Testing Library could still locate and click the off-screen checkbox, so the Task 016 interaction test did not detect the browser-layout defect.

Task 016A uses a four-column desktop grid, places Work Type in the first visible row using the shared filter-dimension contract, widens the dialog, reserves a stable scrollbar gutter, and retains two/one-column responsive fallbacks. No Work Type value is hardcoded into React. After correction, real-browser geometry at 1366×768 showed Work Type at 197–391, all seven fieldsets above the action footer, and `scrollHeight = clientHeight = 627`.

Regression coverage now queries the rendered **Work Type** fieldset and asserts its adapter-discovered CM/PM/EM options and counts. Adapter coverage independently verifies the same discovery result. The prospective `SITE-A → WAPPR` context with `CM OR EM` continues to produce 178 matching Work Orders without committing WAPPR.

## Task 016B manual-acceptance correction

Manual acceptance after Task 016A showed that placing Work Type in the first row of a general four-column grid was still not a sufficiently clear or durable user-visible treatment. The implementation is now restructured rather than merely reordered: Work Type has a dedicated full-width primary filter group immediately below the dialog explanation, while the six **Explore By** dimensions remain in a separate grid. Work Type remains Filter-only. Its options continue to come from the bounded adapter discovery operation; React supplies no `PM`/`CM`/`EM` fallback. A regression test substitutes `CUSTOM-A` and `CUSTOM-B` adapter values to prove the UI does not assume synthetic codes.

Real headless Edge verification measured the Work Type group fully above the sticky action bar without scrolling at both 1366×768 (group y=190–264; action bar starts at y=651) and 1600×900 (group y=254–328; action bar starts at y=718). Root discovery displayed `CM 1,215`, `PM 564`, and `EM 221`, totaling 2,000. A browser-driven end-to-end check applied `CM OR EM`, committed SITE-A, inspected WAPPR prospectively, and returned 178 matching Work Orders while the committed breadcrumb remained `Work Orders → Site: SITE-A`.

The Mock Adapter's three Work Types are deterministic development data. A future Real Maximo Adapter must discover values configured and authorized in the customer's environment. Customer-specific Work Type-to-analytical-category mapping remains a separate future configuration concern and was not introduced by this correction.
