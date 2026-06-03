import type { Retailer, LeverOverrides } from '../types';
import { calcTrueContribution, findBreakEvenValue } from '../calculations';

export interface LeverSpec {
  lever: keyof LeverOverrides;
  label: string;
  negotiabilityTag: string;
  unit: 'percent' | 'days';
  range: { min: number; max: number; current: number };
  breakEvenValue: number | null;  // null = not achievable within range
  breakEvenAchievable: boolean;
}

export interface CompoundBreakEven {
  achievable: boolean;
  steps: Array<{
    lever: keyof LeverOverrides;
    fromValue: number;
    toValue: number;
    label: string;
  }>;
  explanation: string;
}

// ── Negotiability mapping ─────────────────────────────────────────────────────

function negotiabilityForLever(lever: keyof LeverOverrides): string {
  const MAP: Record<keyof LeverOverrides, string> = {
    trade_spend_rate: 'Often',
    deductions_rate: 'Partly',
    payment_terms_days: 'Sometimes',
    returns_rate: 'Rarely',
    logistics_rate: 'Sometimes',
  };
  return MAP[lever];
}

// ── buildLeverSpecs ───────────────────────────────────────────────────────────
// Returns 5 levers (Labor Overhead is Internal — excluded).
// Each spec includes the break-even value for that lever alone, holding all
// other overrides fixed.

export function buildLeverSpecs(
  retailer: Retailer,
  currentOverrides: LeverOverrides,
): LeverSpec[] {
  const levers: Array<{
    lever: keyof LeverOverrides;
    label: string;
    unit: 'percent' | 'days';
  }> = [
    { lever: 'trade_spend_rate', label: 'Trade Spend', unit: 'percent' },
    { lever: 'deductions_rate', label: 'Deductions Rate', unit: 'percent' },
    { lever: 'payment_terms_days', label: 'Payment Terms', unit: 'days' },
    { lever: 'returns_rate', label: 'Returns Rate', unit: 'percent' },
    { lever: 'logistics_rate', label: 'Logistics Rate', unit: 'percent' },
  ];

  return levers.map(({ lever, label, unit }) => {
    const range = retailer.lever_ranges[lever];
    const breakEvenValue = findBreakEvenValue(retailer, lever, currentOverrides, range);
    return {
      lever,
      label,
      negotiabilityTag: negotiabilityForLever(lever),
      unit,
      range,
      breakEvenValue,
      breakEvenAchievable: breakEvenValue !== null,
    };
  });
}

// ── formatLeverValue ──────────────────────────────────────────────────────────

export function formatLeverValue(value: number, lever: keyof LeverOverrides): string {
  if (lever === 'payment_terms_days') return `${Math.round(value)}d`;
  return `${(value * 100).toFixed(1)}%`;
}

// ── getLeverShortLabel ────────────────────────────────────────────────────────

export function getLeverShortLabel(lever: keyof LeverOverrides): string {
  const LABELS: Record<keyof LeverOverrides, string> = {
    trade_spend_rate: 'Trade Spend',
    deductions_rate: 'Deductions',
    payment_terms_days: 'Terms',
    returns_rate: 'Returns',
    logistics_rate: 'Logistics',
  };
  return LABELS[lever];
}

// ── formatLeverStep ───────────────────────────────────────────────────────────

function formatLeverStep(step: {
  lever: keyof LeverOverrides;
  fromValue: number;
  toValue: number;
}): string {
  if (step.lever === 'payment_terms_days') {
    return `Terms ${Math.round(step.fromValue)}d → ${Math.round(step.toValue)}d`;
  }
  return `${getLeverShortLabel(step.lever)} ${(step.fromValue * 100).toFixed(1)}% → ${(step.toValue * 100).toFixed(1)}%`;
}

// ── computeCompoundBreakEven ──────────────────────────────────────────────────
// Finds the minimum set of lever changes (weighted by negotiability priority)
// that would flip the retailer from negative to positive contribution.
// Returns achievable=false if no combination within range can flip the sign.

export function computeCompoundBreakEven(
  retailer: Retailer,
  currentOverrides: LeverOverrides,
): CompoundBreakEven {
  const currentContrib = calcTrueContribution(retailer, currentOverrides);
  if (currentContrib >= 0) {
    return {
      achievable: true,
      steps: [],
      explanation: 'Already profitable — no changes needed.',
    };
  }

  // Negotiability priority order: Often > Sometimes > Partly > Rarely
  const PRIORITY_ORDER: Array<keyof LeverOverrides> = [
    'trade_spend_rate',
    'payment_terms_days',
    'logistics_rate',
    'deductions_rate',
    'returns_rate',
  ];

  const accumulatedOverrides: LeverOverrides = { ...currentOverrides };
  const steps: CompoundBreakEven['steps'] = [];

  for (const lever of PRIORITY_ORDER) {
    const range = retailer.lever_ranges[lever];
    const bev = findBreakEvenValue(retailer, lever, accumulatedOverrides, range);

    if (bev !== null) {
      const fromValue =
        (accumulatedOverrides[lever] as number | undefined) ??
        range.current;

      steps.push({
        lever,
        fromValue,
        toValue: bev,
        label: negotiabilityForLever(lever),
      });
      (accumulatedOverrides as Record<string, number>)[lever] = bev;

      const newContrib = calcTrueContribution(retailer, accumulatedOverrides);
      if (newContrib >= 0) {
        const labelStr = steps.map((s) => formatLeverStep(s)).join(' + ');
        return {
          achievable: true,
          steps,
          explanation: `${labelStr} = break-even`,
        };
      }
    }
  }

  return {
    achievable: false,
    steps,
    explanation:
      'Break-even is not achievable within the negotiable ranges of any single lever combination.',
  };
}
