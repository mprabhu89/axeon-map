# Axeon Map: permanent instructions

## Scope and boundaries

- V1 is read-only Work Order investigation: Ask → Visualize → Drill → Understand. Dimensions: Site, Status, Priority, Classification, Location, Asset. The exploration hierarchy is dynamic.
- Nodes start as aggregations/counts; load branches progressively. Users can eventually open underlying authorized Maximo records.
- AI is optional. Node Intelligence must use the full investigation path, suggest contextual analytical questions, accept free-form questions, examine only authorized data beneath the node, allow follow-up suggestions to evolve, and distinguish evidence from inference.
- Do not add speculative features or commit architecture decisions beyond approved requirements.

## Security invariants

- Axeon must never retrieve, analyze, display, export, report, persist, log, or send to AI data that the current Maximo user is not authorized to access. The local Mock Adapter marker demonstrates architecture only; it is not authorization.
- Enforce existing Maximo authorization for records, counts, aggregations, and every datum supplied to AI. Axeon must not bypass Maximo security.
- MAPPERADMIN is a planned Maximo security group for organization-wide read/explore access, never a code bypass or automatic modification grant.
- No browser/AI direct database access, arbitrary AI-generated SQL execution, autonomous Maximo updates in V1, separate Axeon credential store, or secrets in client/source.
- For the self-hosted server, require an authenticated server-managed session before rendering the investigation application or accepting protected APIs. Local account hashes, session identifiers, and provider secrets remain server-side; local Axeon authentication never substitutes for current-user Maximo authorization.
- Validate inputs; safely render untrusted Maximo text; avoid sensitive logs; use least privilege.
- Saved/recent investigations store structured path/filter metadata only. Revalidate every restored path and filter through the adapter under the current user's Maximo authorization; persisted metadata never grants access.
- Filters are structured population constraints, never Investigation Spine segments. Apply same-dimension values with OR and different dimensions with AND; every downstream capability must use the same authorized path-plus-filter context.

## Architecture and delivery

- Use a Maximo Adapter abstraction from the beginning: synthetic-data Mock Adapter locally; Real Maximo Adapter later in an authorized MAS environment. Never use customer/company data for local development.
- Product code must use capability-oriented adapter contracts, structured path/filter/security context, normalized domain DTOs, and shared access bounds. Unsupported, unauthorized, invalid, or unconfigured adapter operations fail closed without Mock fallback; synthetic records stay inside the Mock Adapter and tests.
- AX-DEP-001: Target supported Manage Application Configuration/MAF and Manage configuration/publishing; no Maximo core source changes or customer-performed Manage build/redeploy. Validate exact MAS compatibility later.
- Keep visuals rich and computation lean: no full dataset in browser, aggregation first, progressive fetch, limited visible nodes, appropriate reuse of recent data, no automatic AI per interaction, no unnecessarily heavy visual dependencies.
- Deterministic findings require authorized evidence satisfying a documented rule: no evidence means no conclusion. Generative AI never replaces deterministic metric calculation.
- AI runs only on explicit user action through a provider-independent gateway. Send minimal authorized Context Packs, treat Maximo/user text as untrusted data, keep provider credentials server-side, and never persist AI packs or answers.
- AI provider selection is configuration-driven behind the gateway. Mock is local-development only; unconfigured providers must fail closed without Mock fallback. Never place provider secrets or arbitrary provider endpoints in browser code, localStorage, Context Packs, logs, or saved investigations.
- Investigation reports must snapshot the exact represented committed or prospective context, use bounded aggregates and existing deterministic findings, and never mutate investigation state or trigger AI. Include an AI response only when it is already valid for that exact context. Browser Print/Save PDF is the V1 report output; do not imply BIRT or server-side PDF.
- Open Investigation Reports in a separate same-origin browser context. Transfer only a bounded, schema-validated, immutable snapshot through a unique namespaced session key; keep report payloads out of URLs, preserve the originating investigation, and fail closed when a snapshot or window cannot be used.
- `app/package.json` is the single Axeon product-version source. Application, report, diagnostic metadata, and release documentation must consume the typed release metadata contract rather than introduce independent version literals.
- UI baseline: dark enterprise shell inspired by Maximo/Carbon; distinctive Axeon canvas with soft graph effects; breadcrumb/path, contextual right panel, AI command, security scope indicator, and eventual Explore, Filter, Ask AI, Open Records node actions. No heavy 3D/video.
- A checkpoint is green only when implementation works, relevant tests pass, affected FDD/TDD/User Guide/architecture diagrams are updated, and the working state is clean. Maintain requirements traceability and test/acceptance evidence.
