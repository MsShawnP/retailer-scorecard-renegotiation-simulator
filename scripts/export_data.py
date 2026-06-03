"""
Generate retailers.json for the retailer scorecard simulator.

Reads retailer-level cost-to-serve data from the Cinderhaven Postgres
platform (via flyctl proxy at localhost:5432) and augments with fields
not yet in the platform schema (returns_rate, payment_terms_days, and
cost-layer rates derived from historical aggregates).

Falls back to SNAPSHOT DATA when Postgres is unavailable. The snapshot
is grounded in Cinderhaven quarterly scan/order data (TTM Q3 2025 through
Q2 2026) and calibrated against CPG industry norms for specialty food
brands in the $20-30M revenue range.

Output: frontend/public/json/retailers.json
        tests/fixtures/retailer_profiles.json  (same data, used for
        cross-validation between Python engine and TypeScript engine)

Run from project root:
    python scripts/export_data.py

With live Postgres (flyctl proxy must be running on localhost:5432):
    flyctl proxy 5432 -a cinderhaven-data-platform &
    python scripts/export_data.py
"""

import json
import os
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
    _HAS_PG = True
except ImportError:
    _HAS_PG = False

# === SNAPSHOT DATA ===
# Grounded in Cinderhaven TTM Q3 2025 through Q2 2026 quarterly revenue.
# Cost-layer rates calibrated against CPG industry norms for specialty food.
#
# True Contribution formula:
#   gross_margin = gross_revenue × (1 - cogs_rate)
#   true_contribution = gross_margin
#     - gross_revenue × deductions_rate
#     - gross_revenue × trade_spend_rate
#     - (payment_terms_days / 365) × gross_revenue × cost_of_capital
#     - (labor_hours_compliance + labor_hours_disputes) × labor_rate
#     - gross_revenue × returns_rate
#     - gross_revenue × (freight_differential_rate + pallet_surcharge_rate + moq_penalty_rate)
#     - gross_revenue × distributor_margin_rate
#
# cogs_rate is included because True Contribution as defined by the brief
# ("negative true contribution" for the anchor) requires gross margin as the
# starting point. Without cogs_rate, cost layers cannot exceed gross revenue.
# (See DECISIONS.md — 2026-06-03 schema decisions.)
#
# Key inversion story:
#   Gross ranking: Walmart #1 → True contribution ranking: Walmart #7 (net negative)
#   Gross ranking: Costco #6 → True contribution ranking: Costco #2
#   Gross ranking: Sprouts #5 → True contribution ranking: Sprouts #1

