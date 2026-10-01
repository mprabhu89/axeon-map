# Technical Design Document

## Established architecture

```text
Axeon Map
  ↓
Maximo Adapter
  ├── Mock Adapter (local development; synthetic data only)
  └── Real Maximo Adapter (future authorized MAS environment)
```

The target is a browser-based Maximo Application Framework (MAF) role-based application inside Maximo Manage, using supported APIs/configuration. Do not modify Maximo core. Routine installation and upgrades should use supported configuration/publish mechanisms without a Manage rebuild, redeploy, or server restart where technically supported. Exact MAS compatibility requires later validation in an authorized MAS environment.

## Data and performance constraints

- Do not load the complete Maximo dataset into the browser. Retrieve aggregations/counts first, fetch branches as requested, limit visible nodes, and reuse appropriate recently explored data.
- Do not run AI automatically on each interaction or use unnecessarily heavy visual dependencies.
- Local development uses synthetic/mock Maximo data only; no customer/company data.

## Current local frontend (Task 002)

`app/` uses React, TypeScript with strict checks, and Vite. `App` owns a selected node ID; `AppHeader`, `InvestigationCanvas`, `ContextPanel`, and `CommandBar` render the shell. `mockMaximoAdapter` implements a small `MaximoAdapter` interface that supplies five static synthetic nodes. It makes no network request and does not enforce or claim Maximo authorization. The boundary is intentionally minimal until authorized integration is designed. CSS variables in `styles.css` hold the visual tokens. Static CSS layout and connectors are used; there is no graph library or exploration engine.

Vitest, jsdom, and React Testing Library cover rendering, selection, and accessible information controls. No backend or AI integration exists.

## Current exploration model (Task 003)

`data/syntheticWorkOrders.ts` defines 24 fictitious Work Orders with IDs and all six exploration fields. `model/exploration.ts` contains pure path filtering, aggregation, dimension availability, and path formatting. `model/investigation.ts` contains the investigation state transitions. `model/useInvestigation.ts` connects those transitions to the React screen and memoizes the current parent/count/child view. Presentation components receive nodes and callbacks rather than synthetic records.

The local `MaximoAdapter` contract now exposes `count(path)` and `aggregate(path, dimension)`; `mockMaximoAdapter` implements both over the synthetic source. This synchronous contract is local to the prototype and does not specify a future Maximo API response shape. The Real Adapter and its authorization behavior remain unimplemented. The UI renders only the current parent and up to 16 immediate child groups. It does not fetch remote data or preload any real Maximo records.

## Asynchronous adapter and synthetic environment (Task 004)

`MaximoAdapter` now exposes one read-only `explore(request): Promise<response>` operation. The request carries the selected path, optional next dimension, maximum group count, and a `current-user` security-scope marker. The response carries `totalCount`, bounded `groups` of value/count, and `totalGroups`. DTOs are independent of future Maximo API payloads. The marker is preparation only; the mock does not authenticate or authorize, and a future Real Adapter must bind the request to Maximo's authenticated user and enforce Maximo security for counts and groups. No raw-record or arbitrary-query operation is available.

`syntheticWorkOrders.ts` deterministically generates exactly 2,000 fictitious records across six unevenly sized sites, four statuses, four priorities, four classifications, three locations per site, and repeatedly used assets. Site-specific weights vary status and classification distributions. Task 009 adds a small analytical evidence set behind the adapter; the original seven exploration/preview/export fields and their DTOs remain unchanged. The generator adds no personal or customer data. `mockMaximoAdapter` owns the records, filters by the full path, aggregates in one pass, sorts by count, caps responses at 16 groups, and caches responses by request. `main.tsx` supplies the mock adapter at the local composition root; the UI and investigation hook consume only the adapter contract and aggregate DTOs. In this local browser build the mock generator code runs in the browser, but no raw Work Order array is placed in React state or passed to presentation components.

`useInvestigation` requests data asynchronously when the view path or requested dimension changes, retains only the current aggregate response, ignores stale request completions, and exposes loading and safe error/retry states. Back and Reset use the existing investigation reducer. The Real Adapter, Maximo APIs, and true security enforcement remain future work.

## Investigation Spine presentation (Task 004A)

The investigation reducer retains the count captured when each child is selected, alongside the selected path. `useInvestigation` retains the root count and constructs spine nodes from those selected path segments; no additional adapter operation or raw Work Order data is needed. The canvas renders the root, selected ancestors, and only the current response's bounded candidate groups. A selected candidate appears in the active fan until another dimension is chosen, then becomes a spine node. Historical siblings are never retained. The rendered node count is bounded by path depth plus the root and at most 16 candidates. Back removes the deepest selected path segment and reopens that level's candidate dimension; Reset clears the path and dimension. The adapter contract and mock dataset are unchanged.

