export interface LeverRange {
  min: number;
  max: number;
  current: number;
}

export interface DeductionBreakdown {
  otif_penalties: number;
  shortage_claims: number;
  pricing_chargebacks: number;
}

export interface TradeSpendBreakdown {
  slotting_amortized: number;
  promo_mcb: number;
  cooperative_advertising: number;
}

export interface LeverRanges {
  trade_spend_rate: LeverRange;
  deductions_rate: LeverRange;
  payment_terms_days: LeverRange;
  returns_rate: LeverRange;
  logistics_rate: LeverRange;
}

export interface Retailer {
  retailer_id: string;
  name: string;
  channel_type: 'retailer' | 'distributor' | 'dtc';
  is_via_distributor: boolean;
  distributor_name: string | null;
  gross_revenue: number;
  cogs_rate: number;
  deductions_rate: number;
  deduction_breakdown: DeductionBreakdown;
  trade_spend_rate: number;
  trade_spend_breakdown: TradeSpendBreakdown;
  payment_terms_days: number;
  cost_of_capital: number;
  labor_hours_compliance: number;
  labor_hours_disputes: number;
  labor_rate: number;
  returns_rate: number;
  freight_differential_rate: number;
  pallet_surcharge_rate: number;
  moq_penalty_rate: number;
  distributor_margin_rate: number;
  growth_rate_annual: number;
  lever_ranges: LeverRanges;
}

export interface LeverOverrides {
  trade_spend_rate?: number;
  deductions_rate?: number;
  payment_terms_days?: number;
  returns_rate?: number;
  logistics_rate?: number;  // replaces combined freight+pallet+moq
}

export interface CostLayerBreakdown {
  gross_margin: number;
  deductions: number;
  trade_spend: number;
  working_capital_drag: number;
  labor_overhead: number;
  swell_returns: number;
  logistics_variance: number;
  distributor_margin: number;
  total_cost_layers: number;
}

export interface RetailerContribution {
  retailer_id: string;
  name: string;
  gross_revenue: number;
  true_contribution: number;
  contribution_margin_rate: number;
  cost_breakdown: CostLayerBreakdown;
  rank_by_gross: number;
  rank_by_contribution: number;
}

// App navigation state
export type AppView = 'entry' | 'methodology' | 'simulator';
