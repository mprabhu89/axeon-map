# AX-023 — Mandatory Authentication and Protected Sessions

## Implemented scope

The self-hosted local Node server now requires a server-managed local session before the React investigation or standalone report surface renders. `AuthenticationGate` calls only the versioned session/login/logout API and keeps the returned CSRF value in component memory. It stores no password, authentication token, or session value in localStorage. Existing V1 browser components, Mock Adapter, deterministic dataset, analytics, report snapshots, CSV export, Saved/Recent metadata, and AI Mock Provider were not changed.

`LocalAccountStore` is server-only and ignored by Git. Initial bootstrap succeeds only when no account exists. It persists an account ID, normalized username, role, creation time, and configured scrypt password hash; it never persists a plaintext password. The roles are `administrator` and `user`. There is no self-registration or account-management API; the reserved administrator route proves server-side role rejection before returning its safe unimplemented response.

An existing local administrator may create a further local `user` or `administrator` account with the server-only `server:create-user` command. The command verifies that administrator's existing scrypt hash before creating the requested account; its temporary administrator and new-account password environment variables are not logged or persisted. This local CLI is deliberately not an Administration Portal.

`AxeonAuthenticationProvider` is a provider-independent local-password port. A later OIDC or SAML provider will authenticate upstream and return the same principal/result contract. `SessionManager` holds opaque random identifiers and CSRF tokens server-side, expires sessions after eight hours or 30 minutes idle, removes sessions on logout, and produces a new identifier after successful authentication. The cookie is HttpOnly and SameSite=Strict, adds Secure for HTTPS/production configuration, and is cleared on logout. Login errors remain generic and a keyed in-memory throttle blocks repeated failures.

This is local server authentication only. Axeon identity is distinct from Maximo authorization. No data-bearing server adapter/API exists yet, and future data routes must enforce Maximo authorization before returning normalized bounded DTOs.

## Automated verification

- Password hashing / bootstrap: no plaintext account storage, normalized administrator role, and bootstrap rejects a second administrator.
- Authentication: valid principal creation, generic invalid result, and repeated-failure throttling.
- Sessions: fresh identifiers/tokens, inactivity expiry, invalidation, and CSRF comparison.
- HTTP: public health, generic failed login, HttpOnly/SameSite cookie, authenticated session lookup, CSRF rejection, logout cookie clearing, and post-logout rejection.
- Configuration: secure cookie defaults for production and explicit HTTPS configuration.

Browser behavior still needs user manual acceptance because cookie behavior and the local sign-in screen depend on the actual browser.

## Manual local procedure

1. In `app`, set `AXEON_BOOTSTRAP_ADMIN_USERNAME` and a strong `AXEON_BOOTSTRAP_ADMIN_PASSWORD` only in the current shell, run `npm run build`, then `npm run server:bootstrap-admin`.
2. Remove the password environment variable and run `npm run server:start`.
3. Browse to `http://127.0.0.1:3000`, authenticate, and verify the unchanged Mock investigation experience.
4. Select **Sign out** and verify the sign-in screen returns; refresh and verify the investigation does not render without a session.
5. Stop the local server when finished. Do not use the local account or Mock scope marker as evidence of Maximo authorization.

## Deferred AX-024 validation

AX-024 should validate a single approved restricted read-only Db2 or SQL Server feasibility path and, separately, an authorized Maximo integration design. It must establish how the authenticated Axeon principal maps to current-user Maximo authorization before any count, record, finding, export, report, persistence, logging, or AI context reaches Axeon. It must not treat database read permissions as a substitute for Maximo authorization.
