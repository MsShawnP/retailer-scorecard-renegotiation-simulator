import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  calcTrueContribution,
  calculateContributions,
  calcWorkingCapitalDrag,
  calcDeductions,
  findBreakEvenValue,
  projectTrajectory,
  calcCostBreakdown,
} from './calculations';
import type { Retailer, LeverOverrides } from './types';

// ── Load fixtures ────────────────────────────────────────────────────────────

function loadRetailers(): Retailer[] {
  const fixturePath = path.resolve(process.cwd(), '..', 'tests', 'fixtures', 'retailer_profiles.json');
  return JSON.parse(readFileSync(fixturePath, 'utf-8')) as Retailer[];
}

function loadExpected(): Array<{
  retailer_id: string;
  gross_revenue: number;
  expected: {
    gross_margin: number;
    deductions: number;
    trade_spend: number;
    working_capital_drag: number;
    labor_overhead: number;
    swell_returns: number;
    logistics_variance: number;
    distributor_margin: number;
    total_cost_layers: number;
    true_contribution: number;
    contribution_margin_rate: number;
    rank_by_gross: number;
    rank_by_contribution: number;
  };
}> {
  const fixturePath = path.resolve(process.cwd(), '..', 'tests', 'fixtures', 'expected_outputs.json');
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
}

const retailers = loadRetailers();
const expectedOutputs = loadExpected();

function getRetailer(id: string): Retailer {
  const r = retailers.find((r) => r.retailer_id === id);
  if (!r) throw new Error(`Retailer not found: ${id}`);
  return r;
}

const TOLERANCE = 0.01;

// ── Test 1: Walmart is net-negative ─────────────────────────────────────────

describe('calcTrueContribution', () => {
  it('returns negative for Walmart', () => {
    const walmart = getRetailer('walmart');
    expect(calcTrueContribution(walmart)).toBeLessThan(0);
  });

  it('returns positive for Costco', () => {
    const costco = getRetailer('costco');
    expect(calcTrueContribution(costco)).toBeGreaterThan(0);
  });
});

// ── Test 3: Ranking ──────────────────────────────────────────────────────────

describe('calculateContributions', () => {
  it('ranks Walmart last by contribution', () => {
    const results = calculateContributions(retailers);
    const walmart = results.find((r) => r.retailer_id === 'walmart');
    expect(walmart).toBeDefined();
    expect(walmart!.rank_by_contribution).toBe(retailers.length);
  });

  it('ranks Costco first by contribution', () => {
    const results = calculateContributions(retailers);
    const costco = results.find((r) => r.retailer_id === 'costco');
    expect(costco).toBeDefined();
    expect(costco!.rank_by_contribution).toBe(1);
  });

  it('ranks Costco in top 2 by contribution', () => {
    const results = calculateContributions(retailers);
    const costco = results.find((r) => r.retailer_id === 'costco');
    expect(costco).toBeDefined();
    expect(costco!.rank_by_contribution).toBeLessThanOrEqual(2);
  });
});

// ── Test 4: Override with 0 trade spend ──────────────────────────────────────

describe('override: trade_spend_rate=0', () => {
  it('produces a finite result (no NaN)', () => {
    const walmart = getRetailer('walmart');
    const overrides: LeverOverrides = { trade_spend_rate: 0 };
    const result = calcTrueContribution(walmart, overrides);
    expect(isNaN(result)).toBe(false);
    expect(isFinite(result)).toBe(true);
  });
});

// ── Test 5: payment_terms_days 30 vs 60 for Walmart ──────────────────────────

describe('override: payment_terms_days', () => {
  it('30-day terms improve Walmart contribution vs 60-day terms', () => {
    const walmart = getRetailer('walmart');
    const tc30 = calcTrueContribution(walmart, { payment_terms_days: 30 });
    const tc60 = calcTrueContribution(walmart, { payment_terms_days: 60 });
    expect(tc30).toBeGreaterThan(tc60);
  });
});

// ── Test 6: halving payment_terms_days halves working capital drag ───────────

describe('calcWorkingCapitalDrag', () => {
  it('halving payment_terms_days halves the drag', () => {
    const walmart = getRetailer('walmart');
    const drag60 = calcWorkingCapitalDrag(walmart, { payment_terms_days: 60 });
    const drag30 = calcWorkingCapitalDrag(walmart, { payment_terms_days: 30 });
    expect(drag30).toBeCloseTo(drag60 / 2, 6);
  });
});

