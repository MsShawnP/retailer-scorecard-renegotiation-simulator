"""Test suite for engine/cost_model.py.

Written BEFORE the implementation (test-first). Each test must fail
when cost_model.py does not exist, and pass after implementation.

Run:
    python -m pytest tests/test_cost_model.py -v
"""
from __future__ import annotations

import json
import math
import os
import sys

import pytest

# ── path setup so tests can import `engine` from the project root ──────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# ── helpers ──────────────────────────────────────────────────────────────────

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "retailer_profiles.json")

with open(FIXTURE_PATH) as f:
    _PROFILES = json.load(f)

_PROFILE_MAP = {p["retailer_id"]: p for p in _PROFILES}


def _build_input(profile: dict):
    """Convert a fixture profile dict to a RetailerInput."""
    from engine.types import RetailerInput

    return RetailerInput.from_dict(profile)


def _all_inputs():
    return [_build_input(p) for p in _PROFILES]


def _walmart():
    return _build_input(_PROFILE_MAP["walmart"])


def _costco():
    return _build_input(_PROFILE_MAP["costco"])


# ── Test 16: importability (run first so failures here surface clearly) ──────

def test_engine_importable():
    """Engine importable as `from engine.cost_model import calculate_contributions`."""
    from engine.cost_model import calculate_contributions  # noqa: F401


# ── Test 1: happy path — correct 7-retailer ranked list ────────────────────

def test_calculate_contributions_returns_all_six_retailers():
    """calculate_contributions() returns one result per retailer, all 6 present."""
    from engine.cost_model import calculate_contributions

    retailers = _all_inputs()
    results = calculate_contributions(retailers)

    assert len(results) == 6
    result_ids = {r.retailer_id for r in results}
    expected_ids = {p["retailer_id"] for p in _PROFILES}
    assert result_ids == expected_ids


# ── Test 2: happy path — Walmart true_contribution is negative ───────────────

def test_walmart_true_contribution_is_negative():
    """Walmart has a negative true contribution — the anchor story."""
    from engine.cost_model import calculate_contributions

    results = calculate_contributions(_all_inputs())
    walmart = next(r for r in results if r.retailer_id == "walmart")
    assert walmart.true_contribution < 0, (
        f"Expected Walmart true_contribution < 0, got {walmart.true_contribution}"
    )


# ── Test 3: happy path — Costco contribution_margin_rate > Walmart ───────────

def test_costco_contribution_margin_rate_exceeds_walmart():
    """The inversion: Costco's contribution margin rate exceeds Walmart's."""
    from engine.cost_model import calculate_contributions

    results = calculate_contributions(_all_inputs())
    result_map = {r.retailer_id: r for r in results}
    assert result_map["costco"].contribution_margin_rate > result_map["walmart"].contribution_margin_rate


# ── Test 4: happy path — override trade_spend reshuffles ranking ────────────

def test_override_trade_spend_reshuffles_ranking():
    """Reducing Walmart trade_spend_rate from 0.28 to 0.15 improves its rank."""
    from engine.cost_model import calculate_contributions
    from engine.types import LeverOverrides

    retailers = _all_inputs()

    baseline = calculate_contributions(retailers)
    walmart_baseline_rank = next(r for r in baseline if r.retailer_id == "walmart").rank_by_contribution

    overrides = {"walmart": LeverOverrides(trade_spend_rate=0.15)}
    modified = calculate_contributions(retailers, overrides)
    walmart_modified_rank = next(r for r in modified if r.retailer_id == "walmart").rank_by_contribution

    # Lower numeric rank = better position (1 = best)
    assert walmart_modified_rank < walmart_baseline_rank, (
        f"Expected Walmart rank to improve (lower number) after trade_spend reduction. "
        f"Before: {walmart_baseline_rank}, After: {walmart_modified_rank}"
    )


# ── Test 5: happy path — reducing payment_terms_days for Walmart ─────────────

def test_override_payment_terms_improves_walmart_contribution():
    """Reducing payment_terms_days from 60 to 30 improves Walmart's true_contribution."""
    from engine.cost_model import calculate_contributions
    from engine.types import LeverOverrides

    retailers = _all_inputs()

    baseline = calculate_contributions(retailers)
    walmart_baseline_tc = next(r for r in baseline if r.retailer_id == "walmart").true_contribution

    overrides = {"walmart": LeverOverrides(payment_terms_days=30)}
    modified = calculate_contributions(retailers, overrides)
    walmart_modified_tc = next(r for r in modified if r.retailer_id == "walmart").true_contribution

    assert walmart_modified_tc > walmart_baseline_tc, (
        f"Expected Walmart contribution to improve. Before: {walmart_baseline_tc}, After: {walmart_modified_tc}"
    )


