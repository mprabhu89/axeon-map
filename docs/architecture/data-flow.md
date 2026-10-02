# Data Flow — local record pagination and export (Task 007A)

```mermaid
flowchart TB
    Panel[Context Panel<br/>committed or prospective path] -->|Open Records| Preview[Record Preview<br/>context snapshot]
    Preview -->|path + offset + max 20 + scope marker| Adapter[Maximo Adapter<br/>read-only operations]
    Preview -->|explicit Download: path + scope marker| Adapter
    Adapter --> Mock[Mock Maximo Adapter<br/>local synthetic records]
    Mock -->|previewRecords: up to 20 fields-only records + total count| Preview
    Mock -->|exportRecords: all matching mock rows as UTF-8 CSV| Preview
    Adapter -. future authorized MAS validation .-> Real[Real Maximo Adapter]
    Real -. enforce Maximo authorization for records and count .-> APIs[Supported Maximo APIs]
    Preview -. future, not implemented .-> Open[Open record in Maximo]
```

Preview retrieval and export retrieval are separate. The Mock Adapter filters and bounds each 20-record page before returning it; explicit export produces all matching fictitious records as CSV. Neither opening nor paging triggers export. The current-user marker is preparation, not security enforcement. Opening, paging, downloading, and closing do not change the committed path or selected candidate. The future Real Adapter must authorize both page results and exports through supported Maximo mechanisms and honor AX-DEP-001; neither that integration nor Maximo record navigation exists locally.

## Saved investigation flow (Task 008)

```mermaid
flowchart TB
    UI[Axeon UI<br/>committed path only] --> Store[Investigation Persistence Interface]
    Store --> Local[localStorage adapter<br/>local metadata only]
    Store -. future .-> Approved[Approved Maximo/user persistence]
    Local -->|structured path on resume| Validate[Exploration Engine<br/>validate each segment]
    Validate -->|bounded aggregates + current-user marker| Adapter[Maximo Adapter]
    Adapter --> Mock[Mock Adapter<br/>local synthetic data]
    Adapter -. future, current authorization .-> Real[Real Maximo Adapter]
    Validate -->|all segments valid| Spine[Reconstructed committed Investigation Spine]
```

The saved path grants no data access. Invalid or unavailable segments leave the current spine intact. Recent paths use the same metadata boundary and are limited to five. The future persistence mechanism is undecided and must honor AX-DEP-001.

## Analytical evidence preparation (Task 009)

```mermaid
flowchart TB
    Context[Investigation Context] --> Adapter[Maximo Adapter]
    Adapter --> Mock[Mock Adapter<br/>synthetic analytical fields stay behind boundary]
    Adapter -->|local service-level operation; Real Adapter authorization future| Evidence[Context Work Order evidence]
    Evidence --> Analysis[Deterministic Analytics]
    Analysis --> Findings[Structured findings]
    Findings -. future optional .-> AI[Axeon AI explanation]
```

At Task 009, the adapter exposed only aggregate exploration, bounded preview, and explicit CSV export. Task 010 adds a separate service-level analytical evidence operation; preview/export DTOs still exclude analytical fields. A future Real Adapter must filter evidence to the current user's authorized Maximo context before any calculation. Enterprise retrieval limits require authorized MAS validation. See [analytical architecture](analytical-architecture.md) for rules and field mapping.

## Service-level analytical flow (Task 010)

```mermaid
flowchart TB
    Context[Structured investigation context] --> Service[analyzeContext service<br/>active Node Intelligence context only]
    Service -->|path + current-user marker| Boundary[AnalyticalEvidenceAdapter]
    Boundary --> Mock[Mock Adapter<br/>filter exact path]
    Mock -->|context evidence + mock authorized-population counts + fixed reference| Service
    Boundary -. future current-user authorization .-> Real[Real Maximo Adapter]
    Real -. supported Maximo APIs; MAS validation .-> APIs[Maximo security and data]
    Service --> Rules[Eight deterministic rules]
    Rules --> Findings[Structured findings or empty array]
    Findings -. future only .-> Node[Node Intelligence / Axeon AI]
```

The Mock Adapter's analytical call is independent of ordinary aggregate, preview, and export calls. It runs for the one active non-root or filtered-root Node Intelligence context, never all candidate nodes or the unfiltered root at startup. The Real Adapter must authorize **both** context evidence and baseline counts before the service evaluates rules; post-analysis hiding is insufficient. For large enterprise populations, prefer server-side or aggregate calculation where supported. No analytical evidence/findings enter localStorage.

## Contextual findings flow (Task 011)

