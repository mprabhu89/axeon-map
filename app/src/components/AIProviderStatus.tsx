import { useEffect, useRef } from 'react';
import type { AxeonAIConfiguration } from '../ai/configuration';
import type { AIExecutionStatus } from '../ai/providerResolver';
import { AI_PROVIDER_REGISTRY, type AIProviderStatus } from '../ai/providerRegistry';

const statusLabel = (status: AIProviderStatus) => status === 'active' ? 'ACTIVE'
  : status === 'not-configured' ? 'Not configured' : 'Unavailable';

export function AIProviderStatus({
  configuration, executionStatus, onClose,
}: {
  configuration: Readonly<AxeonAIConfiguration>;
  executionStatus: AIExecutionStatus;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const current = AI_PROVIDER_REGISTRY.find((provider) => provider.id === configuration.selectedProviderId)!;

  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return <div className="preview-backdrop">
    <section className="provider-status-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-status-title">
      <div className="preview-heading">
        <div><span className="eyebrow">SETTINGS / AI PROVIDER</span><h2 id="provider-status-title">AI Provider</h2></div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close AI provider settings">Close</button>
      </div>
      <div className="provider-current">
        <span className="field-label">CURRENT PROVIDER</span>
        <strong>{current.displayName}</strong>
        <span className={`provider-state is-${executionStatus}`}>{executionStatus === 'active' ? 'ACTIVE' : executionStatus === 'disabled' ? 'DISABLED' : 'NOT CONFIGURED'}</span>
        <p>{configuration.enabled
          ? 'Provider routing is configured behind the Axeon AI Gateway.'
          : 'Generative AI is disabled. Operational Findings and investigation guidance remain available.'}</p>
      </div>
      <div className="provider-integrations">
        <h3>Available integrations</h3>
        <ul>{AI_PROVIDER_REGISTRY.map((provider) => <li key={provider.id}>
          <div><strong>{provider.displayName}</strong>{provider.developmentOnly && <small>LOCAL DEVELOPMENT ONLY</small>}</div>
          <span className={`provider-state is-${provider.status}`}>{statusLabel(provider.status)}</span>
        </li>)}</ul>
      </div>
      <p className="provider-security-note">No provider credentials are stored or entered in this browser. Production integrations require an approved server-side adapter and validation.</p>
    </section>
  </div>;
}

