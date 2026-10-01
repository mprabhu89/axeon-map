# Task 019 — Investigation continuity and release resilience

## Implementation evidence

- **Separate surface:** `main.tsx` renders `ReportWindowApp` for the internal report hash and the full `App` otherwise. The Node Actions click opens the report target synchronously before bounded asynchronous report preparation.
- **Exact snapshot:** the existing `InvestigationReport` contract captures the represented committed or prospective path, active filters, population, scope/provenance, reference time, findings, bounded aggregates, eligible exact-context AI response, and central `1.0.0-dev` release metadata.
- **Safe transfer:** each report uses a unique opaque ID and a schema-versioned envelope in that target's same-origin `sessionStorage`. The URL carries no report payload.
- **Validation/retention:** schema version 1, `axeon:report-snapshot:` namespace, `axeon:report-snapshots:index`, 30-minute expiry, 256 KiB maximum serialized size, and six-entry cleanup bound. Missing, malformed, expired, oversized, and unknown-schema snapshots fail closed.
- **Immutability:** the report reads one completed snapshot. Later source-tab changes and later report requests do not update or overwrite it.
- **Failure:** blocked `window.open` produces a safe source-tab error and explicit Retry. Preparation/storage failure moves the target to a safe error surface. Neither path changes investigation state.
- **Close/print:** Close attempts `window.close()` and gives a manual-close message if browser policy refuses. Print / Save PDF and Task 016B A4 CSS remain unchanged.
- **Persistence/security:** no report operation creates Saved/Recent metadata. No raw records, credentials, tokens, endpoints, SQL, or provider secrets are transferred or stored.

## Automated verification

| Check | Result | Traceability |
| --- | --- | --- |
| Focused Task 019 suite | Passed: 23 tests in 4 files | AX-FR-REP-002, AX-NFR-REP-002, AX-NFR-SEC-005, AX-NFR-REP-001 |
| Full regression suite | Passed: 174 tests in 30 files | Tasks 001–019 regression |
| Strict TypeScript | Passed: `npm run typecheck` | AX-PR-001 |
| Production build | Passed: 76 modules; JS 332.42 kB / 100.61 kB gzip; CSS 35.24 kB / 7.74 kB gzip | AX-PR-001 |
| Local runtime smoke | Vite root and internal report hash both returned HTTP 200 with the application mount | Development runtime only |

Focused coverage verifies synchronous separate-context creation, unchanged source state, root/committed/prospective/filter context, exact eligible AI transfer, popup failure and Retry, unique immutable reports, Saved/Recent integrity, standalone report loading/error/Close/Escape/Print, opaque URL construction, namespace, TTL, size and count bounds, schema failures, release version, and the existing A4 print contract.

jsdom validates browser API contracts through injected window targets and storage implementations. It cannot prove physical tab/window presentation, browser popup policy, scripted-close policy, or A4 pagination. Those remain manual browser acceptance items.

## Session and refresh audit

| State | Classification | Verified/current behavior |
| --- | --- | --- |
| Saved/Recent metadata | A — expected persistent | Existing local repository persists structured path/filter metadata; reports do not alter it. |
| Report snapshot | B — expected session-only | Refresh works in the report tab while the validated snapshot exists and is unexpired. |
| Committed path and active filters | C/D — transient/current limitation | Unchanged during report activity; unsaved state is not recovered after source-tab reload. |
| Prospective candidate | C — transient | Preserved while opening/closing reports; not persisted across reload. |
| AI response | C — transient | Included only when valid for the exact snapshot; not persisted or recovered. |
| Record preview/page | C — transient | Unchanged by report activity; not recovered after reload. |
| Multiple Axeon tabs | D — current limitation | Active state is independent; local Saved/Recent storage is shared without live synchronization. |
| Missing/corrupt report snapshot | D — safe limitation | Report fails closed; no root fallback or reconstruction. |

## Required manual browser acceptance

### Test A — committed context

1. Work Orders.
2. Site → SITE-A → Explore.
3. Priority → 1 → Explore.
4. Choose Investigation Report.
5. Confirm the report opens separately, the original remains `Work Orders → SITE-A → Priority 1`, the report shows that same path, and closing the report returns naturally to the unchanged Axeon tab.

### Test B — filters

1. Apply Work Type `CM` + `EM`.
2. Navigate to a context and open a report.
3. Confirm the report shows the `CM, EM` filter and the source tab retains it.

### Test C — snapshot immutability

1. Open Report A from SITE-A and leave it open.
2. In Axeon, Reset and navigate to SITE-D.
3. Open Report B.
4. Confirm Report A remains SITE-A and Report B remains SITE-D.

### Test D — Print

1. In either report choose Print / Save PDF.
2. Confirm A4 composition, version, section/card pagination, and hidden report controls.
3. Disable browser **Headers and footers** for the clean PDF.

### Test E — popup/open failure

1. Block or simulate blocked popups and choose Investigation Report.
2. Confirm Axeon remains unchanged and shows a safe Retry action.
3. Allow the popup and retry; confirm the exact requested report opens.

## Constraints and remaining validation

- Version remains `1.0.0-dev`.
- Real Maximo authorization, MAF popup/CSP/storage behavior, supported Manage publishing, and AX-DEP-001 remain unvalidated until authorized MAS testing.
- Browser Print / Save PDF remains the only output; no BIRT or server-side PDF was introduced.
- Full unsaved investigation recovery after source-tab refresh and live multi-tab synchronization remain post-V1 items.

**USER MANUAL TEST REQUIRED**