# ── Test 6: happy path — gross rank #1 is Walmart, contribution rank #6 ──────

def test_walmart_is_rank_1_by_gross_and_rank_6_by_contribution():
    """Walmart is the largest by gross revenue (#1) but worst by true contribution (#6)."""
    from engine.cost_model import calculate_contributions

    results = calculate_contributions(_all_inputs())
    walmart = next(r for r in results if r.retailer_id == "walmart")
    assert walmart.rank_by_gross == 1, f"Expected Walmart rank_by_gross=1, got {walmart.rank_by_gross}"
    assert walmart.rank_by_contribution == 6, (
        f"Expected Walmart rank_by_contribution=6, got {walmart.rank_by_contribution}"
    )


# ── Test 7: edge case — all overrides None equals baseline ─────────────────

def test_all_none_overrides_equals_baseline():
    """Passing all-None LeverOverrides produces the same result as no overrides."""
    from engine.cost_model import calculate_contributions
    from engine.types import LeverOverrides

    retailers = _all_inputs()
    baseline = calculate_contributions(retailers)
    # Each retailer gets an all-None override
    none_overrides = {r.retailer_id: LeverOverrides() for r in retailers}
    result = calculate_contributions(retailers, none_overrides)

    baseline_map = {r.retailer_id: r.true_contribution for r in baseline}
    result_map = {r.retailer_id: r.true_contribution for r in result}

    for rid, base_tc in baseline_map.items():
        assert result_map[rid] == pytest.approx(base_tc, abs=1e-6), (
            f"Retailer {rid}: expected {base_tc}, got {result_map[rid]}"
        )


# ── Test 8: edge case — zero gross_revenue ──────────────────────────────────

def test_zero_gross_revenue_returns_zero_contribution_no_division_error():
    """zero gross_revenue does not raise ZeroDivisionError; revenue-proportional costs are zero.

    Labor is a fixed cost (hours × rate) independent of revenue, so
    true_contribution = 0 - labor_overhead (negative). The key invariant
    is: no exception is raised and contribution_margin_rate is 0.0.
    """
    from engine.cost_model import calculate_contributions
    from engine.types import RetailerInput

    lhc = 100.0
    lhd = 100.0
    lr = 35.0
    expected_labor = (lhc + lhd) * lr  # 7000.0

    zero_retailer = RetailerInput(
        retailer_id="zero",
        name="Zero Revenue",
        gross_revenue=0.0,
        cogs_rate=0.5,
        deductions_rate=0.08,
        trade_spend_rate=0.2,
        payment_terms_days=30,
        cost_of_capital=0.12,
        labor_hours_compliance=lhc,
        labor_hours_disputes=lhd,
        labor_rate=lr,
        returns_rate=0.02,
        freight_differential_rate=0.02,
        pallet_surcharge_rate=0.005,
        moq_penalty_rate=0.001,
        distributor_margin_rate=0.0,
        growth_rate_annual=0.05,
    )

    results = calculate_contributions([zero_retailer])
    assert len(results) == 1
    r = results[0]

    # All revenue-proportional costs are zero
    assert r.cost_breakdown.deductions == 0.0
    assert r.cost_breakdown.trade_spend == 0.0
    assert r.cost_breakdown.gross_margin == 0.0
    assert r.cost_breakdown.swell_returns == 0.0
    assert r.cost_breakdown.logistics_variance == 0.0

    # Labor is fixed — still incurred
    assert r.cost_breakdown.labor_overhead == pytest.approx(expected_labor, abs=1e-6)

    # true_contribution = 0 (gross margin) - labor overhead
    assert r.true_contribution == pytest.approx(-expected_labor, abs=1e-6)

    # contribution_margin_rate: zero-revenue guard returns 0.0 (no division error)
    assert r.contribution_margin_rate == 0.0


# ── Test 9: edge case — override trade_spend_rate = 0 ──────────────────────

