import type { Retailer, LeverOverrides, CostLayerBreakdown, RetailerContribution } from './types';

export function calcGrossMargin(r: Retailer): number {
  return r.gross_revenue * (1 - r.cogs_rate);
}

export function calcDeductions(r: Retailer, overrides?: LeverOverrides): number {
  const rate = overrides?.deductions_rate ?? r.deductions_rate;
  return r.gross_revenue * rate;
}

export function calcTradeSpend(r: Retailer, overrides?: LeverOverrides): number {
  const rate = overrides?.trade_spend_rate ?? r.trade_spend_rate;
  return r.gross_revenue * rate;
}

export function calcWorkingCapitalDrag(r: Retailer, overrides?: LeverOverrides): number {
  const days = overrides?.payment_terms_days ?? r.payment_terms_days;
  return (days / 365) * r.gross_revenue * r.cost_of_capital;
}

export function calcLaborOverhead(r: Retailer): number {
  return (r.labor_hours_compliance + r.labor_hours_disputes) * r.labor_rate;
}

export function calcSwellReturns(r: Retailer, overrides?: LeverOverrides): number {
  const rate = overrides?.returns_rate ?? r.returns_rate;
  return r.gross_revenue * rate;
}

export function calcLogisticsVariance(r: Retailer, overrides?: LeverOverrides): number {
  const rate = overrides?.logistics_rate ??
    (r.freight_differential_rate + r.pallet_surcharge_rate + r.moq_penalty_rate);
  return r.gross_revenue * rate;
}

export function calcDistributorMargin(r: Retailer): number {
  return r.gross_revenue * r.distributor_margin_rate;
}

export function calcCostBreakdown(r: Retailer, overrides?: LeverOverrides): CostLayerBreakdown {
  const gross_margin = calcGrossMargin(r);
  const deductions = calcDeductions(r, overrides);
  const trade_spend = calcTradeSpend(r, overrides);
  const working_capital_drag = calcWorkingCapitalDrag(r, overrides);
  const labor_overhead = calcLaborOverhead(r);
  const swell_returns = calcSwellReturns(r, overrides);
  const logistics_variance = calcLogisticsVariance(r, overrides);
  const distributor_margin = calcDistributorMargin(r);
  const total_cost_layers = deductions + trade_spend + working_capital_drag +
    labor_overhead + swell_returns + logistics_variance + distributor_margin;
  return {
    gross_margin, deductions, trade_spend, working_capital_drag,
    labor_overhead, swell_returns, logistics_variance, distributor_margin,
    total_cost_layers,
  };
}

export function calcTrueContribution(r: Retailer, overrides?: LeverOverrides): number {
  const breakdown = calcCostBreakdown(r, overrides);
  return breakdown.gross_margin - breakdown.total_cost_layers;
}

export function calculateContributions(
  retailers: Retailer[],
  overridesByRetailerId?: Record<string, LeverOverrides>
): RetailerContribution[] {
  const byGross = [...retailers].sort((a, b) => b.gross_revenue - a.gross_revenue);
  const grossRanks = new Map(byGross.map((r, i) => [r.retailer_id, i + 1]));

  const results: RetailerContribution[] = retailers.map((r) => {
    const overrides = overridesByRetailerId?.[r.retailer_id];
    const cost_breakdown = calcCostBreakdown(r, overrides);
    const true_contribution = cost_breakdown.gross_margin - cost_breakdown.total_cost_layers;
    const contribution_margin_rate = r.gross_revenue > 0
      ? true_contribution / r.gross_revenue
      : 0;
    return {
      retailer_id: r.retailer_id,
      name: r.name,
      gross_revenue: r.gross_revenue,
      true_contribution,
      contribution_margin_rate,
      cost_breakdown,
      rank_by_gross: grossRanks.get(r.retailer_id) ?? 0,
      rank_by_contribution: 0,  // filled below
    };
  });

  const byContrib = [...results].sort((a, b) => b.true_contribution - a.true_contribution);
  byContrib.forEach((r, i) => { r.rank_by_contribution = i + 1; });

  return results;
}

// Find the lever value at which retailer's true_contribution crosses 0.
// Solves numerically via bisection. Returns null if break-even not in lever range.
export function findBreakEvenValue(
  r: Retailer,
  lever: keyof LeverOverrides,
  currentOverrides: LeverOverrides,
  leverRange: { min: number; max: number }
): number | null {
  const evalAt = (val: number): number => {
    const o: LeverOverrides = { ...currentOverrides, [lever]: val };
    return calcTrueContribution(r, o);
  };

  const atMin = evalAt(leverRange.min);
  const atMax = evalAt(leverRange.max);

  // Already profitable across the entire range — return minimum value
  if (atMin >= 0 && atMax >= 0) return leverRange.min;
  // Never reaches break-even across the range — no sign change
  if (atMin < 0 && atMax < 0) return null;

  // Sign change exists — bisect (matches Python sign-comparison logic)
  let lo = leverRange.min;
  let hi = leverRange.max;
  let tcLo = atMin;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(hi - lo) < 1e-9) break;
    const tcMid = evalAt(mid);
    if (Math.abs(tcMid) < 1e-6) return mid;
    // Keep the half that contains the zero crossing
    if ((tcLo < 0) === (tcMid < 0)) {
      lo = mid;
      tcLo = tcMid;
    } else {
      hi = mid;
    }
  }
  const result = (lo + hi) / 2;
  // Only return if within range
  if (result < leverRange.min || result > leverRange.max) return null;
  return result;
}

// Project monthly true_contribution over N months, applying growth_rate_annual
export function projectTrajectory(
  r: Retailer,
  overrides: LeverOverrides,
  months: number = 24
): number[] {
  const monthlyGrowth = Math.pow(1 + r.growth_rate_annual, 1 / 12);
  return Array.from({ length: months }, (_, i) => {
    const growthFactor = Math.pow(monthlyGrowth, i + 1);
    const scaled: Retailer = { ...r, gross_revenue: r.gross_revenue * growthFactor };
    return calcTrueContribution(scaled, overrides);
  });
}