// ── Test 7: doubling deductions_rate doubles deductions cost ─────────────────

describe('calcDeductions', () => {
  it('doubling deductions_rate doubles the deductions cost', () => {
    const walmart = getRetailer('walmart');
    const base = calcDeductions(walmart);
    const doubled = calcDeductions(walmart, { deductions_rate: walmart.deductions_rate * 2 });
    expect(doubled).toBeCloseTo(base * 2, 6);
  });
});

// ── Test 8: findBreakEvenValue returns value where Walmart flips positive ─────

describe('findBreakEvenValue', () => {
  it('returns a trade_spend_rate value where Walmart true_contribution >= 0', () => {
    const walmart = getRetailer('walmart');
    const leverRange = walmart.lever_ranges.trade_spend_rate;
    const result = findBreakEvenValue(walmart, 'trade_spend_rate', {}, leverRange);
    if (result !== null) {
      const tc = calcTrueContribution(walmart, { trade_spend_rate: result });
      // Should be near zero or positive
      expect(tc).toBeGreaterThanOrEqual(-TOLERANCE * 100);
    }
    // If null, the lever range doesn't cover break-even — acceptable, just verify no crash
    expect(result === null || typeof result === 'number').toBe(true);
  });

  it('finds a deductions_rate break-even for Walmart within lever range', () => {
    const walmart = getRetailer('walmart');
    const leverRange = walmart.lever_ranges.deductions_rate;
    const result = findBreakEvenValue(walmart, 'deductions_rate', {}, leverRange);
    expect(result === null || (result >= leverRange.min && result <= leverRange.max)).toBe(true);
  });
});

// ── Test 9: projectTrajectory returns array of length 24 ─────────────────────

describe('projectTrajectory', () => {
  it('returns an array of length 24 by default', () => {
    const sprouts = getRetailer('sprouts');
    const result = projectTrajectory(sprouts, {});
    expect(result).toHaveLength(24);
  });

  it('all projected values are finite numbers', () => {
    const sprouts = getRetailer('sprouts');
    const result = projectTrajectory(sprouts, {});
    result.forEach((v) => {
      expect(isFinite(v)).toBe(true);
    });
  });
});

// ── Test 10: Match Python fixture expected_outputs.json within tolerance ──────

describe('fixture cross-validation', () => {
  for (const exp of expectedOutputs) {
    it(`${exp.retailer_id}: true_contribution within $${TOLERANCE} of Python engine`, () => {
      const retailer = getRetailer(exp.retailer_id);
      const breakdown = calcCostBreakdown(retailer);
      const trueContrib = breakdown.gross_margin - breakdown.total_cost_layers;

      expect(Math.abs(trueContrib - exp.expected.true_contribution)).toBeLessThanOrEqual(TOLERANCE);
    });

    it(`${exp.retailer_id}: cost breakdown layers within $${TOLERANCE} of Python engine`, () => {
      const retailer = getRetailer(exp.retailer_id);
      const bd = calcCostBreakdown(retailer);

      expect(Math.abs(bd.gross_margin - exp.expected.gross_margin)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.deductions - exp.expected.deductions)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.trade_spend - exp.expected.trade_spend)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.working_capital_drag - exp.expected.working_capital_drag)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.labor_overhead - exp.expected.labor_overhead)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.swell_returns - exp.expected.swell_returns)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.logistics_variance - exp.expected.logistics_variance)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.distributor_margin - exp.expected.distributor_margin)).toBeLessThanOrEqual(TOLERANCE);
    });

    it(`${exp.retailer_id}: rank_by_gross matches fixture`, () => {
      const results = calculateContributions(retailers);
      const result = results.find((r) => r.retailer_id === exp.retailer_id);
      expect(result).toBeDefined();
      expect(result!.rank_by_gross).toBe(exp.expected.rank_by_gross);
    });

    it(`${exp.retailer_id}: rank_by_contribution matches fixture`, () => {
      const results = calculateContributions(retailers);
      const result = results.find((r) => r.retailer_id === exp.retailer_id);
      expect(result).toBeDefined();
      expect(result!.rank_by_contribution).toBe(exp.expected.rank_by_contribution);
    });
  }
});

// ── Test 11: break-even + trajectory cross-validated against the Python engine ─
// scenario_expected.json holds break-even values and trajectory spot-checks
// produced by engine/cost_model.py. The old TS test only checked range/finiteness,
// which is why the phantom break-even on profitable accounts slipped through.

