# Post-V1 backlog

## Axeon Administration and multi-application investigation

- Axeon Administration application for administrators to enable approved Maximo applications/objects.
- Configurable investigation profiles, Explore By fields, Filter fields, and Open Record fields.
- Header-level Application/Object selector.
- Dynamic customer-specific Work Types and separately governed analytical-category mappings.
- Support for approved custom Maximo applications/objects.
- Object-aware Saved Investigations, Reports, and analytical packs.

**Security invariant:** Axeon Administration determines what Axeon exposes. Maximo Security determines what the current user is authorized to see. Enabling an object must never bypass Maximo authorization.

## UX and accessibility follow-up

- Authorized-environment usability testing across supported browser and MAF layouts.
- Formal accessibility assessment; Task 018 does not claim WCAG certification.
- Evaluate focus trapping and background inertness for modal surfaces after target MAF behavior is validated.
- Consider a shared modal-header pattern and wider close-icon adoption only after accepted dialogs are reviewed individually.
- Consider an explicit copy/export action for safe support metadata if operational support requirements justify it.
- Validate narrow-screen and touch interaction beyond the current normal desktop target.

## Session continuity follow-up

- Consider explicit recovery of an unsaved committed path and active filters after accidental browser reload, subject to authorization revalidation and privacy review.
- Evaluate live synchronization semantics for Saved/Recent metadata across multiple Axeon tabs.
- Validate report snapshot lifetime, popup policy, scripted Close, CSP, and same-origin storage behavior in the supported MAS/MAF browser environment.
- Consider user-managed report retention only if a future approved persistence and authorization design requires it; Task 019 reports remain short-lived session snapshots.

## Production security and administration follow-up

- Validate Real Maximo Adapter authorization, API/Object Structure discovery, customer Work Type analytical mapping, and authorization-first behavior in an authorized MAS environment.
- Define approved server-side provider gateway, production secret management, audit retention, monitoring, CSP/security headers, and incident procedures.
- Preserve the planned Axeon Administration model: it may configure approved application/object profiles and fields, while Maximo Security continues to decide what the current user may access. Administration must not become an authorization bypass.

## V1.1 delivery sequence

- Task 022: completed local self-hosted server foundation, authenticated-principal contract, server-only configuration boundary, and validated object-registry model without connecting to Maximo or a database.
- Task 023: implement mandatory authentication and protected sessions before exposing any network data API.
- Validate one approved, authorization-preserving Maximo API adapter before adding restricted Db2 or SQL Server read-only adapters.
- Add database connectivity only with least-privilege accounts, parameterized reviewed operations, authorization propagation, bounds, auditing, and customer approval.
- Add administration UI, SSO integration, customer object profiles, and customer Work Type mappings only after their server-side authorization/governance boundaries are established.
