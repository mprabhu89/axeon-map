# Task 012 — Advanced Work Management Intelligence

## Evidence-gap review

Reliability and Optimization were supportable from existing Task 009 evidence, so neither needed a new field or planted signal. Risk needed a controlled combination of priority, unresolved lifecycle, age and overdue target; a small SITE-F INPRG subset supplies it. Data Quality needed realistic incomplete operational coding; a small SITE-E reactive subset has a null asset. No invalid lifecycle dates, failure evidence, SLA evidence, labor/material/cost data or arbitrary score was introduced.

## Automated verification

`advancedAnalytics.test.ts` verifies all four new rules, generic rather than planted-identity logic, supported/unsupported interpretations, valid null lifecycle handling, no blank aggregate nodes, no raw Work Order arrays, a single evidence request across eight detectors, shared finding shape and deterministic ordering. Component and App integration tests verify structured rendering/disclosure, five-item visible limit plus View all, committed and prospective contexts, existing questions, and unchanged breadcrumb behavior. The full prior exploration, records, export, persistence, analytics, stale-response and retry suite remains included.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full test suite | Passed, 85 tests in 12 files (`npm test -- --run`) | AX-FR-ANA-005/006/007/008, AX-NFR-ANA-002, prior GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build`; 50 modules transformed | AX-PR-001, AX-DEP-001 |
| Local runtime | Vite served the app at `http://127.0.0.1:5182/` | AX-UX-001 |
| Browser verification | Passed in installed Microsoft Edge through DevTools automation | AX-FR-ANA-003/004/005/006/007/008 |

## Development-only calculated evidence

| Context | Detector | Rule | Calculated metric | Threshold | Result |
| --- | --- | --- | --- | --- | --- |
| Asset: A-PUMP-01 | AX-ANA-REL-001 | Sustained reactive history across periods | 37 reactive orders across 3 periods / 180 days | ≥35 orders and ≥3 periods | Qualifies, attention |
| Site: SITE-F | AX-ANA-RISK-001 | Priority 1, unresolved, aged and overdue concentration | 9 of 16 high-priority unresolved | ≥60 days and ≥8 orders | Qualifies, attention |
| Site: SITE-E | AX-ANA-DQ-001 | Missing asset among reactive work | 13 of 145; 8.97% | ≥8 and ≥5% | Qualifies, attention |
| Site: SITE-D | AX-ANA-OPT-001 | High reactive mix concentrated on top three assets | 73 of 239; 30.54% concentration; 85.36% reactive | ≥100 reactive, ≥80% reactive, ≥28% concentration | Qualifies, attention |
| Site: SITE-B | All eight rules | Each documented rule evaluated | No finding satisfies all applicable thresholds | Rule-specific | Nonqualifying, `[]` |

Existing ground truths remained exact: SITE-A aging 29 of 225, A-PUMP-01 recent repeat 15, SITE-C scheduled-PM bottleneck 9 of 13, SITE-D reactive share 85.36%, and authorized mock baseline 71.8%. These are local synthetic verification facts and are not hardcoded into detector logic or exposed as a development report in the product.

## Codex browser verification

Automated against the local Vite app in installed Microsoft Edge:

- Inspected SITE-A prospectively: committed breadcrumb remained `Work Orders`; aging remained `29 of 225 approvals`, `Aged ≥ 90 days`. The compact section showed five of ten findings, and **View all findings** exposed all ten with **Show fewer findings** available.
- Inspected Asset A-PUMP-01 prospectively: Reliability showed `37 reactive orders` across `3 periods / 180 days`; disclosure showed rule `AX-ANA-REL-001`, thresholds, composition and date range.
- Inspected SITE-F prospectively: Risk showed `9 of 16 high-priority unresolved`, `Aged ≥ 60 days · overdue`; disclosure showed `AX-ANA-RISK-001` and the priority/age/count rule.
- Inspected SITE-E prospectively: Data Quality showed `13 of 145 reactive orders`, `Missing asset · 9.0%`.
- Inspected SITE-D prospectively: Optimization showed `30.5% concentrated`, `Top 3 assets · 73 of 239 reactive`; existing Work Mix remained `85.4% reactive`, baseline `71.8%`, difference `+13.6 pts`.
- Inspected SITE-B: the exact neutral no-finding state appeared.
- In every inspection, the committed breadcrumb remained `Work Orders`, Questions to Investigate remained separate, and no raw `SYN-WO-` identifier appeared in findings.

This validates the synthetic local browser presentation only. It does not validate real Maximo authorization, supported MAF deployment, or AI. User manual acceptance remains required.

## Security and scope

All eight detectors consume one adapter-supplied evidence response for the exact context. The local scope marker is not real authorization. A future Real Adapter must restrict evidence and baselines under current-user Maximo authorization before analysis. Findings and evidence are not stored in localStorage. Authorized MAS/MAF deployment remains unvalidated.
