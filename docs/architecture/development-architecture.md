# Development Architecture — Task 014

```mermaid
flowchart TB
    Browser[Local browser] --> UI[Axeon Map UI]
    UI --> Engine[Exploration Engine<br/>path + filter state and bounded view]
    UI --> Preview[Record Preview<br/>context snapshot and read-only table]
    UI --> Persistence[Investigation Persistence Interface]
    UI -->|active non-root or filtered-root context| Analytics[Deterministic Analytics Service]
    Persistence --> Local[localStorage adapter<br/>metadata only, local development]
    Persistence -. future, not implemented .-> Approved[Approved Maximo/user persistence]
    Engine --> Boundary[Maximo Adapter<br/>async read-only DTO contract]
    UI -->|bounded filter value discovery| Boundary
    Preview -->|bounded page request or explicit export| Boundary
    Analytics -->|analytical evidence request| Boundary
    Analytics --> Findings[Structured findings<br/>Node Intelligence only]
    Findings --> Pack[Minimal AI Context Pack<br/>explicit question only]
    UI -->|suggested or free-form question| Pack
    Pack --> AIGateway[Provider-independent AI Gateway]
    Config[Local AI configuration<br/>enabled + mock] --> Resolver[Provider Resolver]
    AIGateway --> Resolver
    Resolver --> MockAI[Deterministic Mock AI Provider<br/>ACTIVE · local, no network]
    Resolver -. future adapters, not configured .-> ApprovedAI[watsonx · Azure · OpenAI<br/>Bedrock · Vertex · Compatible]
    MockAI --> UI
    Boundary --> Mock[Mock Maximo Adapter]
    Mock --> Data[Synthetic Work Order Environment<br/>2,000 deterministic records]
    Boundary -. future, not implemented .-> Real[Real Maximo Adapter]
    Real -. future MAS validation .-> APIs[Maximo APIs]
```

The Mock Adapter runs locally in the browser build. It returns bounded aggregate DTOs, at most 20 preview records per page plus a separate total count, and an all-matching CSV only on explicit export. Analytical evidence is requested only for the active Node Intelligence context when required. Task 013 reuses the resulting structured findings and selected-node count; it sends no raw Work Order collection to the Mock AI Provider. The persistence interface stores committed path/filter metadata, not evidence, findings, Context Packs, answers, or UI state. The future Real Adapter, Maximo API path, enterprise persistence and approved server-side AI provider are not implemented. The scope marker does not enforce authorization in mock mode. AX-DEP-001 remains the deployment target.

Task 014 places a safe configuration and provider resolver between the provider-independent gateway and Mock. Only Mock is executable locally; every named production integration is not configured. Disabled/unavailable routing sends no provider request and does not change exploration or deterministic analytics. No provider secret, endpoint or response payload enters persistence. AX-DEP-001 remains unvalidated in MAS.

## Task 016 context extension

Task 016 extends the structured context and adapter DTOs with normalized filters. The same path, filters, and current-user marker feed map aggregates, analytical evidence, Context Packs, record pages, CSV export, persistence resume, and reports. `filterValues` returns bounded distinct values/counts; no raw dataset enters React. localStorage remains metadata-only.

## Task 017 adapter readiness

Task 017 adds explicit adapter configuration/resolution, capability and availability metadata, normalized domain DTOs, centralized bounds, typed safe errors, and a fail-closed Real Adapter port. The Real port executes no data access. The Mock Adapter remains the sole synthetic-data owner and the reusable contract suite is intended for future authorized Real Adapter validation.

## Task 018 release identity

Task 021 identifies the local V1.1 build as `1.1.0-dev` through package metadata and a typed release view. No build timestamp is generated, so builds and tests remain stable. Safe diagnostic metadata combines release, selected adapter profile, AI provider identity/status, and the development security marker without storage, logging, or transmission.

## V1.1 server development path

The current browser-only Mock path remains the local development baseline. A future server test path will use the same normalized adapter DTO contracts, but will add an authenticated principal, server-only configuration, approved object-registry profile, and fail-closed adapter resolver before calling a data source. No server runtime or service is created in Task 021.

## Task 019 report runtime

The development build has two bootstrap surfaces in the same bundle: normal hashes render `App`; `#/report/{mode}/{opaqueId}` renders `ReportWindowApp` only. The source tab opens the target synchronously, builds the existing bounded report asynchronously, writes a schema-v1 snapshot into the target's `sessionStorage`, then advances the target from `preparing` to `ready`. No router, state-management package, network transfer, or server PDF service was added.

Snapshots use the `axeon:report-snapshot:` namespace and an `axeon:report-snapshots:index` cleanup index. Local bounds are 256 KiB, 30 minutes, and six indexed entries. These are continuity and storage-hygiene controls, not authorization. Browser refresh of the original app still resets unsaved active investigation state; full active-session recovery and cross-tab state synchronization remain post-V1 work.

## Task 020 local security controls

The development shell retains only fictitious data. Its structured logger records allowlisted metadata, while report and persistence validation reject malformed local state. These controls are described in [security documentation](../security/axeon-security-and-data-protection.md); they do not replace Real Adapter authorization or a production audit service.

## AX-023 local authentication development path

The built Node server, rather than Vite alone, is the signed-in local development path. Its bootstrap command creates the first local administrator from shell-only credentials; `server:create-user` requires an existing local administrator and creates a User or Administrator hash record. Tests use temporary account files. The ignored local account file and in-memory session store are development controls only, intentionally unsuitable as a multi-instance or network-deployed identity store. Vite retains its existing UI workflow but needs the local Node server running at `127.0.0.1:3000` to proxy the authentication API.