RETAILERS = [
    {
        "retailer_id": "walmart",
        "name": "Walmart",
        "channel_type": "retailer",
        "is_via_distributor": False,
        "distributor_name": None,
        # TTM revenue (Q3 2025 through Q2 2026 from Cinderhaven quarterly data)
        "gross_revenue": 3614562,
        # COGS rate: Walmart squeezes wholesale pricing harder than specialty channels.
        # 55% COGS means 45% gross margin before channel costs.
        "cogs_rate": 0.55,
        # Deductions: OTIF penalties (3% of COGS = ~1.5% revenue) + shortage claims +
        # pricing chargebacks. Walmart's multi-system complexity drives higher rates.
        "deductions_rate": 0.082,
        "deduction_breakdown": {
            "otif_penalties": 0.030,
            "shortage_claims": 0.025,
            "pricing_chargebacks": 0.027,
        },
        # Trade spend: heavy MCB (major chain business) + slotting amortization +
        # cooperative advertising. 28% is aggressive but realistic for a brand
        # without leverage at Walmart's buyer meetings.
        "trade_spend_rate": 0.280,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.040,
            "promo_mcb": 0.160,
            "cooperative_advertising": 0.080,
        },
        # Working capital: industry-standard Walmart net 60 terms.
        "payment_terms_days": 60,
        "cost_of_capital": 0.12,
        # Labor: complex multi-portal environment (Retail Link, APDP, HighRadius).
        # Compliance setup + dispute hours from Cinderhaven dispute data.
        "labor_hours_compliance": 500,
        "labor_hours_disputes": 2361,
        "labor_rate": 35.0,
        # Returns & swell: Walmart's returns policy and high-volume depot model
        # produces 2.5% swell/damage rate.
        "returns_rate": 0.025,
        # Logistics: SQEP pallet requirements, routing guide complexity, MOQ penalties
        # for mixed-pallet orders below standard. High freight differential vs DCs.
        "freight_differential_rate": 0.038,
        "pallet_surcharge_rate": 0.005,
        "moq_penalty_rate": 0.002,
        # No distributor margin (direct retailer relationship).
        "distributor_margin_rate": 0.0,
        # Growth rate: Walmart volume assumed +5% YoY forward-looking.
        # Note: trailing data shows slight decline; 5% reflects management's growth plan.
        "growth_rate_annual": 0.05,
        # Lever ranges define the realistic negotiation space for each cost component.
        # Ranges grounded in industry benchmarks for brands at this revenue scale.
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.15, "max": 0.35, "current": 0.280},
            "deductions_rate": {"min": 0.04, "max": 0.12, "current": 0.082},
            "payment_terms_days": {"min": 30, "max": 90, "current": 60},
            "returns_rate": {"min": 0.010, "max": 0.040, "current": 0.025},
            "logistics_rate": {"min": 0.020, "max": 0.070, "current": 0.045},
        },
    },
    {
        "retailer_id": "kroger",
        "name": "Kroger",
        "channel_type": "retailer",
        "is_via_distributor": False,
        "distributor_name": None,
        "gross_revenue": 3499113,
        "cogs_rate": 0.52,
        "deductions_rate": 0.075,
        "deduction_breakdown": {
            "otif_penalties": 0.025,
            "shortage_claims": 0.028,
            "pricing_chargebacks": 0.022,
        },
        "trade_spend_rate": 0.220,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.035,
            "promo_mcb": 0.120,
            "cooperative_advertising": 0.065,
        },
        "payment_terms_days": 45,
        "cost_of_capital": 0.12,
        "labor_hours_compliance": 400,
        "labor_hours_disputes": 2256,
        "labor_rate": 35.0,
        "returns_rate": 0.018,
        "freight_differential_rate": 0.026,
        "pallet_surcharge_rate": 0.004,
        "moq_penalty_rate": 0.002,
        "distributor_margin_rate": 0.0,
        "growth_rate_annual": 0.06,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.12, "max": 0.30, "current": 0.220},
            "deductions_rate": {"min": 0.04, "max": 0.12, "current": 0.075},
            "payment_terms_days": {"min": 30, "max": 60, "current": 45},
            "returns_rate": {"min": 0.008, "max": 0.030, "current": 0.018},
            "logistics_rate": {"min": 0.015, "max": 0.050, "current": 0.032},
        },
    },
    {
        "retailer_id": "whole_foods",
        "name": "Whole Foods",
        "channel_type": "retailer",
        "is_via_distributor": True,
        "distributor_name": "UNFI",
        "gross_revenue": 3283376,
        # Premium positioning allows better wholesale pricing → lower COGS rate.
        "cogs_rate": 0.48,
        "deductions_rate": 0.055,
        "deduction_breakdown": {
            "otif_penalties": 0.015,
            "shortage_claims": 0.022,
            "pricing_chargebacks": 0.018,
        },
        "trade_spend_rate": 0.140,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.030,
            "promo_mcb": 0.070,
            "cooperative_advertising": 0.040,
        },
        "payment_terms_days": 30,
        "cost_of_capital": 0.12,
        "labor_hours_compliance": 300,
        "labor_hours_disputes": 2039,
        "labor_rate": 35.0,
        "returns_rate": 0.012,
        "freight_differential_rate": 0.016,
        "pallet_surcharge_rate": 0.003,
        "moq_penalty_rate": 0.001,
        # UNFI distributor margin folded into the cost stack: 10% of gross revenue
        # represents UNFI's margin on goods shipped through their distribution network.
        "distributor_margin_rate": 0.10,
        "growth_rate_annual": 0.10,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.08, "max": 0.22, "current": 0.140},
            "deductions_rate": {"min": 0.03, "max": 0.09, "current": 0.055},
            "payment_terms_days": {"min": 15, "max": 45, "current": 30},
            "returns_rate": {"min": 0.005, "max": 0.025, "current": 0.012},
            "logistics_rate": {"min": 0.010, "max": 0.040, "current": 0.020},
        },
    },
    {
        "retailer_id": "kehe",
        "name": "KeHE",
        "channel_type": "distributor",
        "is_via_distributor": False,
        "distributor_name": None,
        "gross_revenue": 2828272,
        "cogs_rate": 0.49,
        "deductions_rate": 0.042,
        "deduction_breakdown": {
            "otif_penalties": 0.012,
            "shortage_claims": 0.018,
            "pricing_chargebacks": 0.012,
        },
        "trade_spend_rate": 0.120,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.025,
            "promo_mcb": 0.060,
            "cooperative_advertising": 0.035,
        },
        "payment_terms_days": 30,
        "cost_of_capital": 0.12,
        "labor_hours_compliance": 200,
        "labor_hours_disputes": 443,
        "labor_rate": 35.0,
        "returns_rate": 0.015,
        "freight_differential_rate": 0.012,
        "pallet_surcharge_rate": 0.002,
        "moq_penalty_rate": 0.001,
        # KeHE margin: 8% on goods flowing through their network to regional accounts.
        "distributor_margin_rate": 0.08,
        "growth_rate_annual": 0.07,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.07, "max": 0.18, "current": 0.120},
            "deductions_rate": {"min": 0.02, "max": 0.08, "current": 0.042},
            "payment_terms_days": {"min": 15, "max": 45, "current": 30},
            "returns_rate": {"min": 0.008, "max": 0.025, "current": 0.015},
            "logistics_rate": {"min": 0.008, "max": 0.030, "current": 0.015},
        },
    },
    {
        "retailer_id": "sprouts",
        "name": "Sprouts",
        "channel_type": "retailer",
        "is_via_distributor": False,
        "distributor_name": None,
        "gross_revenue": 2636249,
        # Sprouts' natural/specialty positioning allows favorable wholesale pricing.
        "cogs_rate": 0.47,
        "deductions_rate": 0.082,
        "deduction_breakdown": {
            "otif_penalties": 0.020,
            "shortage_claims": 0.035,
            "pricing_chargebacks": 0.027,
        },
        "trade_spend_rate": 0.100,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.020,
            "promo_mcb": 0.055,
            "cooperative_advertising": 0.025,
        },
        "payment_terms_days": 30,
        "cost_of_capital": 0.12,
        "labor_hours_compliance": 150,
        "labor_hours_disputes": 1909,
        "labor_rate": 35.0,
        "returns_rate": 0.010,
        "freight_differential_rate": 0.018,
        "pallet_surcharge_rate": 0.003,
        "moq_penalty_rate": 0.001,
        "distributor_margin_rate": 0.0,
        "growth_rate_annual": 0.12,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.06, "max": 0.16, "current": 0.100},
            "deductions_rate": {"min": 0.04, "max": 0.12, "current": 0.082},
            "payment_terms_days": {"min": 15, "max": 45, "current": 30},
            "returns_rate": {"min": 0.005, "max": 0.020, "current": 0.010},
            "logistics_rate": {"min": 0.010, "max": 0.035, "current": 0.022},
        },
    },
    {
        "retailer_id": "costco",
        "name": "Costco",
        "channel_type": "retailer",
        "is_via_distributor": False,
        "distributor_name": None,
        "gross_revenue": 2094279,
        # Costco's high-volume depot model enables efficient production runs.
        "cogs_rate": 0.46,
        "deductions_rate": 0.045,
        "deduction_breakdown": {
            "otif_penalties": 0.010,
            "shortage_claims": 0.020,
            "pricing_chargebacks": 0.015,
        },
        # Costco operates on item commitment model rather than MCB.
        # Low trade spend but high upfront item fee amortized over term.
        "trade_spend_rate": 0.080,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.030,
            "promo_mcb": 0.030,
            "cooperative_advertising": 0.020,
        },
        "payment_terms_days": 30,
        "cost_of_capital": 0.12,
        "labor_hours_compliance": 200,
        "labor_hours_disputes": 1597,
        "labor_rate": 35.0,
        "returns_rate": 0.015,
        "freight_differential_rate": 0.008,
        "pallet_surcharge_rate": 0.002,
        "moq_penalty_rate": 0.002,
        "distributor_margin_rate": 0.0,
        "growth_rate_annual": 0.08,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.04, "max": 0.14, "current": 0.080},
            "deductions_rate": {"min": 0.02, "max": 0.08, "current": 0.045},
            "payment_terms_days": {"min": 15, "max": 45, "current": 30},
            "returns_rate": {"min": 0.008, "max": 0.025, "current": 0.015},
            "logistics_rate": {"min": 0.005, "max": 0.025, "current": 0.012},
        },
    },
    {
        "retailer_id": "regional_group",
        "name": "Regional Group",
        "channel_type": "retailer",
        "is_via_distributor": False,
        "distributor_name": None,
        "gross_revenue": 2049027,
        "cogs_rate": 0.50,
        "deductions_rate": 0.073,
        "deduction_breakdown": {
            "otif_penalties": 0.018,
            "shortage_claims": 0.030,
            "pricing_chargebacks": 0.025,
        },
        "trade_spend_rate": 0.120,
        "trade_spend_breakdown": {
            "slotting_amortized": 0.025,
            "promo_mcb": 0.060,
            "cooperative_advertising": 0.035,
        },
        "payment_terms_days": 45,
        "cost_of_capital": 0.12,
        # Regional Group uses email/phone dispute process with no portal — high labor.
        "labor_hours_compliance": 300,
        "labor_hours_disputes": 1231,
        "labor_rate": 35.0,
        "returns_rate": 0.015,
        "freight_differential_rate": 0.025,
        "pallet_surcharge_rate": 0.004,
        "moq_penalty_rate": 0.001,
        "distributor_margin_rate": 0.0,
        "growth_rate_annual": 0.05,
        "lever_ranges": {
            "trade_spend_rate": {"min": 0.07, "max": 0.20, "current": 0.120},
            "deductions_rate": {"min": 0.04, "max": 0.12, "current": 0.073},
            "payment_terms_days": {"min": 30, "max": 60, "current": 45},
            "returns_rate": {"min": 0.008, "max": 0.025, "current": 0.015},
            "logistics_rate": {"min": 0.015, "max": 0.050, "current": 0.030},
        },
    },
]


