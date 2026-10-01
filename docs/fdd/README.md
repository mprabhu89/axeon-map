# Functional Design Document

## Product intent

Axeon Map supports read-only visual investigation of Maximo Work Orders: Ask → Visualize → Drill → Understand. AI is an optional enhancement; basic exploration must work without it.

## V1 exploration

- Explore Site, Status, Priority, Classification, Location, and Asset in a dynamic, user-driven hierarchy.
- Show aggregated nodes and counts first; load deeper branches on request. Users can eventually open underlying authorized Maximo records.
- Provide a breadcrumb/investigation path, contextual right-side panel, security scope indicator, and AI command capability.
- Selected-node actions eventually include Explore, Filter, Ask AI, and Open Records.

## Node Intelligence

Every eligible node will eventually offer an information action. Analysis uses the complete investigation path and may examine authorized drill-down data beneath the selected node. It suggests context-appropriate analytical questions, accepts user free-form questions, and may adapt follow-up suggestions to findings. AI output distinguishes evidence from inference.

## Security and access

Normal users see and analyze only Maximo-authorized data, including counts and aggregations. MAPPERADMIN is a planned Maximo security group for organization-wide read/explore access, subject to Maximo configuration; it grants no automatic modification rights. V1 never autonomously updates Maximo.

## Visual baseline

Dark enterprise language; Maximo/Carbon-inspired outer shell; distinctive Axeon investigation canvas; soft graph/node effects; no heavy 3D/video.

## Current local shell (Task 002)

The prototype displays a Work Orders root and four first-level Site nodes with synthetic counts. Each node has a visible, accessible Node Intelligence information control. Selecting a node updates its name, count, and path in the contextual panel. The breadcrumb area currently shows Work Orders. The security scope text, suggested questions, question field, selected-node actions, and AI command area are visual previews; they do not perform authorization, analysis, filtering, navigation, or data access.

## Current dynamic exploration (Task 003)

The local prototype now calculates its root and child counts from 24 fictitious Work Orders. From the root or a selected group, users choose any unused dimension among Site, Status, Priority, Classification, Location, and Asset. Selecting a generated group adds its dimension and value to the investigation path and filters subsequent aggregations to the matching records. The same dimension is not offered again in that path. Back removes the deepest selected path segment; Reset Investigation returns to the root. The breadcrumb and contextual panel show the full selected path. At most 16 child groups are visible; an overflow notice appears if more exist.

The information control remains on each visible node and selects its context. Suggested questions, free-form question input, Filter, Ask AI, Open Records, and the AI command area remain non-functional previews. The scope indicator is display text; no Maximo authorization occurs in the local prototype.

## Current mock environment (Task 004)

The same exploration flow now runs over 2,000 deterministic fictitious Work Orders. Aggregations and counts reflect the complete selected path; the UI receives only the current count and bounded child groups. The screen shows a brief loading state while the adapter resolves a request. If it fails, the screen shows a safe message and Retry, without exposing internal errors. The local scope indicator still does not represent enforced Maximo authorization.

## Investigation Spine correction (Task 004A)

The visual map preserves the selected path from Work Orders to the current investigation context as an **Investigation Spine**. Only the active level fans out into candidate child groups. Earlier sibling groups disappear when their selected node becomes part of the spine. Historical spine nodes, the current active node, and candidate children have distinct visual states; every visible node retains its information control. Back shortens the selected spine by one level and restores the previous level's candidates. Reset returns to Work Orders without an active dimension, matching the existing reset behavior. The 16-child limit still applies to the current candidate fan.

## Contextual question suggestions (Task 005)

The Node Intelligence panel shows up to four deterministic suggested investigation questions for the selected node and its complete path. The Task 005A correction prioritizes operational guidance beyond the available Explore By breakdowns. Each question carries a subtle analytical-lens label. The frozen lenses are **Risk, Backlog & Aging, Repeat Work, Process Bottleneck, Reliability, Work Mix, Data Quality, and Optimization**. Three or four relevant lenses appear for a context; the selected Site, Status, or Priority is incorporated where useful. Suggestions ask what may need investigation, without asserting that a risk, trend, bottleneck, or failure exists. They are previews only: no analytical answers or AI calls. The labelled free-form question input remains visible and disabled.