## Deterministic Node Intelligence suggestions (Task 005)

`model/questionSuggestions.ts` is a pure function independent of React, adapters, and AI services. It accepts the selected node's dimension and label plus the complete structured path. After Task 005A, explicit context templates return three or four `QuestionSuggestion` objects with stable template ID, analytical lens, and question text. The frozen lens union covers Risk, Backlog & Aging, Repeat Work, Process Bottleneck, Reliability, Work Mix, Data Quality, and Optimization. Status/Priority and Site/Status/Priority combinations receive path-specific wording. The contextual panel displays lens labels and question previews; the labelled free-form input stays disabled. This module makes no adapter request, analytical finding, LLM call, answer, or security decision. The future AI layer can consume these structured suggestions without being required for the deterministic baseline.

### Future analytical data requirements (design preparation only)

| Lens | Evidence eventually needed to answer questions |
| --- | --- |
| Risk | Priority, status, timing/targets, and appropriate exposure context |
| Backlog & Aging | Report, status, target, and actual date evidence |
| Repeat Work | Asset/location, historical Work Orders, and timing |
| Process Bottleneck | Status history and transition timing |
| Reliability | Asset, failure information, and work history |
| Work Mix | Work type and relevant classification/status information |
| Data Quality | Missing, null, or inconsistent required analytical attributes |
| Optimization | Evidence derived from multiple lenses |

Task 009 supplies the limited dates, work type, and asset history described below in mock data. Full status transitions, failure information, exposure context, and analytical findings are still absent. Suggestions remain questions, not claims or computed answers. A future authorized data source must supply evidence within the current user's permitted scope.

## Inspection and committed exploration state (Task 006)

`investigationReducer` owns only the committed path, selected counts, and active candidate dimension. `useInvestigation` separately stores a temporary inspected node ID. Clicking a candidate or spine node changes that ID only; the adapter request key remains based on the committed path and active dimension, so inspecting loaded siblings does not reload aggregates. Candidate DTOs already carry the prospective path used by the panel and deterministic question engine. **Explore** dispatches `explore-child`, appends the inspected candidate and count to the committed path, clears the active dimension and inspection, and exposes the remaining dimensions from the new current spine node. Back and Reset clear temporary inspection; Back changes committed history, and Reset returns to the root. The canvas still renders only the committed spine and at most 16 current candidates. The adapter contract and synthetic dataset are unchanged.

## Deployment constraint (AX-DEP-001)

Target supported Maximo Manage Application Configuration/MAF and Manage configuration mechanisms without modifying Maximo core source or requiring a customer-performed Manage build/redeploy. Application Configuration publishing is permitted. This local frontend change makes no MAS deployment claim; technical validation remains future work.

## Bounded record preview (Task 007)

`MaximoAdapter.previewRecords` is a second read-only operation. Its request carries a structured path, `maxRecords`, and the existing current-user scope marker; its response carries `totalCount` separately from up to 20 preview DTOs containing only the seven existing Work Order fields. The Mock Adapter filters by the full path, counts all matches, retains no more than the requested bounded subset, and maps only preview fields. It does not send the 2,000-record source to React. A future Real Adapter must enforce Maximo authorization before returning either individual records or the matching count. The marker is not an authorization implementation.

`useRecordPreview` snapshots the panel node's path when Open Records is invoked and independently manages async loading, stale-result cancellation, error, Retry, and Close. It never dispatches investigation actions or changes the aggregate request key. `RecordPreview` renders a semantic read-only table in a lightweight dialog, with a neutral placeholder for absent values and an accessible Close control. Close and Escape return focus to the invoking button when it remains mounted. No Maximo URL, record navigation, write operation, database access, or arbitrary query is present.

Future authorized flow: Axeon Map → Maximo Adapter → authorized bounded record retrieval → Record Preview → future Open record in Maximo. The last step and real Maximo integration are not implemented.

## Paginated preview and explicit CSV export (Task 007A)

`previewRecords` now takes a nonnegative `offset` as well as `maxRecords`. The hook requests 20 records at offsets `(page - 1) × 20`; the Mock Adapter filters/counts the full path but retains only the requested page. The response continues to carry `totalCount` separately. The UI derives page count from that total, bounds Previous/Next, resets to page 1 on a new context, and retries the same page after an error. Pagination changes only preview state, not the aggregate request key or Investigation Spine.