interface ScenarioFixture {
  break_even_checks: Array<{
    retailer_id: string;
    lever: keyof LeverOverrides;
    lever_range: { min: number; max: number };
    expected_value: number | null;
    tolerance?: number;
  }>;
  trajectory_checks: Array<{
    retailer_id: string;
    months: number;
    spot_checks: Record<string, number>;
  }>;
}

function loadScenario(): ScenarioFixture {
  const fixturePath = path.resolve(process.cwd(), '..', 'tests', 'fixtures', 'scenario_expected.json');
  return JSON.parse(readFileSync(fixturePath, 'utf-8')) as ScenarioFixture;
}

const scenario = loadScenario();

const ALL_LEVERS: Array<keyof LeverOverrides> = [
  'trade_spend_rate',
  'deductions_rate',
  'payment_terms_days',
  'returns_rate',
  'logistics_rate',
];

describe('findBreakEvenValue matches the Python engine fixture', () => {
  for (const check of scenario.break_even_checks) {
    const label = check.expected_value === null ? 'null' : String(check.expected_value);
    it(`${check.retailer_id}/${check.lever}: break-even === ${label}`, () => {
      const retailer = getRetailer(check.retailer_id);
      const result = findBreakEvenValue(retailer, check.lever, {}, check.lever_range);
      if (check.expected_value === null) {
        expect(result).toBeNull();
      } else {
        expect(result).not.toBeNull();
        expect(Math.abs((result as number) - check.expected_value)).toBeLessThanOrEqual(
          check.tolerance ?? 1e-4,
        );
      }
    });
  }
});

// Regression for the phantom "Break-even at 4.0%" marker: an account that is
// profitable across a lever's whole range has NO break-even, so findBreakEvenValue
// must return null (matching the Python engine's None) — never leverRange.min.
describe('no phantom break-even on already-profitable accounts', () => {
  const profitable = expectedOutputs.filter((e) => e.expected.true_contribution >= 0);

  for (const exp of profitable) {
    it(`${exp.retailer_id}: levers it stays profitable across return null`, () => {
      const retailer = getRetailer(exp.retailer_id);
      for (const lever of ALL_LEVERS) {
        const range = retailer.lever_ranges[lever];
        const atMin = calcTrueContribution(retailer, { [lever]: range.min });
        const atMax = calcTrueContribution(retailer, { [lever]: range.max });
        if (atMin >= 0 && atMax >= 0) {
          const bev = findBreakEvenValue(retailer, lever, {}, range);
          expect(bev, `${exp.retailer_id}/${lever} should have no break-even marker`).toBeNull();
        }
      }
    });
  }

  it('Costco is profitable across every lever range, so shows no break-even marker (was "4.0%")', () => {
    const costco = getRetailer('costco');
    for (const lever of ALL_LEVERS) {
      const range = costco.lever_ranges[lever];
      // Profitable at both ends of the range — the phantom-marker precondition.
      expect(calcTrueContribution(costco, { [lever]: range.min })).toBeGreaterThanOrEqual(0);
      expect(calcTrueContribution(costco, { [lever]: range.max })).toBeGreaterThanOrEqual(0);
      const bev = findBreakEvenValue(costco, lever, {}, range);
      expect(bev, `Costco/${lever} must not plant a phantom marker`).toBeNull();
    }
    // trade_spend_rate min is 0.04 — the exact "Break-even at 4.0%" the audit flagged.
    expect(costco.lever_ranges.trade_spend_rate.min).toBe(0.04);
    expect(findBreakEvenValue(costco, 'trade_spend_rate', {}, costco.lever_ranges.trade_spend_rate)).toBeNull();
  });
});

describe('projectTrajectory matches the Python engine fixture', () => {
  const TRAJ_TOLERANCE = 0.5;
  for (const check of scenario.trajectory_checks) {
    it(`${check.retailer_id}: 24-month trajectory matches engine spot-checks`, () => {
      const retailer = getRetailer(check.retailer_id);
      const traj = projectTrajectory(retailer, {}, check.months);
      expect(traj).toHaveLength(check.months);
      for (const [monthStr, expectedValue] of Object.entries(check.spot_checks)) {
        const idx = Number(monthStr) - 1; // month 1 -> index 0
        expect(
          Math.abs(traj[idx] - expectedValue),
          `${check.retailer_id} month ${monthStr}: expected ${expectedValue}, got ${traj[idx]}`,
        ).toBeLessThanOrEqual(TRAJ_TOLERANCE);
      }
    });
  }
});
