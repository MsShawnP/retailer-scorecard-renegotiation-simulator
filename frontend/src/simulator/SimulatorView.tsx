import { useMemo } from 'react';
import type { Retailer, LeverOverrides } from '../types';
import { calcTrueContribution, projectTrajectory } from '../calculations';
import { formatDollars, formatPercent, NEGOTIABILITY_COLORS } from '../constants';
import {
  buildLeverSpecs,
  computeCompoundBreakEven,
  formatLeverValue,
  type LeverSpec,
} from './simulatorDomain';
import './SimulatorView.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  retailers: Retailer[];
  selectedRetailerId: string;
  overridesByRetailerId: Record<string, LeverOverrides>;
  onSelectRetailer: (id: string) => void;
  onOverridesChange: (retailerId: string, overrides: LeverOverrides) => void;
  onResetRetailer: (retailerId: string) => void;
  walkedAwayIds: Set<string>;
  onToggleWalkAway: (id: string) => void;
}

// ── SimulatorView ─────────────────────────────────────────────────────────────

export default function SimulatorView({
  retailers,
  selectedRetailerId,
  overridesByRetailerId,
  onSelectRetailer,
  onOverridesChange,
  onResetRetailer,
  walkedAwayIds,
  onToggleWalkAway,
}: Props) {
  const retailer = retailers.find((r) => r.retailer_id === selectedRetailerId) ?? retailers[0];
  const overrides = overridesByRetailerId[retailer.retailer_id] ?? {};

  const baselineContrib = useMemo(() => calcTrueContribution(retailer, {}), [retailer]);
  const adjustedContrib = useMemo(
    () => calcTrueContribution(retailer, overrides),
    [retailer, overrides],
  );

  const leverSpecs = useMemo(
    () => buildLeverSpecs(retailer, overrides),
    [retailer, overrides],
  );

  const compoundBreakEven = useMemo(
    () => computeCompoundBreakEven(retailer, overrides),
    [retailer, overrides],
  );

  const delta = adjustedContrib - baselineContrib;
  const hasOverrides = Object.keys(overrides).length > 0;

  function handleLeverChange(lever: keyof LeverOverrides, value: number) {
    const next: LeverOverrides = { ...overrides, [lever]: value };
    onOverridesChange(retailer.retailer_id, next);
  }

  return (
    <section className="simulator">
      <h2 className="simulator-title">Renegotiation Simulator</h2>
      <p className="simulator-subtitle">
        Drag levers to model what happens when you renegotiate terms. The ranking
        above updates live. Break-even markers show where each lever alone would
        flip this retailer to profitability.
      </p>

      {/* ── Retailer tabs ──────────────────────────────────────────────────── */}
      <div className="simulator-tabs" role="tablist" aria-label="Select retailer">
        {retailers.map((r) => {
          const isWalkedAway = walkedAwayIds.has(r.retailer_id);
          return (
            <div key={r.retailer_id} className="simulator-tab-group">
              <button
                className={`simulator-tab${r.retailer_id === retailer.retailer_id ? ' active' : ''}${isWalkedAway ? ' walked-away' : ''}`}
                role="tab"
                aria-selected={r.retailer_id === retailer.retailer_id}
                onClick={() => onSelectRetailer(r.retailer_id)}
              >
                {r.name}
              </button>
              <button
                className={`walk-away-btn${isWalkedAway ? ' active' : ''}`}
                onClick={() => onToggleWalkAway(r.retailer_id)}
                aria-label={isWalkedAway ? `Restore ${r.name}` : `Walk away from ${r.name}`}
                title={isWalkedAway ? `Restore ${r.name}` : `Walk away from ${r.name}`}
              >
                {isWalkedAway ? '↩' : '✕'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Contribution summary ───────────────────────────────────────────── */}
      <div className="sim-summary" aria-label="Contribution summary">
        <div className="sim-summary-item">
          <span className="sim-summary-label">Baseline contribution</span>
          <span className={`sim-summary-value${baselineContrib >= 0 ? ' positive' : ' negative'}`}>
            {formatDollars(baselineContrib)}
          </span>
          <span className="sim-summary-delta">
            {formatPercent(baselineContrib / retailer.gross_revenue)} margin
          </span>
        </div>

        <div className="sim-summary-item">
          <span className="sim-summary-label">Adjusted contribution</span>
          <span className={`sim-summary-value${adjustedContrib >= 0 ? ' positive' : ' negative'}`}>
            {formatDollars(adjustedContrib)}
          </span>
          {hasOverrides && (
            <span className={`sim-summary-delta${delta >= 0 ? ' improved' : ' worsened'}`}>
              {delta >= 0 ? '+' : ''}{formatDollars(delta)} vs baseline
            </span>
          )}
        </div>
      </div>

      {/* ── Levers ────────────────────────────────────────────────────────── */}
      <div className="sim-levers">
        <div className="sim-levers-heading">Negotiation levers</div>
        {leverSpecs.map((spec) => (
          <LeverRow
            key={spec.lever}
            spec={spec}
            currentValue={
              (overrides[spec.lever] as number | undefined) ?? spec.range.current
            }
            isModified={spec.lever in overrides}
            onChange={(v) => handleLeverChange(spec.lever, v)}
          />
        ))}
      </div>

      {/* ── Compound break-even card ───────────────────────────────────────── */}
      <CompoundBreakEvenCard
        achievable={compoundBreakEven.achievable}
        steps={compoundBreakEven.steps}
        explanation={compoundBreakEven.explanation}
      />

      {/* ── Trajectory chart ──────────────────────────────────────────────── */}
      <div className="trajectory-section">
        <h3 className="trajectory-heading">24-month contribution trajectory</h3>
        <p className="trajectory-sub">
          Baseline (dashed) vs adjusted terms. Based on{' '}
          {formatPercent(retailer.growth_rate_annual)} annual growth rate.
        </p>
        <TrajectoryChart retailer={retailer} overrides={overrides} />
      </div>

      {/* ── Reset button ──────────────────────────────────────────────────── */}
      {hasOverrides && (
        <button
          className="sim-reset"
          onClick={() => onResetRetailer(retailer.retailer_id)}
          aria-label={`Reset all levers for ${retailer.name}`}
        >
          Reset {retailer.name} to baseline
        </button>
      )}
    </section>
  );
}

// ── LeverRow ──────────────────────────────────────────────────────────────────

interface LeverRowProps {
  spec: LeverSpec;
  currentValue: number;
  isModified: boolean;
  onChange: (value: number) => void;
}

function LeverRow({ spec, currentValue, isModified, onChange }: LeverRowProps) {
  const { lever, label, negotiabilityTag, unit, range, breakEvenValue } = spec;

  const isPaymentTerms = unit === 'days';
  const step = isPaymentTerms ? 1 : 0.001;

  // Break-even tick position as % along the track
  const tickPct =
    breakEvenValue !== null
      ? ((breakEvenValue - range.min) / (range.max - range.min)) * 100
      : null;

  const badgeClass = `neg-badge neg-badge-${negotiabilityTag}`;

  return (
    <div className="lever-row">
      <div className="lever-meta">
        <span className="lever-label">{label}</span>
        <span
          className={badgeClass}
          style={{ color: NEGOTIABILITY_COLORS[negotiabilityTag] }}
        >
          {negotiabilityTag}
        </span>
      </div>

      <div className="slider-wrap">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} slider`}
          title={
            tickPct !== null
              ? `Break-even at ${formatLeverValue(breakEvenValue!, lever)}`
              : 'Cannot reach break-even with this lever alone'
          }
        />
        {tickPct !== null && (
          <div
            className="slider-breakeven-tick"
            style={{ left: `${tickPct}%` }}
            title={`Break-even: ${formatLeverValue(breakEvenValue!, lever)}`}
            aria-hidden="true"
          />
        )}
      </div>

      <span className={`lever-value${isModified ? ' modified' : ''}`}>
        {formatLeverValue(currentValue, lever)}
      </span>
    </div>
  );
}

// ── CompoundBreakEvenCard ─────────────────────────────────────────────────────

interface CompoundCardProps {
  achievable: boolean;
  steps: Array<{
    lever: keyof LeverOverrides;
    fromValue: number;
    toValue: number;
    label: string;
  }>;
  explanation: string;
}

function CompoundBreakEvenCard({ achievable, steps, explanation }: CompoundCardProps) {
  return (
    <div className={`compound-card${achievable ? ' achievable' : ' not-achievable'}`}>
      <div className="compound-card-heading">Minimum path to break-even</div>
      <div className="compound-card-explanation">{explanation}</div>

      {steps.length > 0 && (
        <div className="compound-steps">
          {steps.map((step, i) => {
            const badgeStyle = {
              background:
                step.label === 'Often'
                  ? 'var(--pass-bg)'
                  : step.label === 'Partly'
                    ? 'var(--info-bg)'
                    : step.label === 'Sometimes'
                      ? 'var(--warn-bg)'
                      : 'var(--fail-bg)',
              color: NEGOTIABILITY_COLORS[step.label] ?? 'var(--text-secondary)',
            };

            const fromFormatted = formatLeverValue(step.fromValue, step.lever);
            const toFormatted = formatLeverValue(step.toValue, step.lever);

            return (
              <div key={i} className="compound-step">
                <span className="compound-step-badge" style={badgeStyle}>
                  {step.label}
                </span>
                <span>
                  {fromFormatted}
                  <span className="compound-step-arrow"> → </span>
                  {toFormatted}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TrajectoryChart ───────────────────────────────────────────────────────────

const WIDTH = 600;
const HEIGHT = 200;
const MARGIN = { top: 16, right: 80, bottom: 32, left: 80 };

function TrajectoryChart({
  retailer,
  overrides,
}: {
  retailer: Retailer;
  overrides: LeverOverrides;
}) {
  const baselineData = useMemo(() => projectTrajectory(retailer, {}, 24), [retailer]);
  const adjustedData = useMemo(
    () => projectTrajectory(retailer, overrides, 24),
    [retailer, overrides],
  );

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Y domain: span both series
  const allValues = [...baselineData, ...adjustedData];
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.1 || 1000;
  const domainMin = yMin - yPad;
  const domainMax = yMax + yPad;

  // Linear scale helpers
  function scaleX(month: number): number {
    return MARGIN.left + (month / 23) * innerW;
  }
  function scaleY(value: number): number {
    return MARGIN.top + ((domainMax - value) / (domainMax - domainMin)) * innerH;
  }

  // Build SVG path string from data array
  function buildPath(data: number[]): string {
    return data
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');
  }

  // Y-axis ticks
  const yTicks = computeYTicks(domainMin, domainMax, 4);

  // X-axis ticks: 0, 6, 12, 18, 24
  const xTicks = [0, 6, 12, 18, 23];

  // Find crossover in adjusted line (where it crosses zero)
  const zeroCrossover = findZeroCrossover(adjustedData);

  const baselinePath = buildPath(baselineData);
  const adjustedPath = buildPath(adjustedData);

  // Zero line Y
  const zeroY = scaleY(0);
  const showZeroLine = domainMin < 0 && domainMax > 0;

  return (
    <div className="trajectory-chart-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="trajectory-svg"
        role="img"
        aria-label="24-month contribution trajectory"
      >
        {/* Gridlines */}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            className="traj-gridline"
          />
        ))}

        {/* Zero line */}
        {showZeroLine && (
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={zeroY}
            y2={zeroY}
            className="traj-zero-line"
          />
        )}

        {/* Baseline path */}
        <path d={baselinePath} className="traj-line-baseline" />

        {/* Adjusted path */}
        <path d={adjustedPath} className="traj-line-adjusted" />

        {/* Crossover dot */}
        {zeroCrossover !== null && (
          <circle
            cx={scaleX(zeroCrossover.x)}
            cy={scaleY(zeroCrossover.y)}
            r={5}
            className="traj-crossover-dot"
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={MARGIN.left - 6}
            y={scaleY(tick)}
            dy="0.35em"
            textAnchor="end"
            className="traj-axis-label"
          >
            {formatDollars(tick)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((month) => (
          <text
            key={month}
            x={scaleX(month)}
            y={HEIGHT - MARGIN.bottom + 14}
            textAnchor="middle"
            className="traj-axis-label"
          >
            {month === 0 ? 'Now' : `M${month + 1}`}
          </text>
        ))}
      </svg>

      <div className="traj-legend">
        <div className="traj-legend-item">
          <div
            style={{
              width: 18,
              height: 2,
              background: 'var(--reference)',
              borderTop: '2px dashed var(--reference)',
            }}
          />
          <span>Baseline</span>
        </div>
        <div className="traj-legend-item">
          <div className="traj-legend-swatch adjusted" style={{ height: 3 }} />
          <span>Adjusted terms</span>
        </div>
        {zeroCrossover !== null && (
          <div className="traj-legend-item">
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--hk-35)',
                flexShrink: 0,
              }}
            />
            <span>Break-even at M{Math.round(zeroCrossover.x) + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeYTicks(min: number, max: number, count: number): number[] {
  const range = max - min;
  const rawStep = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max; t += step) {
    ticks.push(t);
  }
  return ticks;
}

function findZeroCrossover(
  data: number[],
): { x: number; y: number } | null {
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    if (prev < 0 && curr >= 0) {
      // Linear interpolation
      const t = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      return { x: (i - 1) + t, y: 0 };
    }
    if (prev > 0 && curr <= 0) {
      const t = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      return { x: (i - 1) + t, y: 0 };
    }
  }
  return null;
}