```mermaid
flowchart TB
    Inspect[Selected node<br/>committed or prospective path] --> Hook[Operational findings hook<br/>path key + stale-response guard]
    Hook --> Service[Deterministic analytics service]
    Service --> Adapter[AnalyticalEvidenceAdapter]
    Adapter --> Mock[Mock context evidence + baseline<br/>synthetic local mode]
    Adapter -. future authorized MAS .-> Real[Real Maximo Adapter]
    Service --> Findings[Structured findings or empty array]
    Findings --> Panel[Node Intelligence<br/>Operational Findings + evidence disclosure]
    Inspect --> Questions[Independent suggested questions]
    Inspect --> Records[Open Records<br/>broader context preview]
```

The committed breadcrumb/spine do not change on candidate inspection. Loading, error, Retry, and result state are confined to the findings section; Open Records and exploration stay independent. The same path is re-evaluated after Saved/Recent resume rather than restored from storage.

## Advanced analytics flow (Task 012)

One `analyticalEvidence` request supplies the active authorized context to Backlog & Aging, Repeat Work, Process Bottleneck, Work Mix, Reliability, Risk, Data Quality, and Optimization detectors. No detector performs its own fetch. Qualifying findings use one shared contract and deterministic ordering; the panel limits the initial presentation without discarding returned results. Preview, pagination, CSV export, aggregates, and saved-path metadata remain separate flows.

## Explicit grounded question flow (Task 013)

```mermaid
sequenceDiagram
    actor User
    participant Panel as Node Intelligence
    participant Builder as Context Pack Builder
    participant Gateway as Axeon AI Gateway
    participant Provider as Mock AI Provider
    User->>Panel: Select suggested question or submit free-form question
    Panel->>Builder: Active path + population + current findings + question
    Builder-->>Panel: Minimal typed Context Pack
    Panel->>Gateway: Provider-neutral request
    Gateway->>Provider: Request as structured data
    Provider-->>Gateway: Answer + references + next checks + limits + grounding
    Gateway-->>Panel: Structured response
```

No request occurs when suggestions render, findings load, nodes load, or the app starts. The Context Pack contains no raw records or persisted library data. A changed context or newer question invalidates an older response. Suggested next checks do not execute UI or Maximo actions.

## Configured provider routing (Task 014)

```mermaid
sequenceDiagram
    participant UI as Node Intelligence
    participant Gateway as Axeon AI Gateway
    participant Resolver as Provider Resolver
    participant Adapter as Configured Provider Adapter
    UI->>Gateway: AxeonAIRequest with unchanged Context Pack
    Gateway->>Resolver: Resolve safe deployment configuration
    alt Mock active locally
        Resolver->>Adapter: Mock provider
        Adapter-->>Gateway: AxeonAIResponse
    else AI disabled or provider not configured
        Resolver-->>Gateway: Controlled unavailable state
    end
    Gateway-->>UI: Provider-independent response or generic failure
```

Configuration resolution never adds records, saved paths, credentials or endpoints to the Context Pack. Future provider-specific translation occurs after the Axeon contract and must run server-side when credentials or provider communication are involved. An unconfigured provider produces no request, answer or Mock fallback.

## Contextual Investigation Report flow (Task 015)

```mermaid
sequenceDiagram
    actor User
    participant Panel as Node Actions
    participant Builder as Report Builder
    participant Adapter as Maximo Adapter
    participant Report as Report Preview
    User->>Panel: Open Investigation Report
    Panel->>Builder: Exact node path/count + current findings + optional exact-path AI response
    par Bounded contextual distributions
        Builder->>Adapter: explore(path, dimension, maxGroups=8, current-user)
        Adapter-->>Builder: Aggregate groups and total
    end
    Builder-->>Report: Provider-independent InvestigationReport
    User->>Report: Print / Save PDF
    Report->>Report: Browser print only
```

The builder makes at most three bounded aggregate requests and does not call preview, export, analytical-evidence or AI operations. Existing findings are copied only when their path exactly matches. An existing AI response is copied only when its originating path exactly matches; otherwise the AI section is absent. No report data is stored in localStorage. Report opening and printing do not dispatch investigation actions.

## Separate report handoff (Task 019)

