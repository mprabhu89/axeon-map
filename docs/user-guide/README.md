# User Guide

## Intended use

Axeon Map will let authorized Maximo users investigate Work Orders through **Ask → Visualize → Drill → Understand**. The application is read-only in V1.

## Planned exploration

Users will navigate aggregated Work Order nodes by Site, Status, Priority, Classification, Location, and Asset. The dimension order can change with the investigation. Deeper data loads when requested, and users can eventually open underlying Maximo records.

An eligible selected node will offer information and contextual analytical questions based on its full investigation path. Users can ask their own free-form questions. AI may consider authorized data beneath that node and will identify evidence separately from inference. Core exploration will work without AI.

The planned interface includes a breadcrumb/path, contextual right panel, security scope indicator, AI command capability, and eventual Explore, Filter, Ask AI, and Open Records actions.

## Availability

### Current Prototype (Task 003)

Launch the local app with `cd app`, `npm install`, and `npm run dev`, then open the URL shown by Vite. Start at Work Orders. In the right panel, choose an **Explore by** dimension, such as Site or Status. Click a generated node to select that group; the right panel and top path update. Choose a different available dimension to see counts filtered by the selected path. Use **Back** to remove the deepest selected level, and **Reset Investigation** to return to Work Orders. A used dimension disappears from the available choices for that path.

The `i` control on each visible node selects that node and preserves its context in the panel. Counts are calculated from fictitious local Work Orders. The question input, suggested questions, Filter, Ask AI, Open Records, and AI command area remain previews only. The scope indicator is display text; no Maximo authorization or connection is active.

### Current Prototype update (Task 004)

The same steps now use 2,000 deterministic fictitious Work Orders, so displayed counts differ from the earlier prototype. A brief loading message may appear when changing levels. If exploration data cannot be loaded, use **Retry** in the contextual panel. The local app still does not connect to Maximo or enforce Maximo permissions.

### Investigation Spine (Task 004A)

As you drill down, the canvas keeps **Work Orders → each selected path node** visible. Only the current level shows candidate branches. For example, after choosing Site: SITE-A and then Priority, the canvas shows Work Orders above SITE-A and the Priority choices below it. Choose a Priority and then Classification to see Work Orders → SITE-A → that Priority above the Classification choices. Earlier Site and Priority siblings are removed from the canvas. Back removes the deepest selected node and restores the previous level's choices; Reset returns to the Work Orders root.

### Suggested questions (Task 005)

Select a node to see up to four operational investigation questions in Node Intelligence. Each has a small lens label, such as **Risk**, **Repeat Work**, or **Process Bottleneck**. Questions reflect the selected path and may ask whether aging, repeat work, or other conditions exist. They do not report detected findings. For example, Status: WAPPR → Priority: 1 asks whether Priority 1 work is aging in WAPPR, without assuming a Site was selected. The **YOUR QUESTION** field still shows where a free-form question will go. Suggestions are previews and the input remains disabled; no AI service is connected and no answer is produced.

The full exploration and AI behavior above remains planned.

### Inspect Before Explore (Task 006)

Choose an **Explore By** dimension, then click a candidate node. The candidate highlights and the panel shows its count, **Prospective Path**, and Node Intelligence questions. The breadcrumb and Investigation Spine still show the committed investigation. Click **Explore** in the panel to add that candidate to the spine; the next unused dimensions then appear. You can inspect another sibling before Explore without adding a history level. Clicking a spine node inspects it without changing the committed path. **Back** removes a committed level; **Reset Investigation** clears both the committed path and any inspected candidate. The question suggestions and free-form question field remain previews; no analytical answer is produced.

### Open Records preview (Task 007)

Select a node, then choose **Open Records** in the Context Panel. At the root, this previews the first 20 of the 2,000 fictitious Work Orders. On an inspected candidate, it uses the panel's **Prospective Path** even before Explore; the breadcrumb and spine stay committed as they were. The preview shows the represented path, total matches, “Showing X–Y of Z,” and a read-only table. Close it with the top-right **×** control or Escape; inspection remains intact and focus returns to **Open Records**. If retrieval fails, use **Retry record preview**. Missing values appear as a dash. This local preview does not open records in Maximo or enforce real Maximo permissions.

### Page navigation and CSV download (Task 007A)

