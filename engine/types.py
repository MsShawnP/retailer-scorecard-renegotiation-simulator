"""Type definitions for the retailer cost-allocation engine.

All types use plain dataclasses (stdlib only — no numpy, no pandas).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


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


@dataclass
class LeverOverrides:
    """Selective overrides for renegotiation scenario modeling.

    Any field left as None uses the retailer's input value unchanged.
    ``logistics_rate`` replaces the combined
    (freight_differential_rate + pallet_surcharge_rate + moq_penalty_rate).
    """

    trade_spend_rate: Optional[float] = None
    deductions_rate: Optional[float] = None
    payment_terms_days: Optional[int] = None
    returns_rate: Optional[float] = None
    logistics_rate: Optional[float] = None  # replaces freight+pallet+moq combined


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
