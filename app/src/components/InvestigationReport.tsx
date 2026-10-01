import { useEffect, useRef } from 'react';
import type { InvestigationReportLoad } from '../model/useInvestigationReport';
import type { ReportFinding } from '../report/contracts';
import { ReportChart } from './report/ReportChart';
import { filterLabel } from '../model/investigationContext';

const label = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
const display = (value: string | number) => typeof value === 'number'
  ? Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1) : value;

function ReportFindingView({ finding }: { finding: ReportFinding }) {
  return <article className="report-finding">
    <div className="report-finding-heading"><span>{finding.lens}</span><small>{finding.severity}</small></div>
    <h3>{finding.title}</h3>
    <div className="report-finding-metric"><strong>{display(finding.metric.value)}{finding.metric.unit === 'percent' ? '%' : ''}</strong><span>{label(finding.metric.key)}</span></div>
    <p><b>{finding.affectedCount.toLocaleString()}</b> qualifying from an evaluated population of <b>{finding.populationCount.toLocaleString()}</b>.</p>
    <div className="report-evidence">
      <span className="report-section-tag">FACT / MEASURED EVIDENCE</span>
      <dl>
        <div><dt>Rule</dt><dd>{finding.ruleId}</dd></div>
        {finding.comparison && <div><dt>Baseline</dt><dd>{display(finding.comparison.value)}{finding.comparison.unit === 'percent' ? '%' : ` ${finding.comparison.unit}`}</dd></div>}
        {finding.thresholds.map((threshold) => <div key={threshold.key}><dt>{label(threshold.key)}</dt><dd>{threshold.operator} {threshold.value} {threshold.unit}</dd></div>)}
        {Object.entries(finding.evidence).map(([key, value]) => <div key={key}><dt>{label(key)}</dt><dd>{display(value)}</dd></div>)}
      </dl>
    </div>
  </article>;
}