The preview shows 20 records per page with **Previous**, **Page X of Y**, and **Next**. The range reads, for example, “Showing 21–40 of 560.” Opening a different node starts at page 1; paging does not change the inspected candidate or committed breadcrumb. The CSV download exports every matching mock Work Order for the preview's represented context. It occurs only on that action and is separate from paging. CSV is compatible with spreadsheet tools such as Excel. Real Maximo authorization and production XLSX have not been validated.

### Saved and Recent Investigations (Task 008)

After exploring at least one node, choose **Save Investigation** above the canvas. Edit the suggested name and save. The saved path includes only nodes already committed with **Explore**; any candidate currently inspected in the panel is excluded. Choose **Saved & Recent** to see named saved investigations and up to five recent paths. **Open** a saved item or **Resume** a recent path to rebuild its spine. Delete requires **Delete**, then **Confirm delete**. Reset records the meaningful path being left as recent. If a stored path is no longer available, Axeon shows a safe error and leaves the current investigation alone. Local browser storage contains investigation metadata only; it does not preserve Maximo access rights.

Record Preview now shows a compact icon button titled **Download spreadsheet**. Its CSV export and page controls work as before.

### Operational Findings in Node Intelligence (Task 011)

Choose an **Explore By** dimension and inspect a candidate. The **Operational Findings** section checks that candidate's **Prospective Path**; the breadcrumb and Investigation Spine remain committed until you choose **Explore**. With no candidate inspected, it checks the current committed node. For example, inspecting SITE-A can show an aged-approval pattern; inspecting SITE-D can show its reactive work share against the local baseline. Only the selected context is checked, and the Work Orders root does not start an analysis on launch.

Each qualifying finding shows its analytical lens, a count or percentage, a relevant population or baseline, a threshold, and rule-based significance. Choose **Evidence and rule** to expand the calculation details. These **Operational Findings are deterministic analytical results, not Axeon AI explanations**. **Questions to Investigate** remain suggested questions, and the **YOUR QUESTION** input remains a disabled preview. A finding reports only what its rule and evidence support; if none of the eight current rules qualifies, the panel says **No qualifying operational findings for this context**. That statement does not mean the workload has no problems.

The findings area may briefly show a checking message. If analysis fails, use **Retry operational findings**; exploration and Open Records remain usable. **Open Records** still previews the broader Context Panel path, not only the Work Orders counted in an individual finding. Saved/Recent Investigations store paths, then recalculate findings when reopened. This is a synthetic local preview: its scope indicator is not real Maximo authorization, and no AI service or Maximo connection is active.

### Advanced Operational Findings (Task 012)

The same section can now show **Reliability**, **Risk**, **Data Quality**, and **Optimization** findings when their documented evidence rules qualify. These mean, respectively: sustained reactive asset history; a concentration of high-priority unresolved, aged and overdue work; a qualifying level of missing reactive-work asset references; or high reactive work concentrated on a small asset subset. They do not predict failure, assert safety/financial/regulatory risk, judge the whole data environment, or prescribe a management action.

If more than five findings qualify, choose **View all findings**; choose **Show fewer findings** to return to the compact view. Ordering is deterministic, with rule-provided significance first. Missing exploration values appear as `(Unspecified)` rather than as blank nodes. Each advanced finding uses the existing **Evidence and rule** disclosure. No evidence means no finding, and the neutral no-finding message does not claim the operation is healthy or optimized.

### Grounded Axeon AI questions (Task 013)

Inspect or commit a node and wait for Operational Findings to finish. Select any **Questions to Investigate** item to submit it explicitly, or type up to 500 characters under **YOUR QUESTION** and choose **Ask Axeon**. The **Ask AI** node action focuses that input. The bottom command bar remains a future placeholder. Asking does not Explore a candidate, change the breadcrumb, open records, or perform a Maximo action.

The **AXEON AI** section shows the question, answer, evidence status, supporting finding lenses, suggested next checks, and limitations. **Grounded in current Axeon findings** means the answer uses supplied structured findings. **Limited evidence** means the Context Pack cannot support the requested conclusion. For example, a failure-cause question can acknowledge repeat work while refusing to invent why an asset failed. When no detector qualifies, the answer explains that this does not prove there are no other issues.

The displayed provider is a deterministic local mock, not a real LLM. It calls no external AI service. Errors remain inside the AI section and provide **Retry Axeon AI**; Operational Findings and map controls remain available. Switching context or asking a newer question prevents an older response from appearing under the new request. Saved/Recent Investigations never store answers and reopen with an empty AI response area.