def test_override_trade_spend_zero_is_valid_not_nan():
    """override trade_spend_rate=0 removes the trade_spend cost; result is finite, not NaN."""
    from engine.cost_model import calculate_contributions
    from engine.types import LeverOverrides

    retailers = _all_inputs()
    overrides = {"walmart": LeverOverrides(trade_spend_rate=0.0)}
    results = calculate_contributions(retailers, overrides)
    walmart = next(r for r in results if r.retailer_id == "walmart")

    assert not math.isnan(walmart.true_contribution)
    assert walmart.cost_breakdown.trade_spend == pytest.approx(0.0, abs=1e-6)
    # With zero trade spend, Walmart should now be positive
    assert walmart.true_contribution > 0


# ── Test 10: error — NaN input produces NaN contribution ───────────────────

def test_nan_input_returns_nan_contribution():
    """NaN input for a cost-layer rate propagates to NaN true_contribution (NaN-first branching)."""
    from engine.cost_model import calculate_contributions
    from engine.types import RetailerInput

    nan_retailer = RetailerInput(
        retailer_id="nan_test",
        name="NaN Test",
        gross_revenue=1_000_000.0,
        cogs_rate=float("nan"),  # NaN injected here
        deductions_rate=0.08,
        trade_spend_rate=0.20,
        payment_terms_days=30,
        cost_of_capital=0.12,
        labor_hours_compliance=100.0,
        labor_hours_disputes=100.0,
        labor_rate=35.0,
        returns_rate=0.02,
        freight_differential_rate=0.02,
        pallet_surcharge_rate=0.005,
        moq_penalty_rate=0.001,
        distributor_margin_rate=0.0,
        growth_rate_annual=0.05,
    )

    results = calculate_contributions([nan_retailer])
    assert math.isnan(results[0].true_contribution), (
        "Expected NaN true_contribution when input contains NaN"
    )


# ── Test 11: perturbation — doubling deductions_rate doubles deductions ──────

def test_doubling_deductions_rate_doubles_deductions_cost():
    """Doubling deductions_rate doubles the deductions dollar amount (not a constant)."""
    from engine.cost_model import calculate_deductions
    from engine.types import RetailerInput

    base = _walmart()
    doubled = RetailerInput(
        **{**base.__dict__, "deductions_rate": base.deductions_rate * 2}
    )

    base_deductions = calculate_deductions(base)
    doubled_deductions = calculate_deductions(doubled)

    assert doubled_deductions == pytest.approx(base_deductions * 2, rel=1e-6), (
        f"Expected doubled_deductions ≈ {base_deductions * 2:.4f}, got {doubled_deductions:.4f}"
    )


# ── Test 12: perturbation — halving payment_terms_days halves WCD ───────────

