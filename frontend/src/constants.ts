import type { LeverOverrides } from './types';

// Lailara Design System v2 — HK teal sequential palette (darkest = best contributor)
// References CSS custom properties defined in App.css :root
export const TEAL_SCALE = [
  'var(--teal-0)', 'var(--teal-1)', 'var(--teal-2)', 'var(--teal-3)',
  'var(--teal-4)', 'var(--teal-5)', 'var(--teal-6)', 'var(--teal-7)',
] as const;

// Tokyo palette for net-negative retailers
export const TOKYO_NEGATIVE = 'var(--tokyo-40)';
export const TOKYO_NEGATIVE_LIGHT = 'var(--tokyo-70)';

// Negotiability tags per cost lever (constant across all retailers)
export const NEGOTIABILITY_TAGS: Record<keyof LeverOverrides, string> = {
  trade_spend_rate: 'Often',
  deductions_rate: 'Partly',
  payment_terms_days: 'Sometimes',
  returns_rate: 'Rarely',
  logistics_rate: 'Sometimes',
};

export const NEGOTIABILITY_COLORS: Record<string, string> = {
  Often: 'var(--neg-often)',
  Partly: 'var(--neg-partly)',
  Sometimes: 'var(--neg-sometimes)',
  Rarely: 'var(--neg-rarely)',
  Internal: 'var(--neg-internal)',
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
