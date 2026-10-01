import { useEffect, useRef, useState } from 'react';
import { AI_QUESTION_MAX_LENGTH } from '../ai/contextPack';
import type { Dimension } from '../model/exploration';
import { pathLabels } from '../model/exploration';
import { suggestAnalyticalQuestions } from '../model/questionSuggestions';
import type { InvestigationNode } from '../model/useInvestigation';
import type { FindingsLoad } from '../model/useOperationalFindings';
import type { AxeonAILoad } from '../model/useAxeonAI';
import type { AIExecutionStatus } from '../ai/providerResolver';
import { AxeonAIResponse } from './AxeonAIResponse';
import { OperationalFindings } from './OperationalFindings';
import { filterLabel, type InvestigationFilter } from '../model/investigationContext';

interface Props {
  node: InvestigationNode | null;
  available: readonly Dimension[];
  canChooseDimension: boolean;
  filters: readonly InvestigationFilter[];
  onExplore: () => void;
  onOpenRecords: (source: HTMLButtonElement) => void;
  onOpenReport: (source: HTMLButtonElement) => void;
  onOpenFilters: (source: HTMLButtonElement) => void;
  onChooseDimension: (dimension: Dimension) => void;
  onBack: () => void;
  onReset: () => void;
  canBack: boolean;
  canReset: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  findings: FindingsLoad;
  onRetryFindings: () => void;
  ai: { load: AxeonAILoad; validationError: string | null; availability: { status: AIExecutionStatus; message: string; providerId: string }; askSuggested: (question: ReturnType<typeof suggestAnalyticalQuestions>[number]) => void; askFreeForm: (question: string) => void; retry: () => void };
}

