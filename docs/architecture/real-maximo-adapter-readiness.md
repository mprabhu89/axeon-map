# Real Maximo Adapter readiness

## Ready now

- A read-only, capability-oriented adapter contract covers aggregates, filter discovery, preview pages, explicit export, analytical evidence, and reporting aggregates.
- Structured requests carry path, filters, security context, and operation-specific bounds; no UI component emits Maximo query syntax.
- Normalized DTOs isolate product logic from nulls, text/control variations, and numeric/string priorities.
- Honest adapter profiles declare availability and six current capabilities. Typed safe errors fail closed.
- Explicit resolution selects Mock locally or the nonexecuting Real port; there is no silent fallback.
- A reusable behavioral contract suite runs against Mock and is designed for later Real Adapter execution.

## Still mocked

Synthetic data generation, the current-user development marker, reference time, work-type analytical semantics, authorized baseline, filter value counts, records, export, and evidence are local fixtures. Mock authorization is not Maximo authorization.

## Real Adapter responsibilities

1. Bind requests to the authenticated Maximo session and enforce record/site/org/security restrictions before or during retrieval.
2. Implement only verified supported operations and declare only proven capabilities.
3. Translate structured path/filter/bounds into supported Maximo APIs without accepting UI query syntax or SQL.
4. Normalize Maximo values, including null text, descriptions, identifiers, customer domains, and numeric/string priorities.
5. Discover customer Work Types dynamically. Configure approved planned/reactive mappings separately before enabling work-type-dependent detectors.
6. Preserve bounds, explicit export policy, safe errors, retry classification, and security context.

## Discovery and unresolved MAS questions

Authorized MAS work must identify supported Application Configuration/MAF integration points, suitable APIs/Object Structures, authentication/session propagation, aggregate/distinct support, pagination semantics, export limits/generation, authorization behavior for counts, and server/reference-time handling. No endpoint, Object Structure, query syntax, or credential mechanism is assumed here.

## Proof required in an authorized MAS environment

- Run the shared adapter contract against authorized users with different site/org access.
- Prove counts, filters, evidence, pages, exports, baselines, and reports never exceed each user's authorized scope.
- Validate null/customer-domain normalization and configured work-type analytical mapping.
- Verify authorization, session, capability, transient, and invalid-context failures are safe and fail closed.
- Confirm bounds, performance, supported publishing, and AX-DEP-001 without Maximo core modification or customer-performed Manage rebuild/redeploy.

Exact MAS compatibility remains unvalidated.

## Task 020 MAS handoff checklist

Before any authorized customer pilot, confirm supported Maximo Manage 7.6.1.x Application Configuration/MAF installation and publishing path; identify approved APIs/Object Structures without assuming names; verify session/authentication propagation; test restricted and broader user roles; prove authorization applies to aggregates, filters, evidence, preview, export, AI Context Pack, and report inputs before Axeon receives data; establish normalization/customer Work Type mapping; validate safe error and audit-log handling; and test browser CSP, popup, print, storage, and provider-gateway policy.

MAS 9.2+ and later portability is an explicit validation item, not a current compatibility claim. Review supported extension model, browser/session policy, API authorization behavior, approved hosting for the server-side AI gateway, logging/audit policy, and upgrade behavior in each target environment. No customer URL, credential, endpoint, Object Structure, or authentication method is defined by the local project.
