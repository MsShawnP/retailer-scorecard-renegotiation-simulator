---
title: "Dual-Engine Cross-Validation: Maintaining Parallel Implementations with Shared Test Fixtures"
date: 2026-06-03
category: architecture-patterns
module: retailer-scorecard-renegotiation-simulator
problem_type: architecture_pattern
component: testing_framework
severity: high
applies_when:
  - "Same business logic must execute in two language runtimes (e.g., Python for library import, TypeScript for zero-latency client-side interaction)"
  - "Both engines must produce identical results for the same inputs"
  - "Logic contains conditional branches, iterative algorithms, or index arithmetic"
  - "Correctness matters more than convenience — approximate answers are not acceptable"
tags:
  - dual-implementation
  - cross-validation
  - shared-fixtures
  - python-typescript
  - cost-engine
  - formula-drift
  - bisection
---

# Dual-Engine Cross-Validation: Maintaining Parallel Implementations with Shared Test Fixtures

## Context

When a project must serve two non-negotiable runtime environments — a Python library importable by downstream systems and a TypeScript SPA that recalculates on every slider drag without API round-trips — the same business logic ends up implemented twice. This creates a class of bugs that single-language projects never encounter: formula drift between engines, where one implementation subtly diverges from the other and neither test suite catches it because each validates against its own logic in isolation.

The Retailer Scorecard project implemented an 8-layer cost-allocation formula (COGS, deductions, trade spend, working-capital drag, labor overhead, swell/returns, logistics variance, distributor margin) in both Python (`engine/cost_model.py`, importable by Question Engine Q1) and TypeScript (`frontend/src/calculations.ts`, for zero-latency slider interaction). Despite both engines being written from the same specification, three distinct drift bugs emerged during code review — one in break-even bisection logic, one in trajectory projection indexing, and one in the fixture generation pipeline itself. All three would have shipped silently without a structured cross-validation discipline.

The dual-engine architecture was a deliberate choice: the Python engine exists because the Question Engine Q1 imports it as a library. The TypeScript engine exists because slider-driven recalculation requires sub-16ms response with no network round-trip. Neither requirement can be relaxed.

## Guidance

### Designate one engine as canonical and make all other paths derive from it

The Python engine is the canonical implementation. Every other consumer of the business logic — the export script, the fixture generator, the test oracle — must import and call the Python engine rather than reimplementing formulas. The TypeScript engine is the one permitted copy, and it exists only because the browser runtime requires it.

### Generate test fixtures from the canonical engine, not from a standalone copy

The export script (`scripts/export_data.py`) builds `RetailerInput` objects and calls `engine.calculate_contributions()` to produce the `_computed` block in fixture files. Both the Python test suite and the TypeScript test suite validate against these same fixture values:

```python
# scripts/export_data.py — imports canonical engine
from engine.cost_model import calculate_contributions
from engine.types import RetailerInput

def compute_contributions(retailers: list[dict]) -> list[dict]:
    inputs = [RetailerInput.from_dict(r) for r in retailers]
    engine_results = calculate_contributions(inputs)
    result_map = {rc.retailer_id: rc for rc in engine_results}
    results = []
    for r in retailers:
        rc = result_map[r["retailer_id"]]
        bd = rc.cost_breakdown
        results.append({
            **r,
            "_computed": {
                "gross_margin": round(bd.gross_margin, 2),
                "true_contribution": round(rc.true_contribution, 2),
                # ... all cost layers from engine output
            },
        })
    return results
```

### Cross-validate every function that exists in both engines, not just the top-level result

The initial cross-validation script (`scripts/validate_calculations.py`) only checked top-level contribution totals against fixtures. This is why the bisection and trajectory bugs survived through U3 validation and into the review phase. (session history) Cross-validation must cover every public function individually — `calculate_contributions()`, `find_break_even_value()`, and `project_trajectory()` each need their own fixture-based assertions.

```typescript
// frontend/src/calculations.test.ts — fixture cross-validation
describe('fixture cross-validation', () => {
  for (const exp of expectedOutputs) {
    it(`${exp.retailer_id}: cost breakdown layers within $${TOLERANCE} of Python engine`, () => {
      const retailer = getRetailer(exp.retailer_id);
      const bd = calcCostBreakdown(retailer);
      expect(Math.abs(bd.gross_margin - exp.expected.gross_margin)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(bd.deductions - exp.expected.deductions)).toBeLessThanOrEqual(TOLERANCE);
      // ... every cost layer individually
    });
  }
});
```

