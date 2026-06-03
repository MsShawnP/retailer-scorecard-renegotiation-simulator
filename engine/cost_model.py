"""Core cost-allocation calculations for the retailer scorecard engine.

All functions are pure (no side effects). Intermediate values use full float
precision; rounding belongs at the presentation layer only.

NaN-first branching: any NaN input propagates to a NaN output rather than
silently producing a misleading finite result.

Public entry point for Q1:
    from engine.cost_model import calculate_contributions
"""
from __future__ import annotations

import math
from typing import Optional

from engine.types import (
    CostLayerBreakdown,
    LeverOverrides,
    RetailerContribution,
    RetailerInput,
)


# ── Individual cost-layer functions ──────────────────────────────────────────


def calculate_gross_margin(retailer: RetailerInput) -> float:
    """gross_revenue × (1 − cogs_rate)."""
    return retailer.gross_revenue * (1.0 - retailer.cogs_rate)


def calculate_deductions(
    retailer: RetailerInput, overrides: Optional[LeverOverrides] = None
) -> float:
    """gross_revenue × effective_deductions_rate."""
    rate = (
        overrides.deductions_rate
        if overrides is not None and overrides.deductions_rate is not None
        else retailer.deductions_rate
    )
    return retailer.gross_revenue * rate


def calculate_trade_spend(
    retailer: RetailerInput, overrides: Optional[LeverOverrides] = None
) -> float:
    """gross_revenue × effective_trade_spend_rate."""
    rate = (
        overrides.trade_spend_rate
        if overrides is not None and overrides.trade_spend_rate is not None
        else retailer.trade_spend_rate
    )
    return retailer.gross_revenue * rate


def calculate_working_capital_drag(
    retailer: RetailerInput, overrides: Optional[LeverOverrides] = None
) -> float:
    """(payment_terms_days / 365) × gross_revenue × cost_of_capital."""
    days = (
        overrides.payment_terms_days
        if overrides is not None and overrides.payment_terms_days is not None
        else retailer.payment_terms_days
    )
    return (days / 365.0) * retailer.gross_revenue * retailer.cost_of_capital


def calculate_labor_overhead(retailer: RetailerInput) -> float:
    """(labor_hours_compliance + labor_hours_disputes) × labor_rate."""
    return (retailer.labor_hours_compliance + retailer.labor_hours_disputes) * retailer.labor_rate


def calculate_swell_returns(
    retailer: RetailerInput, overrides: Optional[LeverOverrides] = None
) -> float:
    """gross_revenue × effective_returns_rate."""
    rate = (
        overrides.returns_rate
        if overrides is not None and overrides.returns_rate is not None
        else retailer.returns_rate
    )
    return retailer.gross_revenue * rate


def calculate_logistics_variance(
    retailer: RetailerInput, overrides: Optional[LeverOverrides] = None
) -> float:
    """gross_revenue × effective logistics rate.

    When LeverOverrides.logistics_rate is set it replaces the combined
    (freight_differential_rate + pallet_surcharge_rate + moq_penalty_rate).
    """
    if overrides is not None and overrides.logistics_rate is not None:
        rate = overrides.logistics_rate
    else:
        rate = (
            retailer.freight_differential_rate
            + retailer.pallet_surcharge_rate
            + retailer.moq_penalty_rate
        )
    return retailer.gross_revenue * rate


def calculate_distributor_margin(retailer: RetailerInput) -> float:
    """gross_revenue × distributor_margin_rate."""
    return retailer.gross_revenue * retailer.distributor_margin_rate


# ── True contribution ─────────────────────────────────────────────────────────