## Inspect Before Explore (Task 006)

A candidate click temporarily selects it for inspection. The panel shows its count, prospective path, and Node Intelligence questions; the committed breadcrumb and Investigation Spine do not change. **Explore** explicitly commits the candidate, makes it the current context, and then offers unused Explore By dimensions. Selecting a different loaded sibling replaces only the temporary selection. A committed spine node may be inspected without rewriting the investigation. Back acts on committed path levels, while Reset clears both the path and temporary inspection. Only the active level's bounded candidate fan is displayed.

The target remains supported Maximo Manage Application Configuration/MAF and Manage configuration mechanisms, including Application Configuration publishing, without Maximo core source changes or a customer-performed Manage build/redeploy. This deployment target has not been technically validated in MAS.

## Contextual record preview (Task 007)

**Open Records** retrieves a read-only preview for the Context Panel's exact context: the committed current node, or a selected candidate's prospective path before Explore. The preview shows that path, the total matching Work Orders, and at most 20 individual records per request with only identifier, Site, Status, Priority, Classification, Location, and Asset. A missing value displays a neutral placeholder. Opening and closing the preview do not alter inspection, the active dimension, or the committed Investigation Spine. Loading, a safe error message, Retry, and Close are available. Record navigation, Maximo write, and analytical findings are not implemented. Mock mode demonstrates the bounded adapter boundary only; actual Maximo authorization remains future work.

## Record pagination and spreadsheet export (Task 007A)

The preview uses fixed 20-record pages and shows “Showing X–Y of Z” with Previous, Page X of Y, and Next. Previous is disabled on page 1; Next is disabled on the final page. Opening a different context starts at page 1. Changing pages leaves investigation and inspection unchanged and does not reload aggregates.

**Download Spreadsheet** is a separate explicit action for the preview's exact committed or prospective path. The local Mock Adapter exports all matching fictitious records in Excel-compatible UTF-8 CSV with the seven existing fields. The file has a safe context-derived `.csv` name, proper CSV quoting, and spreadsheet formula protection. Opening a preview or changing pages does not trigger export. Production XLSX, Maximo authorization, export-size policies, and server-generated files require later MAS validation.

## Saved and Recent Investigations (Task 008)

**Save Investigation** appears when the committed Investigation Spine extends beyond Work Orders or active filters make the root context meaningful. Users may edit a concise default name. Saving captures only the committed structured path, active filter metadata, local ID, name, and timestamps; a selected but uncommitted candidate and all preview, page, node-layout, and record data are excluded. **Saved & Recent** lists named contexts separately from up to five recent meaningful contexts. Saved items require a second explicit confirmation to delete. Recents are deduplicated by path plus filters. Unfiltered root alone is not saved.

Resume validates each path segment and filter value through current bounded adapter operations before replacing the committed context. If validation fails, the current investigation remains intact and a generic error appears. Restored investigations do not reopen record preview or restore temporary candidate inspection. Local browser persistence is a development convenience, not Maximo authorization or the final enterprise persistence design. A future Real Adapter must re-query data under the current user's Maximo authorization on every resume.

The record preview now uses a compact download icon with the accessible name **Download spreadsheet**. It invokes the same explicit CSV export as Task 007A.

## Work Management analytical evidence foundation (Task 009)

The local 2,000-record fictitious Work Order environment now carries work type, report date, current status date, target start/finish, and actual start/finish behind the Mock Adapter. These fields prepare Backlog & Aging, Repeat Work, Process Bottleneck, and Work Mix investigation, plus basic asset/work history for future Reliability analysis. A fixed reference date and deliberate subsets provide repeatable test evidence. No analytical findings, answers, new Explore By dimensions, preview columns, export columns, or other user-visible behavior are added. Future analysis must use only evidence authorized for the current user and investigation context.

