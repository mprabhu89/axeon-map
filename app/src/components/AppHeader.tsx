export function AppHeader({ providerLabel, providerStatus, onOpenProvider }: {
  providerLabel: string;
  providerStatus: 'active' | 'disabled' | 'unavailable';
  onOpenProvider: (source: HTMLButtonElement) => void;
}) {
  return (
    <header className="app-header">
      <div className="brand" aria-label="Axeon Map">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <div className="brand-copy">
          <strong>AXEON <span>MAP</span></strong>
          <small>Operational Investigation</small>
        </div>
      </div>
      <div className="header-right">
        <button className="provider-status-trigger" type="button" onClick={(event) => onOpenProvider(event.currentTarget)} aria-label="Open AI provider settings">
          <span>AI Provider</span><strong>{providerLabel}</strong><small>{providerStatus === 'active' ? 'ACTIVE' : providerStatus === 'disabled' ? 'DISABLED' : 'NOT CONFIGURED'}</small>
        </button>
        <div className="scope-indicator"><span className="scope-dot" />Viewing: My permitted data</div>
        <div className="profile-placeholder" aria-label="User profile placeholder">AM</div>
      </div>
    </header>
  );
}
