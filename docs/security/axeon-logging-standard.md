# Axeon Map logging standard

## Purpose and boundary

The local logging foundation records small operational-security metadata for development and support diagnostics. It is not an audit trail, a SIEM integration, or proof of Maximo authorization.

`app/src/support/logger.ts` defines the only browser logger. Each event includes a timestamp, central Axeon version, level, and allowlisted metadata. Callers cannot attach arbitrary objects.

## Levels and event types

| Level | Use |
| --- | --- |
| DEBUG | development diagnostics only; suppressed in production builds |
| INFO | bounded normal operational marker |
| WARN | recoverable technical failure, such as report-window opening/preparation failure |
| ERROR | nonrecoverable technical failure when a safe classification exists |
| SECURITY | rejected adapter/provider configuration, invalid report snapshot, tampered persistence, or CSV formula sanitization |

Technical logs identify a safe component and operation. Security events identify the rejection/sanitization category. Neither substitutes for a future enterprise audit event system.

## Allowlisted metadata

Allowed fields are event code, component, short operation, result, opaque correlation ID, safe adapter error code, adapter ID/mode, provider ID, and scope category. Correlation IDs are random opaque `axc-` identifiers; they must not encode Work Order IDs, site names, users, or paths.

Never log: Work Orders, evidence arrays, findings payloads, report content, AI Context Packs/answers, questions, Maximo response bodies, exported CSV, filters/path values, credentials, tokens, cookies, headers, URLs/endpoints, SQL, stack traces, or arbitrary exception objects.

## Operational behavior

Development browser output may use the browser console with sanitized structured events. Tests inject a sink and do not print deliberately malformed/tampered inputs. A production deployment must route the same safe event shape through an approved platform logging facility with retention, access, alerting, and audit requirements defined by the customer.
