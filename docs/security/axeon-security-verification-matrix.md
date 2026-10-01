# Axeon Map security verification matrix

| Control | Automated evidence | Manual / MAS evidence still required |
| --- | --- | --- |
| Fail-closed Real Adapter | Task 017 adapter readiness/contract tests | Configure a Real Adapter in authorized MAS |
| Authorized-data-first invariant | Task 017 context propagation and Task 020 code/document audit | Compare restricted and broad Maximo users |
| Bounded access | adapter contract tests for 16/20/50/report bounds | Inspect actual API behavior and performance |
| Safe persistence/report snapshots | persistence and Task 019 snapshot malformed/oversize/schema tests | Browser storage lifecycle check |
| XSS-safe rendering | Task 020 malicious-text rendering and source scan | CSP and actual Maximo text verification |
| CSV formula protection | CSV escaping/formula tests | Open a downloaded CSV in customer spreadsheet tooling |
| Context Pack minimization | Context Pack tests and Mock provider grounding tests | Review future server payload telemetry with approved tools |
| Safe logging | Task 020 logger allowlist/correlation tests | Configure production log retention/access controls |
| Dependency/repository hygiene | Task 020 package, audit, secrets, dangerous API scans | Repeat in release pipeline |

Automated checks demonstrate local controls only. They do not validate Maximo authorization, MAS deployment compatibility, production provider security, or formal compliance certification.
