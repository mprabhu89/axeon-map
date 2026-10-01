import type { AxeonAILoad } from '../model/useAxeonAI';
import type { AIExecutionStatus } from '../ai/providerResolver';

export function AxeonAIResponse({ load, onRetry, availability }: {
  load: AxeonAILoad;
  onRetry: () => void;
  availability?: { status: AIExecutionStatus; message: string };
}) {
  return <section className="axeon-ai-response" aria-label="Axeon AI response">
    <h4>AXEON AI</h4>
    {load.status === 'idle' && <p className="ai-state">{availability && availability.status !== 'active'
      ? availability.message
      : 'Choose a suggested question or submit your own question.'}</p>}
    {load.status === 'loading' && <p className="ai-state" role="status">Preparing a grounded response for this context…</p>}
    {load.status === 'error' && <div className="ai-state" role="alert">Axeon AI is unavailable. Please retry.<button className="retry-button" type="button" onClick={onRetry}>Retry Axeon AI</button></div>}
    {load.status === 'ready' && <div className="ai-answer">
      <span className="ai-grounding">{load.response.groundingStatus === 'grounded' ? 'GROUNDED IN CURRENT AXEON FINDINGS' : 'LIMITED EVIDENCE'}</span>
      <span className="field-label">QUESTION</span><p>{load.question}</p>
      <span className="field-label">ANSWER</span><p>{load.response.answer}</p>
      {load.response.evidenceReferences.length > 0 && <><span className="field-label">BASED ON</span><ul>{load.response.evidenceReferences.map((reference) => <li key={reference.findingId}>{reference.lens} — {reference.title}</li>)}</ul></>}
      {load.response.nextChecks.length > 0 && <><span className="field-label">SUGGESTED NEXT CHECKS</span><ul>{load.response.nextChecks.map((check) => <li key={check}>{check}</li>)}</ul></>}
      {load.response.limitations.length > 0 && <><span className="field-label">LIMITATIONS</span><ul>{load.response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></>}
      <p className="ai-provider-note">Deterministic Mock AI Provider · local architecture validation</p>
    </div>}
  </section>;
}
