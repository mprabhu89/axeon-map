# AX-022 — Secure Application Server Foundation

## Implemented scope

`app/server` is a separate Node.js/TypeScript server foundation. It uses native HTTP APIs, serves the built React application, provides `GET /api/v1/health`, returns consistent safe JSON errors, applies request-size and static-path containment checks, and exposes close primitives for SIGINT/SIGTERM shutdown. The Vite development workflow, browser Mock Adapter, synthetic dataset, and V1 UI remain unchanged.

The server configuration loader validates non-secret runtime settings and safe references for future Db2, SQL Server, Maximo, and AI configuration. It intentionally contains no credentials, endpoint values, connection strings, database drivers, or network integration. Configuration is not returned by any browser response.

`AuthenticatedPrincipal`, `AuthorizationService`, and `requireAuthenticatedPrincipal` define fail-closed future protected-operation contracts. No fake user, login route, session, SSO, user management, data API, or authorization bypass exists.

The server-owned object registry supports validated profiles for Work Orders, Service Requests, Incidents, Assets, and approved custom objects. It defines approved fields, exploration/filter/preview capability, relationships, analytical capabilities, and authorization-policy reference. Profiles reject SQL, query, endpoint, connection string, credential, and secret fields and grant no Maximo permissions.

## Focused verification

- Server configuration validation and secret exclusion.
- Missing authenticated principal fails closed.
- Approved/default/custom object profile validation and query-bearing configuration rejection.
- Versioned health endpoint, safe headers, no configuration disclosure, absence of data APIs, and request-size rejection.

Focused AX-022 tests passed. The complete existing Vitest suite passed, strict TypeScript passed for browser and server projects, and the combined production build passed: Vite transformed 76 modules and the Node server compiled successfully. Local smoke verification started the built server, confirmed `GET /api/v1/health` returned HTTP 200 with only `{status, apiVersion, service}`, confirmed the built browser app returned HTTP 200, then stopped the temporary local process.

## Deferred dependencies

Authentication/session implementation, SSO, server framework decision, configuration/secret store, registry governance/storage, reverse proxy/TLS, CSP, audit destination, Maximo authorization propagation, API/Object Structure discovery, Db2/SQL Server drivers, database policy, and approved AI gateway remain unresolved. No external service was contacted.

## Proposed AX-023 scope

Implement mandatory authentication and protected sessions for server routes: authenticated-principal resolution, session lifecycle/logout/expiry, CSRF strategy for future administration actions, secure cookie policy, and protected-route middleware. Keep all data adapters, database/Maximo connections, SSO, user management, and AI provider calls out of scope until those session controls are verified.
