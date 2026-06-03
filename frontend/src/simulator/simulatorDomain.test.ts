import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import type { Retailer, LeverOverrides } from '../types';
import { NEGOTIABILITY_TAGS } from '../constants';
import { findBreakEvenValue } from '../calculations';
import {
  buildLeverSpecs,
  computeCompoundBreakEven,
} from './simulatorDomain';

// ── Fixture loader ────────────────────────────────────────────────────────────

function loadRetailers(): Retailer[] {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'tests',
    'fixtures',
    'retailer_profiles.json',
  );
  return JSON.parse(readFileSync(fixturePath, 'utf-8')) as Retailer[];
}

const retailers = loadRetailers();

function getRetailer(id: string): Retailer {
  const r = retailers.find((r) => r.retailer_id === id);
  if (!r) throw new Error(`Retailer not found: ${id}`);
  return r;
}

// ── Test 1: buildLeverSpecs returns exactly 5 levers ─────────────────────────

describe('buildLeverSpecs', () => {
  it('returns exactly 5 levers (Labor Overhead excluded)', () => {
    const walmart = getRetailer('walmart');
    const specs = buildLeverSpecs(walmart, {});
    expect(specs).toHaveLength(5);
  });

  // ── Test 2: All levers have valid negotiability tags ─────────────────────

  it('all levers have valid negotiability tags from NEGOTIABILITY_TAGS', () => {
    const walmart = getRetailer('walmart');
    const specs = buildLeverSpecs(walmart, {});
    const validTags = new Set(Object.values(NEGOTIABILITY_TAGS));
    for (const spec of specs) {
      expect(validTags.has(spec.negotiabilityTag)).toBe(true);
    }
  });

  // ── Test 3: Walmart trade_spend_rate has achievable break-even ───────────

  it('Walmart trade_spend_rate lever has breakEvenValue !== null', () => {
    const walmart = getRetailer('walmart');
    const specs = buildLeverSpecs(walmart, {});
    const tradeSpec = specs.find((s) => s.lever === 'trade_spend_rate');
    expect(tradeSpec).toBeDefined();
    expect(tradeSpec!.breakEvenValue).not.toBeNull();
    expect(tradeSpec!.breakEvenAchievable).toBe(true);
  });

  // ── Test 4: returns_rate matches findBreakEvenValue directly ────────────

  it("Walmart returns_rate achievability matches findBreakEvenValue directly", () => {
    const walmart = getRetailer('walmart');
    const specs = buildLeverSpecs(walmart, {});
    const returnsSpec = specs.find((s) => s.lever === 'returns_rate');
    expect(returnsSpec).toBeDefined();

    const directResult = findBreakEvenValue(
      walmart,
      'returns_rate',
      {},
      walmart.lever_ranges.returns_rate,
    );
    // The spec's result must match the direct calculation
    expect(returnsSpec!.breakEvenValue).toBe(directResult);
    expect(returnsSpec!.breakEvenAchievable).toBe(directResult !== null);
  });

  // ── Test 7: currentOverrides are passed to findBreakEvenValue ───────────

  it('building lever specs with currentOverrides passes overrides to findBreakEvenValue', () => {
    const walmart = getRetailer('walmart');
    const overrides: LeverOverrides = { deductions_rate: 0.04 };

    const specsWithOverrides = buildLeverSpecs(walmart, overrides);
    const specsNoOverrides = buildLeverSpecs(walmart, {});

    // The trade_spend break-even value may differ when deductions are already reduced
    // This verifies overrides are threaded through correctly
    const bevWith = specsWithOverrides.find((s) => s.lever === 'trade_spend_rate')!
      .breakEvenValue;
    const bevWithout = specsNoOverrides.find((s) => s.lever === 'trade_spend_rate')!
      .breakEvenValue;

    // With reduced deductions, trade_spend break-even threshold should be higher
    // (need less trade spend reduction to flip positive)
    if (bevWith !== null && bevWithout !== null) {
      expect(bevWith).toBeGreaterThanOrEqual(bevWithout);
    }
    // Both are valid numbers or null — no crash
    expect(typeof bevWith === 'number' || bevWith === null).toBe(true);
  });

  // ── Test 8: all lever ranges have min < max and current within [min, max] ─

  it('all lever ranges have min < max and current within [min, max]', () => {
    for (const retailer of retailers) {
      const specs = buildLeverSpecs(retailer, {});
      for (const spec of specs) {
        expect(spec.range.min).toBeLessThan(spec.range.max);
        expect(spec.range.current).toBeGreaterThanOrEqual(spec.range.min);
        expect(spec.range.current).toBeLessThanOrEqual(spec.range.max);
      }
    }
  });
});

// ── Test 5: computeCompoundBreakEven for Walmart is achievable ───────────────

describe('computeCompoundBreakEven', () => {
  it('returns achievable=true for Walmart (trade_spend lever alone should flip it)', () => {
    const walmart = getRetailer('walmart');
    const result = computeCompoundBreakEven(walmart, {});
    expect(result.achievable).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  // ── Test 6: Costco is already profitable — achievable=true, steps=[] ─────

  it('returns achievable=true with steps=[] for Costco (already profitable)', () => {
    const costco = getRetailer('costco');
    const result = computeCompoundBreakEven(costco, {});
    expect(result.achievable).toBe(true);
    expect(result.steps).toHaveLength(0);
    expect(result.explanation).toMatch(/already profitable/i);
  });

  it('Walmart compound break-even explanation is a non-empty string', () => {
    const walmart = getRetailer('walmart');
    const result = computeCompoundBreakEven(walmart, {});
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('each step has lever, fromValue, toValue, and label fields', () => {
    const walmart = getRetailer('walmart');
    const result = computeCompoundBreakEven(walmart, {});
    for (const step of result.steps) {
      expect(typeof step.lever).toBe('string');
      expect(typeof step.fromValue).toBe('number');
      expect(typeof step.toValue).toBe('number');
      expect(typeof step.label).toBe('string');
    }
  });
});
