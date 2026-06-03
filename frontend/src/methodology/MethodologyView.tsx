import type { Retailer, CostLayerBreakdown } from '../types';
import { calculateContributions } from '../calculations';
import { NEGOTIABILITY_COLORS, formatDollars } from '../constants';
import './MethodologyView.css';

interface Props {
  retailers: Retailer[];
  onContinue: () => void;
  onBack: () => void;
}

// ─── Mini-chart ────────────────────────────────────────────────

interface MiniChartProps {
  retailers: Retailer[];
  layerKey: keyof CostLayerBreakdown;
}

function LayerMiniChart({ retailers, layerKey }: MiniChartProps) {
  const contributions = calculateContributions(retailers);
  const walmart = contributions.find(r => r.retailer_id === 'walmart');
  const costco = contributions.find(r => r.retailer_id === 'costco');
  if (!walmart || !costco) return null;

  const wVal = walmart.cost_breakdown[layerKey];
  const cVal = costco.cost_breakdown[layerKey];
  const maxVal = Math.max(wVal, cVal, 1);
  const BAR_H = 20;
  const MAX_W = 200;

  return (
    <svg
      width={MAX_W + 120}
      height={80}
      className="layer-mini-chart"
      aria-label={`Cost comparison: Walmart vs Costco for this cost layer`}
    >
      {/* Walmart bar */}
      <text x={0} y={BAR_H / 2 + 4} className="mini-label">Walmart</text>
      <rect
        x={80}
        y={0}
        width={(wVal / maxVal) * MAX_W}
        height={BAR_H}
        fill="var(--tokyo-40)"
      />
      <text
        x={80 + (wVal / maxVal) * MAX_W + 6}
        y={BAR_H / 2 + 4}
        className="mini-value"
      >
        {formatDollars(wVal)}
      </text>

      {/* Costco bar */}
      <text x={0} y={BAR_H + 24 + BAR_H / 2 + 4} className="mini-label">Costco</text>
      <rect
        x={80}
        y={BAR_H + 24}
        width={(cVal / maxVal) * MAX_W}
        height={BAR_H}
        fill="var(--hk-35)"
      />
      <text
        x={80 + (cVal / maxVal) * MAX_W + 6}
        y={BAR_H + 24 + BAR_H / 2 + 4}
        className="mini-value"
      >
        {formatDollars(cVal)}
      </text>
    </svg>
  );
}

// ─── Negotiability badge ──────────────────────────────────────

interface TagProps {
  label: string;
}

function NegotiabilityTag({ label }: TagProps) {
  const color = NEGOTIABILITY_COLORS[label] ?? NEGOTIABILITY_COLORS['Internal'];
  return (
    <span className="negotiability-tag" style={{ color, borderColor: color }}>
      {label === 'Internal' ? 'Internal — fixed operationally' : `${label} negotiable`}
    </span>
  );
}

// ─── Main view ────────────────────────────────────────────────