**Preview retrieval ≠ export retrieval.** `MaximoAdapter.exportRecords` is a separate, explicit read-only operation with a structured path and current-user scope marker. The Mock Adapter filters that path and produces a complete UTF-8 CSV string only when Download Spreadsheet is clicked. The response carries CSV content, count, MIME type, and a sanitized `.csv` filename; the browser download helper creates a Blob and temporary object URL. CSV cells are quoted, embedded quotes doubled, CRLF separates records, a UTF-8 BOM aids Excel, and leading spreadsheet formula characters are neutralized. No extra package or synthetic fields were added in Task 007A.

A future Real Adapter must enforce Maximo authorization for both page retrieval and export before returning data. It may impose configurable export limits or generate files server-side; that contract and production XLSX suitability need authorized MAS validation. Mock mode does not enforce real Maximo security. No direct database access, arbitrary query, browser API key, or write operation is introduced.

## Structured investigation persistence (Task 008)

`InvestigationPersistence` is a small repository interface for saved and recent paths. Its local adapter stores a schema-version-1 document in browser localStorage. A saved entry contains only a local ID, trimmed name, structured committed path, creation time, and optional last-opened time. A recent entry contains only a path and last-opened time; recent entries are deduplicated by structured path and capped at five. No candidate aggregates, records, preview state, coordinates, credentials, or AI content are serialized. Browser storage access stays behind the repository; this is local-development persistence, not an enterprise storage decision.

`App` composes the repository with the existing investigation hook. Save reads `state.path`, never the inspected node's prospective path. The lightweight library dialog handles names, Saved/Recent lists, explicit deletion confirmation, and a generic restore error. Reset records the meaningful path being left as recent. The record-preview download control changes only its presentation to an inline SVG icon; the CSV operation is unchanged.

`useInvestigation.restore` checks nonempty path structure, dimension availability, and each selected value by requesting bounded aggregates for the preceding validated path through the Maximo Adapter with the current-user scope marker. It collects counts and dispatches one reducer `restore` action only after every segment validates. Failure leaves committed state untouched. A generation token ignores stale validation after another investigation action. The restored path then follows normal adapter loading; candidate inspection, record preview, and page state are not restored. In a future MAS implementation, the Real Adapter must enforce current Maximo authorization for every validation and subsequent query. A saved path never carries entitlement.

Future persistence boundary: Axeon UI → Investigation Persistence Interface → localStorage adapter (local development). An approved Maximo/user-specific persistence mechanism may replace the adapter after authorized MAS validation. AX-DEP-001 remains mandatory.

## Work Management analytical evidence (Task 009)

`data/workOrderEvidence.ts` defines the small `WorkOrderAnalyticalEvidence` model independently of future Maximo API payloads. The synthetic record implements it with `workType` (`PM`, `CM`, `EM`), `reportDate`, `statusDate`, `targetStart`, `targetFinish`, `actualStart`, and `actualFinish`, in addition to the original seven fields. Dates use ISO UTC and a fixed `2026-09-01T00:00:00.000Z` synthetic reference; generation never uses wall-clock time or randomness. Site counts and existing exploration fields are retained. Work type uses uneven site-specific weights.

Lifecycle rules: report precedes current status date and any actual start; targets follow report, finish follows target start; WAPPR and WSCH have no actuals; INPRG has an actual start and no finish; COMP has actual start and finish no later than its current status date. Some WAPPR targets are null when no schedule is assigned. Target dates span both sides of the fixed reference. `statusDate` marks entry to the **current** status only; it is not a full transition history.

Controlled, fictitious subsets include aged SITE-A Electrical WAPPR approvals, recent reactive CM/EM work on A-PUMP-01, long-current-status SITE-C WSCH PM work, and a higher reactive share at SITE-D. These are fixture design signals for future testing, not application findings. Other records retain varied distributions. See [analytical architecture](../architecture/analytical-architecture.md) for evidence mapping and the future authorized flow. Detailed failure-code/problem/cause/remedy analysis, full status history, analytical calculations, and AI explanation are absent.

At Task 009, the `MaximoAdapter` contract was unchanged: aggregate results, 20-row previews, and explicit seven-column CSV export. Task 010 adds a separate analytical evidence contract for the service, with no React invocation. A future Real Adapter must implement authorized evidence retrieval. Maximo authorization must restrict records **before** any analytics are calculated; the `current-user` marker alone is not enforcement. Saved/recent localStorage remains structured path/filter metadata only. AX-DEP-001 remains a deployment target, with MAS compatibility unvalidated.

## Deterministic Analytics Engine I (Task 010)