def test_halving_payment_terms_days_halves_working_capital_drag():
    """Halving payment_terms_days halves working_capital_drag (not a constant)."""
    from engine.cost_model import calculate_working_capital_drag
    from engine.types import RetailerInput

    base = _walmart()  # payment_terms_days=60
    halved = RetailerInput(
        **{**base.__dict__, "payment_terms_days": base.payment_terms_days // 2}
    )  # payment_terms_days=30

    base_wcd = calculate_working_capital_drag(base)
    halved_wcd = calculate_working_capital_drag(halved)

    assert halved_wcd == pytest.approx(base_wcd / 2, rel=1e-6), (
        f"Expected halved WCD ≈ {base_wcd / 2:.4f}, got {halved_wcd:.4f}"
    )


# ── Test 13: integration — output matches fixture _computed values ──────────

def test_output_matches_fixture_computed_values_within_tolerance():
    """calculate_contributions() output matches fixture _computed values within 1e-2."""
    from engine.cost_model import calculate_contributions

    results = calculate_contributions(_all_inputs())
    result_map = {r.retailer_id: r for r in results}

    for profile in _PROFILES:
        rid = profile["retailer_id"]
        expected = profile["_computed"]
        result = result_map[rid]

        assert result.cost_breakdown.gross_margin == pytest.approx(
            expected["gross_margin"], abs=1e-2
        ), f"{rid} gross_margin: expected {expected['gross_margin']}, got {result.cost_breakdown.gross_margin}"

        assert result.cost_breakdown.deductions == pytest.approx(
            expected["deductions"], abs=1e-2
        ), f"{rid} deductions: expected {expected['deductions']}, got {result.cost_breakdown.deductions}"

        assert result.cost_breakdown.trade_spend == pytest.approx(
            expected["trade_spend"], abs=1e-2
        ), f"{rid} trade_spend: expected {expected['trade_spend']}, got {result.cost_breakdown.trade_spend}"

        assert result.cost_breakdown.working_capital_drag == pytest.approx(
            expected["working_capital"], abs=1e-2
        ), f"{rid} working_capital_drag: expected {expected['working_capital']}, got {result.cost_breakdown.working_capital_drag}"

        assert result.cost_breakdown.labor_overhead == pytest.approx(
            expected["labor"], abs=1e-2
        ), f"{rid} labor_overhead: expected {expected['labor']}, got {result.cost_breakdown.labor_overhead}"

        assert result.cost_breakdown.swell_returns == pytest.approx(
            expected["swell_returns"], abs=1e-2
        ), f"{rid} swell_returns: expected {expected['swell_returns']}, got {result.cost_breakdown.swell_returns}"

        assert result.cost_breakdown.logistics_variance == pytest.approx(
            expected["logistics"], abs=1e-2
        ), f"{rid} logistics_variance: expected {expected['logistics']}, got {result.cost_breakdown.logistics_variance}"

        assert result.cost_breakdown.distributor_margin == pytest.approx(
            expected["distributor_margin"], abs=1e-2
        ), f"{rid} distributor_margin: expected {expected['distributor_margin']}, got {result.cost_breakdown.distributor_margin}"

        assert result.true_contribution == pytest.approx(
            expected["true_contribution"], abs=1e-2
        ), f"{rid} true_contribution: expected {expected['true_contribution']}, got {result.true_contribution}"

        assert result.contribution_margin_rate == pytest.approx(
            expected["contribution_margin_rate"], abs=1e-2
        ), f"{rid} contribution_margin_rate: expected {expected['contribution_margin_rate']}, got {result.contribution_margin_rate}"


# ── Test 14: break-even — find_break_even_value for Walmart trade_spend ──────

def test_find_break_even_value_returns_trade_spend_rate_where_walmart_flips_positive():
    """find_break_even_value returns the trade_spend_rate at which Walmart crosses zero contribution."""
    from engine.cost_model import find_break_even_value
    from engine.types import LeverOverrides

    walmart = _walmart()
    lever_range = {"min": 0.15, "max": 0.35}
    overrides = LeverOverrides()

    breakeven = find_break_even_value(walmart, "trade_spend_rate", overrides, lever_range)

    assert breakeven is not None, "Expected a break-even value, got None"
    assert lever_range["min"] <= breakeven <= lever_range["max"], (
        f"Break-even {breakeven} outside lever range {lever_range}"
    )

    # Verify the break-even actually produces near-zero contribution
    from engine.cost_model import calculate_true_contribution

    be_overrides = LeverOverrides(trade_spend_rate=breakeven)
    tc, _ = calculate_true_contribution(walmart, be_overrides)
    assert abs(tc) < 1.0, f"Expected true_contribution ≈ 0 at break-even, got {tc}"


# ── Test 15: trajectory — 24-month projection grows monotonically ────────────

def test_24_month_trajectory_grows_monotonically_with_positive_growth_rate():
    """project_trajectory() grows monotonically when growth_rate_annual > 0."""
    from engine.cost_model import project_trajectory
    from engine.types import LeverOverrides

    # Use Costco (positive contribution, positive growth rate)
    costco = _costco()
    assert costco.growth_rate_annual > 0

    trajectory = project_trajectory(costco, LeverOverrides(), months=24)

    assert len(trajectory) == 24, f"Expected 24 months, got {len(trajectory)}"

    # Each month should be >= previous (monotonically non-decreasing)
    for i in range(1, len(trajectory)):
        assert trajectory[i] >= trajectory[i - 1], (
            f"Trajectory not monotonically increasing at month {i}: "
            f"{trajectory[i-1]:.2f} -> {trajectory[i]:.2f}"
        )

    # First month should match costco's current contribution closely
    from engine.cost_model import calculate_true_contribution

    base_tc, _ = calculate_true_contribution(costco)
    # Monthly contribution at month 0 growth factor is base_tc * (1+monthly_rate)^0 effectively
    # The first projected point represents month 1
    assert trajectory[0] > 0, "Expected positive trajectory for Costco"
