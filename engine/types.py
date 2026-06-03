"""Type definitions for the retailer cost-allocation engine.

All types use plain dataclasses (stdlib only — no numpy, no pandas).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class LeverRangeDict(TypedDict):
    """Typed dict for lever range bounds used by find_break_even_value."""
    min: float
    max: float


@dataclass
class RetailerInput:
    """All inputs required to compute a retailer's true contribution."""

    retailer_id: str
    name: str
    gross_revenue: float
    cogs_rate: float
    deductions_rate: float
    trade_spend_rate: float
    payment_terms_days: int
    cost_of_capital: float
    labor_hours_compliance: float
    labor_hours_disputes: float
    labor_rate: float
    returns_rate: float
    freight_differential_rate: float
    pallet_surcharge_rate: float
    moq_penalty_rate: float
    distributor_margin_rate: float
    growth_rate_annual: float

    @classmethod
    def from_dict(cls, data: dict) -> RetailerInput:
        """Build a RetailerInput from a dict (e.g. fixture or RETAILERS entry)."""
        return cls(
            retailer_id=data['retailer_id'],
            name=data['name'],
            gross_revenue=data['gross_revenue'],
            cogs_rate=data['cogs_rate'],
            deductions_rate=data['deductions_rate'],
            trade_spend_rate=data['trade_spend_rate'],
            payment_terms_days=data['payment_terms_days'],
            cost_of_capital=data['cost_of_capital'],
            labor_hours_compliance=data['labor_hours_compliance'],
            labor_hours_disputes=data['labor_hours_disputes'],
            labor_rate=data['labor_rate'],
            returns_rate=data['returns_rate'],
            freight_differential_rate=data['freight_differential_rate'],
            pallet_surcharge_rate=data['pallet_surcharge_rate'],
            moq_penalty_rate=data['moq_penalty_rate'],
            distributor_margin_rate=data['distributor_margin_rate'],
            growth_rate_annual=data['growth_rate_annual'],
        )


@dataclass
class LeverOverrides:
    """Selective overrides for renegotiation scenario modeling.

    Any field left as None uses the retailer's input value unchanged.
    ``logistics_rate`` replaces the combined
    (freight_differential_rate + pallet_surcharge_rate + moq_penalty_rate).
    """

    trade_spend_rate: float | None = None
    deductions_rate: float | None = None
    payment_terms_days: int | None = None
    returns_rate: float | None = None
    logistics_rate: float | None = None  # replaces freight+pallet+moq combined


@dataclass
class CostLayerBreakdown:
    """Dollar values for each of the six cost layers plus distributor margin."""

    gross_margin: float
    deductions: float
    trade_spend: float
    working_capital_drag: float
    labor_overhead: float
    swell_returns: float
    logistics_variance: float
    distributor_margin: float
    total_cost_layers: float


@dataclass
class RetailerContribution:
    """Full contribution result for one retailer, including ranks."""

    retailer_id: str
    name: str
    gross_revenue: float
    true_contribution: float
    contribution_margin_rate: float
    cost_breakdown: CostLayerBreakdown
    rank_by_gross: int
    rank_by_contribution: int
