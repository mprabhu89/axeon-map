# Test and acceptance evidence

Record relevant test results and acceptance evidence for each implementation checkpoint here. Link evidence to stable IDs in the [requirements traceability matrix](../requirements/traceability.md).

Task 009 evidence: [Work Management analytical data foundation](task-009.md).
Task 010 evidence: [Deterministic Analytics Engine I](task-010.md).
Task 011 evidence: [Contextual Operational Findings](task-011.md).
Task 012 evidence: [Advanced Work Management Intelligence](task-012.md).
Task 013 evidence: [Grounded Axeon AI foundation](task-013.md).
Task 017 evidence: [Maximo-ready adapter and security boundary hardening](task-017.md).
Task 018 evidence: [Product identity, release readiness, and UX hardening](task-018.md).

## Task 002 local shell

Automated checks in `app/src/App.test.tsx` cover shell/root rendering, node selection updating the contextual panel and path, and accessible Node Intelligence controls for every displayed node. Build and TypeScript checks run through `npm run build`; `npm run typecheck` can run separately. Record the execution results for this checkpoint below after verification.

| Check | Result | Related requirements |
| --- | --- | --- |
| Shell, root, and scope text render | Passed, `npm test` (Task 002) | AX-UX-001, AX-FR-EXP-001 |
| Node selection updates panel and path | Passed, `npm test` (Task 002) | AX-UX-001 |
| Information controls have accessible names | Passed, `npm test` (Task 002) | AX-FR-AI-002 (visual control only) |
| TypeScript and production build | Passed, `npm run typecheck` and `npm run build` (Task 002) | AX-PR-001 |
| Local launch | Passed, Vite started at `http://127.0.0.1:5173/` and returned HTTP 200 | AX-UX-001 |

## Task 003 dynamic exploration

`app/src/model/exploration.test.ts` checks Site and Status aggregation, filtering before a second dimension, and order-independent path results. `app/src/App.test.tsx` checks calculated root rendering, generated-node selection and full path, used-dimension exclusion, Back, Reset, and accessible Node Intelligence controls.

| Check | Result | Related requirements |
| --- | --- | --- |
| Focused model and UI tests | Passed, 9 tests in 2 files (`npm test`) | AX-FR-EXP-001/002/003/005, AX-FR-AI-002, AX-UX-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local runtime smoke check | Vite started and root page returned HTTP 200 | AX-UX-001 |

## Task 004 mock adapter and synthetic environment

`app/src/model/exploration.test.ts` checks the typed Mock Adapter, 2,000-record deterministic fixture, varied and path-filtered aggregates, order-independent filtering, and bounded responses with no raw-record field. `app/src/App.test.tsx` covers aggregate-only adapter injection, loading/selection paths, accessible Node Intelligence controls, Back, Reset, and a safe adapter error with Retry recovery.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 12 tests in 2 files (`npm test`) | AX-AR-001, AX-FR-EXP-001/002/003/005, AX-FR-AI-002, AX-NFR-PERF-001, AX-UX-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started; page and entry module returned HTTP 200 | AX-UX-001 |

The local mock does not validate Maximo authorization. AX-FR-SEC-001 remains unverified until authorized MAS integration exists.

## Task 004A Investigation Spine correction

`app/src/App.test.tsx` verifies that Work Orders stays visible after drill-down, the selected root-to-context spine persists through Site → Priority → Classification, historical siblings disappear, Back shortens the spine and restores prior candidates, Reset returns to root, information controls remain accessible, and the candidate fan still stops at 16 groups. The existing adapter and exploration tests continue to pass.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 14 tests in 2 files (`npm test`) | AX-FR-EXP-002, AX-FR-AI-002, AX-NFR-PERF-001, AX-UX-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started; page and entry module returned HTTP 200 | AX-UX-001 |

## Task 005 contextual question suggestions