export function InvestigationReport({ load, onClose, onRetry, onPrint = () => window.print(), closeMessage = null }: {
  load: InvestigationReportLoad;
  onClose: () => void;
  onRetry: () => void;
  onPrint?: () => void;
  closeMessage?: string | null;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return <div className="investigation-report-backdrop">
    <section className="investigation-report-shell" role="dialog" aria-modal="true" aria-labelledby="investigation-report-title">
      <div className="report-toolbar report-screen-only">
        <span>INVESTIGATION REPORT PREVIEW</span>
        <div>{closeMessage && <span className="report-close-message" role="status">{closeMessage}</span>}{load.status === 'ready' && <button type="button" onClick={onPrint}>Print / Save PDF</button>}<button ref={closeButton} type="button" onClick={onClose}>Close</button></div>
      </div>
      {load.status === 'loading' && <div className="report-state" role="status"><h2 id="investigation-report-title">Preparing Investigation Report</h2><p>Building bounded contextual visualizations and evidence…</p></div>}
      {load.status === 'error' && <div className="report-state" role="alert"><h2 id="investigation-report-title">Investigation Report unavailable</h2><p>The report could not be prepared. No investigation state was changed.</p><button type="button" onClick={onRetry}>Retry report</button></div>}
      {load.status === 'ready' && <article className="investigation-report">
        <header className="report-cover">
          <div className="report-brand"><span className="report-brand-mark" aria-hidden="true" /><strong>AXEON <b>MAP</b></strong></div>
          <span className="report-kicker">OPERATIONAL INTELLIGENCE</span>
          <h1 id="investigation-report-title">{load.report.title}</h1>
          <p className="report-path">{load.report.context.pathLabels.join(' → ')}</p>
          {load.report.context.filters.length > 0 && <div className="report-active-filters"><span>ACTIVE FILTERS</span><ul>{load.report.context.filters.map((filter) => <li key={filter.dimension}>{filterLabel(filter)}</li>)}</ul></div>}
          <div className="report-meta">
            <div><span>Context</span><strong>{load.report.context.nodeType}: {load.report.context.nodeLabel}</strong></div>
            <div><span>Generated</span><time dateTime={load.report.generatedAt}>{new Date(load.report.generatedAt).toLocaleString()}</time></div>
            <div><span>Scope</span><strong>{load.report.securityScope.label}</strong></div>
            <div><span>Provenance</span><strong>{load.report.provenance.label}</strong></div>
          </div>
          <p className="report-print-only">Generated from the exact represented Axeon investigation context.</p>
        </header>

        <main className="report-body">
          <section className="report-section" aria-labelledby="report-overview-title">
            <div className="report-section-heading"><span>01</span><div><p>EXECUTIVE OVERVIEW</p><h2 id="report-overview-title">Context at a glance</h2></div></div>
            <div className="report-kpis">{load.report.kpis.map((kpi) => <article key={kpi.id} className="report-kpi">
              <span>{kpi.label}</span><strong>{kpi.displayValue}</strong><p>{kpi.detail}</p>
            </article>)}</div>
          </section>

          {load.report.charts.length > 0 && <section className="report-section report-page-section" aria-labelledby="report-visuals-title">
            <div className="report-section-heading"><span>02</span><div><p>CONTEXT OVERVIEW</p><h2 id="report-visuals-title">Measured workload patterns</h2></div></div>
            <div className="report-chart-grid">{load.report.charts.map((chart) => <ReportChart key={chart.id} chart={chart} />)}</div>
          </section>}

          <section className="report-section report-page-section" aria-labelledby="report-findings-title">
            <div className="report-section-heading"><span>03</span><div><p>DETERMINISTIC ANALYTICS</p><h2 id="report-findings-title">Operational Findings</h2></div></div>
            {load.report.findings.length > 0
              ? <div className="report-findings">{load.report.findings.map((finding) => <ReportFindingView key={finding.id} finding={finding} />)}</div>
              : <p className="report-neutral">No qualifying operational findings for this context under the currently implemented deterministic rules. This does not establish that no other operational issues exist.</p>}
          </section>

          {load.report.aiInterpretation && <section className="report-section report-ai-section report-page-section" aria-labelledby="report-ai-title">
            <div className="report-section-heading"><span>04</span><div><p>AXEON AI INTERPRETATION</p><h2 id="report-ai-title">Grounded contextual interpretation</h2></div></div>
            <span className="report-ai-status">{load.report.aiInterpretation.groundingStatus === 'grounded' ? 'GROUNDED IN CURRENT AXEON FINDINGS' : 'LIMITED EVIDENCE'}</span>
            <p className="report-ai-question">{load.report.aiInterpretation.question}</p>
            <p className="report-ai-answer">{load.report.aiInterpretation.answer}</p>
            {load.report.aiInterpretation.evidenceReferences.length > 0 && <div><span className="report-section-tag">BASED ON</span><ul>{load.report.aiInterpretation.evidenceReferences.map((reference) => <li key={reference.findingId}>{reference.lens} — {reference.title}</li>)}</ul></div>}
            {load.report.aiInterpretation.limitations.length > 0 && <div><span className="report-section-tag">AI LIMITATIONS</span><ul>{load.report.aiInterpretation.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </section>}

          <section className="report-section report-closing report-page-section" aria-labelledby="report-next-title">
            <div className="report-section-heading"><span>{load.report.aiInterpretation ? '05' : '04'}</span><div><p>INVESTIGATION CONTINUITY</p><h2 id="report-next-title">Suggested next investigation areas</h2></div></div>
            <ul className="report-next-areas">{load.report.suggestedNextAreas.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="report-limitations"><span className="report-section-tag">LIMITATIONS & PROVENANCE</span><ul>{load.report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              {load.report.referenceTime && <p>Analytical reference time: <time dateTime={load.report.referenceTime}>{load.report.referenceTime.slice(0, 10)}</time></p>}
            </div>
          </section>
        </main>
        <footer className="report-footer"><strong>AXEON MAP</strong><span>Version {load.report.release.version} · Operational Investigation Report · Read-only</span></footer>
      </article>}
    </section>
  </div>;
}
