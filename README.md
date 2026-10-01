# Axeon Map

Axeon Map is a lightweight, read-only, AI-assisted visual investigation application intended to run inside IBM Maximo Manage. Its core interaction is **Ask → Visualize → Drill → Understand Maximo data**.

## V1 scope

- Work Orders only; explore by Site, Status, Priority, Classification, Location, and Asset in a dynamic hierarchy.
- Start with aggregated nodes and counts; fetch deeper data when a user drills down, and eventually open underlying Maximo records.
- Offer optional Node Intelligence with contextual analytical questions and user free-form questions. Basic exploration works without AI.
- Respect the current user's Maximo authorization for records, counts, aggregations, and AI analysis. V1 remains read-only.

## Core principles

- Use a Maximo Adapter abstraction with a synthetic-data Mock Adapter for local development and a future Real Maximo Adapter for an authorized MAS environment.
- Keep the browser lean: aggregation first, progressive loading, limited visible nodes, appropriate reuse of recently explored data, and AI only on request.
- Target a browser-based Maximo Application Framework role-based application in Maximo Manage through supported Application Configuration/MAF and Manage configuration/publishing, without Maximo core source changes or a customer-performed Manage build/redeploy. Exact MAS compatibility remains to be validated.
- Keep documentation and verification evidence aligned with each green checkpoint.

## Current development status

The local React/TypeScript/Vite shell explores 2,000 deterministic fictitious Work Orders in [app](app/). The asynchronous Mock Maximo Adapter returns bounded aggregates and 20-record preview pages. Choose a dimension, inspect a candidate, then use **Explore** to add it to the committed Investigation Spine. **Open Records** previews the panel's current or prospective context without committing it; Previous/Next navigate bounded pages. **Download Spreadsheet** explicitly exports all matching mock records as UTF-8 CSV. Node Intelligence shows deterministic findings, questions, and local Mock AI responses. Back and Reset Investigation manage the committed path. Loading and safe retry states cover adapter failures. Maximo connectivity, real authorization, real provider-backed AI, navigation to Maximo records, and remote data loading are not implemented. Exact MAS compatibility and production XLSX remain unvalidated.

To run locally, use Node.js 22 or another version supported by the installed Vite release:

```powershell
cd app
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm test` and `npm run build` to verify the checkpoint.

Task 008 adds a lightweight Saved/Recent Investigations library. Task 016 extends its localStorage metadata to the committed path plus active filters and validates both through the adapter before resuming. A selected but uncommitted candidate is excluded. Record Preview uses a compact, accessible download icon while keeping the same explicit CSV export.

Task 009 adds fixed-date Work Management evidence and controlled fictitious patterns behind the Mock Adapter for future deterministic analysis. The six exploration dimensions, Record Preview, CSV columns, and UI are unchanged. No analytical findings or answers are displayed.

Task 010 established a service-level deterministic analytics engine for aging approvals, repeated reactive asset work, long scheduled PM stages, and reactive work mix. The Mock Adapter supplies context-filtered evidence and a local baseline; real Maximo authorization remains future work.

Task 011 displays qualifying deterministic **Operational Findings** in Node Intelligence for the active committed or inspected prospective context. Compact evidence disclosure, neutral empty state, loading, and Retry are local to that section. Suggested questions and free-form question preview remain separate; no AI explanation or real Maximo authorization is implemented.

Task 012 extends the same structured engine and Node Intelligence presentation to Reliability, Risk, Data Quality, and Optimization. Findings remain rule-based and evidence-limited. The panel initially shows at most five findings with an explicit **View all findings** control; no result is silently discarded.

Task 013 adds the first explicit question-and-answer flow in Node Intelligence. Suggested and free-form questions build a minimal Context Pack from the active committed or prospective path and its existing structured findings, then call a provider-independent gateway backed locally by a deterministic Mock AI Provider. Responses identify evidence, limitations, grounding status, and suggested next checks. No real LLM, network AI endpoint, provider credential, AI SDK, or Maximo write is present.

Task 014 adds configuration-driven provider routing and a development-only **AI Provider** status surface. The local Mock provider is the only active executable adapter. IBM watsonx, Azure OpenAI, OpenAI, AWS Bedrock, Google Vertex AI, and a compatible enterprise provider are represented as future, not-configured integrations and cannot be selected or called. AI can be disabled without affecting deterministic findings, exploration, records, exports, or investigations. Production credentials and provider communication must remain behind an approved server-side boundary; no production provider is connected.

Task 015 adds a dedicated **Operational Investigation Report** for the exact root, committed, or prospectively inspected context. The report uses bounded contextual aggregates and existing deterministic findings to produce evidence-backed KPIs, ranked distributions, composition charts, baseline comparisons, rule evidence, and optional exact-context Axeon AI interpretation. Opening it does not commit candidates or change investigation state, and it never calls AI or retrieves raw record populations. **Print / Save PDF** uses browser printing with report-specific light print styles; BIRT, server-side PDF, and validated Maximo report deployment are not implemented.

