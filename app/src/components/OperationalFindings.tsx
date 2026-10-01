import { useEffect, useState } from 'react';
import type { AnalyticalFinding } from '../analytics/finding';
import type { FindingsLoad } from '../model/useOperationalFindings';

function threshold(finding: AnalyticalFinding, key: string): number | null {
  return finding.thresholds.find((item) => item.key === key)?.value ?? null;
}

function conciseEvidence(finding: AnalyticalFinding): { metric: string; context: string } {
  const count = finding.affectedCount.toLocaleString();
  const population = finding.populationCount.toLocaleString();
  switch (finding.lens) {
    case 'Backlog & Aging': return {
      metric: `${count} of ${population} approvals`,
      context: `Aged ≥ ${threshold(finding, 'currentStatusDays') ?? '—'} days`,
    };
    case 'Repeat Work': return {
      metric: `${count} reactive orders`,
      context: `${String(finding.evidence.asset ?? 'Asset')} · last ${threshold(finding, 'lookbackDays') ?? '—'} days`,
    };
    case 'Process Bottleneck': return {
      metric: `${count} of ${population} scheduled PM orders`,
      context: `In ${String(finding.evidence.status ?? 'current status')} ≥ ${threshold(finding, 'currentStatusDays') ?? '—'} days`,
    };
    case 'Work Mix': {
      const difference = finding.evidence.differencePercentagePoints;
      const baseline = finding.comparison?.value;
      return {
        metric: `${finding.metric.value.toFixed(1)}% reactive`,
        context: baseline === undefined ? 'Authorized baseline unavailable'
          : `Baseline ${baseline.toFixed(1)}%${typeof difference === 'number' ? ` · +${difference.toFixed(1)} pts` : ''}`,
      };
    }
    case 'Reliability': return {
      metric: `${count} reactive orders`,
      context: `${String(finding.evidence.asset ?? 'Asset')} · ${display(finding.evidence.activePeriods ?? 0)} periods / ${threshold(finding, 'lookbackDays') ?? '—'} days`,
    };
    case 'Risk': return {
      metric: `${count} of ${population} high-priority unresolved`,
      context: `Aged ≥ ${threshold(finding, 'reportAgeDays') ?? '—'} days · overdue`,
    };
    case 'Data Quality': return {
      metric: `${count} of ${population} reactive orders`,
      context: `Missing ${String(finding.evidence.fieldCategory ?? 'required data')} · ${finding.metric.value.toFixed(1)}%`,
    };
    case 'Optimization': return {
      metric: `${finding.metric.value.toFixed(1)}% concentrated`,
      context: `Top ${display(finding.evidence.topAssetCount ?? 0)} assets · ${count} of ${population} reactive`,
    };
  }
}

function label(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
}

function display(value: string | number): string {
  return typeof value === 'number' ? Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1) : value;
}

function FindingRow({ finding }: { finding: AnalyticalFinding }) {
  const summary = conciseEvidence(finding);
  return <li className="finding-row">
    <div className="finding-head"><span className="finding-lens">{finding.lens}</span><span className="finding-severity">{finding.severity}</span></div>
    <strong className="finding-title">{finding.title}</strong>
    <span className="finding-metric">{summary.metric}</span>
    <span className="finding-context">{summary.context}</span>
    <details className="finding-details">
      <summary>Evidence and rule</summary>
      <dl>
        <div><dt>Rule</dt><dd>{finding.ruleId}</dd></div>
        <div><dt>Metric</dt><dd>{label(finding.metric.key)}: {display(finding.metric.value)} {finding.metric.unit}</dd></div>
        <div><dt>Population</dt><dd>{finding.populationCount.toLocaleString()} Work Orders</dd></div>
        {finding.comparison && <div><dt>Baseline</dt><dd>{display(finding.comparison.value)} {finding.comparison.unit}</dd></div>}
        {finding.thresholds.map((item) => <div key={item.key}><dt>{label(item.key)} threshold</dt><dd>{item.operator} {item.value} {item.unit}</dd></div>)}
        {Object.entries(finding.evidence).map(([key, value]) => <div key={key}><dt>{label(key)}</dt><dd>{display(value)}</dd></div>)}
        <div><dt>Reference date</dt><dd>{finding.referenceTime.slice(0, 10)}</dd></div>
      </dl>
    </details>
  </li>;
}

export function OperationalFindings({ load, onRetry }: { load: FindingsLoad; onRetry: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const resultKey = load.status === 'ready' ? load.findings.map((finding) => finding.id).join('|') : load.status;
  useEffect(() => setShowAll(false), [resultKey]);
  const visibleLimit = 5;
  const visible = load.status === 'ready' && !showAll ? load.findings.slice(0, visibleLimit)
    : load.status === 'ready' ? load.findings : [];
  return <section className="operational-findings" aria-label="Operational Findings">
    <h4>Operational Findings</h4>
    {load.status === 'idle' && <p className="finding-state">Inspect a Work Order group to check this context.</p>}
    {load.status === 'loading' && <p className="finding-state" role="status">Checking this context for operational findings…</p>}
    {load.status === 'error' && <div className="finding-state" role="alert">Operational findings are unavailable. Please retry.<button className="retry-button" type="button" onClick={onRetry}>Retry operational findings</button></div>}
    {load.status === 'ready' && (load.findings.length
      ? <><ul className="finding-list">{visible.map((finding) => <FindingRow key={finding.id} finding={finding} />)}</ul>
        {load.findings.length > visibleLimit && <div className="finding-volume"><span>Showing {visible.length} of {load.findings.length} findings</span><button type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer findings' : 'View all findings'}</button></div>}</>
      : <p className="finding-state">No qualifying operational findings for this context.</p>)}
  </section>;
}
