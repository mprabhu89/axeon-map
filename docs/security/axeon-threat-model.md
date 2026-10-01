# Axeon Map V1 threat model

| Threat | V1 control | Residual validation |
| --- | --- | --- |
| User sees data outside Maximo authorization | Real Adapter contract requires authorization before every bounded operation; Mock scope is visibly developmental | Prove in authorized MAS with role/site/org tests |
| Real adapter silently returns Mock data | explicit adapter resolver, nonexecuting Real port, typed fail-closed errors | Validate Real deployment selection/configuration |
| Client over-fetches Work Orders | aggregate-first requests, 16/20/50/report bounds, no React synthetic imports | Test payload and server limits with Real APIs |
| Report URL leaks operational context | opaque report key only; bounded same-origin session snapshot | Browser policy and multi-tab validation |
| Stored data is tampered | schema/version/shape validation; invalid state fails closed | Browser storage remains user-controlled; never treat it as authority |
| XSS from Maximo or user text | React text rendering; no unsafe HTML API; labels treated as untrusted data | CSP/headers and Real payload testing in MAS |
| CSV formula execution | quote and apostrophe-prefix formula-leading cells | Test customer spreadsheet tooling |
| Prompt injection or unauthorized AI disclosure | minimal authorized Context Pack, text-as-data rule, provider gateway boundary | Validate future provider prompt and server controls |
| Provider secret exposure | no browser credentials or public provider call; production gateway required | Implement approved server secret management later |
| Sensitive diagnostics | allowlisted structured logger and safe UI errors | Integrate approved production audit/log service later |
| Popup/report snapshot abuse | synchronous open, opaque ID, expiry, schema and size validation | Browser popup/session behavior acceptance |

Out of scope for V1 local development: Maximo authentication, MAS network policy, CSP/security headers, production audit retention, SSO/session configuration, real AI provider implementation, and formal penetration testing.