export function ContextPanel({
  node, available, canChooseDimension, filters, onExplore, onOpenRecords, onOpenReport, onOpenFilters, onChooseDimension, onBack, onReset,
  canBack, canReset, loading, error, onRetry, findings, onRetryFindings, ai,
}: Props) {
  const [questionText, setQuestionText] = useState('');
  const questionInput = useRef<HTMLInputElement | null>(null);
  const nodeKey = JSON.stringify(node?.path ?? null);
  useEffect(() => setQuestionText(''), [nodeKey]);
  if (!node) return (
    <aside className="context-panel" aria-label="Selected node details">
      <div className="panel-topline"><span className="eyebrow">NODE CONTEXT</span></div>
      <div className="panel-message" role={error ? 'alert' : 'status'}>
        {error ? 'Exploration data is unavailable. Please retry.' : loading ? 'Loading node context…' : 'No node context available.'}
      </div>
      {error && <button className="retry-button" type="button" onClick={onRetry}>Retry</button>}
      <div className="nav-controls">
        <button type="button" onClick={onBack} disabled={!canBack}>Back</button>
        <button type="button" onClick={onReset} disabled={!canReset}>Reset Investigation</button>
      </div>
    </aside>
  );

  const inspectingCandidate = node.kind === 'candidate';
  const labels = pathLabels(node.path);
  const questions = suggestAnalyticalQuestions({ nodeDimension: node.dimension, nodeLabel: node.label, path: node.path, filters });
  const aiReady = (node.path.length === 0 || findings.status === 'ready') && ai.availability.status === 'active';
  return (
    <aside className="context-panel" aria-label="Selected node details">
      <div className="panel-topline">
        <span className="eyebrow">NODE CONTEXT</span>
        <span className="panel-status">{inspectingCandidate ? 'INSPECTING' : 'COMMITTED PATH'}</span>
      </div>
      <div className="selected-heading">
        <div className="selected-icon" aria-hidden="true">◇</div>
        <div><h2>{node.label}</h2><p>{node.count.toLocaleString()} Work Orders</p></div>
      </div>
      <div className="path-block">
        <span className="field-label">{inspectingCandidate ? 'PROSPECTIVE PATH' : 'CURRENT PATH'}</span>
        <div className="path-text" aria-label={labels.join(' to ')}>
          {labels.map((part, index) => <span key={`${index}-${part}`}>{index > 0 && <span className="path-arrow" aria-hidden="true">→</span>}{part}</span>)}
        </div>
      </div>
      {filters.length > 0 && <div className="context-filter-summary"><span className="field-label">ACTIVE FILTERS</span><p>{filters.map(filterLabel).join('; ')}</p></div>}
      <div className="nav-controls">
        <button type="button" onClick={onBack} disabled={!canBack}>Back</button>
        <button type="button" onClick={onReset} disabled={!canReset}>Reset Investigation</button>
      </div>
      {canChooseDimension && <div className="panel-section explore-section">
        <span className="field-label">EXPLORE BY</span>
        {available.length > 0
          ? <div className="dimension-options">{available.map((dimension) => <button key={dimension} type="button" onClick={() => onChooseDimension(dimension)}>{dimension}</button>)}</div>
          : <p className="placeholder-note">All dimensions are in the current path.</p>}
      </div>}
      <div className="panel-section">
        <span className="field-label">NODE ACTIONS</span>
        <div className="action-grid">
          {inspectingCandidate && <button className="explore-action" type="button" onClick={onExplore} aria-label={`Explore ${node.label}`}>Explore</button>}
          <button type="button" onClick={(event) => onOpenFilters(event.currentTarget)}>Filter</button>
          <button type="button" onClick={() => questionInput.current?.focus()} aria-label="Focus Axeon question" disabled={ai.availability.status !== 'active'}>Ask AI</button>
          <button type="button" onClick={(event) => onOpenRecords(event.currentTarget)}>Open Records</button>
          <button type="button" onClick={(event) => onOpenReport(event.currentTarget)}>Investigation Report</button>
        </div>
        <p className="placeholder-note">{inspectingCandidate ? 'Explore adds this node to the investigation path. Filter constrains the inspected context without committing it.' : 'Filter constrains this context without adding path nodes.'}</p>
      </div>
      {error && <div className="panel-message" role="alert">
        Exploration data is unavailable. Please retry.
        <button className="retry-button" type="button" onClick={onRetry}>Retry</button>
      </div>}
      <div className="panel-section intelligence-section">
        <div className="section-title"><span className="info-glyph" aria-hidden="true">i</span><h3>Node Intelligence</h3></div>
        <OperationalFindings load={findings} onRetry={onRetryFindings} />
        <h4 className="questions-heading">Questions to Investigate</h4>
        <p className="section-description">Select a question to ask against this exact context.</p>
        <ul className="question-list">{questions.map((question) => <li key={question.id}><button type="button" onClick={() => ai.askSuggested(question)} disabled={!aiReady} aria-label={`Ask Axeon: ${question.text}`}><span className="question-lens">{question.lens}</span><span>{question.text}</span></button></li>)}</ul>
        <label className="field-label" htmlFor="node-question">YOUR QUESTION</label>
        <form className="question-form" onSubmit={(event) => { event.preventDefault(); ai.askFreeForm(questionText); }}>
          <input ref={questionInput} id="node-question" type="text" value={questionText} onChange={(event) => setQuestionText(event.target.value)} maxLength={AI_QUESTION_MAX_LENGTH} placeholder="Ask your own question about this node..." aria-describedby="question-note question-error" />
          <button type="submit" disabled={!aiReady}>Ask Axeon</button>
        </form>
        <p id="question-note" className="placeholder-note">{ai.availability.status === 'active' ? 'Uses the configured local Mock AI Provider; no external LLM is connected.' : ai.availability.message}</p>
        {ai.validationError && <p id="question-error" className="question-error" role="alert">{ai.validationError}</p>}
        <AxeonAIResponse load={ai.load} onRetry={ai.retry} availability={ai.availability} />
      </div>
    </aside>
  );
}