`AnalyticalEvidenceAdapter` extends the existing read-only `MaximoAdapter` for service-level use. `analyticalEvidence({ path, securityScope })` returns evidence filtered to the exact structured investigation path, PM/CM/EM baseline counts from the adapter's authorized population, and a replaceable reference time. The local Mock Adapter uses the fixed Task 009 reference date and its fictitious population; it performs no real authorization. At Task 010 the UI did not invoke this operation; Task 011 now invokes it only for the active Node Intelligence context. Existing aggregate, preview, export, and persistence contracts are unchanged.

`analytics/analyzeContext.ts` orchestrates four pure detectors in `analytics/detectors.ts` and returns `AnalyticalFinding[]`. `analytics/finding.ts` defines stable rule/finding identifiers, lens, exact path, rule-based neutral severity, reference time, metric, affected/population counts, optional comparison, thresholds, and aggregate evidence metadata. Findings do not embed raw Work Orders or generated AI prose. Empty evidence or nonqualifying evidence returns `[]`. The rules and threshold/severity definitions are documented in [analytical architecture](../architecture/analytical-architecture.md).

The engine imports the adapter contract and transport-independent evidence type, never the synthetic generator. The Mock Adapter owns context filtering and baseline calculation. The future Real Adapter must apply Maximo authorization to **both** detailed evidence and baseline before analysis, and should prefer supported server-side/aggregate calculation for large populations. The current local browser build already contains the mock source for development. Task 011 requests evidence only for the active non-root context; Task 016 also analyzes a filtered root because that is a meaningful constrained context. Detailed failure, labor/material/cost, SLA, and AI explanation remain absent; exact MAS compatibility remains unvalidated under AX-DEP-001.

## Node Intelligence finding integration (Task 011)

`App` passes the selected `InvestigationNode.path` to `useOperationalFindings`. The same path is committed for the current spine node or prospective for an inspected candidate; no investigation reducer action occurs on inspection. The hook invokes `analyzeContext` only when the active path is non-root and the adapter implements `AnalyticalEvidenceAdapter`. This skips full-root startup analysis. Its effect key is the serialized structured path, so unrelated React renders and an Inspect → Explore transition with the same path do not repeat a request. No analytics run across sibling candidates. The hook retains no persisted or raw evidence.

The hook keeps asynchronous loading/error/results local to the findings section. A path-key check prevents old findings from displaying immediately after selection changes; effect cleanup prevents older completions from replacing newer results. Retry calls the service for the current path. A successful Saved/Recent resume increments an analysis revision so the restored path is re-evaluated even if it matches the previous active path. Aggregate exploration, record preview, and export operations remain independent and usable while analysis runs. The prior UI test adapters that implement only the base contract show an idle analytical state; the production Mock Adapter implements the analytical extension.

`components/OperationalFindings.tsx` renders Task 010 fields directly: lens, deterministic title, metric, population/baseline, thresholds, and rule-provided severity. Native `<details>` discloses structured rule, calculation, reference date, and aggregate evidence metadata; it does not expose raw Work Order rows or change Open Records filtering. A successful empty array produces a narrowly worded neutral state. `ContextPanel` retains the eight-lens deterministic question suggestions and disabled free-form input under a separate heading. No AI result or explanation is generated. The small CSS additions use the existing dark visual language, and no dependency or new deployment mechanism was introduced.

## Advanced Work Management Intelligence (Task 012)

### Evidence-gap review

| Lens | Existing evidence | Minimal addition | Out of scope |
| --- | --- | --- | --- |
| Reliability | Asset, CM/EM/PM work type, classification, report dates and 180-day history | None; existing A-PUMP-01 history spans three 60-day periods | Predicted failure, MTBF, root cause, failure probability, health score |
| Risk | Priority, lifecycle state, age, status and target dates | A small deterministic SITE-F INPRG subset is Priority 1, at least 60 days old and overdue | Safety, financial, regulatory or failure-probability claims; universal score |
| Data Quality | Asset/location/classification references plus lifecycle evidence | A small deterministic SITE-E reactive subset has a null asset reference | Treating valid lifecycle nulls as defects; broad Maximo data-governance assessment |
| Optimization | Work type, asset, context work mix and authorized baseline | None; existing SITE-D evidence supports reactive-work concentration | Prescriptive maintenance, staffing, inventory, spending or PM-frequency actions |

No field was added solely for Task 012. `asset` is nullable in analytical evidence; the aggregate adapter maps a missing value to the safe `(Unspecified)` group so exploration never produces a blank node. Preview and CSV columns remain unchanged. Exactly 2,000 records and all Task 009/010 ground truths are preserved.

### Advanced detectors

**Reliability**

