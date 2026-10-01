import type { InvestigationNode } from '../model/useInvestigation';
import type { Dimension } from '../model/exploration';

interface Props {
  spine: readonly InvestigationNode[];
  children: readonly InvestigationNode[];
  dimension: Dimension | null;
  hiddenCount: number;
  selectedId: string;
  onSelect: (node: InvestigationNode) => void;
  loading: boolean;
  error: boolean;
}

function NodeCard({ node, selected, current, root, onSelect }: {
  node: InvestigationNode;
  selected: boolean;
  current?: boolean;
  root?: boolean;
  onSelect: (node: InvestigationNode) => void;
}) {
  return (
    <div className={`node-card ${root ? 'node-root' : ''} ${node.kind === 'spine' && !selected ? 'is-spine' : ''} ${current ? 'is-current' : ''} ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="node-main"
        onClick={() => onSelect(node)}
        aria-pressed={selected}
        aria-label={`Select ${node.label}, ${node.count.toLocaleString()} Work Orders`}
      >
        <span className="node-kicker">{root ? 'INVESTIGATION ROOT' : node.kind === 'spine' ? current ? 'CURRENT CONTEXT' : 'SELECTED PATH' : node.dimension.toUpperCase()}</span>
        <span className="node-label">{node.label}</span>
        <span className="node-count">{node.count.toLocaleString()} <small>work orders</small></span>
      </button>
      <button
        type="button"
        className="node-info"
        onClick={() => onSelect(node)}
        aria-label={`Node Intelligence for ${node.label}`}
        title={`Node Intelligence for ${node.label}`}
      >i</button>
    </div>
  );
}

export function InvestigationCanvas({ spine, children, dimension, hiddenCount, selectedId, onSelect, loading, error }: Props) {
  return (
    <section className="canvas" aria-label="Investigation canvas">
      <div className="canvas-grid" aria-hidden="true" />
      <div className="canvas-topline">
        <div><span className="eyebrow">INVESTIGATION VIEW</span><h1>Work Order Landscape</h1></div>
        <span className="canvas-mode">{dimension ? `${dimension.toUpperCase()} DISTRIBUTION` : 'CHOOSE A DIMENSION'} <span aria-hidden="true">●</span> SYNTHETIC DATA</span>
      </div>
      {spine.length === 0 ? <div className="canvas-message" role={error ? 'alert' : 'status'}>{error ? 'Exploration data is unavailable. Try again from the panel.' : loading ? 'Loading investigation…' : 'No exploration data available.'}</div> : <div className="graph-scene">
        <div className="graph-spine" role="group" aria-label="Investigation spine">{spine.map((node, index) => <div className="graph-spine-item" key={node.id}>
          <div className="graph-root"><NodeCard node={node} root={index === 0} current={index === spine.length - 1} selected={node.id === selectedId} onSelect={onSelect} /></div>
          {index < spine.length - 1 && <div className="graph-spine-link" aria-hidden="true" />}
        </div>)}</div>
        {children.length > 0 && <><div className="graph-stem" aria-hidden="true" /><div className="graph-branches" aria-hidden="true" /></>}
        <div className="graph-sites" role="group" aria-label="Current candidate groups">
          {children.map((node) => <NodeCard key={node.id} node={node} selected={node.id === selectedId} onSelect={onSelect} />)}
        </div>
        {(loading || error) && <div className="graph-state" role={error ? 'alert' : 'status'}>{error ? 'Exploration data is unavailable. Try again from the panel.' : 'Loading investigation…'}</div>}
        {hiddenCount > 0 && <p className="node-limit-note">Showing the first {children.length} groups; {hiddenCount} more groups are hidden in this preview.</p>}
      </div>}
      <div className="canvas-footnote"><span className="tiny-diamond" /> Synthetic local preview <span className="footnote-divider">/</span> Counts calculated from fictitious records</div>
    </section>
  );
}
