# Task 018 — Product identity, release readiness, and UX hardening

## Release identity

- Product: Axeon Map.
- Current version: `1.0.0-dev`.
- Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`.
- Authoritative source: `app/package.json`; the package lock is its generated dependency-state mirror.
- Typed consumer: `product/releaseMetadata.ts`, which validates the format and derives the channel.
- Displays: subtle application footer and Investigation Report provenance footer.
- Safe diagnostic contract: release, adapter ID/mode/availability, AI provider ID/status, and security-scope marker only.

## UX consistency audit

| Area | Classification | Result |
| --- | --- | --- |
| Open Records textual Close | C — user-visible approved defect | Replaced with top-right 38px icon button; `aria-label` and title are `Close` |
| Modal Escape and focus return | Existing accepted behavior | Retained and regression tested |
| Evidence disclosure focus | C — straightforward accessibility inconsistency | Added visible `summary:focus-visible` outline |
| Other dialog textual Close controls | Accepted UI | Retained; mechanical replacement was outside scope |
| Buttons and icon buttons | Existing accepted behavior | Native buttons retained; download and Close icons have accessible names/tooltips |
| Disabled states | Existing accepted behavior | Filter Apply, pagination, exports, save/delete, questions, and AI controls retain explicit disabled styling/state |
| Loading/error/Retry | Existing accepted behavior | Map, analytics, AI, records, report, and filters remain localized and user-safe |
| Back/Reset/Apply/Clear/Cancel | Existing accepted behavior | Labels and state semantics remain consistent |
| Modal focus trapping/background inertness | E — post-V1 improvement | Deferred pending MAF/browser validation |
| Formal accessibility certification | E — post-V1 improvement | Not claimed; formal assessment remains future work |

## Release-readiness audit

| Classification | Finding | Disposition |
| --- | --- | --- |
| A — intentional development disclosure | SYNTHETIC DATA, LOCAL EXPLORATION, deterministic Mock AI Provider, current development scope marker, and COMING LATER global AI bar | Retained for honest development-state labeling |
| B — safe internal artifact | Source comments, test fixtures, non-user-visible local package name, and disabled future-provider registry entries | Retained |
| C — user-visible defect | Missing unified product version; report lacked release identity; Open Records used textual Close despite approved refinement | Corrected |
| D — production blocker | No accidental credential, endpoint, SQL, stack trace, unrestricted debug log, localhost label, or false certification claim found | None introduced; Real Maximo/MAS validation remains intentionally unavailable |
| E — post-V1 improvement | Modal focus trapping/inertness, formal accessibility review, narrow/touch validation, shared modal header, support-metadata copy/export | Recorded in post-V1 backlog |

The Mock provider remains honestly ACTIVE only for local development; Real Maximo remains NOT CONFIGURED. No detector, dataset, adapter security behavior, report layout, provider route, or product workflow changed.

## Automated evidence

- Focused Task 018 suite: **46 passed** across 7 files.
- Full regression suite: **161 passed** across 28 files.
- Strict TypeScript (`tsc -b --pretty false`): **passed**.
- Production build: **passed**; 73 modules transformed.
- Tests cover the central version, typed metadata, source-divergence protection, application/report displays, safe diagnostics, icon semantics, Escape, focus restoration, adapter regression, and unchanged A4 report rules.
- No dependency, network integration, credential, commit, push, or remote was added.