## Deterministic Work Management analytics (Task 010)

A service-level engine derives structured, evidence-traceable findings for Backlog & Aging, Repeat Work, Process Bottleneck, and Work Mix from the Mock Adapter's analytical evidence operation. It uses rule thresholds and an adapter-provided reference time and work-mix baseline. A detector may return no finding. Task 010 did not connect this capability to the UI; Task 011 now shows its findings without adding charts, AI answers, dimensions, or changed preview/export fields. A future Real Adapter must restrict evidence and baseline to the current user's Maximo authorization before analysis.

## Contextual Operational Findings (Task 011)

The Context Panel's Node Intelligence section now displays qualifying **Operational Findings** from the deterministic Task 010 rules for its active context. A committed node uses its committed path; an inspected candidate uses its prospective path without changing the breadcrumb or Investigation Spine. Only that selected context is analyzed. The Work Orders root does not trigger startup analysis. Findings show lens, rule-based severity, metric, relevant population/baseline, threshold, and a small evidence disclosure. The existing **Questions to Investigate** and disabled free-form question preview remain separate. Findings are calculated patterns, not Axeon AI explanations.

Loading and failure stay within the finding section; Retry uses the current context. A successful empty result says only that there are no qualifying findings under the currently implemented deterministic rules. An older context response cannot replace a newer one. Open Records continues to preview the broader Context Panel context, not a finding-specific record subset. Saved/Recent Investigations persist path/filter metadata only and re-run analysis after resume. The local Mock Adapter does not enforce Maximo authorization; the future Real Adapter must authorize evidence and baseline before analysis.

## Advanced Work Management Intelligence (Task 012)

Operational Findings now cover all eight approved lenses through the same deterministic model. Reliability identifies sustained reactive asset history; Risk identifies concentrations of high-priority unresolved work that are both aged and overdue; Data Quality quantifies missing asset references in reactive work; Optimization identifies high-reactive contexts where work is concentrated on a small asset subset. No lens produces a conclusion without sufficient evidence. Findings describe supported patterns and investigation opportunities without predicting failure, asserting safety/financial/regulatory exposure, prescribing operational changes, or inventing failure, SLA, labor, material, or cost evidence.

The four new lenses use the same committed/prospective context, asynchronous loading, stale-response protection, evidence disclosure, and neutral empty state as Task 011. Results are ordered deterministically by supplied severity and stable lens/rule order. The panel initially shows up to five findings; when more qualify, **View all findings** reveals every result. Existing questions, exploration dimensions, record preview, CSV export, and Saved/Recent behavior are unchanged.

## Grounded Axeon AI foundation (Task 013)

Suggested questions are now explicit controls, and the free-form question input accepts a normalized question of up to 500 characters. Submitting either uses the Context Panel's exact context: the committed current node or an inspected candidate's prospective path. Asking never commits a candidate or changes the Investigation Spine. The existing **Ask AI** node action moves keyboard focus to the question input; the global bottom command bar remains future-only.

Each explicit request creates a minimal Context Pack containing the active structured path, context label/type and population, current deterministic findings with concise aggregate evidence, development scope marker, question, reference time, and grounding provenance. It excludes raw Work Orders, previews, CSV data, saved/recent entries, unrelated candidates, browser storage, credentials, and arbitrary UI state.

The local deterministic Mock AI Provider returns a structured answer, finding references, suggested next checks, limitations, grounding status, and internal provider metadata. A grounded answer restates only supplied findings and metrics. A limited-evidence answer refuses unsupported conclusions, including root cause, and a no-finding answer states only that current rules did not qualify. Responses are visually separate from authoritative Operational Findings. Loading, generic failure, Retry, context/question stale-response protection, and resume clearing are local to the AI area. The Mock Provider validates architecture and UX; it is not a real LLM.

## Configurable AI provider foundation (Task 014)