def compute_contributions(retailers):
    """
    Compute true contribution for each retailer.
    Returns a list of dicts with derived financial metrics added.
    Used for verification and for generating the fixture file.
    """
    results = []
    for r in retailers:
        gr = r["gross_revenue"]
        gross_margin = gr * (1 - r["cogs_rate"])
        deductions = gr * r["deductions_rate"]
        trade_spend = gr * r["trade_spend_rate"]
        working_capital = (r["payment_terms_days"] / 365) * gr * r["cost_of_capital"]
        labor = (r["labor_hours_compliance"] + r["labor_hours_disputes"]) * r["labor_rate"]
        swell_returns = gr * r["returns_rate"]
        logistics_rate = (
            r["freight_differential_rate"]
            + r["pallet_surcharge_rate"]
            + r["moq_penalty_rate"]
        )
        logistics = gr * logistics_rate
        distributor_margin = gr * r["distributor_margin_rate"]

        total_cost_layers = (
            deductions
            + trade_spend
            + working_capital
            + labor
            + swell_returns
            + logistics
            + distributor_margin
        )
        true_contribution = gross_margin - total_cost_layers

        results.append({
            **r,
            "_computed": {
                "gross_margin": round(gross_margin, 2),
                "deductions": round(deductions, 2),
                "trade_spend": round(trade_spend, 2),
                "working_capital": round(working_capital, 2),
                "labor": round(labor, 2),
                "swell_returns": round(swell_returns, 2),
                "logistics": round(logistics, 2),
                "distributor_margin": round(distributor_margin, 2),
                "total_cost_layers": round(total_cost_layers, 2),
                "true_contribution": round(true_contribution, 2),
                "contribution_margin_rate": round(true_contribution / gr, 4),
            },
        })
    return results


