import type { ReportChart as ReportChartModel } from '../../report/contracts';

const colors = ['#087f83', '#4e87a0', '#8aa6b3', '#c8a96b', '#6d7f91', '#5a9b7d', '#8d79a6', '#b07a72'];
const formatValue = (value: number) => Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);

function RankedBar({ chart }: { chart: ReportChartModel }) {
  const maximum = Math.max(...chart.values.map((item) => item.value), 1);
  return <div className="report-ranked-bars" role="list">
    {chart.values.map((item, index) => <div className="report-ranked-row" role="listitem" key={`${item.label}-${index}`}>
      <div className="report-ranked-label"><span>{item.label}</span><strong>{formatValue(item.value)}</strong></div>
      <div className="report-ranked-track" aria-hidden="true"><span style={{ width: `${(item.value / maximum) * 100}%`, backgroundColor: colors[index % colors.length] }} /></div>
    </div>)}
  </div>;
}

function Composition({ chart }: { chart: ReportChartModel }) {
  const total = chart.total ?? chart.values.reduce((sum, item) => sum + item.value, 0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <div className="report-composition">
    <svg viewBox="0 0 120 120" role="img" aria-label={chart.ariaLabel}>
      <title>{chart.title}</title>
      <circle className="report-donut-base" cx="60" cy="60" r={radius} />
      {chart.values.map((item, index) => {
        const length = total > 0 ? (item.value / total) * circumference : 0;
        const dashOffset = -offset;
        offset += length;
        return <circle key={`${item.label}-${index}`} className="report-donut-segment" cx="60" cy="60" r={radius}
          stroke={colors[index % colors.length]} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} />;
      })}
      <text x="60" y="57" textAnchor="middle" className="report-donut-total">{formatValue(total)}</text>
      <text x="60" y="72" textAnchor="middle" className="report-donut-caption">TOTAL</text>
    </svg>
    <ul className="report-chart-legend">{chart.values.map((item, index) => <li key={`${item.label}-${index}`}>
      <span style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
      <div><strong>{formatValue(item.value)}</strong><small>{item.label}</small></div>
    </li>)}</ul>
  </div>;
}

function Comparison({ chart }: { chart: ReportChartModel }) {
  return <div className="report-comparison" role="list" aria-label={chart.ariaLabel}>
    {chart.values.map((item, index) => <div className="report-comparison-item" role="listitem" key={`${item.label}-${index}`}>
      <div className="report-comparison-scale"><span style={{ height: `${Math.min(100, Math.max(0, item.value))}%`, backgroundColor: colors[index % colors.length] }} /></div>
      <strong>{item.value.toFixed(1)}%</strong><small>{item.label}</small>
    </div>)}
  </div>;
}

export function ReportChart({ chart }: { chart: ReportChartModel }) {
  return <figure className="report-chart" aria-label={chart.ariaLabel}>
    <figcaption><strong>{chart.title}</strong><span>{chart.description}</span></figcaption>
    {chart.kind === 'ranked-bar' && <RankedBar chart={chart} />}
    {chart.kind === 'composition' && <Composition chart={chart} />}
    {chart.kind === 'comparison' && <Comparison chart={chart} />}
    <p className="report-chart-source">{chart.source === 'contextual-aggregate' ? 'Context aggregate' : 'Deterministic finding evidence'}</p>
  </figure>;
}