`app/src/model/questionSuggestions.test.ts` covers root, Site, Status, Priority, Classification, Asset, and Location wording; multi-level Status → Priority context; used-dimension exclusion; and the four-question bound. `app/src/App.test.tsx` verifies the displayed root, Site, Status → Priority, and Asset suggestions and the labelled, disabled free-form input. Existing exploration and Investigation Spine tests remain in the suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 24 tests in 3 files (`npm test`) | AX-FR-AI-002/003, AX-FR-EXP-002, AX-UX-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started; page, entry module, and suggestion module returned HTTP 200 | AX-UX-001 |

## Task 005A operational investigation guidance

`app/src/model/questionSuggestions.test.ts` checks stable IDs, frozen lens metadata, four-question limit, root and Site guidance, Status → Priority and Site → Status → Priority path wording, Asset repeat-work/reliability questions, no dimension-label restatements, and interrogative wording without fabricated findings. `app/src/App.test.tsx` verifies the displayed root, SITE-A, SITE-A → WAPPR → Priority 1, Status → Priority, and Asset contexts; lens labels; and the labelled disabled free-form input. Existing adapter, exploration, Back/Reset, and Investigation Spine checks remain in the suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 23 tests in 3 files (`npm test -- --run`) | AX-FR-AI-002/003/004, AX-FR-EXP-002, AX-UX-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started at `http://127.0.0.1:5173/`; root page returned HTTP 200 | AX-UX-001 |

This checkpoint verifies question previews only. It provides no analytical findings, AI answers, or Maximo authorization.

## Task 006 Inspect Before Explore

`app/src/App.test.tsx` verifies that candidate inspection updates the prospective context and Node Intelligence without changing the committed breadcrumb or spine; Explore commits it; selecting a different sibling replaces inspection without an adapter reload; spine inspection does not rewrite history; Back acts on committed levels; Reset clears both states; candidate and Explore controls are focusable native buttons. Existing 16-group, adapter/error/retry, Investigation Spine, and analytical-lens tests remain in the suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 26 tests in 3 files (`npm test -- --run`) | AX-FR-MAP-004/005, AX-FR-AI-002/003/004, AX-NFR-PERF-001 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started at `http://127.0.0.1:5173/`; root page returned HTTP 200 | AX-UX-001 |

AX-DEP-001 is recorded as a deployment target; no authorized MAS validation was performed.

## Task 007 contextual record preview

`app/src/data/recordPreview.test.ts` verifies that the Mock Adapter returns at most 20 records even when asked for more, reports the full matching count separately, and filters a multi-segment path before retaining preview rows. `app/src/App.test.tsx` verifies root “Showing 20 of 2,000,” prospective SITE-A “Showing 20 of 560,” committed SITE-A plus inspected WAPPR context, unchanged breadcrumb/inspection, no aggregate reload on opening, semantic rows, missing-field placeholders, loading, safe error, Retry, Escape Close, and focus restoration. Existing adapter, 16-group, Inspect Before Explore, Investigation Spine, and Node Intelligence tests remain in the suite.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 32 tests in 4 files (`npm test -- --run`) | AX-FR-REC-001, AX-NFR-PERF-002, AX-FR-MAP-005 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started at `http://127.0.0.1:5173/`; root page returned HTTP 200 | AX-UX-001 |

Mock mode demonstrates a bounded data boundary only. It does not enforce Maximo authorization or support Maximo record navigation. AX-DEP-001 remains unvalidated in MAS.

## Task 007A paginated preview and explicit CSV export

`app/src/data/recordPreview.test.ts` verifies first, second, final, and past-end bounded page offsets; independent total count; complete SITE-A export of 560 records plus header; and exclusion of other sites. `app/src/data/csvExport.test.ts` checks UTF-8 BOM, headers, commas, quotes, line breaks, spreadsheet-formula protection, and safe filename derivation. `app/src/model/downloadCsv.test.ts` checks explicit browser link creation and cleanup. `app/src/App.test.tsx` checks page ranges, page counts, disabled Previous/Next, context reset, unchanged inspection/spine, no aggregate reload, export not running on preview open, exact prospective-path export, and the existing loading/error/Retry flow.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 40 tests in 6 files (`npm test -- --run`) | AX-FR-REC-002/003, AX-NFR-PERF-002, AX-FR-MAP-005 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local launch | Vite started at `http://127.0.0.1:5173/`; root page returned HTTP 200 | AX-UX-001 |

