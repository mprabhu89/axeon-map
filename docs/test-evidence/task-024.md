# AX-024 — Synthetic Database and Maximo Authorization Feasibility

## Implemented proof

The server now supports an **explicitly configured local synthetic SQLite mode**. `npm run server:init-synthetic-db` recreates a Git-ignored database from the shared deterministic Work Order generator. It contains exactly 2,000 fictitious records, including SITE-A = 560 and all existing lifecycle, work-type, and analytical fixture signals. Initialization is the only write operation and is never called by normal investigation requests.

The read-only repository exposes only two approved Work Order operations: Site aggregate and a deterministic `LIMIT 20` preview with validated offset. It opens SQLite read-only with `query_only`, uses parameter binding for values, fixed allowlisted table/field statements, fixed result bounds, and a short busy timeout. It exposes no SQL, database path, credentials, raw error, arbitrary table, arbitrary field, or write request to the browser.

Synthetic authorization is seeded separately from local Axeon account roles. `axeon.admin` explicitly receives all fixture sites, `site.a.user` SITE-A, `multi.site.user` SITE-A/SITE-C, and `no.workorder.user` no Work Order permission. Every query resolves the authenticated username to an allowed Work Order profile and its organization/site scope before query construction. Administrator role alone grants no data bypass. Missing, malformed, unmapped, or permissionless profiles fail closed.

## Commands

```powershell
cd app
npm run build
npm run server:init-synthetic-db
```

Create the local accounts through the existing administrator-controlled `server:create-user` command, using the following usernames for the seeded synthetic authorization profiles: `site.a.user`, `multi.site.user`, and `no.workorder.user`. Start the restricted mode only after initialization:

```powershell
function Set-AxeonSecretEnv([string]$name, [string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  Set-Item -Path "Env:$name" -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr))
}
$env:AXEON_ADMIN_USERNAME = 'axeon.admin'
Set-AxeonSecretEnv AXEON_ADMIN_PASSWORD 'Administrator password'
$env:AXEON_NEW_USERNAME = 'site.a.user'
Set-AxeonSecretEnv AXEON_NEW_PASSWORD 'SITE-A user password'
$env:AXEON_NEW_ROLE = 'user'
npm run server:create-user
# Set AXEON_NEW_USERNAME, AXEON_NEW_PASSWORD, AXEON_NEW_ROLE, then run the command again for multi.site.user and no.workorder.user.
Remove-Item Env:AXEON_ADMIN_PASSWORD,Env:AXEON_NEW_PASSWORD
```

Start the restricted mode only after initialization:

```powershell
$env:AXEON_SYNTHETIC_DATABASE_ENABLED = 'true'
npm run server:start
```

After local sign-in, use the session cookie through the authenticated API only:

- `GET /api/v1/work-orders/site-aggregate` as `site.a.user` returns only SITE-A and total 560.
- `GET /api/v1/work-orders/preview?site=SITE-A&offset=0` returns 20 SITE-A records and total 560.
- Requesting SITE-B with `site.a.user`, or any Work Order route with `no.workorder.user`, returns a safe 403 response.

Use `127.0.0.1` consistently for the signed-in page and each API tab. The local Vite flow is `http://127.0.0.1:5173`; its `/api` proxy and direct server tabs at `http://127.0.0.1:3000` share the same host-only cookie. `localhost` is a different host for cookie isolation and must not be mixed with `127.0.0.1` during this verification.

### Authenticated API defect correction

The AX-024 investigation found no session-store or protected-route defect. The local Vite server had retained its default `localhost` host while the server/API and documentation used `127.0.0.1`. Logging in through Vite therefore created a deliberately host-only cookie for `localhost`; manually opening an API tab on `127.0.0.1` correctly omitted it and received `unauthenticated`. Vite now binds explicitly to `127.0.0.1`, matching the server, proxy target, and documented API tabs. Focused HTTP integration verifies a login cookie reused on a distinct same-host request can retrieve the authorized aggregate. No cookie scope was broadened and no authentication or CSRF control was relaxed.

Use `npm run server:reset-synthetic-db` to recreate the same fixture. Remove `AXEON_SYNTHETIC_DATABASE_ENABLED` after the local proof. SQLite mode rejects production configuration.

### Administrator-authorized local account correction

The account-creation CLI now uses the same normalized-username and scrypt verification flow as browser login, then checks the resolved principal's administrator role. Its default account-store and synthetic-database paths are anchored to the Axeon `app` directory instead of the process working directory, so launching a built command from a different directory cannot select a separate empty local account store. The existing account file is retained unchanged. Regression tests cover successful administrator-authorized creation and rejection for a user or an invalid password.

When verification fails, the CLI emits a local-only diagnostic containing the effective account-store path and a safe status (`administrator-not-found`, `administrator-role-required`, or `administrator-password-not-verified`). It never prints passwords, hashes, sessions, account-file contents, or tokens. This distinguishes a store/configuration mismatch from a role or credential verification issue without weakening authentication.

To create the fixture account for SITE-A through the corrected CLI, use the existing local administrator only in the current PowerShell session:

```powershell
cd app
function Set-AxeonSecretEnv([string]$name, [string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { Set-Item -Path "Env:$name" -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
$env:AXEON_ADMIN_USERNAME = 'axeon.admin'
Set-AxeonSecretEnv AXEON_ADMIN_PASSWORD 'Administrator password'
$env:AXEON_NEW_USERNAME = 'site.a.user'
Set-AxeonSecretEnv AXEON_NEW_PASSWORD 'SITE-A user password'
$env:AXEON_NEW_ROLE = 'user'
npm run build
npm run server:create-user
Remove-Item Env:AXEON_ADMIN_USERNAME,Env:AXEON_ADMIN_PASSWORD,Env:AXEON_NEW_USERNAME,Env:AXEON_NEW_PASSWORD,Env:AXEON_NEW_ROLE
```

### Final session reliability verification

No intermittent session defect was reproduced. The authenticated API contract test performs one login as `site.a.user`, then uses the same HttpOnly, SameSite=Strict cookie for consecutive Site aggregate and SITE-A preview requests at offsets 0 and 20. It confirms that the session endpoint continues to resolve `site.a.user`, that read requests do not rotate the cookie, and that a SITE-B denial remains a 403 without invalidating the valid SITE-A session; the following aggregate remains 200 with total 560.

The local server stores sessions in memory. A server restart deliberately discards the session map while the browser may still retain the expired opaque cookie until its normal cookie lifetime ends. The next protected request then fails closed as `unauthenticated` and the user must sign in again. The same result occurs if `localhost` and `127.0.0.1` are mixed, because host-only cookies do not cross those hosts. This is a local V1 operational limitation, not a Maximo authorization result. Durable shared session storage and restart-safe session continuity require later production deployment architecture.

## Verification

Focused tests verify repeatable initialization, 2,000 deterministic records, SITE-A aggregate, multi-site scope, bounded deterministic pagination, invalid site/offset rejection, permissionless/missing profile rejection, unavailable fixture failure, authenticated route protection, consecutive session use across aggregate/preview requests, direct modified-parameter resistance, cross-user session isolation, and safe failures. Full-suite, TypeScript, and build outcomes are recorded in the completion report.

## Real Maximo / database evidence still required

This uses Node's experimental SQLite API and fictitious data only. It does not prove Db2, SQL Server, Maximo schema compatibility, a Maximo API/Object Structure, database account policy, production pool/timeout behavior, user-to-Maximo identity mapping, MAPPERADMIN behavior, or authorization parity. AX-025 must introduce reviewed secret/configuration handling and provider-neutral connection configuration before any authorized external connection is attempted.
