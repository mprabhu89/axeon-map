# Task 015 — Modern contextual Investigation Report

## Automated verification

`report/buildInvestigationReport.test.ts` verifies the React-independent report contract, root/committed contexts, bounded aggregates, evidence-backed KPI/chart derivation, all requested controlled analytical contexts, no-finding behavior, exact/stale AI handling, scope/provenance and untrusted text normalization. `App.report.test.tsx` verifies root and prospective report entry, unchanged breadcrumb/inspection, no record or analytical reload, exact-context AI inclusion, stale AI exclusion, AI-disabled and unconfigured-provider behavior, browser print action, print-only markup and safe React rendering.

| Check | Result | Related requirements |
| --- | --- | --- |
| Focused Task 015 tests | Passed, 13 tests in 2 files | AX-FR-REP-001, AX-NFR-REP-001 |
| Full test suite | Passed, 127 tests in 20 files (`npm test -- --run`) | Task 001–015 GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` and production build type phase | AX-PR-001 |
| Production build | Passed, `npm run build`; 63 modules transformed | AX-PR-001, AX-DEP-001 target |
| Local runtime/browser | Vite on `http://127.0.0.1:5185/`; headless Edge CDP verification passed | AX-FR-REP-001 |

## Known-context report evidence

| Context | Evidence-backed report result |
| --- | --- |
| Work Orders root | 2,000 total; Site, Status and Priority distributions; no raw records or startup analytics requested |
| SITE-D | 280 total; 85.36% reactive, 71.80% authorized baseline, 30.54% top-three concentration; status/priority/classification, work-mix, baseline and concentration charts |
| A-PUMP-01 | Repeat Work and Reliability findings; 15 repeat reactive orders; CM/EM composition totals 15 |
| SITE-E | Data Quality finding; 13 of 145 reactive orders missing asset reference, 8.97%; missing/populated composition 13/132 |
| SITE-F | Risk finding; 9 of 16 high-priority unresolved orders qualify; qualifying/remainder composition 9/7 |
| SITE-A → WAPPR | Backlog & Aging finding; 29 aged approvals and contextual Priority/Classification/Asset distributions |
| SITE-B | No qualifying findings; only total-population KPI and contextual aggregate charts; no unsupported KPI/finding chart |

## Data-access and state evidence

- Each report requests at most three `explore` distributions with `maxGroups=8` and the `current-user` scope marker.
- Report generation does not call `previewRecords`, `exportRecords`, `analyticalEvidence` or an AI gateway and contains no raw synthetic Work Order IDs.
- Candidate inspection, committed breadcrumb, record preview state and analytical request count remain unchanged.
- AI interpretation appears only for an already-ready response whose originating path exactly matches. Disabled, unconfigured, absent or stale responses produce no AI section.
- React renders normalized text without raw HTML or `dangerouslySetInnerHTML`. Reports are not stored in localStorage or Saved/Recent metadata.

## Codex browser and print verification

Headless Microsoft Edge opened the local application, selected Site, inspected SITE-D and opened **Investigation Report** without Explore. Verified:

- report path `Work Orders → Site: SITE-D` while the committed breadcrumb remained `Work Orders` and the prospective candidate stayed selected;
- KPI cards for 280 total, 85.4% reactive and 30.5% top-asset concentration;
- six charts: Status, Priority, Classification, work-mix composition, authorized-baseline comparison and workload concentration;
- deterministic Work Mix and Optimization findings;
- no AI section before explicit AI execution;
- visible **Print / Save PDF** action.

The report screenshot was visually inspected for hierarchy, whitespace, readable typography and chart presentation. Print-media emulation verified that application chrome and the report toolbar are hidden, the overlay becomes static, and the light report background remains printable. Temporary browser profiles, scripts and screenshots were removed afterward.

Browser Print/Save PDF is the V1 local output. No BIRT, server-side PDF, production Maximo reporting integration, real Maximo authorization or authorized MAS deployment validation was performed.

## Task 016B A4 pagination correction

Manual acceptance found that the existing A4 declaration and card-level `break-inside` rule did not prevent a section heading from being left at the foot of one page while its first content began on the next. The print contract now combines the heading with its following content through `break-after: avoid-page` / `break-before: avoid-page`, including legacy `page-break-*` fallbacks. KPI groups and individual KPI, chart, finding, AI, next-area, and limitations blocks are protected from inappropriate internal page splits. The closing section and compact Limitations & Provenance block are not forced to start a new page, so they can use sufficient remaining space.

Automated print-contract tests verify the A4 rule, heading grouping, card protections, absence of a forced page break on report sections/limitations, and hiding of application chrome and report controls. Headless Edge generated a four-page SITE-D PDF from the real report with six charts and two findings using CSS A4 sizing, background printing, and browser headers/footers disabled. DOM/jsdom assertions cannot prove physical pagination; final A4 Print Preview remains a manual acceptance check. Browser-generated date, URL, and page chrome are controlled by the browser, so users should disable **Headers and footers** when saving a clean PDF.