def calculate_true_contribution(
    retailer: RetailerInput,
    overrides: Optional[LeverOverrides] = None,
) -> tuple[float, CostLayerBreakdown]:
    """Compute true contribution and a full cost-layer breakdown.

    Returns
    -------
    (true_contribution, CostLayerBreakdown)

    NaN propagation: if any input that feeds gross_margin is NaN, the result
    true_contribution will be NaN. All intermediate calculations use full
    float precision.
    """
    gross_margin = calculate_gross_margin(retailer)
    deductions = calculate_deductions(retailer, overrides)
    trade_spend = calculate_trade_spend(retailer, overrides)
    working_capital_drag = calculate_working_capital_drag(retailer, overrides)
    labor_overhead = calculate_labor_overhead(retailer)
    swell_returns = calculate_swell_returns(retailer, overrides)
    logistics_variance = calculate_logistics_variance(retailer, overrides)
    distributor_margin = calculate_distributor_margin(retailer)

    total_cost_layers = (
        deductions
        + trade_spend
        + working_capital_drag
        + labor_overhead
        + swell_returns
        + logistics_variance
        + distributor_margin
    )

    true_contribution = gross_margin - total_cost_layers

    breakdown = CostLayerBreakdown(
        gross_margin=gross_margin,
        deductions=deductions,
        trade_spend=trade_spend,
        working_capital_drag=working_capital_drag,
        labor_overhead=labor_overhead,
        swell_returns=swell_returns,
        logistics_variance=logistics_variance,
        distributor_margin=distributor_margin,
        total_cost_layers=total_cost_layers,
    )

    return true_contribution, breakdown


# ── Portfolio-level function ──────────────────────────────────────────────────


def calculate_contributions(
    retailers: list[RetailerInput],
    overrides: Optional[dict[str, LeverOverrides]] = None,
) -> list[RetailerContribution]:
    """Compute true contribution for every retailer, with dual-axis ranking.

    This is the main entry point imported by Q1.

    Parameters
    ----------
    retailers:
        All retailer inputs to evaluate.
    overrides:
        Optional dict of retailer_id -> LeverOverrides for scenario modeling.
        Retailers not present in the dict use baseline inputs.

    Returns
    -------
    List of RetailerContribution sorted by rank_by_contribution ascending
    (best contributor first).

    Zero gross_revenue: returns zero contribution and zero margin rate without
    raising ZeroDivisionError.
    """
    if overrides is None:
        overrides = {}

    # First pass: compute true contribution for each retailer.
    raw: list[tuple[RetailerInput, float, CostLayerBreakdown]] = []
    for retailer in retailers:
        lever = overrides.get(retailer.retailer_id)
        tc, breakdown = calculate_true_contribution(retailer, lever)
        raw.append((retailer, tc, breakdown))

    # Rank by gross revenue descending (rank 1 = largest gross_revenue).
    gross_sorted = sorted(raw, key=lambda x: x[0].gross_revenue, reverse=True)
    gross_ranks: dict[str, int] = {
        item[0].retailer_id: i + 1 for i, item in enumerate(gross_sorted)
    }

    # Rank by true_contribution descending (rank 1 = best contributor).
    # NaN values sort to the bottom (worst rank).
    def contribution_sort_key(item: tuple) -> float:
        tc = item[1]
        return tc if not math.isnan(tc) else float("-inf")

    contribution_sorted = sorted(raw, key=contribution_sort_key, reverse=True)
    contribution_ranks: dict[str, int] = {
        item[0].retailer_id: i + 1 for i, item in enumerate(contribution_sorted)
    }

    # Build results.
    results: list[RetailerContribution] = []
    for retailer, tc, breakdown in raw:
        gr = retailer.gross_revenue
        if gr == 0.0 or math.isnan(gr):
            cmr = 0.0 if gr == 0.0 else float("nan")
        elif math.isnan(tc):
            cmr = float("nan")
        else:
            cmr = tc / gr

        results.append(
            RetailerContribution(
                retailer_id=retailer.retailer_id,
                name=retailer.name,
                gross_revenue=gr,
                true_contribution=tc,
                contribution_margin_rate=cmr,
                cost_breakdown=breakdown,
                rank_by_gross=gross_ranks[retailer.retailer_id],
                rank_by_contribution=contribution_ranks[retailer.retailer_id],
            )
        )

    # Return sorted by contribution rank (best first).
    results.sort(key=lambda r: r.rank_by_contribution)
    return results


# ── Scenario utilities ────────────────────────────────────────────────────────


