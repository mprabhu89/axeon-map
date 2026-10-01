# Task 020 — V1 security, data protection, logging and release-candidate hardening

## Scope and invariant

Task 020 preserves local V1 behavior while making the authorization-first rule explicit: **Axeon must never retrieve, analyze, display, export, report, persist, log, or send to AI data that the current Maximo user is not authorized to access.** The Mock Adapter and its scope marker remain fictitious development architecture, not enforcement.

## Repository and architecture audit

The product layer uses the Maximo Adapter contract for aggregates, filter discovery, preview, export, analytical evidence, and report-supporting aggregates. Synthetic records remain in the Mock Adapter and tests. `RealMaximoAdapter` remains nonexecuting, not configured, and fails closed without Mock fallback. PM/CM/EM remain Mock analytical fixture values; UI discovery stays adapter-driven. No product-layer direct data import or browser database/query/credential path was introduced.

## Protection controls verified

- Exploration, filter discovery, records, reporting, and Context Pack contracts remain bounded and typed.
- Saved/Recent stores path/filter metadata only. Invalid JSON fails closed.
- Report snapshots are same-origin/session-scoped, namespaced, schema-versioned, 256 KiB bounded, 30-minute limited, capped at six, and reject raw-record/secret-like payloads.
- Context Packs contain only the current path/filter context, population, concise findings, scope marker, reference time, and normalized question; they contain no raw Work Orders, storage, exports, credentials, or unrelated branches.
- React renders adapter values as text. No unsafe HTML API was found in application source. Formula-leading CSV values are neutralized without logging their content.
- Structured logging allowlists safe metadata and an opaque correlation ID. It never accepts operational values, raw errors, paths, filters, records, AI content, credentials, endpoints, SQL, or response bodies.
- The global “COMING LATER” command-bar placeholder is no longer rendered; contextual Node Intelligence is the actual AI entry point.

## Focused verification

Initial focused security-only Vitest run: **5 files, 21 tests passed**. The final focused Task 020 regression run, including application rendering, passed **6 files and 47 tests**.

- `logger.test.ts`: allowlisted event metadata and opaque correlation IDs.
- `csvExport.test.ts`: escaping and all formula-leading character classes.
- `investigationPersistence.test.ts`: metadata-only persistence and malformed-state rejection.
- `contextPack.test.ts`: minimization, filters, normalization, and untrusted question/text treatment.
- `reportSnapshot.test.ts`: schema, URL, bounds, expiry, immutability, and fail-closed behavior.

Task 020 also adds an application rendering regression test that passes a hostile adapter label and verifies it remains text without an injected `img` or `script` node.

## Release-readiness audit

Intentional development disclosures retained: Synthetic Data, Mock Adapter/development scope marker, deterministic Mock AI Provider, `1.0.0-dev`, and Real Adapter not configured. No user-visible TODO/FIXME, localhost claim, fake connected provider, browser credential input, or global future-AI control remains in the application shell. The version remains `1.0.0-dev`; it has not been promoted to `1.0.0`.

The UX/accessibility review retained native button semantics, labelled dialogs, focus-visible states, Escape/Close behavior, retry actions, staged Filter Apply/Clear/Cancel actions, disabled provider states, and the existing top-right Open Records close icon. No broad visual redesign was made. Post-V1 items remain formal accessibility assessment, MAF-layout validation, focus trapping/background inertness review, and approved production audit/observability integration.

Repository scan found no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or `document.write` use in application source. The only production `localStorage` access is the persistence abstraction; sessionStorage is limited to report transfer/surface code. No source outside the Mock Adapter or tests imports the synthetic Work Order data. The secrets-pattern scan found no suspected credential/private-key matches. `npm audit --omit=dev --json` reported **0 production vulnerabilities**; runtime dependencies remain React and ReactDOM only. The initial complete audit identified two moderate development-only Vitest-chain advisories, so Task 020 updated the existing dev test tool to Vitest 5.0.1 and its lockfile. The final complete audit reported **0 vulnerabilities**. `npm audit` must be repeated in a release pipeline.

Strict TypeScript passed. The full standard Vitest suite completed successfully again after the Vitest 5.0.1 update. Production build passed: 76 modules transformed, with `index-DafsJAwp.js` 335.03 kB (101.37 kB gzip). Local Vite launch returned HTTP 200 at `http://127.0.0.1:5173/`. Browser-level/manual acceptance remains required for the release-candidate workflows.

## Authorized MAS validation remains required

Real Maximo authentication/authorization, Maximo 7.6.1.x deployment, MAS 9.2+ portability, API/Object Structure discovery, customer Work Type mapping, production CSP/logging, server-side AI gateway/secret management, role-based data separation, and formal security/accessibility testing remain open. See [Real Adapter readiness](../architecture/real-maximo-adapter-readiness.md), the [security verification matrix](../security/axeon-security-verification-matrix.md), and the [residual risk register](../security/axeon-residual-risk-register.md).

## Manual user acceptance

1. Confirm visible Synthetic/Mock/development disclosures remain honest.
2. Explore, filter, inspect, and open records without losing context.
3. Export a context containing a formula-like test value only in a safe test environment and confirm the spreadsheet does not evaluate it.
4. Ask a contextual AI question and confirm deterministic evidence remains separate.
5. Open a report, print A4 preview, and confirm no raw operational payload appears in its URL.
6. Open separate reports and verify snapshot immutability.
7. Check safe retry/error states for unavailable adapter/provider or blocked report window.
8. Inspect browser storage only for metadata and report snapshot envelopes; do not add customer data.
9. Verify keyboard navigation, Escape/Close, focus-visible controls, and disabled states.
10. For an authorized MAS pilot, repeat these checks with users who have intentionally different Maximo access.