### For numerical algorithms, match the exact branching logic

Subtle differences in guard conditions, loop bounds, and sign-comparison logic are where drift actually occurs. Both engines must use identical branching:

```python
# Python — find_break_even_value sign-change detection
if not ((tc_lo <= 0 <= tc_hi) or (tc_hi <= 0 <= tc_lo)):
    return None
# Bisection direction
if (tc_lo < 0) == (tc_mid < 0):
    lo = mid; tc_lo = tc_mid
else:
    hi = mid
```

```typescript
// TypeScript — must match Python's symmetric sign-change test
if (atMin >= 0 && atMax >= 0) return leverRange.min;
if (atMin < 0 && atMax < 0) return null;
// Same bisection direction logic
if ((tcLo < 0) === (tcMid < 0)) {
  lo = mid; tcLo = tcMid;
} else {
  hi = mid;
}
```

### For indexed iterations, verify that index semantics match across languages

Python's `range(1, months + 1)` and TypeScript's `Array.from({ length: months }, (_, i) => ...)` use different index bases. The growth factor exponent must be `i + 1` in TypeScript (where `i` is zero-based) to match Python's `month` (where `month` starts at 1):

```python
# Python — month starts at 1
for month in range(1, months + 1):
    growth_factor = (1.0 + monthly_growth) ** month
```

```typescript
// TypeScript — monthlyGrowth is the compounding factor (e.g., 1.0095 for 12% annual)
const monthlyGrowth = Math.pow(1 + r.growth_rate_annual, 1 / 12);
// i starts at 0, so exponent is i + 1 to match Python's 1-based month
Array.from({ length: months }, (_, i) => {
  const growthFactor = Math.pow(monthlyGrowth, i + 1);
});
```

## Why This Matters

**Fixture pipeline self-reference is invisible to tests.** When the export script reimplements formulas instead of importing the engine, the fixture file reflects the export script's logic, not the engine's. Both test suites pass against their respective implementations, but the two implementations may disagree with each other. This is the most dangerous class of dual-engine bug because CI is green while production outputs diverge.

In this project, the export script originally contained a standalone `compute_contributions()` that manually calculated all 8 cost layers. If a formula was changed in `engine/cost_model.py`, the change would not propagate to the fixtures. The Python tests would test the engine against the engine (tautological). The TypeScript tests would test the TypeScript engine against the stale fixtures. Neither would catch the discrepancy.

**Bisection guard asymmetry produces wrong answers for valid inputs.** The original TypeScript `findBreakEvenValue` used `if (atMin >= 0 || atMax >= 0)` — an OR condition that returned early whenever *either* endpoint was non-negative. This rejected cases where `atMax > 0` and `atMin < 0` (a valid sign change that Python would correctly bisect). The result: TypeScript returned `null` ("no break-even exists") for retailers where Python correctly found a break-even point. Two independent reviewers (correctness and adversarial personas) flagged this in the same review pass.

**Off-by-one in indexed loops compounds over time.** The original TypeScript `projectTrajectory` used `Math.pow(monthlyGrowth, i)` where `i` starts at 0, making month 1's growth factor `1.0` (no growth). Python used `(1 + monthly_growth) ** month` where `month` starts at 1. For a retailer with 12% annual growth, the 24-month projection endpoint diverged by one month's compounding — a small but systematic error visible to any user comparing the Python report to the interactive chart.

**Cross-validation that only checks top-level results gives false confidence.** (session history) The initial `validate_calculations.py` passed at U3 completion, confirming parity for `calculate_contributions()` totals. But it never tested `find_break_even_value()` or `project_trajectory()` individually. Both bisection and trajectory bugs shipped past this gate because the aggregate contribution numbers were correct — only the secondary functions diverged.

## When to Apply

This pattern applies when all three conditions hold:

1. **The same business logic must execute in two or more language runtimes.** Not "could benefit from" — "must." If one runtime can serve both needs (via API, WASM, or acceptable latency), use one engine and skip dual implementation entirely.

2. **The business logic is non-trivial.** Simple arithmetic does not need cross-validation. An 8-layer cost model with bisection-based break-even solving and compounded trajectory projection does. The threshold: if the logic contains conditional branches, iterative algorithms, or index arithmetic, cross-validate.