Task 016 makes **Filter** functional for Site, Status, Priority, Classification, Location, Asset, and Work Type. Filters constrain the represented population without adding Investigation Spine nodes. Values within one dimension use OR; dimensions combine with AND. The same structured path-plus-filter context drives map counts, analytics, AI Context Packs, records, pagination, CSV export, saved/recent investigations, and reports. Filter values are discovered through bounded adapter operations; React does not load the synthetic dataset.

Task 017 hardens the Maximo boundary with a capability-oriented, normalized, fail-closed adapter contract. Local composition explicitly selects the active Mock Adapter; the nonexecuting Real Maximo Adapter port is not configured and never falls back to synthetic data. Structured path, filters, adapter security context, centralized access bounds, safe errors, and adapter capabilities now propagate through product operations. Real Maximo authorization, API/Object Structure discovery, work-type analytical mapping, and MAS validation remain future authorized-environment work.

Task 018 establishes the development release identity **Axeon Map 1.0.0-dev**. `app/package.json` is the controlled version source and a typed release contract supplies the subtle application footer, Investigation Report provenance footer, and safe support metadata. The prerelease suffix means this build is not the formally released 1.0.0 product. Open Records now uses a compact accessible Close icon while preserving Escape and focus return.

Task 019 opens each **Investigation Report** in a separate same-origin browser tab or window. The click creates the report surface synchronously, then transfers a bounded, schema-validated, immutable snapshot through namespaced `sessionStorage`; the URL contains only a unique opaque report key. Each report remains independent of later investigation changes. Missing, corrupt, expired, oversized, or unsupported snapshots fail closed, and a blocked popup leaves the active investigation untouched with a safe retry action. Browser Print / Save PDF and the central release-metadata contract remain unchanged.

Task 020 adds V1 local security/data-protection hardening: the authorization-first invariant is documented across data retrieval, analytics, report, export, persistence, logging, and AI; structured browser diagnostics use an allowlist; malformed persistence/report state is rejected safely; and CSV formula-like cells are neutralized. See [security documentation](docs/security/axeon-security-and-data-protection.md). These are local controls, not a claim of Real Maximo authorization, MAS compatibility, production audit logging, or production AI integration.

Task 021 advances the development baseline to **1.1.0-dev** without changing the V1 investigation experience. It documents the planned self-hosted server boundary for mandatory authentication, configuration, approved object profiles, server-side adapters, restricted read-only database connectivity, and provider integration. The current Mock Adapter and synthetic dataset remain active locally. See the [V1.1 architecture baseline](docs/architecture/v1.1-architecture-baseline.md).

Task 022 adds the local Node.js/TypeScript server foundation in `app/server`. Run `npm run build`, then `npm run server:start` from `app` to serve the built UI and `GET /api/v1/health` on `127.0.0.1:3000`. It provides no data APIs, authentication, database/Maximo connection, or provider calls.

## Release versioning

Axeon releases use `MAJOR.MINOR.PATCH[-PRERELEASE]`. Development uses `-dev`, release candidates use forms such as `-rc.1`, and a formal release omits the suffix. Promote a future release by changing the version in `app/package.json` through the normal package-version workflow so its lockfile mirror stays aligned; product code must not duplicate the literal.

Documentation sources are under [docs](docs/).

## Local authentication (AX-023)

The self-hosted Node server now requires a local Axeon account. It remains localhost-only by default and does not connect to Maximo. Create the first administrator once in PowerShell, keeping the password only in the current process:

```powershell
cd app
$env:AXEON_BOOTSTRAP_ADMIN_USERNAME = 'axeon.admin'
$securePassword = Read-Host 'Initial Axeon administrator password' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$env:AXEON_BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
npm run build
npm run server:bootstrap-admin
Remove-Item Env:AXEON_BOOTSTRAP_ADMIN_PASSWORD
npm run server:start
```

Open `http://127.0.0.1:3000`, sign in, and use **Sign out** to end the server session. The ignored local account store contains scrypt hashes rather than plaintext passwords. There is no self-registration, SSO, database connection, real-data API, or Maximo authorization in this checkpoint. Local Axeon authentication never grants Maximo data access.

To create a further local account without an Administration Portal, an existing local administrator must provide their own current credentials only in the shell process, then run `npm run server:create-user`:

```powershell
$env:AXEON_ADMIN_USERNAME = 'axeon.admin'
$adminSecurePassword = Read-Host 'Administrator password' -AsSecureString
$adminBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecurePassword)
$env:AXEON_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminBstr)
$env:AXEON_NEW_USERNAME = 'axeon.user'
$newSecurePassword = Read-Host 'New user password' -AsSecureString
$newBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newSecurePassword)
$env:AXEON_NEW_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($newBstr)
npm run server:create-user
Remove-Item Env:AXEON_ADMIN_PASSWORD,Env:AXEON_NEW_PASSWORD
```

Use `AXEON_NEW_ROLE=user` by default or `administrator` only when appropriate. Clear the administrator and new-account password variables immediately after the command. This CLI is the local-development account-management mechanism, not the future Administration Portal.