- **Input:** CM/EM orders with a usable asset and report date in the exact authorized context.
- **Rule/threshold:** at least 35 reactive orders for an asset in the preceding 180 days, present in at least three distinct 60-day periods.
- **Output:** asset, reactive count, active periods, CM/EM mix, classification count and date range.
- **Limitations:** Work Order recurrence does not establish common failure mode, failed intervention, predicted failure or MTBF.
- **Supported interpretation:** sustained reactive-maintenance history warrants reliability investigation.
- **Unsupported interpretation:** the asset is failing or a particular corrective action is required.

**Risk**

- **Input:** Priority 1 orders that are unresolved, have no actual finish, have a report date and overdue target finish.
- **Rule/threshold:** report age at least 60 days, target finish before reference time, and at least eight qualifying orders in context.
- **Output:** qualifying/evaluated counts, percentage, oldest age, overdue count and priority boundary.
- **Limitations:** no safety, finance, regulation, consequence or probability evidence; no composite risk score.
- **Supported interpretation:** a concentration of high-priority unresolved, aged and overdue work represents observable operational exposure.
- **Unsupported interpretation:** safety or business harm will occur.

**Data Quality**

- **Input:** reactive CM/EM orders in context and their asset reference.
- **Rule/threshold:** at least eight missing/blank asset references and at least five percent of the evaluated reactive population.
- **Output:** field category, affected/evaluated counts and percentage.
- **Limitations:** this initial rule checks only asset completeness for reactive work. Legitimate null target/actual dates are excluded.
- **Supported interpretation:** missing asset coding may reduce supported work analysis.
- **Unsupported interpretation:** the whole record, process or Maximo environment has poor data quality.

**Optimization**

- **Input:** PM/CM/EM work mix and usable assets in context.
- **Rule/threshold:** at least 100 reactive orders, reactive share at least 80 percent, and the three highest-volume assets account for at least 28 percent of reactive orders.
- **Output:** top-three concentration, reactive population, context reactive share and contributing asset/count aggregates.
- **Limitations:** a concentration is an investigation opportunity, not an opaque score, causal diagnosis or prescribed intervention.
- **Supported interpretation:** focused investigation of a small asset subset may reveal an improvement opportunity.
- **Unsupported interpretation:** replace assets, change PM frequency, staffing, inventory or expenditure.

`analyzeContext` makes one authorized-evidence request and executes all eight pure detectors. It orders results by `elevated`, `attention`, then `info`, followed by a stable lens/rule order. Node Intelligence initially renders at most five and exposes **View all findings** when more qualify; results are never silently discarded. All detectors reuse `AnalyticalFinding`, deterministic reference time, exact path, thresholds, aggregate metadata, and the Task 011 stale-response guard. An empty result remains valid: no evidence means no conclusion.

## Axeon AI foundation (Task 013)

`ai/contextPack.ts` is a pure builder. It normalizes control whitespace, rejects empty questions and questions longer than 500 characters, copies the exact selected path and population, and converts current `AnalyticalFinding` objects into concise `AIContextFinding` values. Evidence keys are whitelisted per lens. Raw Work Order arrays, preview/export data, persistence entries, candidate collections and UI state are not accepted by the builder contract. Context strings remain plain data rendered by React; no HTML interpretation is used.

`ai/contracts.ts` defines provider-neutral `AIContextPack`, `AxeonAIRequest`, `AxeonAIResponse`, provider and gateway interfaces. Requests distinguish suggested and free-form interactions without model, temperature, token, endpoint or vendor fields. Responses contain an answer, stable finding references, next checks, limitations, `grounded` or `limited-evidence` status, and small internal provider metadata. Deterministic findings remain the source of counts, percentages, baselines, thresholds, qualification, and severity.

`ProviderIndependentAxeonAIGateway` depends only on `AxeonAIProvider`. `MockAxeonAIProvider` is deterministic and local: it formats facts already present in the Context Pack, refuses failure-cause questions when cause evidence is absent, and does not equate an empty finding list with absence of problems. It performs no network operation and is not a generative model. A production implementation must place credentials and vendor communication behind an approved server-side gateway; browser code must not call a public LLM endpoint or carry a provider secret.

`useAxeonAI` owns one active response area. It builds a Context Pack only on explicit submission and uses findings already loaded for the selected context. Request tokens and a serialized path/revision key discard responses for superseded questions or obsolete contexts. Retry rebuilds the current request from the current context. Reset, Back, sibling inspection, and successful Saved/Recent resume clear the answer; no Context Pack or response enters localStorage. AI failure is isolated from findings, exploration and records.

Untrusted Maximo-originating labels and user questions are data fields, not instructions. A future provider system prompt must explicitly ignore instructions embedded in those data fields. Authorization must filter evidence before deterministic analytics and Context Pack construction. The local `current-user` marker demonstrates intent only and is not real Maximo enforcement. AX-DEP-001 and authorized MAS/provider validation remain pending.