AI provider selection is represented by safe deployment configuration behind the existing Axeon AI Gateway. The local default is AI enabled with the deterministic Mock AI Provider. The provider registry identifies IBM watsonx, Azure OpenAI, OpenAI, AWS Bedrock, Google Vertex AI, and a compatible enterprise provider as **Not configured**; none is executable, selectable, or presented as connected. A compact **AI Provider** settings/status dialog shows the current provider and honest integration status without exposing credential inputs.

When AI is disabled, or when configuration references an unconfigured provider, AI question actions are unavailable and no answer is fabricated. Operational Findings, Questions to Investigate, map exploration, Open Records, CSV export, and Saved/Recent Investigations continue to work. There is no silent fallback from a named production provider to Mock. Provider choice does not alter the Context Pack, structured response, grounding, authorization, or investigation contracts.

## Contextual Investigation Report (Task 015)

**Investigation Report** is available from Node Actions for the represented Work Orders root, committed current node, or inspected prospective candidate. The report snapshots that exact context. Opening, closing, retrying, or printing it does not commit a candidate, alter the Investigation Spine, change inspection, open/close records, save an investigation, or change analytical state.

The dedicated light report preview uses an executive overview, evidence-backed KPI cards, contextual aggregate charts, deterministic Operational Findings with rule evidence, optional exact-context Axeon AI interpretation, suggested next investigation areas, and limitations/provenance. It clearly labels measured evidence separately from AI interpretation. An existing AI response is included only when its captured path exactly matches the report path; report generation never calls AI. A context with no qualifying findings shows the same bounded neutral meaning used in Node Intelligence.

Charts use actual bounded adapter aggregates and structured finding evidence. Ranked bars show contextual distributions; composition charts show supported work mix, repeat/reliability work type, data completeness, backlog, bottleneck, risk, or concentration evidence; comparison charts appear only when a finding provides a baseline. A time trend is omitted because the current report contract has no defensible aggregated time series. Unsupported KPI/chart content is omitted rather than shown as zero or placeholder material.

**Print / Save PDF** invokes browser print capability. Print styling targets A4, hides application chrome and actions, uses a light report surface and professional margins, keeps section headings with the beginning of their content, and protects KPI, chart, finding, AI, and closing evidence blocks from inappropriate splits. Compact limitations/provenance content may use available space on the preceding page. Users should disable the browser's optional **Headers and footers** setting for a clean PDF. This V1 local implementation is not BIRT, a server-generated PDF, or a validated Maximo reporting deployment.

## Contextual Investigation Filters (Task 016)

The existing **Filter** node action opens a staged filter dialog for Site, Status, Priority, Classification, Location, Asset, and Work Type. Work Type is shown as an immediately visible primary filter group; it is not an **Explore By** dimension. **Apply Filters** replaces the active filter set in one state change. **Cancel** leaves it unchanged. **Clear Filters** removes it, and each filter chip can remove one dimension. All values, including Work Types, are discovered through bounded adapter aggregation for the represented root, committed, or prospective path. Local synthetic data returns `PM`, `CM`, and `EM`; a future Real Adapter must return customer-configured values available within the current authorized scope.

**Explore By** navigates by adding a selected node to the Investigation Spine. **Filter** constrains the represented Work Order population and never adds a spine segment. Values inside one dimension use OR; dimensions use AND. Back retains filters, while Reset clears path, temporary inspection, expansion, and filters. Counts, candidate groups, Inspect → Explore, Operational Findings, questions, Axeon AI, records, pages, CSV, persistence, and Investigation Report use the same path-plus-filter context.

Saved and Recent Investigations persist minimal structured path and filter metadata. Filter-only root contexts may be saved. Older filterless entries remain readable. Resume revalidates path and filter values through the current adapter scope; stored metadata grants no access.

## Investigation continuity and separate report surface (Task 019)

Choosing **Investigation Report** now opens a dedicated same-origin report tab or window while the original Axeon workspace remains on its exact committed path, prospective inspection, filters, record page, findings, and eligible AI response. The browser decides whether the separate context appears as a tab or window. A blocked opening shows a safe retry message in Axeon and never replaces or resets the original page.

