import { useMemo, useState } from 'react';
import type { Retailer, LeverOverrides } from '../types';
import { formatDollars, formatPercent } from '../constants';
import {
  computeFreedResources,
  computeRedeployment,
  type AbsorptionRates,
  type PortfolioSummary,
} from './redeploymentDomain';
import './RedeploymentView.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  retailers: Retailer[];
  walkedAwayIds: Set<string>;
  overridesByRetailerId: Record<string, LeverOverrides>;
}

// ── RedeploymentView ──────────────────────────────────────────────────────────

export default function RedeploymentView({
  retailers,
  walkedAwayIds,
  overridesByRetailerId,
}: Props) {
  const remaining = useMemo(
    () => retailers.filter((r) => !walkedAwayIds.has(r.retailer_id)),
    [retailers, walkedAwayIds],
  );
  const walkedAway = useMemo(
    () => retailers.filter((r) => walkedAwayIds.has(r.retailer_id)),
    [retailers, walkedAwayIds],
  );

  // Absorption rates: 0–100 integer for slider, stored as 0.0–1.0 in state
  const [absorptionPcts, setAbsorptionPcts] = useState<Record<string, number>>(() =>
    Object.fromEntries(remaining.map((r) => [r.retailer_id, 0])),
  );

  // When remaining set changes (user toggles back), reset new retailers to 0
  const resolvedAbsorptionPcts = useMemo(() => {
    const resolved: Record<string, number> = {};
    for (const r of remaining) {
      resolved[r.retailer_id] = absorptionPcts[r.retailer_id] ?? 0;
    }
    return resolved;
  }, [remaining, absorptionPcts]);

  const absorptionRates: AbsorptionRates = useMemo(() => {
    const rates: AbsorptionRates = {};
    for (const [id, pct] of Object.entries(resolvedAbsorptionPcts)) {
      rates[id] = pct / 100;
    }
    return rates;
  }, [resolvedAbsorptionPcts]);

  const freed = useMemo(
    () => computeFreedResources(walkedAway, overridesByRetailerId),
    [walkedAway, overridesByRetailerId],
  );

  const result = useMemo(
    () => computeRedeployment(retailers, walkedAwayIds, overridesByRetailerId, absorptionRates),
    [retailers, walkedAwayIds, overridesByRetailerId, absorptionRates],
  );

  const walkedAwayNames = walkedAway.map((r) => r.name).join(', ');
  const netPositive = result.net_impact >= 0;

  function handleAbsorptionChange(retailerId: string, pct: number) {
    setAbsorptionPcts((prev) => ({ ...prev, [retailerId]: pct }));
  }

  return (
    <section className="redeployment" aria-label="Walk-away redeployment analysis">
      <h2 className="redeployment-title">If you walked away</h2>
      <p className="redeployment-subtitle">
        Resources freed by dropping {walkedAwayNames}. Drag absorption sliders to
        model how much of that freed capacity each remaining partner can absorb —
        and whether redeployment improves or worsens the portfolio.
      </p>

      {/* ── Freed resources ──────────────────────────────────────────────── */}
      <div className="freed-stats-heading">Resources freed</div>
      <div className="freed-stats">
        <FreedStatCard
          label="Revenue released"
          value={formatDollars(freed.revenue)}
          note="Gross revenue no longer on the books"
        />
        <FreedStatCard
          label="Working capital freed"
          value={formatDollars(freed.working_capital)}
          note="Cash tied up in payment terms"
        />
        <FreedStatCard
          label="Trade spend reclaimed"
          value={formatDollars(freed.trade_spend)}
          note="Slotting, promo, co-op no longer committed"
        />
        <FreedStatCard
          label="Labor overhead freed"
          value={formatDollars(freed.labor_overhead)}
          note="Compliance + dispute hours at labor rate"
        />
      </div>

      {/* ── Absorption sliders ───────────────────────────────────────────── */}
      {remaining.length > 0 && (
        <div className="absorption-section">
          <div className="absorption-heading">Redeployment absorption</div>
          <p className="absorption-description">
            How much of the freed revenue can each remaining partner absorb? Set
            0% if they cannot take more volume. Total absorption above 100% models
            revenue growth, not just redistribution.
          </p>
          <div className="absorption-list">
            {remaining.map((r) => {
              const pct = resolvedAbsorptionPcts[r.retailer_id] ?? 0;
              return (
                <div key={r.retailer_id} className="absorption-row">
                  <span className="absorption-retailer-name">{r.name}</span>
                  <div className="absorption-slider-wrap">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={pct}
                      onChange={(e) =>
                        handleAbsorptionChange(r.retailer_id, Number(e.target.value))
                      }
                      aria-label={`${r.name} absorption rate`}
                    />
                  </div>
                  <span className={`absorption-pct${pct > 0 ? ' nonzero' : ''}`}>
                    {formatPercent(pct / 100, 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Before/After comparison table ───────────────────────────────── */}
      <div className="comparison-section">
        <div className="comparison-heading">Portfolio before vs after</div>
        <ComparisonTable before={result.before} after={result.after} />
      </div>

      {/* ── Net impact callout ───────────────────────────────────────────── */}
      <div className={`net-impact ${netPositive ? 'positive' : 'negative'}`}>
        <div className="net-impact-label">Net portfolio impact</div>
        <div className={`net-impact-value ${netPositive ? 'positive' : 'negative'}`}>
          {result.net_impact >= 0 ? '+' : ''}
          {formatDollars(result.net_impact)}
        </div>
        <p className="net-impact-caption">
          {netPositive
            ? 'Walking away and redeploying improves total portfolio contribution.'
            : 'Walking away reduces total portfolio contribution at current absorption rates. Increase absorption or reconsider the exit.'}
        </p>
      </div>
    </section>
  );
}

// ── FreedStatCard ─────────────────────────────────────────────────────────────

interface FreedStatCardProps {
  label: string;
  value: string;
  note: string;
}

function FreedStatCard({ label, value, note }: FreedStatCardProps) {
  return (
    <div className="freed-stat-card">
      <div className="freed-stat-label">{label}</div>
      <div className="freed-stat-value">{value}</div>
      <div className="freed-stat-note">{note}</div>
    </div>
  );
}

// ── ComparisonTable ───────────────────────────────────────────────────────────

interface ComparisonTableProps {
  before: PortfolioSummary;
  after: PortfolioSummary;
}

function ComparisonTable({ before, after }: ComparisonTableProps) {
  const rows: Array<{
    label: string;
    beforeVal: string;
    afterVal: string;
    delta: number;
    formatDelta: (n: number) => string;
  }> = [
    {
      label: 'Total Revenue',
      beforeVal: formatDollars(before.total_revenue),
      afterVal: formatDollars(after.total_revenue),
      delta: after.total_revenue - before.total_revenue,
      formatDelta: formatDollars,
    },
    {
      label: 'True Contribution',
      beforeVal: formatDollars(before.total_contribution),
      afterVal: formatDollars(after.total_contribution),
      delta: after.total_contribution - before.total_contribution,
      formatDelta: formatDollars,
    },
    {
      label: 'Working Capital',
      beforeVal: formatDollars(before.total_working_capital),
      afterVal: formatDollars(after.total_working_capital),
      delta: after.total_working_capital - before.total_working_capital,
      formatDelta: (n) => (n === 0 ? '—' : formatDollars(n)),
    },
    {
      label: 'Retailers',
      beforeVal: String(before.retailer_count),
      afterVal: String(after.retailer_count),
      delta: after.retailer_count - before.retailer_count,
      formatDelta: (n) => (n >= 0 ? `+${n}` : String(n)),
    },
  ];

  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Before</th>
          <th>After</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isPositiveDelta = row.delta > 0;
          const isNegativeDelta = row.delta < 0;
          const deltaClass = isPositiveDelta
            ? 'delta-positive'
            : isNegativeDelta
              ? 'delta-negative'
              : 'delta-neutral';

          // For working capital, a reduction (negative delta) is actually good
          const workingCapitalRow = row.label === 'Working Capital';
          const effectiveClass = workingCapitalRow
            ? isNegativeDelta
              ? 'delta-positive'
              : isPositiveDelta
                ? 'delta-negative'
                : 'delta-neutral'
            : row.label === 'Retailers'
              ? 'delta-neutral'
              : deltaClass;

          const deltaStr =
            row.delta === 0
              ? '—'
              : `${row.delta > 0 ? '+' : ''}${row.formatDelta(row.delta)}`;

          return (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.beforeVal}</td>
              <td>{row.afterVal}</td>
              <td className={effectiveClass}>{deltaStr}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
