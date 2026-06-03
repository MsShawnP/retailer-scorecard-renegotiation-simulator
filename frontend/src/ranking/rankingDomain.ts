import * as d3 from 'd3';
import type { Retailer, LeverOverrides, CostLayerBreakdown } from '../types';
import { calculateContributions } from '../calculations';
import { TEAL_SCALE, TOKYO_NEGATIVE } from '../constants';

export type RankingMode = 'gross' | 'contribution';

export interface BarDatum {
  retailer_id: string;
  name: string;
  gross_revenue: number;
  true_contribution: number;
  contribution_margin_rate: number;
  /** Absolute value for bar width (contribution can be negative) */
  bar_value: number;
  is_negative: boolean;
  bar_color: string;
  y: number;          // computed y-position from D3 scaleBand
  bar_width: number;  // computed bar width in pixels
  cost_breakdown: CostLayerBreakdown;  // pre-computed from calculateContributions
}

export interface RankingLayout {
  bars: BarDatum[];
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleBand<string>;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  zeroX: number;  // x-coordinate of the zero line (for diverging axis)
}

export function computeRankingLayout(
  retailers: Retailer[],
  overrides: Record<string, LeverOverrides> | undefined,
  mode: RankingMode,
  containerWidth: number
): RankingLayout {
  const contributions = calculateContributions(retailers, overrides);

  const sorted = [...contributions].sort((a, b) =>
    mode === 'gross'
      ? b.gross_revenue - a.gross_revenue
      : b.true_contribution - a.true_contribution
  );

  const BAR_HEIGHT = 44;
  const GAP = 8;
  const margin = { top: 16, right: 180, bottom: 40, left: 140 };
  const height = sorted.length * (BAR_HEIGHT + GAP) + margin.top + margin.bottom;
  const innerWidth = containerWidth - margin.left - margin.right;

  // For contribution mode bars can be negative; use diverging scale
  const values = sorted.map((r) =>
    mode === 'gross' ? r.gross_revenue : r.true_contribution
  );
  const maxAbs = Math.max(...values.map(Math.abs), 1);

  const xMin = mode === 'gross' ? 0 : -maxAbs;
  const xScale = d3
    .scaleLinear()
    .domain([xMin, maxAbs])
    .range([0, innerWidth]);

  const zeroX = xScale(0);

  const yScale = d3
    .scaleBand<string>()
    .domain(sorted.map((r) => r.retailer_id))
    .range([margin.top, height - margin.bottom])
    .padding(GAP / (BAR_HEIGHT + GAP));

  const bars: BarDatum[] = sorted.map((r, i) => {
    const value = mode === 'gross' ? r.gross_revenue : r.true_contribution;
    const is_negative = value < 0;

    // Pixel width: distance between zero and the bar end
    const barWidth = Math.abs(xScale(value) - zeroX);

    let bar_color: string;
    if (mode === 'contribution' && is_negative) {
      bar_color = TOKYO_NEGATIVE;
    } else {
      bar_color = TEAL_SCALE[Math.min(i, TEAL_SCALE.length - 1)];
    }

    return {
      retailer_id: r.retailer_id,
      name: r.name,
      gross_revenue: r.gross_revenue,
      true_contribution: r.true_contribution,
      contribution_margin_rate: r.contribution_margin_rate,
      bar_value: value,
      is_negative,
      bar_color,
      y: yScale(r.retailer_id)!,
      bar_width: barWidth,
      cost_breakdown: r.cost_breakdown,
    };
  });

  return { bars, xScale, yScale, width: containerWidth, height, margin, zeroX };
}

/**
 * Returns the SVG x-coordinate of the left edge of a bar.
 * Negative bars extend left of zero; positive bars extend right.
 */
export function getBarX(datum: BarDatum, zeroX: number): number {
  return datum.is_negative ? zeroX - datum.bar_width : zeroX;
}
