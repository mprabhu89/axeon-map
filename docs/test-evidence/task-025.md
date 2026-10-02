# AX-025 — Secure Connection Configuration

## Implemented scope

AX-025 adds a server-only, provider-neutral `ConnectionRegistry`. It validates approved connection definitions from `AXEON_CONNECTION_DEFINITIONS` for future IBM Db2, Microsoft SQL Server, and HTTPS Maximo REST adapters. A definition requires a stable ID, `approval: "approved"`, an explicit read-only mode, bounded connection/operation/concurrency policy, safe endpoint metadata, and the name of a credential environment variable.

The registry checks that each referenced credential variable is present but retains only its name. Credential values never appear in registry entries, browser responses, ordinary logs, or committed configuration. The only secret lookup contract is server-side and intended for a future provider immediately before it opens an explicit `ReadOnlyConnectionLease`. The contract exposes no SQL or arbitrary query operation.

## Validation and fail-closed behavior

The loader rejects malformed definitions, unknown fields, duplicate IDs, unsupported providers, missing approval, write-capable modes, invalid timeout/concurrency values, unsafe Maximo REST URLs, and missing referenced credentials. Errors are generic and do not include a credential value. Empty configuration is valid and leaves local Mock and AX-024 synthetic SQLite mode unchanged.

## Automated verification

Focused tests cover approved Db2, SQL Server, and Maximo REST definitions; default read-only policy bounds; configured bounds; missing secrets; unsupported/unapproved definitions; unsafe modes/URLs; secret-bearing unknown fields; safe error messages; and JSON serialization without credential values. AX-024 HTTP and SQLite tests run alongside the registry checks to confirm that authenticated synthetic aggregate/preview behavior remains unchanged.

Verification completed with 15 focused tests across four server test files, the complete serial Vitest suite, strict TypeScript validation, and the production build. Node's local SQLite experimental-runtime warning is expected for the existing synthetic fixture; no external connection was attempted.

## Final manual acceptance verification

On the local server, normal Mock-mode startup returned `GET /api/v1/health` 200. Synthetic SQLite startup also returned health 200; an unsigned aggregate request returned 401, preserving the session-first boundary. An approved fictitious Db2 definition using `db2.acceptance.example` and a temporary placeholder credential started the server and returned health 200. The server process had zero external TCP connections, because AX-025 has no provider client or driver.

With the same definition but no referenced credential, startup failed with the generic unavailable-connection error. Separate unapproved and write-mode definitions failed with the generic invalid-configuration error. In all three failures, the temporary placeholder value was absent from captured process output. Temporary definition and credential environment variables were removed after every check. Git ignores `.env`, local account stores, and synthetic SQLite files; no runtime file was staged.

## Limitations

No database driver, network call, TLS handshake, connection pool, credential manager, Maximo REST call, Object Structure, SQL statement, or customer data is used in this checkpoint. A read-only connection account is not Maximo current-user authorization. Real adapters must implement reviewed bounded operations, secret rotation, certificate policy, connection lifecycle/pooling, audit controls, and proven Maximo authorization propagation in an approved environment.
