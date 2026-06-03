"""
Cross-validate Python engine vs TypeScript engine outputs.
Requires: npm run build to produce distributable, or use shared fixtures.

This script verifies the shared fixture in tests/fixtures/expected_outputs.json
against Python engine output. The TypeScript test suite (calculations.test.ts)
independently verifies the same fixture against the TS engine.
Together they guarantee both implementations agree.

Validates three levels:
  1. All cost-layer breakdown fields per retailer (not just true_contribution)
  2. find_break_even_value() spot checks (bisection + int-cast paths)
  3. project_trajectory() spot checks (compounded monthly projections)

Run from project root:
    python scripts/validate_calculations.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from engine.cost_model import calculate_contributions, find_break_even_value, project_trajectory
from engine.types import LeverOverrides, RetailerContribution, RetailerInput

TOLERANCE = 0.01  # $0.01 tolerance for floating-point drift
BREAK_EVEN_TOLERANCE = 0.0001  # lever-value tolerance for bisection results

ROOT = Path(__file__).parent.parent


def load_retailers() -> list[dict]:
    path = ROOT / "tests" / "fixtures" / "retailer_profiles.json"
    with open(path) as f:
        return json.load(f)


def load_expected() -> list[dict]:
    path = ROOT / "tests" / "fixtures" / "expected_outputs.json"
    with open(path) as f:
        return json.load(f)


def load_scenario_expected() -> dict:
    path = ROOT / "tests" / "fixtures" / "scenario_expected.json"
    with open(path) as f:
        return json.load(f)


def retailer_input_from_fixture(r: dict) -> RetailerInput:
    return RetailerInput.from_dict(r)


def validate_cost_layers(
    results_by_id: dict[str, RetailerContribution],
    expected: list[dict],
) -> list[str]:
    """Check every cost-layer field per retailer, not just true_contribution."""
    errors: list[str] = []
    breakdown_fields = [
        ("gross_margin", lambda r: r.cost_breakdown.gross_margin),
        ("deductions", lambda r: r.cost_breakdown.deductions),
        ("trade_spend", lambda r: r.cost_breakdown.trade_spend),
        ("working_capital_drag", lambda r: r.cost_breakdown.working_capital_drag),
        ("labor_overhead", lambda r: r.cost_breakdown.labor_overhead),
        ("swell_returns", lambda r: r.cost_breakdown.swell_returns),
        ("logistics_variance", lambda r: r.cost_breakdown.logistics_variance),
        ("distributor_margin", lambda r: r.cost_breakdown.distributor_margin),
        ("total_cost_layers", lambda r: r.cost_breakdown.total_cost_layers),
        ("true_contribution", lambda r: r.true_contribution),
        ("contribution_margin_rate", lambda r: r.contribution_margin_rate),
    ]
    rank_fields = [
        ("rank_by_gross", lambda r: r.rank_by_gross),
        ("rank_by_contribution", lambda r: r.rank_by_contribution),
    ]

    for exp in expected:
        rid = exp["retailer_id"]
        actual = results_by_id.get(rid)
        if actual is None:
            errors.append(f"{rid}: missing from engine output")
            continue

        for field_name, getter in breakdown_fields:
            exp_val = exp["expected"][field_name]
            act_val = getter(actual)
            if abs(exp_val - act_val) > TOLERANCE:
                errors.append(
                    f"{rid}: {field_name} mismatch — "
                    f"expected {exp_val:.2f}, got {act_val:.2f}"
                )

        for field_name, getter in rank_fields:
            exp_val = exp["expected"][field_name]
            act_val = getter(actual)
            if exp_val != act_val:
                errors.append(
                    f"{rid}: {field_name} mismatch — "
                    f"expected {exp_val}, got {act_val}"
                )

    return errors


def validate_break_even(
    retailers_by_id: dict[str, RetailerInput],
    fixtures_by_id: dict[str, dict],
    checks: list[dict],
) -> list[str]:
    """Spot-check find_break_even_value() against fixture expectations."""
    errors: list[str] = []

    for check in checks:
        rid = check["retailer_id"]
        lever = check["lever"]
        lever_range = check["lever_range"]
        expected_val = check["expected_value"]
        tol = check.get("tolerance", BREAK_EVEN_TOLERANCE)

        retailer = retailers_by_id.get(rid)
        if retailer is None:
            errors.append(f"break_even {rid}/{lever}: retailer not found")
            continue

        actual = find_break_even_value(retailer, lever, LeverOverrides(), lever_range)

        if expected_val is None:
            if actual is not None:
                errors.append(
                    f"break_even {rid}/{lever}: expected None, got {actual:.6f}"
                )
        else:
            if actual is None:
                errors.append(
                    f"break_even {rid}/{lever}: expected {expected_val:.6f}, got None"
                )
            elif abs(expected_val - actual) > tol:
                errors.append(
                    f"break_even {rid}/{lever}: expected {expected_val:.6f}, "
                    f"got {actual:.6f} (tolerance {tol})"
                )

    return errors


def validate_trajectory(
    retailers_by_id: dict[str, RetailerInput],
    checks: list[dict],
) -> list[str]:
    """Spot-check project_trajectory() at specific months against fixtures."""
    errors: list[str] = []

    for check in checks:
        rid = check["retailer_id"]
        months = check["months"]
        spot_checks = check["spot_checks"]

        retailer = retailers_by_id.get(rid)
        if retailer is None:
            errors.append(f"trajectory {rid}: retailer not found")
            continue

        traj = project_trajectory(retailer, LeverOverrides(), months=months)

        if len(traj) != months:
            errors.append(
                f"trajectory {rid}: expected {months} months, got {len(traj)}"
            )
            continue

        for month_str, expected_val in spot_checks.items():
            month_idx = int(month_str) - 1
            actual_val = traj[month_idx]
            if abs(expected_val - actual_val) > TOLERANCE:
                errors.append(
                    f"trajectory {rid} month {month_str}: "
                    f"expected {expected_val:.2f}, got {actual_val:.2f}"
                )

    return errors


def main() -> None:
    fixtures = load_retailers()
    expected = load_expected()
    scenario = load_scenario_expected()

    inputs = [retailer_input_from_fixture(r) for r in fixtures]
    results = calculate_contributions(inputs)
    results_by_id = {r.retailer_id: r for r in results}
    retailers_by_id = {r.retailer_id: r for r in inputs}
    fixtures_by_id = {r["retailer_id"]: r for r in fixtures}

    all_errors: list[str] = []

    # 1. Cost-layer breakdown validation (all fields, all retailers)
    all_errors.extend(validate_cost_layers(results_by_id, expected))

    # 2. Break-even spot checks
    all_errors.extend(
        validate_break_even(retailers_by_id, fixtures_by_id, scenario["break_even_checks"])
    )

    # 3. Trajectory spot checks
    all_errors.extend(validate_trajectory(retailers_by_id, scenario["trajectory_checks"]))

    if all_errors:
        print("VALIDATION FAILED:")
        for e in all_errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        n_retailers = len(expected)
        n_be = len(scenario["break_even_checks"])
        n_traj = sum(len(c["spot_checks"]) for c in scenario["trajectory_checks"])
        print(
            f"Validation passed: {n_retailers} retailers (all cost layers), "
            f"{n_be} break-even checks, {n_traj} trajectory spot checks"
        )


if __name__ == "__main__":
    main()