export default function MethodologyView({ retailers, onContinue, onBack }: Props) {
  return (
    <div className="page methodology-page">
      <div className="brand">
        <span className="brand-name">Lailara LLC</span>
        <span className="brand-sub">Retailer Scorecard &amp; Renegotiation Simulator</span>
      </div>

      <button className="nav-back" onClick={onBack}>← Back to start</button>

      <div className="methodology-header">
        <h1 className="methodology-title">How is this calculated?</h1>
        <p className="methodology-intro">
          Six cost layers sit between gross revenue and true contribution.
          Most brands track one or two. This model attributes all six to
          each retail account, using rates calibrated against CPG industry
          benchmarks for specialty food brands at the $20–30M revenue scale.
        </p>
      </div>

      {/* ── 1. Deductions & Chargebacks ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Deductions &amp; Chargebacks</h2>
          <NegotiabilityTag label="Partly" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="deductions" />
        <p className="section-body">
          Every major retailer deducts from invoices for OTIF failures, shortage
          claims, and pricing chargebacks. Walmart alone runs three separate
          deduction systems — APDP, HighRadius, and Retail Link — each with its
          own claim codes and dispute windows. A brand that has never mapped these
          systems can lose 7–9% of its Walmart revenue to deductions before the
          first sales call of the year. The typical recovery rate on a disputed
          claim is 30–50%, which means the discipline of actually filing — and
          filing on time — is worth more than the dispute outcome.
        </p>
        <p className="section-body">
          The negotiability is partial. Compliance deductions (OTIF, label fines)
          are on the vendor, not the buyer. Buyers don't negotiate their own
          enforcement programs. What moves is the deduction rate over time, as
          compliance improves — but that is an operational fix, not a terms fix.
        </p>
      </section>

      {/* ── 2. Trade Spend ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Trade Spend</h2>
          <NegotiabilityTag label="Often" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="trade_spend" />
        <p className="section-body">
          Trade spend is the most visible cost layer and, for that reason, often
          the one that gets negotiated hardest. Slotting fees, cooperative
          advertising, promotional discounts, and major chain business (MCB)
          funding together represent 10–30% of gross revenue, depending on
          channel. Walmart's funding requirements run near the top of that range
          for brands without leverage; specialty retailers like Sprouts run near
          the bottom.
        </p>
        <p className="section-body">
          The lever is real. Promo percentage is where most buyer meetings happen,
          and most give is possible. Slotting is harder to move once it is
          committed — but as a contract term at renewal, it is the most logical
          negotiation target. Brands that walk into renewal with a cost-to-serve
          model in hand — knowing exactly what each point of trade spend costs
          over the year — consistently get better outcomes than those who
          negotiate from the ERP line item.
        </p>
      </section>

      {/* ── 3. Working-Capital Drag ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Working-Capital Drag</h2>
          <NegotiabilityTag label="Sometimes" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="working_capital_drag" />
        <p className="section-body">
          Payment terms are a tax on growth. At net 60 terms — standard for
          Walmart — the brand is effectively lending the retailer three weeks of
          revenue, paid back at the brand's cost of capital. For a brand with 12%
          blended cost of capital, 60-day terms on a $3.6M Walmart relationship
          cost $71,000 per year. That is not a rounding error. It is a meaningful
          drag that grows in lockstep with the account.
        </p>
        <p className="section-body">
          Terms move slowly. They tend to improve with scale and with demonstrated
          sell-through performance. Brands that have them in the deal from the
          start — or that negotiate them explicitly at renewal — rarely get net 45
          or better from a major retailer without a track record. Distributors like
          KeHE and UNFI are often easier on terms than the retailers they serve.
        </p>
      </section>

      {/* ── 4. Labor Overhead ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Labor Overhead</h2>
          <NegotiabilityTag label="Internal" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="labor_overhead" />
        <p className="section-body">
          No standard P&amp;L assigns compliance hours to a retail account. The
          deduction portal for Walmart requires navigating three separate systems.
          Dispute resolution for a single chargeback can take 90 minutes of analyst
          time. Multiplied by the volume of deductions in a high-revenue account
          and the hours-per-event for each retailer's specific process, labor
          overhead is often the biggest surprise in a cost-to-serve model —
          because it has never been measured.
        </p>
        <p className="section-body">
          The lever here is internal. Buyers do not negotiate the complexity of
          their own portals. Labor cost per account falls when the brand automates
          dispute filing, builds a deduction-tracking system, or simply dedicates
          an analyst to the account. The intervention is operational.
        </p>
      </section>

      {/* ── 5. Swell & Returns ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Swell &amp; Returns</h2>
          <NegotiabilityTag label="Rarely" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="swell_returns" />
        <p className="section-body">
          Swell — unsaleables, damage, and returns — is one of the stickiest cost
          layers in retail. Contractual return thresholds are set at channel setup
          and almost never revisited. Walmart's return policy and high-volume depot
          model produce higher swell rates than specialty retailers whose stores
          handle product more carefully. The delta between a 1.0% swell rate
          (Sprouts) and a 2.5% rate (Walmart) costs $54,000 on a $3.6M account.
        </p>
        <p className="section-body">
          Negotiating swell allowances down requires evidence — documented damage
          claims, photographic proof of delivery condition — and is typically a
          multi-year effort. The near-term lever is internal: better packaging,
          better pallet protection, improved carrier selection.
        </p>
      </section>

      {/* ── 6. Logistics Variance ── */}
      <section className="method-section">
        <div className="method-section-header">
          <h2 className="section-title">Logistics Variance</h2>
          <NegotiabilityTag label="Sometimes" />
        </div>
        <LayerMiniChart retailers={retailers} layerKey="logistics_variance" />
        <p className="section-body">
          Retailers impose routing guide requirements, pallet programs, and MOQ
          minimums that create cost differentials across accounts. Walmart's SQEP
          pallet requirements, its routing-guide complexity, and the penalties for
          mixed-pallet deviations add 3–5% to the landed cost of goods compared
          to a simpler regional retailer. Costco's depot cross-dock model, by
          contrast, is operationally efficient — high-volume palletized shipments
          that minimize per-unit handling.
        </p>
        <p className="section-body">
          The negotiable portion is modest but real. Bracket pricing for volume
          commitments, negotiated MOQ minimums, and pallet surcharge waivers for
          direct-to-distribution-center shipments are all items that appear in
          renewal conversations. Brands that approach logistics as a fixed cost —
          rather than a line item in the terms negotiation — systematically overpay.
        </p>
      </section>

      {/* ── CTA ── */}
      <div className="methodology-cta">
        <p className="methodology-cta-label">
          Six layers. Six retailers. One net-negative account.
        </p>
        <button className="methodology-cta-btn" onClick={onContinue}>
          Explore the simulator →
        </button>
      </div>

      <div className="footer">
        <p>
          All figures synthetic. Rates calibrated against CPG industry benchmarks
          for specialty food brands at the $20–30M revenue scale.
        </p>
      </div>
    </div>
  );
}