The report is an immutable point-in-time snapshot of the represented context. A unique opaque report ID is the only report-specific value in the URL. The bounded report model is stored in the opened context's namespaced session storage with schema version 1, a 30-minute retention limit, a 256 KiB size limit, and a maximum index of six snapshots. Separate IDs prevent concurrent reports from overwriting one another. Missing, malformed, expired, oversized, or unknown-version snapshots show a closed report-unavailable state and never fall back to root. Closing attempts to close the Axeon-opened tab; if browser policy prevents this, the report tells the user to close the tab manually.

The standalone report retains Print / Save PDF, A4 print rules, exact-context filters, findings, optional exact-context AI interpretation, provenance, and the centrally sourced Axeon version. Opening or closing a report does not create a Saved or Recent Investigation.

## Acceptance status

Local synthetic exploration, shell behavior, and service-level deterministic analytics are implemented. See [requirements traceability](../requirements/traceability.md) and [test evidence](../test-evidence/README.md).

## V1 security and data protection (Task 020)

The V1 invariant is that Axeon must never retrieve, analyze, display, export, report, persist, log, or send to AI data the current Maximo user is not authorized to access. Local Mock behavior proves interfaces only and never claims Maximo enforcement. The product uses authorization-first adapter DTOs, bounded capability requests, explicit export, metadata-only Saved/Recent persistence, validated report snapshots, minimum AI Context Packs, safe text rendering, formula-safe CSV, and generic user errors. Local structured logs contain only allowlisted diagnostic metadata.

## Maximo Adapter independence (Task 017)

All existing user workflows consume a capability-oriented read-only adapter port. Requests carry the structured committed/prospective path, active filters, adapter security context, and operation-specific bounds. The local Mock Adapter is active; a Real Maximo Adapter port is explicitly not configured and returns a safe unavailable result. Product behavior never silently substitutes synthetic data. No user-visible workflow changed.

Filter values, including Work Type and all six exploration domains, remain adapter-discovered. PM/CM/EM are local synthetic values and are not universal product assumptions. Customer work-type interpretation for planned/reactive analytics requires later authorized configuration and validation.

## Product identity and approved UX refinement (Task 018)

Axeon Map previously established its central release-identity mechanism in Task 018. The current development identity is `1.1.0-dev`, derived by the application and report from the typed contract backed by package metadata; its prerelease suffix does not indicate a formal release.

The Open Records modal uses a dependency-free top-right close icon with the accessible name **Close**, title tooltip, native button behavior, initial focus, Escape closure, and focus return to **Open Records**. Other accepted dialogs retain their textual Close controls.

## V1.1 architecture baseline (Task 021)

The V1.1 development baseline preserves all current investigation behavior while planning a self-hosted Axeon server for configuration, authentication, object governance, data access, and AI-provider integration. Work Orders, Service Requests, Incidents, and approved custom objects will be governed by an administrator-managed registry of approved profiles rather than arbitrary database objects. The registry determines what Axeon exposes; Maximo security determines what a user may access.

Mandatory authentication is required before network data APIs are deployed. Read-only Db2 or SQL Server access will be a restricted server-side connection only and does not replace Maximo authorization. The current Mock Adapter and synthetic data remain the local development path. Task 021 adds no server, database connection, authentication, administration UI, or visible workflow change.

## Secure application server foundation (Task 022)

The V1 UI remains unchanged. Axeon now has a separate Node.js/TypeScript server foundation that serves the built browser application and exposes a versioned health endpoint. It intentionally exposes no Work Order, object, analytics, export, report, AI, Maximo, or database API. Future data APIs are contractually protected by authenticated-principal and authorization interfaces and must fail closed until authentication is implemented.

The server owns validated non-secret configuration and a server-owned approved object-profile registry. Profiles support Work Orders, Service Requests, Incidents, Assets, and approved custom objects through allowed metadata only; they do not expose arbitrary SQL or grant Maximo permissions.
