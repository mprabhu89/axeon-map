import { useEffect, useRef, useState, type FormEvent } from 'react';
import { pathLabels, type PathSegment } from '../model/exploration';
import {
  defaultInvestigationName, type RecentInvestigation, type SavedInvestigation,
} from '../model/investigationPersistence';
import { filterLabel, type InvestigationFilter } from '../model/investigationContext';

interface Props {
  mode: 'save' | 'browse';
  committedPath: readonly PathSegment[];
  committedFilters: readonly InvestigationFilter[];
  saved: readonly SavedInvestigation[];
  recent: readonly RecentInvestigation[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
  onResumeSaved: (item: SavedInvestigation) => void;
  onResumeRecent: (item: RecentInvestigation) => void;
  onDelete: (id: string) => void;
}

export function InvestigationLibrary({
  mode, committedPath, committedFilters, saved, recent, busy, error, onClose, onSave,
  onResumeSaved, onResumeRecent, onDelete,
}: Props) {
  const [name, setName] = useState(() => defaultInvestigationName(committedPath));
  const [nameError, setNameError] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (mode === 'save') nameRef.current?.focus();
    else closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, mode]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setNameError(true); return; }
    setNameError(false);
    onSave(trimmed);
  };

  return <div className="preview-backdrop">
    <section className="investigation-library" role="dialog" aria-modal="true" aria-labelledby="library-title">
      <div className="preview-heading">
        <div><span className="eyebrow">INVESTIGATION LIBRARY</span><h2 id="library-title">{mode === 'save' ? 'Save Investigation' : 'Saved & Recent Investigations'}</h2></div>
        <button ref={closeButtonRef} type="button" onClick={onClose} disabled={busy} aria-label="Close investigations">Close</button>
      </div>
      {mode === 'save' && <form className="library-save" onSubmit={submit}>
        <label className="field-label" htmlFor="investigation-name">INVESTIGATION NAME</label>
        <input ref={nameRef} id="investigation-name" type="text" maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setNameError(false); }} />
        <p className="placeholder-note">Saving committed path: {pathLabels(committedPath).join(' → ')}</p>
        {committedFilters.length > 0 && <p className="placeholder-note">Filters: {committedFilters.map(filterLabel).join('; ')}</p>}
        {nameError && <p role="alert" className="library-error">Enter an investigation name.</p>}
        <button type="submit" disabled={busy || (committedPath.length === 0 && committedFilters.length === 0)}>Save Investigation</button>
      </form>}
      {error && <p role="alert" className="library-error">{error}</p>}
      {mode === 'browse' && <>
        <div className="library-section">
          <h3>Saved Investigations</h3>
          {saved.length === 0 && <p className="placeholder-note">No saved investigations yet.</p>}
          <ul>{saved.map((item) => <li key={item.id}>
            <div className="library-item-copy"><strong>{item.name}</strong><span>{pathLabels(item.path).join(' → ')}</span>{item.filters?.length ? <small>Filters: {item.filters.map(filterLabel).join('; ')}</small> : null}</div>
            <div className="library-item-actions">
              <button type="button" onClick={() => onResumeSaved(item)} disabled={busy}>Open</button>
              {deleteId === item.id
                ? <>
                  <button type="button" onClick={() => { onDelete(item.id); setDeleteId(null); }} disabled={busy} aria-label={`Confirm delete ${item.name}`}>Confirm delete</button>
                  <button type="button" onClick={() => setDeleteId(null)} disabled={busy}>Cancel</button>
                </>
                : <button type="button" onClick={() => setDeleteId(item.id)} disabled={busy} aria-label={`Delete ${item.name}`}>Delete</button>}
            </div>
          </li>)}</ul>
        </div>
        <div className="library-section">
          <h3>Recent Investigations</h3>
          {recent.length === 0 && <p className="placeholder-note">No recent investigations yet.</p>}
          <ul>{recent.map((item) => <li key={JSON.stringify([item.path, item.filters])}>
            <div className="library-item-copy"><span>{pathLabels(item.path).join(' → ')}</span>{item.filters?.length ? <small>Filters: {item.filters.map(filterLabel).join('; ')}</small> : null}</div>
            <div className="library-item-actions"><button type="button" onClick={() => onResumeRecent(item)} disabled={busy}>Resume</button></div>
          </li>)}</ul>
        </div>
      </>}
    </section>
  </div>;
}