## Configurable provider routing (Task 014)

`ai/providerRegistry.ts` defines stable provider IDs (`mock`, `watsonx`, `azure-openai`, `openai`, `aws-bedrock`, `google-vertex`, `compatible`), safe display/capability/configuration metadata, and explicit `active`, `not-configured`, or `unavailable` status. It contains no endpoint, tenant, account, token, key, secret, password, or credential value. Only `mock` is active in local development. Capability metadata is deliberately limited to contextual question answering, structured responses, and enterprise-gateway support.

`AxeonAIConfiguration` contains only `enabled` and `selectedProviderId`; the local default is `{ enabled: true, selectedProviderId: 'mock' }`. `resolveAxeonAIRuntime` resolves configuration to the existing provider-independent gateway, selected provider metadata, and an `active`, `disabled`, or `unavailable` execution state. Its executable factory contains only the deterministic Mock provider. Disabled and unconfigured selections use a controlled unavailable provider that rejects execution; resolution never silently substitutes Mock.

`App` composes the resolved gateway at the application boundary. `useAxeonAI` and React presentation still depend on `AxeonAIGateway`, `AIContextPack`, and `AxeonAIResponse`; no component branches on vendor IDs. The runtime status only controls whether explicit AI execution is available and clears stale responses when provider availability changes. The development status dialog reads safe registry metadata and exposes no credential or endpoint entry. Provider adapters must translate the Axeon Context Pack to a provider request and map provider output back to `AxeonAIResponse` after the Axeon contract boundary.

Production architecture is Browser → Axeon AI Gateway boundary → approved server-side integration → configured customer-approved provider. Provider credentials and provider communication remain outside browser-delivered code. A future compatible provider means an administrator-configured adapter implementing an Axeon-supported compatibility contract: allow-listed destination, TLS, server-side credentials, and validated responses. Arbitrary user-supplied URLs are prohibited. Actual provider support and AX-DEP-001 compatibility remain subject to adapter implementation and authorized MAS validation.

## Investigation reporting foundation (Task 015)

`report/contracts.ts` defines the provider-independent `InvestigationReport` contract: normalized context/path, population, development scope/provenance, timestamps, evidence-backed KPI values, chart series, copied structured findings, optional exact-context AI interpretation, next areas and limitations. It contains no React state, DOM data, raw Work Orders, record preview rows, persistence entries, credentials, provider configuration or unrelated candidate branches.

`buildInvestigationReport` receives a context snapshot plus already-loaded deterministic findings and optional AI snapshot. It requests at most three context-appropriate dimensions through `MaximoAdapter.explore`, each capped at eight groups and marked `current-user`. It never calls `previewRecords`, `exportRecords`, `analyticalEvidence` or an AI gateway. This preserves aggregate-first behavior and avoids retrieving full record populations solely for visualization. Future Real Adapter aggregates must be authorized before return.

The builder derives KPI cards and finding charts only from exact-path findings. Aggregate charts use adapter-returned groups. Work Mix baseline, work-type composition, data completeness, exposure, backlog, bottleneck and concentration charts appear only when their required values exist. No time trend is produced because current findings do not expose an aggregated chronological series. Text is normalized into data fields and React renders it without raw HTML.

`useInvestigationReport` owns asynchronous loading/error/Retry and snapshots input without mutating investigation state. `InvestigationReport` renders the model in a full-page preview; `ReportChart` supplies accessible CSS ranked bars, SVG composition charts and percentage comparison bars without a charting dependency. Print CSS declares A4 with explicit margins, hides the surrounding app and controls, binds a section heading to its first content block, and applies modern `break-*` rules plus `page-break-*` fallbacks to KPI groups/cards, charts, findings, AI interpretation, next areas, and limitations. Closing content is not forced onto a new page, allowing compact limitations/provenance to use available space. Physical pagination remains a browser print-layout concern and requires Print Preview acceptance. The only PDF path is browser Print/Save PDF; no BIRT or server PDF exists.

`useAxeonAI` now retains the response's originating path in ready state. The report includes that response only when the path exactly equals the report path. It does not call AI, restore stale answers, or include provider internals. AI-disabled and unconfigured-provider modes produce the same deterministic report without an AI section.

## Security constraints

- Respect existing Maximo authorization for all returned records and aggregate results and for all AI inputs. MAPPERADMIN is handled by Maximo security configuration, never by a code bypass.
- No direct database access from browser or AI; no arbitrary AI-generated SQL execution; no autonomous V1 updates; no separate Axeon credential store; no secrets in client/source.
- Validate inputs, safely render untrusted Maximo text, avoid sensitive logs, and use least privilege.

