import type { LeverOverrides } from './types';

// Lailara Design System v2 — HK teal sequential palette (darkest = best contributor)
export const TEAL_SCALE = [
  '#063d32', '#0a5c4b', '#0e6e5a', '#158f75',
  '#1fa282', '#35b595', '#6dcdb5', '#b5e4d8',
] as const;

// Tokyo palette for net-negative retailers
export const TOKYO_NEGATIVE = '#b82d4a';
export const TOKYO_NEGATIVE_LIGHT = '#e68a9a';

// Negotiability tags per cost lever (constant across all retailers)
export const NEGOTIABILITY_TAGS: Record<keyof LeverOverrides, string> = {
  trade_spend_rate: 'Often',
  deductions_rate: 'Partly',
  payment_terms_days: 'Sometimes',
  returns_rate: 'Rarely',
  logistics_rate: 'Sometimes',
};

export const NEGOTIABILITY_COLORS: Record<string, string> = {
  Often: '#0e6e5a',       // HK-25 teal
  Partly: '#1f2e7a',      // Chicago navy
  Sometimes: '#7a3d10',   // Singapore dark
  Rarely: '#b82d4a',      // Tokyo
  Internal: '#595959',    // text-secondary
};

// Cost layer display labels
export const LAYER_LABELS: Record<string, string> = {
  deductions: 'Deductions & Chargebacks',
  trade_spend: 'Trade Spend',
  working_capital_drag: 'Working-Capital Drag',
  labor_overhead: 'Labor Overhead',
  swell_returns: 'Swell & Returns',
  logistics_variance: 'Logistics Variance',
  distributor_margin: 'Distributor Margin',
};

export const LAYER_LEVER_MAP: Record<string, keyof LeverOverrides | null> = {
  deductions: 'deductions_rate',
  trade_spend: 'trade_spend_rate',
  working_capital_drag: 'payment_terms_days',
  labor_overhead: null,           // Internal — not negotiable via lever
  swell_returns: 'returns_rate',
  logistics_variance: 'logistics_rate',
  distributor_margin: null,       // Fixed by distributor relationship
};

// Assign teal color by contribution rank (rank 1 = darkest)
export function tealByRank(rank: number, total: number): string {
  const idx = Math.min(
    Math.round(((rank - 1) / Math.max(total - 1, 1)) * (TEAL_SCALE.length - 1)),
    TEAL_SCALE.length - 1,
  );
  return TEAL_SCALE[idx];
}

export function formatDollars(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
