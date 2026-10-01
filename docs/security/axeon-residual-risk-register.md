# Axeon Map V1 residual risk register

| Risk | Status | Owner / next action |
| --- | --- | --- |
| Real Maximo authorization is not implemented locally | Open | Validate adapter contract and authorization boundary in authorized MAS |
| MAS 9.2 and later portability is unvalidated | Open | Run deployment/configuration compatibility assessment |
| Customer Work Type analytical mapping is not configured | Open | Define approved administrator configuration after V1 |
| Browser storage can be user-modified | Accepted local limitation | Treat metadata as untrusted; revalidate through Real Adapter |
| Browser print output can be saved locally by the user | Accepted read-only output behavior | Apply customer browser/data-handling policy |
| Production logging/audit integration is absent | Open | Integrate approved server/platform observability without sensitive content |
| Production AI provider has no adapter or secret handling | Open | Implement approved server-side provider integration and threat review |
| Formal accessibility, security, and MAS certification are absent | Open | Conduct customer-approved validation before production release |
