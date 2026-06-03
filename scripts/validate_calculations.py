"""
Cross-validate Python engine vs TypeScript engine outputs.
Requires: npm run build to produce distributable, or use shared fixtures.

This script verifies the shared fixture in tests/fixtures/expected_outputs.json
against Python engine output. The TypeScript test suite (calculations.test.ts)
independently verifies the same fixture against the TS engine.
Together they guarantee both implementations agree.

Run from project root:
    python scripts/validate_calculations.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from engine.cost_model import calculate_contributions
from engine.types import RetailerInput

TOLERANCE = 0.01  # $0.01 tolerance for floating-point drift

def load_retailers():
    path = Path("tests/fixtures/retailer_profiles.json")
    with open(path) as f:
        return json.load(f)

def load_expected():
    path = Path("tests/fixtures/expected_outputs.json")
    with open(path) as f:
        return json.load(f)

def retailer_input_from_fixture(r):
    return RetailerInput(
        retailer_id=r["retailer_id"],
        name=r["name"],
        gross_revenue=r["gross_revenue"],
        cogs_rate=r["cogs_rate"],
        deductions_rate=r["deductions_rate"],
        trade_spend_rate=r["trade_spend_rate"],
        payment_terms_days=r["payment_terms_days"],
        cost_of_capital=r["cost_of_capital"],
        labor_hours_compliance=r["labor_hours_compliance"],
        labor_hours_disputes=r["labor_hours_disputes"],
        labor_rate=r["labor_rate"],
        returns_rate=r["returns_rate"],
        freight_differential_rate=r["freight_differential_rate"],
        pallet_surcharge_rate=r["pallet_surcharge_rate"],
        moq_penalty_rate=r["moq_penalty_rate"],
        distributor_margin_rate=r["distributor_margin_rate"],
        growth_rate_annual=r["growth_rate_annual"],
    )

def main():
    fixtures = load_retailers()
    expected = load_expected()

    inputs = [retailer_input_from_fixture(r) for r in fixtures]
    results = calculate_contributions(inputs)
    results_by_id = {r.retailer_id: r for r in results}

    errors = []
    for exp in expected:
        rid = exp["retailer_id"]
        actual = results_by_id.get(rid)
        if actual is None:
            errors.append(f"{rid}: missing from engine output")
            continue
        exp_tc = exp["expected"]["true_contribution"]
        act_tc = actual.true_contribution
        if abs(exp_tc - act_tc) > TOLERANCE:
            errors.append(
                f"{rid}: true_contribution mismatch — "
                f"expected {exp_tc:.2f}, got {act_tc:.2f}"
            )

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print(f"Validation passed: {len(expected)} retailers matched within ${TOLERANCE}")

if __name__ == "__main__":
    main()
