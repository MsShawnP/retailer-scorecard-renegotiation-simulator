import './EntryView.css';

interface Props {
  onExplore: () => void;
  onMethodology: () => void;
}

export default function EntryView({ onExplore, onMethodology }: Props) {
  return (
    <div className="page entry-page">
      <div className="brand">
        <span className="brand-name">Lailara LLC</span>
        <span className="brand-sub">Retailer Scorecard &amp; Renegotiation Simulator</span>
      </div>

      <div className="entry-hero">
        <h1 className="headline">
          Your proudest customer<br />is your heaviest anchor.
        </h1>
        <p className="entry-framing">
          Rank Cinderhaven's retail partners by gross revenue, then by true
          all-in contribution — after deductions, trade spend, working-capital
          drag, compliance labor, swell, and logistics are attributed to each
          account. The lists don't match. One major retailer runs net-negative.
        </p>
        <p className="entry-framing">
          Drag the levers of a real renegotiation to find the terms that flip
          the account positive — or the number that justifies walking away.
        </p>
      </div>

      <div className="entry-paths">
        <button className="entry-btn entry-btn-primary" onClick={onExplore}>
          Show me the inversion
        </button>
        <button className="entry-btn entry-btn-secondary" onClick={onMethodology}>
          How is this calculated?
        </button>
      </div>

      <div className="entry-meta">
        <p>
          Built on synthetic Cinderhaven data. $17.2M TTM revenue across
          6 retail relationships. All cost-layer rates calibrated against
          CPG industry benchmarks for specialty food brands at this scale.
        </p>
      </div>
    </div>
  );
}