The local export is CSV, not XLSX. Real Maximo authorization, enterprise export limits, production XLSX suitability, and MAS deployment remain unvalidated.

Manual local-browser verification (Task 007A audit): in Chrome, selected Site then inspected SITE-A while the committed breadcrumb stayed at Work Orders. The preview showed “Showing 1–20 of 560”; Next showed “Showing 21–40 of 560”; Previous returned to the first range. Download Spreadsheet produced `axeon-work-orders-site-site-a.csv` only after explicit activation. The file contained a header and 560 SITE-A rows, with no SITE-B rows. Installed Excel opened the CSV as 561 worksheet rows; the first header was “Work Order,” and both the first and last data rows showed SITE-A. This checks local CSV interoperability only, not production XLSX or authorized MAS export.

## Task 008 Saved/Recent Investigations and download icon

`app/src/model/investigationPersistence.test.ts` verifies minimal schema-versioned metadata, trimmed names, root rejection, local adapter round-trip, deletion, bounded/deduplicated Recents, and last-opened timestamps. `app/src/App.test.tsx` verifies committed multi-level save/resume, exclusion of an inspected candidate, reconstruction of the visible spine, no record-preview restoration, recent resume, two-step deletion, and non-destructive failure when an unavailable path is reopened. Existing exploration, adapter, record preview/pagination/export, and Node Intelligence tests remain in the suite. The export UI test verifies the compact SVG control retains the accessible name and calls the unchanged CSV path.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full automated suite | Passed, 49 tests in 7 files (`npm test -- --run`) | AX-FR-INV-001/002, AX-NFR-SEC-003, AX-FR-REC-003 |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build` | AX-PR-001 |
| Local browser scenarios | Passed, scenarios A–D in headless Chrome | AX-FR-INV-001/002, AX-FR-REC-003 |

Browser localStorage is a local-development persistence mechanism only. No real Maximo authorization or approved enterprise persistence was validated.

The final persistence test confirms that unexpected record-like properties in a stored entry are discarded before the repository writes metadata again.

Browser detail: named SITE-A → WAPPR reopened as a committed two-level spine. Saving with WAPPR merely inspected reopened only SITE-A. Six meaningful Site paths left through Reset produced five distinct Recents, and SITE-B resumed from that list. The compact icon had accessible name “Download spreadsheet” and downloaded the SITE-A CSV while the committed breadcrumb remained Work Orders. The CSV contained 560 SITE-A records plus a header; installed Excel opened it as 561 worksheet rows with SITE-A in the first and last data rows. The temporary browser profile and downloaded file were removed after verification.

## Later checkpoint evidence

- [Task 009 analytical data foundation](task-009.md)
- [Task 010 deterministic analytics](task-010.md)
- [Task 011 contextual findings integration](task-011.md)
- [Task 012 advanced Work Management intelligence](task-012.md)
- [Task 013 grounded Axeon AI foundation](task-013.md)
- [Task 014 configurable multi-provider AI gateway foundation](task-014.md)
- [Task 015 modern contextual Investigation Report](task-015.md)
- [Task 016 contextual investigation filters](task-016.md)
- [Task 017 Maximo-ready adapter and security boundary](task-017.md)
- [Task 018 product identity and release readiness](task-018.md)
- [Task 019 investigation continuity and release resilience](task-019.md)
- [Task 020 V1 security, data protection, logging and release-candidate hardening](task-020.md)
- [Task 021 V1.1 architecture baseline](task-021.md)
- [AX-022 secure application server foundation](task-022.md)
- [AX-023 mandatory authentication and protected sessions](task-023.md)
- [AX-024 synthetic database and Maximo authorization feasibility](task-024.md)
- [AX-025 secure connection configuration](task-025.md)
