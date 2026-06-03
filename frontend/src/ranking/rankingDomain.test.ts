import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import type { Retailer } from '../types';
import { computeRankingLayout, getBarX } from './rankingDomain';

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
const CONTAINER_WIDTH = 860;

// ── Test 1: 7 bars for 7 retailers ───────────────────────────────────────────

describe('computeRankingLayout', () => {
  it('returns 7 bars for 7 retailers', () => {
    const layout = computeRankingLayout(retailers, undefined, 'gross', CONTAINER_WIDTH);
    expect(layout.bars).toHaveLength(7);
  });

  // ── Test 2: gross mode sorts by gross_revenue descending ─────────────────

  it('sorts bars largest-to-smallest by gross_revenue in gross mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'gross', CONTAINER_WIDTH);
    const revenues = layout.bars.map((b) => b.gross_revenue);
    for (let i = 1; i < revenues.length; i++) {
      expect(revenues[i]).toBeLessThanOrEqual(revenues[i - 1]);
    }
  });

  // ── Test 3: contribution mode sorts by true_contribution descending ───────

  it('sorts bars largest-to-smallest by true_contribution in contribution mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const contribs = layout.bars.map((b) => b.true_contribution);
    for (let i = 1; i < contribs.length; i++) {
      expect(contribs[i]).toBeLessThanOrEqual(contribs[i - 1]);
    }
  });

  // ── Test 4: Walmart is last (index 6) in contribution mode ───────────────

  it('places Walmart last (index 6) in contribution mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    expect(layout.bars[6].retailer_id).toBe('walmart');
  });

  // ── Test 5: Walmart bar is_negative=true in contribution mode ────────────

  it('marks Walmart is_negative=true in contribution mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const walmart = layout.bars.find((b) => b.retailer_id === 'walmart');
    expect(walmart).toBeDefined();
    expect(walmart!.is_negative).toBe(true);
  });

  // ── Test 6: Costco is positive and ranked before Walmart ─────────────────

  it('places Costco before Walmart with is_negative=false in contribution mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const costcoIdx = layout.bars.findIndex((b) => b.retailer_id === 'costco');
    const walmartIdx = layout.bars.findIndex((b) => b.retailer_id === 'walmart');
    expect(costcoIdx).toBeGreaterThanOrEqual(0);
    expect(costcoIdx).toBeLessThan(walmartIdx);
    expect(layout.bars[costcoIdx].is_negative).toBe(false);
  });

  // ── Test 7: all y-values are unique ──────────────────────────────────────

  it('assigns unique y-positions to all bars', () => {
    const layout = computeRankingLayout(retailers, undefined, 'gross', CONTAINER_WIDTH);
    const ys = layout.bars.map((b) => b.y);
    const unique = new Set(ys);
    expect(unique.size).toBe(ys.length);
  });

  // ── Test 8: bar_width > 0 for all bars ───────────────────────────────────

  it('computes bar_width > 0 for all bars with non-zero values', () => {
    const layout = computeRankingLayout(retailers, undefined, 'gross', CONTAINER_WIDTH);
    for (const bar of layout.bars) {
      expect(bar.bar_width).toBeGreaterThan(0);
    }
  });

  it('computes bar_width > 0 for all bars in contribution mode', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    for (const bar of layout.bars) {
      expect(bar.bar_width).toBeGreaterThan(0);
    }
  });

  // ── Test 10: switching modes reshuffles bar order ─────────────────────────

  it('reshuffles bar order when switching from gross to contribution mode', () => {
    const grossLayout = computeRankingLayout(retailers, undefined, 'gross', CONTAINER_WIDTH);
    const contribLayout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const grossOrder = grossLayout.bars.map((b) => b.retailer_id);
    const contribOrder = contribLayout.bars.map((b) => b.retailer_id);
    // The orders should differ — Walmart is #1 by gross but last by contribution
    expect(grossOrder).not.toEqual(contribOrder);
  });
});

// ── Test 9: getBarX returns correct x for positive and negative bars ──────────

describe('getBarX', () => {
  it('returns x < zeroX for a negative bar', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const walmart = layout.bars.find((b) => b.retailer_id === 'walmart');
    expect(walmart).toBeDefined();
    expect(walmart!.is_negative).toBe(true);
    const x = getBarX(walmart!, layout.zeroX);
    expect(x).toBeLessThan(layout.zeroX);
  });

  it('returns x === zeroX for a positive bar', () => {
    const layout = computeRankingLayout(retailers, undefined, 'contribution', CONTAINER_WIDTH);
    const costco = layout.bars.find((b) => b.retailer_id === 'costco');
    expect(costco).toBeDefined();
    expect(costco!.is_negative).toBe(false);
    const x = getBarX(costco!, layout.zeroX);
    expect(x).toBe(layout.zeroX);
  });
});