## Contextual filtering architecture (Task 016)

`InvestigationContext` combines typed path segments, normalized `InvestigationFilter[]`, and the current-user scope marker. Filter dimensions are the six exploration dimensions plus Work Type. Filters remain separate from reducer path state and display strings. Normalization validates dimensions and values, deduplicates and orders them, and creates stable context keys.

The read-only Maximo Adapter DTOs for exploration, preview, export, analytical evidence, and filter discovery accept structured filters. `filterValues` is bounded; the Mock Adapter applies the represented path and all other filter dimensions while discovering one dimension. Matching uses OR inside one filter and AND between filters and path segments. React receives value/count DTOs only.

`FilterDialog` owns a draft copy, so checkbox changes trigger no aggregate or analytics update. Work Type is rendered in a dedicated first group, but its values and counts still come exclusively from `MaximoAdapter.filterValues`; React has no `PM`/`CM`/`EM` fallback. Those codes describe the current synthetic environment only. A future Real Adapter discovers authorized customer-configured Work Types dynamically; mapping customer Work Types to analytical categories is a separate future configuration concern. Apply commits one set, Cancel discards the draft, and Clear removes all filters. `useInvestigation` includes filters in request keys and refreshes root/spine counts while keeping only the active candidate fan. Back changes committed path only; Reset clears path and filters.

The same filters go to analytics, record preview, CSV export, Context Pack, persistence, and report. Findings and ready AI responses retain their originating filter context, preventing report or UI reuse across changed filters. Report aggregate calls include filters and accept AI only when both path and filter set match.

Local persistence schema 2 stores optional filter metadata beside path/name/timestamps. Schema 1 entries migrate as filterless investigations. Recents deduplicate by path plus canonical filters. Resume validates path segments and stored filter values through adapter operations before replacing state.

## Deferred design

The future Real Adapter API, AI integration, remote caching strategy, and deployment compatibility remain unvalidated. Record those decisions only when authorized implementation establishes them.

## Production-facing Maximo Adapter boundary (Task 017)

`MaximoAdapter` is the read-only capability port for exploration, bounded filter discovery, paged record preview, explicit export, analytical evidence, and reporting aggregates. `MaximoAdapterProfile` declares environment identity, honest availability, capabilities, and a security-context marker. `requestContext` creates copied structured path/filter/security DTOs; UI code creates no Maximo query syntax. Shared bounds are 16 exploration groups, 20 preview records, 50 filter values, three report dimensions, and eight report groups per dimension.

`MockMaximoAdapter` alone owns and iterates the 2,000 synthetic records. `RealMaximoAdapter` is a nonexecuting structural port: it contains no URL, Object Structure name, query, credential, network call, or Mock fallback and fails with `unavailable`. Configuration explicitly resolves `mock` or `real-maximo`. Capability checks fail closed before operations. Safe errors distinguish unavailable, unauthorized, invalid context, unsupported capability, transient, and unknown outcomes without retaining raw server details.

Normalization converts null/missing text, control characters, and numeric or string priorities into small Axeon DTOs before product use. Future Real payloads map behind this boundary. Work Type and all six exploration domains remain discovered values. PM/CM/EM comparisons exist only in mock analytical interpretation; a Real environment needs administrator-approved work-type-to-planned/reactive mapping before those rules can run.

The security marker is propagation, not authorization. The production order remains authenticated Maximo user -> Maximo authorization -> Real Adapter retrieval -> authorized Axeon DTOs. A mismatched/missing marker or invalid context fails closed rather than broadening to root. The reusable behavioral suite covers context, bounds, filters, prospective paths, pages, export, analytical evidence, capabilities, safe errors, and deterministic Mock behavior.

## Release metadata and safe diagnostics (Task 018)

`app/package.json` is the authoritative product-version source. `product/releaseMetadata.ts` validates its `MAJOR.MINOR.PATCH[-PRERELEASE]` shape and exposes immutable product name, version, and derived development/release-candidate/stable channel. `AppFooter`, the report model/builder/footer, and `support/diagnosticMetadata.ts` consume that contract. The package lock mirrors package metadata as generated dependency state; it is not an independent product configuration.

`SafeDiagnosticMetadata` contains only release identity, adapter ID/mode/availability, AI provider ID/execution status, and the adapter security-scope marker. It excludes endpoints, credentials, tokens, SQL, stack traces, raw context, customer configuration, and operational records. It has no network, storage, or logging behavior.