```mermaid
sequenceDiagram
    actor User
    participant Axeon as Axeon investigation tab
    participant Builder as Report builder
    participant Target as Separate report tab/window
    participant Session as Target sessionStorage
    User->>Axeon: Investigation Report
    Axeon->>Target: Open preparing surface synchronously
    Axeon->>Builder: Build exact committed/prospective + filter snapshot
    Builder-->>Axeon: Bounded InvestigationReport model
    Axeon->>Session: Write unique schema-v1 snapshot
    Axeon->>Target: Navigate hash to ready opaque ID
    Target->>Session: Read and validate exact snapshot
    Session-->>Target: Immutable report model
    Note over Axeon,Target: Later Axeon changes do not mutate the opened report
```

The URL contains the report mode and opaque ID only. No path, filter, finding, AI content, security metadata, record collection, token, or credential crosses through the URL. Missing or invalid snapshots stop at the report error surface; they never invoke an unrestricted/root report request.

## Contextual filter flow (Task 016)

```mermaid
sequenceDiagram
    actor User
    participant Dialog as Filter Dialog
    participant Adapter as Maximo Adapter
    participant State as Investigation Context
    participant Capabilities as Map / Analytics / AI / Records / Persistence / Report
    User->>Dialog: Open for root, committed, or prospective path
    Dialog->>Adapter: filterValues(path, active filters, dimension, maxValues)
    Adapter-->>Dialog: bounded values and counts
    User->>Dialog: Stage checkboxes
    Note over Dialog: No active-context change
    User->>Dialog: Apply Filters
    Dialog->>State: one normalized filter-set update
    State->>Capabilities: same path + filters + current-user scope
```

Path constraints and different filter dimensions combine with AND. Values within a filter dimension combine with OR. Preview remains 20 records per page; CSV export is separate and explicit. Filter discovery returns aggregates and never raw Work Orders.

## Hardened adapter flow (Task 017)

```mermaid
flowchart LR
    Context[Structured path + filters] --> Request[Bounded adapter request]
    Security[Adapter security context] --> Request
    Request --> Capability{Capability supported?}
    Capability -->|no| SafeError[Typed safe error]
    Capability -->|yes| Adapter[Configured adapter]
    Adapter --> Authorization[Maximo authorization: future Real Adapter]
    Authorization --> Normalize[Normalized Axeon DTO]
    Normalize --> Product[Product capability]
```

Invalid context never falls back to root. Filter discovery, aggregates, preview pages, export, analytical evidence, and report aggregates share the same path/filter/security contract. Only explicit export is unpaged and remains a separate authorized adapter operation.

## Task 020 protection lifecycle

The same authorization-first flow applies to every data use: authorized adapter DTOs feed bounded aggregates, preview/export, deterministic analytics, reports, and optionally a minimal Context Pack. Client persistence is metadata-only; report snapshots are bounded presentation handoffs. No raw Work Order collection is written to browser storage, placed in a URL, logged, or sent to the local Mock AI provider.

## AX-022 server ingress

```mermaid
flowchart LR
    Browser -->|GET /api/v1/health| Server[Node server foundation]
    Browser -->|future protected operation| Principal[Require authenticated principal]
    Principal --> Registry[Approved object profile]
    Registry --> Authorization[Future Maximo authorization]
    Authorization --> Adapter[Future server adapter]
```

Only the health branch exists in AX-022. The protected branch is a fail-closed contract and does not invoke adapters, databases, Maximo, or AI.

## AX-024 local synthetic database proof

```mermaid
flowchart LR
    Browser -->|authenticated GET only| Server[Node server]
    Server --> Session[Resolve server session]
    Session --> Scope[Resolve synthetic object/org/site scope]
    Scope -->|parameterized approved statements| SQLite[Read-only local SQLite fixture]
    SQLite --> Aggregate[Site aggregate]
    SQLite --> Preview[20-record page]
```

The browser cannot send SQL, a table name, authorization scope, or a database path. The fixture is initialized separately from the shared 2,000-record deterministic generator. Scope is resolved from the authenticated principal before every statement and may only be narrowed by an optional validated Site query parameter. This is a local authorization-placement proof; future Db2, SQL Server, and Maximo API flows require independent current-user Maximo authorization validation.

## AX-025 future approved connection flow

```mermaid
flowchart LR
    Env[Server environment definition] --> Validate[Connection registry validation]
    Validate --> Approved[Approved read-only definition]
    Secret[Server credential environment value] --> Resolve[Server-only credential resolution]
    Approved --> Future[Future provider connection lease]
    Resolve --> Future
    Future --> Auth[Current-user Maximo authorization]
    Auth --> Adapter[Reviewed bounded adapter operation]
    Adapter --> DTO[Normalized bounded Axeon DTO]
```

AX-025 implements only validation and contracts. It creates no lease, sends no request, and executes no database/API operation. The browser never receives the definition's credential value or any connection capability.
