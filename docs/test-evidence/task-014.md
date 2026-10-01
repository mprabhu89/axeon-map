# Task 014 — Configurable multi-provider AI gateway foundation

## Automated verification

`ai/providerRegistry.test.ts` verifies all seven stable unique IDs, Mock `active` status, six future `not-configured` statuses, lightweight capabilities, and the absence of credentials or customer endpoints. `ai/providerResolver.test.ts` verifies default Mock resolution, controlled disabled execution, all six unconfigured provider routes, no silent Mock fallback, unchanged Context Pack semantics, provider-independent response mapping, and no production secret requirement. `App.provider.test.tsx` verifies the development status dialog, no credential entry, disabled/unconfigured AI controls, honest provider identity, and continued deterministic findings/investigation behavior.

| Check | Result | Related requirements |
| --- | --- | --- |
| Focused Task 014 tests | Passed, 13 tests in 3 files | AX-NFR-AI-009, AX-NFR-AI-006/007 |
| Full test suite | Passed, 114 tests in 18 files (`npm test -- --run`) | Task 001–014 GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build`; 59 modules transformed | AX-PR-001, AX-DEP-001 target |
| Local runtime smoke check | Vite served `http://127.0.0.1:5184/`; HTTP 200 and root mount present | AX-UX-001 |

## Provider routing evidence

- Local configuration resolves `mock` through `AxeonAIGateway`; the existing SITE-D grounded response retains 85.36% reactive, 71.80% baseline, +13.56 percentage points, and 73/239 concentration evidence.
- `watsonx`, `azure-openai`, `openai`, `aws-bedrock`, `google-vertex`, and `compatible` each resolve to controlled unavailable behavior. None executes Mock or returns a fabricated answer.
- `{ enabled: false }` prevents AI execution while SITE-D Operational Findings and Open Records remain usable.
- The registry/configuration contain no secret, credential, account, customer endpoint, or provider authentication value. Source inspection found no provider network call, SDK, browser credential, `dangerouslySetInnerHTML`, or provider persistence path.
- Context Pack schema version 1 and `AxeonAIResponse` remain Axeon contracts; provider selection adds no vendor-specific payload to React.

## Existing AI and full regression

All Task 013 grounded/limited-evidence, prospective-context, error/Retry, stale-context, superseded-question, and non-persistence tests remain green. All eight detector suites and their Task 010/012 ground truths remain green. Exploration, Investigation Spine, Inspect → Explore, Back/Reset, records, pagination, CSV export, Saved/Recent Investigations, finding presentation, and evidence disclosure remain green.

## Runtime and browser evidence

The application launched successfully under Vite and returned HTTP 200. Browser automation is not exposed in the current toolset, so no automated browser session is claimed. The jsdom interaction tests verify the visible Mock ACTIVE state, six Not configured providers, absence of credential fields, disabled and unconfigured behavior, and unchanged SITE-D operational findings. User manual acceptance remains required.

No real provider, external AI request, credential, provider authentication, backend, Maximo connection, or MAS validation was performed. AX-DEP-001 remains a required but unvalidated deployment target.