### AI Provider status (Task 014)

Use **AI Provider** in the top bar to view the development provider status. Local mode shows **Mock AI Provider — ACTIVE**. The listed IBM watsonx, Azure OpenAI, OpenAI, AWS Bedrock, Google Vertex AI, and Compatible Enterprise Provider integrations show **Not configured** because Task 014 does not connect them. The status surface contains no credential fields and does not allow an unimplemented integration to be selected.

If generative AI is disabled or its selected provider is unavailable, Ask AI controls are disabled and the panel explains the state. Operational Findings, Questions to Investigate, exploration, records, export, and Saved/Recent Investigations remain available. The local Mock provider is a deterministic development tool, not a production LLM connection.

### Operational Investigation Report (Task 015)

Choose **Investigation Report** under Node Actions. The report opens in a separate browser tab or window; the browser chooses which presentation to use. At Work Orders root, the report represents the complete synthetic root scope. For a committed node it represents the committed current path. For an inspected candidate it uses the displayed **Prospective Path** without choosing Explore. The original Axeon tab remains unchanged, including its breadcrumb, inspected candidate, filters, records page, findings, and exact-context AI response.

The report opens in a dedicated light preview with the represented path, generated time, current scope marker, synthetic provenance, supported KPI cards, contextual charts, deterministic Operational Findings and rule evidence. Unsupported metrics are omitted. If the AXEON AI area already contains an answer for that exact path, the report includes it in a separately labelled interpretation section. Opening a report never asks AI, and an answer from another context is not reused.

Choose **Print / Save PDF** to open the browser print dialog. Select A4 and the browser's PDF destination where available. The print layout hides report actions, keeps report headings with their content, and protects KPI, chart, and finding cards from page splits. Disable the browser's optional **Headers and footers** setting to omit browser-generated date, URL, and page chrome. This is local browser printing, not a Maximo/BIRT or server-generated report. **Close** or Escape attempts to close the Axeon-opened report tab. If browser policy prevents scripted closing, close the tab manually and return to the unchanged Axeon tab.

If the browser blocks the separate report context, Axeon shows a concise error and **Retry Investigation Report**. The active investigation remains untouched. A report is a point-in-time snapshot: changing Axeon after opening Report A does not update Report A, and opening Report B creates a separate snapshot. Refreshing a report works while its short-lived session snapshot is present and valid; missing, expired, or corrupt report context shows a safe unavailable state rather than an unrelated root report.

### Contextual filters (Task 016)

Choose **Filter** under Node Actions at the root, a committed node, or an inspected candidate. **Work Type** appears immediately near the top of the filter dialog; it remains a Filter dimension and does not appear under **Explore By**. Select Site, Status, Priority, Classification, Location, Asset, or Work Type values and choose **Apply Filters**. Values in one dimension are alternatives (OR); selections in different dimensions all apply (AND). Checkbox edits remain staged until Apply.

In local synthetic mode the adapter discovers Work Types `CM`, `PM`, and `EM`. These are development data values rather than universal Maximo codes. A future authorized Real Adapter will expose the Work Types configured and available in that customer's Maximo environment.

Active filters appear separately below the Investigation Path. Use a filter chip to remove one dimension. **Clear Filters** removes all filters; **Cancel** closes without changes. Back keeps filters. **Reset Investigation** clears path and filters.

Filtered counts, candidate groups, Operational Findings, explicit AI requests, Open Records pages, CSV downloads, Saved/Recent Investigations, and reports share the same filtered population. Reports and record preview display active filters. Saving captures committed path plus filters and excludes an inspected candidate. Mock mode uses fictitious data and does not implement real Maximo authorization.

## Development data and security notice

This `1.0.0-dev` build uses fictitious local Work Order data, a development scope marker, and a deterministic Mock AI Provider. These disclosures do not represent real Maximo authorization, a production AI connection, or a formal release. Export, report, and Node Intelligence actions use the represented local context; browser storage retains only Saved/Recent metadata or short-lived report snapshots. Do not place customer credentials or production data in this local build.

## Product version

The bottom of the application shows **AXEON MAP � Version 1.0.0-dev**. Investigation Report provenance shows the same version. `-dev` identifies the current development build and must not be interpreted as a formal 1.0.0 release, IBM product identity, or Maximo certification.

In Open Records, use the top-right **�** control, whose accessible name and tooltip are **Close**, or press Escape. Inspection remains intact and focus returns to the Open Records action.
