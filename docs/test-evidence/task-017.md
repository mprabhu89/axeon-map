# Task 017 — Maximo-ready adapter and security boundary hardening

## Repository data-access audit

| Classification | Finding | Disposition |
| --- | --- | --- |
| A — test fixture/development data | SITE-* values, PM/CM/EM, fixed statuses/priorities/classes/assets, controlled signals and reference time in tests | Retained intentionally |
| B — Mock implementation | Synthetic dataset generation, iteration, scope marker, deterministic baseline and CSV source | Retained only behind `MockMaximoAdapter` |
| C — analytical configuration | PM planned and CM/EM reactive semantics plus fixed synthetic detector/status rules | Retained for deterministic mock analytics; future customer mapping documented |
| D — product leakage | CSV export typed to `SyntheticWorkOrder`; unused PM/CM/EM model constant; repeated ad-hoc mock scope literals; scattered bounds; direct Mock choice in composition | Replaced with normalized export DTO, removed constant, adapter-derived request context, shared limits and explicit resolver |
| E — documentation/example | SITE-* and domain-value examples in guides/evidence | Retained and labelled synthetic where applicable |

Repository source checks confirm production modules outside the Mock implementation do not import `syntheticWorkOrders`. Adapter resolution is the only production composition module that references the Mock implementation. React has no PM/CM/EM, SITE, status, priority, classification, location, or asset discovery fallback.

## Contract and security evidence

- `MaximoAdapterProfile` declares identity, availability, six current capabilities, mode, and security context.
- `requestContext` propagates copied path, filters, and adapter security context to product operations.
- Invalid/missing context does not broaden to root. Mismatched security context is unauthorized.
- The unconfigured Real port has no capabilities, network/configuration details, credentials, synthetic import, or fallback.
- Errors expose only stable safe messages and retryability.
- Normalization covers missing text, control whitespace, and numeric/string priorities.
- Shared bounds: exploration 16; preview 20; filter discovery 50; report dimensions 3; report groups 8.

## Reusable contract suite

`defineMaximoAdapterContract` verifies represented population, bounded aggregates, OR/AND filters, prospective paths, bounded pagination, exact-context export, analytical evidence/baseline, reference time, and dynamic domain discovery. Mock runs the suite now; future Real must run it in an authorized MAS environment.

## Verification

- Focused adapter/filter/report suite: **31 passed** across 5 files.
- Full regression suite: **157 passed** across 25 files.
- Strict TypeScript (`tsc -b --pretty false`): **passed**.
- Vite production build: **passed**; 70 modules transformed.
- Ground truths retained: 2,000 records, SITE-A 560, Work Type discovery CM 1,215 / PM 564 / EM 221, and SITE-A → WAPPR under CM/EM filters 178.
- Source-boundary scan: only the Mock Adapter imports `syntheticWorkOrders`; the explicit resolver is the only production composition import of `mockMaximoAdapter`.
- No network call, real Maximo connection, dependency, commit, push, or remote was introduced.

## Remaining validation

Real Maximo authentication/session propagation, API/Object Structure selection, counts/aggregation support, pagination/export semantics, customer-domain normalization, work-type analytical mapping, capability availability, performance, authorization negative cases, supported publishing, and AX-DEP-001 remain MAS-only validation items.
