"""Client-mode tests for the Retailer Scorecard (checklist §6).

Skipped unless the shared ``lailara_engagement`` lib is installed. Fixtures
generated on the fly — no client identifiers, no committed data.
"""
from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("lailara_engagement")

import client_mode  # noqa: E402  (repo root on path via cwd)

_HDR = ("retailer_id,name,gross_revenue,cogs_rate,deductions_rate,trade_spend_rate,"
        "payment_terms_days,cost_of_capital,labor_hours_compliance,labor_hours_disputes,"
        "labor_rate,returns_rate,freight_differential_rate,pallet_surcharge_rate,moq_penalty_rate\n")
# BigCo: high revenue, punishing cost rates -> low/negative contribution.
# SmallCo: half the revenue, lean cost rates -> higher contribution. Ranking flips.
LEDGER = _HDR + (
    "bigco,BigCo,1000000,0.65,0.25,0.20,60,0.10,200,200,50,0.08,0.03,0.03,0.03\n"
    "smallco,SmallCo,500000,0.50,0.05,0.05,30,0.10,20,20,50,0.01,0.005,0.005,0.005\n"
)


def _write(d: Path, text=LEDGER, name="retailers.csv"):
    p = d / name
    p.write_text(text, encoding="utf-8")
    return p


def _cfg(d: Path, columns=None):
    import yaml
    p = d / "engagement.demo.yml"
    p.write_text(yaml.safe_dump({
        "client": {"name": "Cinderhaven Provisions (demo)"}, "engagement": {"id": "T-1"},
        "as_of_date": "2026-01-02", "demo": True, "columns": columns or {}}), encoding="utf-8")
    return p


def test_clean_profile_ranks_by_true_contribution(tmp_path):
    inp = _write(tmp_path)
    res = client_mode.run(str(_cfg(tmp_path)), str(inp), str(tmp_path / "out"))
    assert res["status"] == "ok"
    assert res["n_retailers"] == 2
    # BigCo leads on revenue but not on contribution -> both accounts flip rank.
    assert res["n_rank_flips"] == 2
    assert Path(res["report"]).is_file() and Path(res["csv"]).is_file()


def test_scorecard_csv_flips_the_leader(tmp_path):
    import csv as _csv
    inp = _write(tmp_path)
    res = client_mode.run(str(_cfg(tmp_path)), str(inp), str(tmp_path / "out"))
    rows = {r["name"]: r for r in _csv.DictReader(open(res["csv"], encoding="utf-8"))}
    assert rows["BigCo"]["rank_by_gross"] == "1"          # #1 by revenue
    assert rows["BigCo"]["rank_by_contribution"] == "2"   # ...but #2 by contribution
    assert rows["SmallCo"]["rank_by_contribution"] == "1"
    assert float(rows["SmallCo"]["true_contribution"]) > float(rows["BigCo"]["true_contribution"])


def test_deliverable_prints_basis_and_draft(tmp_path):
    inp = _write(tmp_path)
    res = client_mode.run(str(_cfg(tmp_path)), str(inp), str(tmp_path / "out"))
    html = Path(res["report"]).read_text(encoding="utf-8")
    assert "full cost attribution" in html
    assert "rank differently on true contribution" in html
    assert "DRAFT" in html
    assert "Basis" in html   # provenance footer extra


def test_basis_label_pins_the_full_attribution_string(tmp_path):
    """This money tool renders a FIXED basis (full cost attribution, six named
    layers) with no data-dependent window/period — so the label-text convention
    here is to pin the COMPLETE basis string, not a distinctive-input span. The
    deliverable test asserts only the 'full cost attribution' prefix; a silent
    edit that dropped a cost layer (e.g. 'logistics') from the basis wording
    would pass it while misstating what the money figure attributes. Pinning the
    full string is the mislabel guard for a constant-basis money figure."""
    inp = _write(tmp_path)
    res = client_mode.run(str(_cfg(tmp_path)), str(inp), str(tmp_path / "out"))
    html = Path(res["report"]).read_text(encoding="utf-8")
    assert ("full cost attribution — six layers (deductions, trade spend, "
            "working-capital drag, labor, swell/returns, logistics) + distributor margin") in html


def test_missing_deductions_rate_blocks(tmp_path):
    import pandas as pd
    inp = tmp_path / "retailers.csv"
    pd.read_csv(_write(tmp_path, name="tmp.csv")).drop(columns=["deductions_rate"]).to_csv(inp, index=False)
    res = client_mode.run(str(_cfg(tmp_path)), str(inp), str(tmp_path / "out"))
    assert res["status"] == "blocked"
    assert "deductions_rate" in Path(res["readiness_report"]).read_text(encoding="utf-8")


def test_header_mapping(tmp_path):
    text = LEDGER.replace("gross_revenue", "Revenue").replace("retailer_id", "ID", 1)
    # replace header token 'retailer_id' -> 'ID' and 'gross_revenue' -> 'Revenue'
    header, *body = text.splitlines()
    header = header.replace("retailer_id", "ID").replace("gross_revenue", "Revenue")
    inp = _write(tmp_path, text="\n".join([header, *body]) + "\n")
    cfg = _cfg(tmp_path, columns={"retailer_id": "ID", "gross_revenue": "Revenue"})
    res = client_mode.run(str(cfg), str(inp), str(tmp_path / "out"))
    assert res["status"] == "ok"
    assert res["n_retailers"] == 2