def _pg_connect():
    if not _HAS_PG:
        return None
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        pw = os.environ.get("POSTGRES_PASSWORD")
        if not pw:
            return None
        dsn = f"postgresql://postgres:REDACTED@localhost:5432/cinderhaven"
    try:
        return psycopg2.connect(dsn)
    except Exception:
        return None


def fetch_live_revenues():
    """
    Fetch TTM gross revenue per retailer from Cinderhaven Postgres.
    Returns dict mapping retailer_id → revenue, or None if unavailable.

    Requires flyctl proxy running: flyctl proxy 5432 -a cinderhaven-data-platform
    """
    conn = _pg_connect()
    if conn is None:
        return None
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    dr.retailer_id,
                    SUM(fo.total_value)::float AS ttm_revenue
                FROM public_marts.fct_retailer_orders fo
                JOIN public_marts.dim_retailers dr
                     ON dr.retailer_id = fo.retailer_id
                WHERE fo.po_date >= CURRENT_DATE - INTERVAL '365 days'
                GROUP BY dr.retailer_id
                UNION ALL
                SELECT
                    dd.distributor_id AS retailer_id,
                    SUM(fo.total_value)::float AS ttm_revenue
                FROM public_marts.fct_distributor_orders fo
                JOIN public_marts.dim_distributors dd
                     ON dd.distributor_id = fo.distributor_id
                WHERE fo.po_date >= CURRENT_DATE - INTERVAL '365 days'
                GROUP BY dd.distributor_id
            """)
            rows = cur.fetchall()
        return {r["retailer_id"]: round(r["ttm_revenue"], 2) for r in rows}
    except Exception:
        return None
    finally:
        conn.close()


def build_retailer_data():
    """
    Build the final retailer dataset.
    Uses live Postgres revenues if available; falls back to snapshot.
    All cost-layer rates and schema extensions (returns_rate, payment_terms_days)
    always come from the snapshot — they are not yet in the Postgres schema.
    """
    live_revenues = fetch_live_revenues()
    source = "snapshot"
    if live_revenues:
        source = "live"

    retailers = []
    for r in RETAILERS:
        retailer = dict(r)
        if live_revenues and r["retailer_id"] in live_revenues:
            retailer["gross_revenue"] = live_revenues[r["retailer_id"]]
        retailers.append(retailer)

    return retailers, source


def main():
    retailers, source = build_retailer_data()

    # Compute derived metrics for verification output
    with_computed = compute_contributions(retailers)

    # Print verification summary to stdout
    print(f"\nRetailer cost-to-serve — {source} data")
    print(f"{'Retailer':<20} {'Gross Rev':>12} {'Contribution':>14} {'Rate':>8}")
    print("-" * 58)

    ranked = sorted(with_computed, key=lambda r: r["_computed"]["true_contribution"], reverse=True)
    for r in ranked:
        c = r["_computed"]
        sign = "" if c["true_contribution"] >= 0 else ""
        print(
            f"{r['name']:<20} "
            f"${r['gross_revenue']:>11,.0f} "
            f"{sign}${abs(c['true_contribution']):>12,.0f} "
            f"{c['contribution_margin_rate']:>7.1%}"
        )

    # Check that at least one retailer is net-negative (R17)
    net_negative = [r for r in with_computed if r["_computed"]["true_contribution"] < 0]
    if not net_negative:
        raise ValueError(
            "R17 violation: no retailer is net-negative. "
            "Adjust cost rates to produce at least one net-negative anchor."
        )
    print(f"\nR17 satisfied: {len(net_negative)} net-negative retailer(s)")

    # Write retailers.json (input data only — no _computed fields)
    json_out = [
        {k: v for k, v in r.items() if k != "_computed"}
        for r in with_computed
    ]

    out_dir = Path(__file__).parent.parent / "frontend" / "public" / "json"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "retailers.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(json_out, f, indent=2)
    print(f"\nWrote {len(json_out)} retailers to {out_path}")

    # Write fixture file (with _computed for cross-validation)
    fixture_dir = Path(__file__).parent.parent / "tests" / "fixtures"
    fixture_dir.mkdir(parents=True, exist_ok=True)
    fixture_path = fixture_dir / "retailer_profiles.json"
    with open(fixture_path, "w", encoding="utf-8") as f:
        json.dump(with_computed, f, indent=2)
    print(f"Wrote {len(with_computed)} retailer profiles to {fixture_path}")


if __name__ == "__main__":
    main()
