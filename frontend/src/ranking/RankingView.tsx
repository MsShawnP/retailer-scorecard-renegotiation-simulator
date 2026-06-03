import { useMemo, useState } from 'react';
import type { Retailer, LeverOverrides } from '../types';
import { computeRankingLayout, type RankingMode, getBarX } from './rankingDomain';
import { calculateContributions } from '../calculations';
import { formatDollars, formatPercent } from '../constants';
import './RankingView.css';

interface Props {
  retailers: Retailer[];
  overrides?: Record<string, LeverOverrides>;
  defaultMode?: RankingMode;
}

const CONTAINER_WIDTH = 860;

export default function RankingView({
  retailers,
  overrides,
  defaultMode = 'gross',
}: Props) {
  const [mode, setMode] = useState<RankingMode>(defaultMode);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const layout = useMemo(
    () => computeRankingLayout(retailers, overrides, mode, CONTAINER_WIDTH),
    [retailers, overrides, mode]
  );

  const pinnedBar =
    pinnedId ? (layout.bars.find((b) => b.retailer_id === pinnedId) ?? null) : null;

  function handleBarClick(retailer_id: string) {
    setPinnedId((prev) => (prev === retailer_id ? null : retailer_id));
  }

  const BAR_HEIGHT = layout.yScale.bandwidth();

  return (
    <section className="ranking">
      <div className="ranking-controls">
        <button
          className={mode === 'gross' ? 'ranking-btn active' : 'ranking-btn'}
          onClick={() => setMode('gross')}
        >
          By gross revenue
        </button>
        <button
          className={mode === 'contribution' ? 'ranking-btn active' : 'ranking-btn'}
          onClick={() => setMode('contribution')}
        >
          By true contribution
        </button>
      </div>

      <div className="ranking-chart-wrap">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="ranking-svg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPinnedId(null);
          }}
        >
          {/* Zero-line axis — only meaningful in contribution mode with negatives */}
          <line
            x1={layout.margin.left + layout.zeroX}
            x2={layout.margin.left + layout.zeroX}
            y1={layout.margin.top}
            y2={layout.height - layout.margin.bottom}
            className="ranking-zero-line"
          />

          {/* Bars — each <g> has its own y transform; CSS transitions handle animation */}
          {layout.bars.map((bar) => {
            const isPinned = pinnedId === bar.retailer_id;
            const dimmed = pinnedId !== null && !isPinned;
            const x = layout.margin.left + getBarX(bar, layout.zeroX);
            const y = bar.y;

            return (
              <g
                key={bar.retailer_id}
                className="ranking-bar-group"
                transform={`translate(0, ${y})`}
                onClick={() => handleBarClick(bar.retailer_id)}
                role="button"
                tabIndex={0}
                aria-label={`${bar.name}: ${formatDollars(bar.bar_value)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleBarClick(bar.retailer_id);
                  }
                }}
              >
                <rect
                  x={x}
                  y={0}
                  width={Math.max(bar.bar_width, 1)}
                  height={BAR_HEIGHT}
                  fill={bar.bar_color}
                  opacity={dimmed ? 0.2 : 1}
                  rx={1}
                  className="ranking-bar"
                />

                {/* Retailer name label — left of chart */}
                <text
                  x={layout.margin.left - 8}
                  y={BAR_HEIGHT / 2}
                  dy="0.35em"
                  textAnchor="end"
                  className="ranking-label"
                  opacity={dimmed ? 0.3 : 1}
                >
                  {bar.name}
                </text>

                {/* Value label — right of bar */}
                <text
                  x={x + bar.bar_width + 8}
                  y={BAR_HEIGHT / 2}
                  dy="0.35em"
                  className={
                    `ranking-value${bar.is_negative ? ' ranking-value-negative' : ' ranking-value-positive'}`
                  }
                  opacity={dimmed ? 0.3 : 1}
                >
                  {formatDollars(bar.bar_value)}
                  {mode === 'contribution' && (
                    <tspan className="ranking-rate">
                      {' '}({formatPercent(bar.contribution_margin_rate)})
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Click-to-pin cost breakdown callout card */}
        {pinnedBar && (
          <CostBreakdownCard
            bar={pinnedBar}
            retailers={retailers}
            overrides={overrides}
            onDismiss={() => setPinnedId(null)}
          />
        )}
      </div>

      <p className="footnote">
        Source: Cinderhaven Data Platform, synthetic data.
        True contribution = gross margin minus deductions, trade spend,
        working-capital drag, labor overhead, swell &amp; returns, logistics
        variance, and distributor margin.
      </p>
    </section>
  );
}

// ── Cost breakdown callout card ───────────────────────────────────────────────

type PinnedBar = ReturnType<typeof computeRankingLayout>['bars'][0];

interface CostCardProps {
  bar: PinnedBar;
  retailers: Retailer[];
  overrides?: Record<string, LeverOverrides>;
  onDismiss: () => void;
}

function CostBreakdownCard({ bar, retailers, overrides, onDismiss }: CostCardProps) {
  const retailer = retailers.find((r) => r.retailer_id === bar.retailer_id);
  if (!retailer) return null;

  const contributions = calculateContributions([retailer], overrides);
  const contrib = contributions[0];
  const bd = contrib.cost_breakdown;

  const layers: [string, number][] = [
    ['Gross margin', bd.gross_margin],
    ['Deductions', -bd.deductions],
    ['Trade spend', -bd.trade_spend],
    ['Working-capital drag', -bd.working_capital_drag],
    ['Labor overhead', -bd.labor_overhead],
    ['Swell & returns', -bd.swell_returns],
    ['Logistics variance', -bd.logistics_variance],
    ...(bd.distributor_margin > 0
      ? ([['Distributor margin', -bd.distributor_margin]] as [string, number][])
      : []),
  ];

  return (
    <div
      className="ranking-card"
      role="dialog"
      aria-label={`Cost breakdown for ${bar.name}`}
    >
      <button
        className="ranking-card-close"
        onClick={onDismiss}
        aria-label="Close cost breakdown"
      >
        ×
      </button>

      <div className="ranking-card-name">{bar.name}</div>
      <div className="ranking-card-revenue">
        ${(bar.gross_revenue / 1e6).toFixed(2)}M gross revenue
      </div>

      <div className="ranking-card-layers">
        {layers.map(([label, value]) => (
          <div key={label} className="ranking-card-row">
            <span className="ranking-card-label">{label}</span>
            <span className={`ranking-card-value ${value < 0 ? 'neg' : 'pos'}`}>
              {formatDollars(value)}
            </span>
          </div>
        ))}
        <div className="ranking-card-row ranking-card-total">
          <span className="ranking-card-label">True contribution</span>
          <span
            className={`ranking-card-value ${
              contrib.true_contribution < 0 ? 'neg' : 'pos'
            }`}
          >
            {formatDollars(contrib.true_contribution)}
          </span>
        </div>
      </div>
    </div>
  );
}