The report contract snapshots release metadata without altering report requests or A4 layout. Open Records keeps its existing modal and focus lifecycle while the Close control becomes a 38-pixel native icon button. Global focus-visible styling now includes interactive evidence `summary` elements.

## Separate report context and continuity (Task 019)

`useInvestigationReport` opens a report target synchronously from the Node Actions click, before `buildInvestigationReport` performs bounded asynchronous aggregate work. The opened target first renders `#/report/preparing/{opaqueId}`. Completion writes the finished `InvestigationReport` model to that target's same-origin `sessionStorage` and changes only that target to `#/report/ready/{opaqueId}`. React application state, browser history in the source tab, persistence, record preview, analytics, and AI state are untouched. A null `window.open` result produces a local retryable error and does not navigate the source tab.

`reportSnapshot.ts` owns schema validation and retention. Envelope schema version 1 includes a unique ID, created/expiry times, and the already-bounded report model. Keys use `axeon:report-snapshot:`; the index uses `axeon:report-snapshots:index`. Snapshots expire after 30 minutes, are capped at 256 KiB, and cleanup retains at most six entries. Validation rejects malformed JSON, unknown schema versions, invalid path/filter/domain values, missing report fields, disallowed raw-record/secret keys at any level, and oversized input. A failure renders no report and never broadens to Work Orders root.

`main.tsx` selects `ReportWindowApp` for the internal report hash and otherwise renders `App`; no router dependency or complete application shell is added. The report surface reads a single immutable snapshot and retains it in component state until refresh. A later change in another Axeon tab cannot alter it. Each report uses a different ID and target storage, so Report B cannot overwrite Report A. Close attempts `window.close()` and then provides a manual-close message when browser policy leaves the window open. Print and Task 016B A4 CSS are reused unchanged.

The URL contains mode and opaque ID only. It contains no path, filters, findings, evidence, AI answer, security marker, record data, credential, or token. The target opener reference is cleared on a best-effort basis after creation. This local same-origin transfer is not an authorization mechanism; the snapshot contains only information already represented and authorized by the report-building boundary.

### Session and refresh state classification

| State/workflow | Class | Current behavior |
| --- | --- | --- |
| Saved and Recent investigations | A — expected persistent | Structured path/filter metadata persists through the existing local repository only. |
| Report snapshot | B — expected session-only | Remains in its report tab's session storage until tab/session ends or 30-minute expiry; refresh revalidates it. |
| Committed path and active filters | C/D — transient and current limitation | Normal navigation is stable, but an unsaved active investigation resets on browser reload; full recovery is post-V1. |
| Prospective inspection | C — expected transient UI state | Never persisted or restored. |
| AI response | C — expected transient UI state | Exact-context only; never stored in Saved/Recent or restored after reload. |
| Record Preview and page | C — expected transient UI state | Opening/closing/reporting does not change it; reload does not restore it. |
| Multiple Axeon tabs | D — current limitation | Active UI state is independent. Saved/Recent browser storage is shared, without live cross-tab synchronization. |
| Report refresh | B/D | Works while the validated unexpired session snapshot exists; otherwise fails closed. |

## Task 020 security hardening

`support/logger.ts` is the local technical/security logging boundary. Its typed event metadata is allowlisted and rejects arbitrary payloads. It uses no network or persistence. Report snapshots, investigation persistence, unconfigured provider selection, unconfigured Real Adapter access, and CSV formula neutralization emit safe category-only events. Product errors retain typed safe adapter classifications and must never leak server details.

Threat model, data-protection lifecycle, logging policy, verification matrix, and residual risk register are maintained in `docs/security/`. The Real Adapter handoff checklist records the remaining authorized MAS validation work; it assumes no endpoint, Object Structure, credential, or Maximo API syntax.

## V1.1 server and object-registry baseline (Task 021)

The existing `MaximoAdapter` port remains the browser's data contract. A future self-hosted server will own authentication/session validation, server-only configuration/secrets, object-registry evaluation, authorization enforcement, adapter selection, normalized bounded DTO construction, approved export policy, and server-side provider gateway communication. The browser continues to construct structured investigation context only; it does not receive credentials, SQL, arbitrary endpoints, or Maximo-native payloads.

An object profile will define a stable ID, display metadata, enabled state, approved adapter source, normalized fields, permitted exploration/filter/record fields, bounded limits, analytical pack, and authorization policy reference. Future read-only Db2/SQL Server adapters must use reviewed parameterized server operations and least-privilege accounts, but must separately enforce the current user's Maximo authorization. Authentication middleware is mandatory before any network data route; SSO is an adapter at that boundary. See `docs/architecture/v1.1-architecture-baseline.md` for sequencing and unresolved decisions.
