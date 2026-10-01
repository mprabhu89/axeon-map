# Task 013 — Grounded Axeon AI foundation

## Automated verification

`ai/contextPack.test.ts` verifies exact paths, population, normalized questions, reference time, scope marker, concise whitelisted finding evidence and exclusion of raw records, persistence data, unrelated branches and arbitrary state. `ai/mockProvider.test.ts` verifies provider-neutral structured responses, deterministic SITE-D calculations, valid evidence references, root-cause refusal and safe no-finding language. `App.ai.test.tsx` verifies explicit suggested/free-form execution, committed and prospective context, local loading/error/Retry, superseded-question and changed-context protection, unchanged spine, findings availability during AI failure, and exclusion from Saved/Recent persistence.

| Check | Result | Related requirements |
| --- | --- | --- |
| Full test suite | Passed, 101 tests in 15 files (`npm test -- --run`) | AX-FR-AI-005/006/007, AX-NFR-AI-006/007/008, prior GREEN requirements |
| Strict TypeScript | Passed, `npm run typecheck` | AX-PR-001 |
| Production build | Passed, `npm run build`; 55 modules transformed | AX-PR-001, AX-DEP-001 |
| Local runtime/browser | Vite served `http://127.0.0.1:5183/`; Edge automation passed | AX-FR-AI-006/007 |

Source inspection confirms no OpenAI, watsonx, Anthropic, Azure OpenAI or other AI SDK; no public provider fetch; and no provider credential, API key, SQL operation or Maximo write path. The only provider is the local deterministic mock behind the `AxeonAIGateway` interface.

## Development-only AI verification

| Context | Question | Grounding | Result |
| --- | --- | --- | --- |
| Site: SITE-D | Why should I investigate this? | Grounded | Uses 85.36% reactive, authorized baseline 71.80%, +13.56 points, and top-three concentration 73/239 (30.54%); references Work Mix and Optimization |
| Asset: A-PUMP-01 | Why did this pump fail? | Limited evidence | Recognizes Repeat Work/Reliability evidence but states failure-cause evidence is insufficient; invents no cause |
| Site: SITE-B | Are there any major problems here? | Limited evidence | States current rules produced no qualifying finding and that this does not establish absence of other issues |
| Committed SITE-A, inspected WAPPR | Why should I investigate this? | Grounded or limited according to supplied findings | Context Pack path is Work Orders → SITE-A → WAPPR while committed breadcrumb remains Work Orders → SITE-A |

## Security and performance evidence

AI execution occurs only after a question action. The Context Pack is built from the selected path, node count and already-loaded structured findings; it contains no raw Work Orders. The Mock Provider performs no network call. Context Packs/responses never enter localStorage. Provider errors expose only a generic message. Suggested next checks are text and trigger no navigation, exploration, record access or write. The current-user marker is not real authorization; an approved future server-side gateway and authorized MAS validation remain required.

## Codex browser verification

Automated in installed Microsoft Edge against the local Vite app:

- SITE-D displayed no answer before explicit action. Selecting its Optimization suggestion produced a separate grounded response using only the matching Optimization finding (`73 of 239`, `30.54%`) while Operational Findings remained visible. A suggested lens with no qualifying matching finding is separately tested to return Limited Evidence rather than substitute an unrelated lens.
- Free-form `Why should I investigate this?` used Work Mix and Optimization: 85.36% reactive, authorized baseline 71.80%, +13.56 percentage points, and top-three 73/239 (30.54%).
- Switching to A-PUMP-01 cleared the SITE-D answer. `Why did this pump fail?` returned Limited Evidence and refused to infer a failure cause while referencing Repeat Work and Reliability.
- SITE-B stated that current rules produced no qualifying findings and did not establish absence of other issues.
- With SITE-A committed and WAPPR inspected, the AI response bound to `Work Orders → Site: SITE-A → Status: WAPPR`; the committed breadcrumb stayed `Work Orders → Site: SITE-A`.
- Operational Findings and AXEON AI remained distinct DOM sections, and the bottom global command bar stayed `COMING LATER`.
- Saving the committed SITE-A path while WAPPR was inspected, resetting, and reopening restored SITE-A and recalculated findings; no old answer returned.
- Browser context switching cleared an existing answer. In-flight stale-context, newer-question protection, and provider-error isolation were additionally verified with injected-gateway integration tests because the production Mock Provider intentionally does not fail or delay.

The browser run used synthetic data and a deterministic local provider. It did not validate real Maximo authorization, MAF deployment or a real LLM/provider service. User manual acceptance remains required.