def find_break_even_value(
    retailer: RetailerInput,
    lever: str,
    current_overrides: LeverOverrides,
    lever_range: dict,
) -> Optional[float]:
    """Find the lever value at which true_contribution crosses zero.

    Uses bisection search (binary search) — exact and stable for monotone
    functions. Returns None if break-even is not achievable within lever_range.

    Parameters
    ----------
    retailer:
        The retailer to analyze.
    lever:
        Name of the LeverOverrides field to search (e.g. 'trade_spend_rate').
    current_overrides:
        Existing overrides to preserve for other levers.
    lever_range:
        Dict with 'min' and 'max' keys defining the search bounds.

    Supported levers
    ----------------
    trade_spend_rate, deductions_rate, payment_terms_days, returns_rate,
    logistics_rate.
    """
    lo = float(lever_range["min"])
    hi = float(lever_range["max"])

    def _tc_at(value: float) -> float:
        kwargs = {
            "trade_spend_rate": current_overrides.trade_spend_rate,
            "deductions_rate": current_overrides.deductions_rate,
            "payment_terms_days": current_overrides.payment_terms_days,
            "returns_rate": current_overrides.returns_rate,
            "logistics_rate": current_overrides.logistics_rate,
        }
        # Cast payment_terms_days to int when that lever is being searched
        if lever == "payment_terms_days":
            kwargs[lever] = int(round(value))
        else:
            kwargs[lever] = value
        trial_overrides = LeverOverrides(**kwargs)
        tc, _ = calculate_true_contribution(retailer, trial_overrides)
        return tc

    tc_lo = _tc_at(lo)
    tc_hi = _tc_at(hi)

    # Break-even must exist between lo and hi (sign change required).
    # Higher lever values for cost rates mean lower contribution; the function
    # is monotonically decreasing in cost rates and monotonically increasing
    # for payment_terms reductions. We look for sign change regardless.
    if not (
        (tc_lo <= 0 <= tc_hi) or (tc_hi <= 0 <= tc_lo)
    ):
        return None

    # Bisection — 60 iterations gives < 1e-15 relative error for most ranges.
    for _ in range(60):
        mid = (lo + hi) / 2.0
        tc_mid = _tc_at(mid)
        if abs(tc_mid) < 1e-6:
            return mid
        # Determine which half contains the zero crossing.
        if (tc_lo < 0) == (tc_mid < 0):
            lo = mid
            tc_lo = tc_mid
        else:
            hi = mid

    return (lo + hi) / 2.0


def project_trajectory(
    retailer: RetailerInput,
    overrides: LeverOverrides,
    months: int = 24,
) -> list[float]:
    """Project monthly true contribution over N months assuming growth_rate_annual.

    Revenue grows each month at the compounded monthly rate derived from
    growth_rate_annual. Cost rates and fixed labor are held constant — the
    revenue base grows, so both gross margin and all revenue-proportional
    costs scale together, causing true contribution to grow proportionally.

    Parameters
    ----------
    retailer:
        Base retailer inputs.
    overrides:
        Lever overrides to apply (scenario projection).
    months:
        Number of monthly periods to project (default 24).

    Returns
    -------
    List of length ``months`` where index 0 is month 1's projected
    true contribution.
    """
    monthly_growth = (1.0 + retailer.growth_rate_annual) ** (1.0 / 12.0) - 1.0

    result: list[float] = []
    for month in range(1, months + 1):
        growth_factor = (1.0 + monthly_growth) ** month
        # Scale the revenue base; rates and fixed labor stay constant.
        scaled_retailer = RetailerInput(
            retailer_id=retailer.retailer_id,
            name=retailer.name,
            gross_revenue=retailer.gross_revenue * growth_factor,
            cogs_rate=retailer.cogs_rate,
            deductions_rate=retailer.deductions_rate,
            trade_spend_rate=retailer.trade_spend_rate,
            payment_terms_days=retailer.payment_terms_days,
            cost_of_capital=retailer.cost_of_capital,
            labor_hours_compliance=retailer.labor_hours_compliance,
            labor_hours_disputes=retailer.labor_hours_disputes,
            labor_rate=retailer.labor_rate,
            returns_rate=retailer.returns_rate,
            freight_differential_rate=retailer.freight_differential_rate,
            pallet_surcharge_rate=retailer.pallet_surcharge_rate,
            moq_penalty_rate=retailer.moq_penalty_rate,
            distributor_margin_rate=retailer.distributor_margin_rate,
            growth_rate_annual=retailer.growth_rate_annual,
        )
        tc, _ = calculate_true_contribution(scaled_retailer, overrides)
        result.append(tc)

    return result
