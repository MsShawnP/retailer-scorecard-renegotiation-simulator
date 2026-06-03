import type { Retailer, LeverOverrides } from '../types';
import { calculateContributions, calcCostBreakdown } from '../calculations';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface FreedResources {
  revenue: number;          // gross revenue of walked-away retailers
  working_capital: number;  // WC drag freed (cash freed)
  trade_spend: number;      // trade spend no longer committed
  labor_overhead: number;   // labor hours freed (dollar value)
}

export interface AbsorptionRates {
  [retailer_id: string]: number;  // 0.0 to 1.0 (0% to 100% absorption)
}

export interface PortfolioSummary {
  total_revenue: number;
  total_contribution: number;
  total_working_capital: number;
  retailer_count: number;
}

export interface RedeploymentResult {
  freed: FreedResources;
  before: PortfolioSummary;
  after: PortfolioSummary;
  net_impact: number;  // after.total_contribution - before.total_contribution
}

// ── computeFreedResources ─────────────────────────────────────────────────────

export function computeFreedResources(
  walkedAway: Retailer[],
  overridesByRetailerId: Record<string, LeverOverrides>,
): FreedResources {
  let revenue = 0;
  let working_capital = 0;
  let trade_spend = 0;
  let labor_overhead = 0;

  for (const r of walkedAway) {
    const overrides = overridesByRetailerId[r.retailer_id];
    const bd = calcCostBreakdown(r, overrides);
    revenue += r.gross_revenue;
    working_capital += bd.working_capital_drag;
    trade_spend += bd.trade_spend;
    labor_overhead += bd.labor_overhead;
  }

  return { revenue, working_capital, trade_spend, labor_overhead };
}

// ── computePortfolioSummary ───────────────────────────────────────────────────

export function computePortfolioSummary(
  retailers: Retailer[],
  overridesByRetailerId: Record<string, LeverOverrides>,
): PortfolioSummary {
  if (retailers.length === 0) {
    return { total_revenue: 0, total_contribution: 0, total_working_capital: 0, retailer_count: 0 };
  }
  const contributions = calculateContributions(retailers, overridesByRetailerId);
  return {
    total_revenue: contributions.reduce((s, r) => s + r.gross_revenue, 0),
    total_contribution: contributions.reduce((s, r) => s + r.true_contribution, 0),
    total_working_capital: contributions.reduce(
      (s, r) => s + r.cost_breakdown.working_capital_drag,
      0,
    ),
    retailer_count: retailers.length,
  };
}

// ── computeRedeployment ───────────────────────────────────────────────────────
// Redeployment impact: freed revenue × absorption rates × remaining retailers'
// contribution margin rates

export function computeRedeployment(
  allRetailers: Retailer[],
  walkedAwayIds: Set<string>,
  overridesByRetailerId: Record<string, LeverOverrides>,
  absorptionRates: AbsorptionRates,
): RedeploymentResult {
  const remaining = allRetailers.filter((r) => !walkedAwayIds.has(r.retailer_id));
  const walkedAway = allRetailers.filter((r) => walkedAwayIds.has(r.retailer_id));

  const before = computePortfolioSummary(allRetailers, overridesByRetailerId);
  const freed = computeFreedResources(walkedAway, overridesByRetailerId);

  // Redeployment: freed revenue × each remaining retailer's absorption × their contribution rate
  const remainingContribs = remaining.length > 0
    ? calculateContributions(remaining, overridesByRetailerId)
    : [];

  let redeployedContribution = 0;
  for (const r of remainingContribs) {
    const absorption = absorptionRates[r.retailer_id] ?? 0;
    // Freed revenue absorbed by this retailer at its contribution margin rate
    redeployedContribution += freed.revenue * absorption * r.contribution_margin_rate;
  }

  // Total absorption fraction across all remaining retailers
  const totalAbsorptionFraction = Object.values(absorptionRates).reduce((s, a) => s + a, 0);

  const remainingSummary = computePortfolioSummary(remaining, overridesByRetailerId);
  const after: PortfolioSummary = {
    total_revenue: remainingSummary.total_revenue + freed.revenue * totalAbsorptionFraction,
    total_contribution: remainingSummary.total_contribution + redeployedContribution,
    total_working_capital: remainingSummary.total_working_capital,
    retailer_count: remaining.length,
  };

  return {
    freed,
    before,
    after,
    net_impact: after.total_contribution - before.total_contribution,
  };
}
