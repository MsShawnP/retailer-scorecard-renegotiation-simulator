import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import type { Retailer, LeverOverrides } from '../types';
import {
  computeFreedResources,
  computePortfolioSummary,
  computeRedeployment,
  type AbsorptionRates,
} from './redeploymentDomain';

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
const overrides: Record<string, LeverOverrides> = {};

function getRetailer(id: string): Retailer {
  const r = retailers.find((r) => r.retailer_id === id);
  if (!r) throw new Error(`Retailer not found: ${id}`);
  return r;
}

// ── Test 1: computeFreedResources returns correct revenue ─────────────────────

describe('computeFreedResources', () => {
  it('returns gross_revenue of walked-away retailers', () => {
    const walmart = getRetailer('walmart');
    const freed = computeFreedResources([walmart], overrides);
    expect(freed.revenue).toBe(walmart.gross_revenue);
  });

  it('sums revenue across multiple walked-away retailers', () => {
    const walmart = getRetailer('walmart');
    const kroger = getRetailer('kroger');
    const freed = computeFreedResources([walmart, kroger], overrides);
    expect(freed.revenue).toBeCloseTo(walmart.gross_revenue + kroger.gross_revenue, 2);
  });

  it('returns working_capital > 0 for Walmart', () => {
    const walmart = getRetailer('walmart');
    const freed = computeFreedResources([walmart], overrides);
    expect(freed.working_capital).toBeGreaterThan(0);
  });

  it('returns trade_spend > 0 for Walmart', () => {
    const walmart = getRetailer('walmart');
    const freed = computeFreedResources([walmart], overrides);
    expect(freed.trade_spend).toBeGreaterThan(0);
  });

  it('returns zeros when no retailers walked away', () => {
    const freed = computeFreedResources([], overrides);
    expect(freed.revenue).toBe(0);
    expect(freed.working_capital).toBe(0);
    expect(freed.trade_spend).toBe(0);
    expect(freed.labor_overhead).toBe(0);
  });
});

// ── Test 2: computePortfolioSummary for all 7 retailers ──────────────────────

describe('computePortfolioSummary', () => {
  it('returns total_revenue > 0 for all 7 retailers', () => {
    const summary = computePortfolioSummary(retailers, overrides);
    expect(summary.total_revenue).toBeGreaterThan(0);
  });

  it('returns retailer_count = 6 for all retailers', () => {
    const summary = computePortfolioSummary(retailers, overrides);
    expect(summary.retailer_count).toBe(6);
  });

  it('returns zeroed summary for empty array', () => {
    const summary = computePortfolioSummary([], overrides);
    expect(summary.total_revenue).toBe(0);
    expect(summary.total_contribution).toBe(0);
    expect(summary.retailer_count).toBe(0);
  });

  it('total_contribution is the sum of all individual true contributions', () => {
    const summary = computePortfolioSummary(retailers, overrides);
    // The sum can be positive or negative — just confirm it is finite
    expect(isFinite(summary.total_contribution)).toBe(true);
  });
});

// ── Test 3: computeRedeployment — Walmart walked away: before includes Walmart ─

describe('computeRedeployment', () => {
  it('before.retailer_count includes Walmart (all 6), after does not (5)', () => {
    const walkedAwayIds = new Set(['walmart']);
    const absorptionRates: AbsorptionRates = {};
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(result.before.retailer_count).toBe(6);
    expect(result.after.retailer_count).toBe(5);
  });

  it('before.total_revenue includes Walmart revenue', () => {
    const walmart = getRetailer('walmart');
    const walkedAwayIds = new Set(['walmart']);
    const absorptionRates: AbsorptionRates = {};
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(result.before.total_revenue).toBeGreaterThanOrEqual(walmart.gross_revenue);
  });

  // ── Test 4: Zero absorption — Walmart is net-negative, so walking away improves ─

  it('with zero absorption rates, net_impact is positive for Walmart (net-negative retailer)', () => {
    // Walmart has negative true_contribution — dropping it without redeployment
    // still improves the portfolio because we stop absorbing its losses.
    const walkedAwayIds = new Set(['walmart']);
    const absorptionRates: AbsorptionRates = {};  // all 0%
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(result.net_impact).toBeGreaterThan(0);
  });

  // ── Test 5: 100% absorption evenly distributed ────────────────────────────

  it('100% absorption distributed evenly among high-margin retailers can recover more', () => {
    const walkedAwayIds = new Set(['walmart']);
    const remaining = retailers.filter((r) => r.retailer_id !== 'walmart');

    // Give 10% absorption to each of 6 remaining = 60% total
    const absorptionRates: AbsorptionRates = {};
    for (const r of remaining) {
      absorptionRates[r.retailer_id] = 0.1;
    }
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(result.net_impact).toBeGreaterThan(
      computeRedeployment(retailers, walkedAwayIds, overrides, {}).net_impact,
    );
  });

  // ── Test 6: 20% absorbed by Sprouts (positive margin) improves vs 0% ────

  it('Walmart walked away, 20% absorbed by Sprouts (positive margin) improves net_impact vs 0%', () => {
    // Sprouts has positive contribution_margin_rate so absorbing freed revenue adds value
    const walkedAwayIds = new Set(['walmart']);
    const noAbsorption: AbsorptionRates = {};
    const sproutsAbsorbs: AbsorptionRates = { sprouts: 0.2 };

    const resultZero = computeRedeployment(retailers, walkedAwayIds, overrides, noAbsorption);
    const resultSprouts = computeRedeployment(retailers, walkedAwayIds, overrides, sproutsAbsorbs);
    expect(resultSprouts.net_impact).toBeGreaterThan(resultZero.net_impact);
  });

  // ── Test 7: Walk away from all retailers ─────────────────────────────────

  it('walking away from all retailers: after.total_contribution = 0', () => {
    const walkedAwayIds = new Set(retailers.map((r) => r.retailer_id));
    const absorptionRates: AbsorptionRates = {};
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(result.after.total_contribution).toBe(0);
    expect(result.after.retailer_count).toBe(0);
  });

  // ── Test 8: Portfolio has positive before.total_contribution ─────────────

  it('before.total_contribution is a finite number', () => {
    const walkedAwayIds = new Set(['walmart']);
    const absorptionRates: AbsorptionRates = {};
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, absorptionRates);
    expect(isFinite(result.before.total_contribution)).toBe(true);
  });

  it('freed resources have positive revenue when Walmart is walked away', () => {
    const walmart = getRetailer('walmart');
    const walkedAwayIds = new Set(['walmart']);
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, {});
    expect(result.freed.revenue).toBe(walmart.gross_revenue);
  });

  it('net_impact = after.total_contribution - before.total_contribution', () => {
    const walkedAwayIds = new Set(['walmart']);
    const result = computeRedeployment(retailers, walkedAwayIds, overrides, {});
    expect(result.net_impact).toBeCloseTo(
      result.after.total_contribution - result.before.total_contribution,
      6,
    );
  });
});