3. **Correctness matters more than convenience.** If approximate answers are acceptable, one implementation with manual spot-checks may suffice. If the two engines feed into different decision surfaces and must agree exactly, the cross-validation overhead is mandatory.

The pattern does NOT apply to:
- Formatting/presentation logic that differs by platform
- Configuration or constants shareable via a JSON file both runtimes read
- Code that can be compiled/transpiled to run in both environments (e.g., Rust to WASM)

## Examples

### Fixture pipeline — before and after

**BEFORE (self-referencing — fixtures generated by a standalone reimplementation):**

```python
# scripts/export_data.py — reimplements all 8 cost layers
def compute_contributions(retailers):
    results = []
    for r in retailers:
        gr = r["gross_revenue"]
        gross_margin = gr * (1 - r["cogs_rate"])
        deductions = gr * r["deductions_rate"]
        trade_spend = gr * r["trade_spend_rate"]
        working_capital = (r["payment_terms_days"] / 365) * gr * r["cost_of_capital"]
        labor = (r["labor_hours_compliance"] + r["labor_hours_disputes"]) * r["labor_rate"]
        swell_returns = gr * r["returns_rate"]
        logistics = gr * (r["freight_differential_rate"]
            + r["pallet_surcharge_rate"] + r["moq_penalty_rate"])
        distributor_margin = gr * r["distributor_margin_rate"]
        total = (deductions + trade_spend + working_capital
            + labor + swell_returns + logistics + distributor_margin)
        true_contribution = gross_margin - total
        results.append({**r, "_computed": {
            "true_contribution": round(true_contribution, 2),
        }})
    return results
```

Problem: If `engine/cost_model.py` changes how logistics variance is calculated, this script would not reflect the change. Both test suites would pass — Python tests against the engine, TypeScript tests against the stale fixtures — and the two runtimes would silently disagree.

**AFTER:** The corrected version imports the canonical engine (shown in the Guidance section above). A formula change in the engine automatically propagates to fixtures the next time `export_data.py` runs. If the TypeScript engine does not match, cross-validation tests fail.

### Break-even bisection — before and after

**BEFORE (asymmetric guard):**

```typescript
const atMin = evalAt(leverRange.min);
const atMax = evalAt(leverRange.max);
if (atMin >= 0 || atMax >= 0) {
  if (atMin >= 0) return leverRange.min;
  return null;
}
```

When `atMin = -50000` and `atMax = +30000`, the OR condition evaluates to `true`. The function enters the early-return branch, sees `atMin < 0`, and returns `null` — claiming no break-even exists. Python's symmetric check correctly identifies this as a sign change and bisects.

**AFTER (symmetric guard matching Python):**

```typescript
if (atMin >= 0 && atMax >= 0) return leverRange.min;
if (atMin < 0 && atMax < 0) return null;
// Sign change exists — bisect with direction-aware halving
// Full loop: 64 iterations, 1e-9 convergence, 1e-6 early exit, post-loop range check
if ((tcLo < 0) === (tcMid < 0)) { lo = mid; tcLo = tcMid; }
else { hi = mid; }
```

Note: the Python engine uses 60 iterations; TypeScript uses 64. Both converge well within tolerance for this problem's input ranges, but the count discrepancy should be unified if the engines are ever extended to higher-precision domains.

### Cross-validation pipeline structure

```
Python engine (canonical)
    |
    v
export_data.py (imports engine, calls calculate_contributions)
    |
    +---> tests/fixtures/retailer_profiles.json   (input data + _computed)
    +---> tests/fixtures/expected_outputs.json     (expected results for TS)
    +---> frontend/public/json/retailers.json      (production data)
```

Python tests validate against `retailer_profiles.json`. TypeScript tests validate against `expected_outputs.json`. Both fixture files are produced by the same engine run — closing the loop.

## Related

- DECISIONS.md: "Dual calculation implementation: Python + TypeScript" — architectural rationale
- DECISIONS.md: "TS findBreakEvenValue must use symmetric sign-change detection matching Python" — bisection bug details
- DECISIONS.md: "export_data.py must import engine, not reimplement formulas" — fixture drift prevention
- `scripts/validate_calculations.py` — the cross-validation gate script
- `tests/fixtures/` — shared fixture directory bridging both engines
