# Task 021 — V1.1 architecture baseline

## Scope

Task 021 updates the controlled development version to `1.1.0-dev` and documents the next self-hosted architecture phase. It introduces no server process, network connection, database driver, authentication mechanism, administration UI, Maximo endpoint, SQL, real AI provider, or change to V1 investigation behavior.

## Reusable baseline

The browser already consumes a capability-oriented `MaximoAdapter` port, normalized DTOs, bounded request context, security-context marker, provider-independent AI contracts, and release metadata from `app/package.json`. The Mock Adapter and deterministic synthetic dataset remain the active local implementation. The nonexecuting Real Adapter remains not configured and fails closed without Mock fallback.

## Architecture decisions

- Future production credentials, configuration, authentication/session state, adapter execution, database access, object registry, and AI-provider calls belong on a self-hosted Axeon server.
- The browser retains Axeon semantic investigation/adapter/Context Pack contracts and receives only authenticated, authorized, normalized, bounded DTOs.
- Object exposure is registry-driven: Work Orders, Service Requests, Incidents, and approved custom objects require approved profiles. The registry does not bypass Maximo authorization.
- Read-only Db2/SQL Server permissions are a connection restriction, not a replacement for current-user Maximo authorization.
- Network deployment requires mandatory authentication before data routes; SSO is a future authentication-boundary adapter.

## Verification

Release-focused automated tests passed: **3 files, 10 tests**. The full existing Vitest suite completed successfully, strict TypeScript passed, and production build passed with 76 modules transformed. No V1 UI behavior is intentionally changed. A localhost smoke request was not run because the prior local Vite process had exited; this does not affect the test, type-check, or build gates.

## Task 022 proposed scope

Task 022 should scaffold only the server foundation, authenticated-principal request contract, server-only configuration boundary, and validated object-profile registry model. It must not connect Maximo, Db2, SQL Server, or an AI provider and must not expose a network data API before mandatory authentication is implemented.
