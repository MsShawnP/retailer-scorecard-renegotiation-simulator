"""Client-mode CLI for the Retailer Scorecard & Renegotiation Simulator.

Runs the tested cost-allocation engine on a client's own cost-to-serve inputs:
attributes the six cost layers to each retailer account and ranks accounts by
**true contribution** instead of gross revenue — surfacing the accounts whose
revenue rank and contribution rank disagree (the crown-jewel-by-revenue that
loses money after full attribution).

Reuses ``engine.calculate_contributions`` unchanged (reuse, not rebuild) and the
shared ``lailara_engagement`` scaffold for intake/preflight/provenance.

Money tool: every figure is on the **full-cost-attribution** basis (six layers +
distributor margin), stated on the deliverable. Not POS-shaped, so it uses the
generic column specs.

Required input: a **cost-to-serve profile** — one row per retailer account with
gross revenue and the cost rates. A missing required column blocks with a branded
Data Readiness Report; a clean run writes a draft-watermarked, provenance-footed
**Retailer Contribution Scorecard** (HTML) + a CSV to ``client-output/``.

Usage:
    python client_mode.py --config engagement.yml --input client-data/retailers.csv \
        [--out client-output] [--final]
"""

from __future__ import annotations

import argparse
import csv as _csv
import html
from pathlib import Path

from engine import RetailerInput, calculate_contributions  # reuse the tested engine
from lailara_engagement import (
    ColumnSpec,
    PreflightSpec,
    build_provenance,
    load_config,
    read_table,
    run_preflight,
    validation_status_label,
    write_report,
)
from lailara_engagement import palette as P
from lailara_engagement.pos import to_frame
from lailara_engagement.provenance import Provenance

TOOL = "retailer-scorecard-renegotiation-simulator"
TOOL_VERSION = "1.0"
BASIS_LABEL = "full cost attribution — six layers (deductions, trade spend, working-capital drag, labor, swell/returns, logistics) + distributor margin"

# (canonical field, dtype, required, default-when-optional)
_FIELDS = [
    ("retailer_id", "identifier", True, None), ("name", "string", True, None),
    ("gross_revenue", "number", True, None), ("cogs_rate", "number", True, None),
    ("deductions_rate", "number", True, None), ("trade_spend_rate", "number", True, None),
    ("payment_terms_days", "integer", True, None), ("cost_of_capital", "number", True, None),
    ("labor_hours_compliance", "number", True, None), ("labor_hours_disputes", "number", True, None),
    ("labor_rate", "number", True, None), ("returns_rate", "number", True, None),
    ("freight_differential_rate", "number", True, None), ("pallet_surcharge_rate", "number", True, None),
    ("moq_penalty_rate", "number", True, None),
    # optional — default to 0 (direct account, scorecard doesn't need trajectory)
    ("distributor_margin_rate", "number", False, 0.0), ("growth_rate_annual", "number", False, 0.0),
]


def _spec() -> PreflightSpec:
    cols = []
    for name, dtype, req, _ in _FIELDS:
        cols.append(ColumnSpec(name=name, dtype=dtype, required=req,
                               allow_blank=not req,
                               unique=(name == "retailer_id"),
                               not_negative=(dtype in ("number", "integer") and name != "growth_rate_annual"),
                               spec_ref="INPUT-SPEC §Retailers"))
    return PreflightSpec(tool=TOOL, version=TOOL_VERSION, columns=cols)


def _num(v, default=0.0):
    s = str(v).strip()
    if s == "":
        return default
    try:
        return float(s)
    except ValueError:
        return default


def build_inputs(frame) -> list[RetailerInput]:
    inputs = []
    for _, r in frame.iterrows():
        def g(name, default=0.0):
            return _num(r[name], default) if name in frame.columns else default
        inputs.append(RetailerInput(
            retailer_id=str(r["retailer_id"]).strip(), name=str(r["name"]).strip(),
            gross_revenue=g("gross_revenue"), cogs_rate=g("cogs_rate"),
            deductions_rate=g("deductions_rate"), trade_spend_rate=g("trade_spend_rate"),
            payment_terms_days=int(g("payment_terms_days")), cost_of_capital=g("cost_of_capital"),
            labor_hours_compliance=g("labor_hours_compliance"), labor_hours_disputes=g("labor_hours_disputes"),
            labor_rate=g("labor_rate"), returns_rate=g("returns_rate"),
            freight_differential_rate=g("freight_differential_rate"),
            pallet_surcharge_rate=g("pallet_surcharge_rate"), moq_penalty_rate=g("moq_penalty_rate"),
            distributor_margin_rate=g("distributor_margin_rate"), growth_rate_annual=g("growth_rate_annual")))
    return inputs


def _fmt_dollars(v):
    return ("-" if v < 0 else "") + f"${abs(v):,.0f}"


def _deliverable_html(config, contributions, limitations, provenance: Provenance, *, draft: bool) -> str:
    esc = html.escape
    draft_class = " ll-draft" if draft else ""
    ranked = sorted(contributions, key=lambda c: c.rank_by_contribution)
    n_flips = sum(1 for c in contributions if c.rank_by_gross != c.rank_by_contribution)
    rows = "".join(
        f"<tr><td>{esc(c.name)}{' ⚑' if c.rank_by_gross != c.rank_by_contribution else ''}</td>"
        f"<td class=num>#{c.rank_by_gross}</td><td class=num>#{c.rank_by_contribution}</td>"
        f"<td class=num>{_fmt_dollars(c.gross_revenue)}</td>"
        f"<td class=num>{_fmt_dollars(c.true_contribution)}</td>"
        f"<td class=num>{c.contribution_margin_rate*100:.1f}%</td></tr>"
        for c in ranked
    )
    lim = "".join(f"<li>{esc(x)}</li>" for x in limitations)
    return f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Retailer Contribution Scorecard — {esc(config.client_name)}</title><style>{_css(draft)}</style></head>
<body class="{draft_class.strip()}"><main class=ll-page>
<header class=ll-header>
  <div class=ll-eyebrow>Lailara LLC · Retailer Scorecard</div>
  <h1 class=ll-title>Retailer Contribution Scorecard</h1>
  <div class=ll-client>
    <div><span class=ll-k>Client</span> {esc(config.client_name)}</div>
    <div><span class=ll-k>Engagement</span> {esc(config.engagement_id)}</div>
    <div><span class=ll-k>As of</span> {esc(config.as_of_date.isoformat())}</div>
    <div><span class=ll-k>Prepared by</span> {esc(config.prepared_by)}</div>
  </div>
</header>
<section class=ll-banner>
  <div class=ll-score>{n_flips} account(s) rank differently on true contribution than on revenue</div>
  <div>Ranked by true contribution after full cost attribution. ⚑ = revenue rank ≠ contribution rank.</div>
  <div class=ll-basis>Basis: {esc(BASIS_LABEL)}.</div>
</section>
<section class=ll-section>
  <h2 class=ll-h2>Scorecard</h2>
  <table class=ll-table><thead><tr><th>Retailer</th><th>Rank by revenue</th><th>Rank by contribution</th>
  <th>Gross revenue</th><th>True contribution</th><th>Contribution margin</th></tr></thead>
  <tbody>{rows}</tbody></table>
</section>
<section class=ll-section>
  <h2 class=ll-h2>Data limitations</h2>
  <ul class=ll-limitations>{lim}</ul>
</section>
{provenance.to_html()}
</main></body></html>"""


def _css(draft: bool) -> str:
    draft_css = (
        ".ll-draft::before{content:'DRAFT';position:fixed;top:50%;left:50%;"
        "transform:translate(-50%,-50%) rotate(-32deg);font-family:var(--s);"
        "font-size:22vw;font-weight:700;color:rgba(204,16,10,.06);z-index:0;"
        "pointer-events:none;white-space:nowrap}" if draft else ""
    )
    return f"""
:root{{--s:{P.LL_SERIF};--f:{P.LL_SANS}}}
*{{box-sizing:border-box}}
body{{margin:0;background:{P.LL_CANVAS};color:{P.LL_TEXT};font-family:var(--f);line-height:1.6}}
.ll-page{{position:relative;z-index:1;max-width:{P.LL_MAX_WIDTH};margin:0 auto;padding:48px 24px}}
.ll-header{{border-bottom:1px solid {P.LL_GRIDLINE};padding-bottom:24px;margin-bottom:24px}}
.ll-eyebrow{{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:{P.LL_RED};font-weight:600}}
.ll-title{{font-family:var(--s);font-weight:700;color:{P.LL_INK};font-size:34px;margin:8px 0 16px}}
.ll-client{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 24px;font-size:14px}}
.ll-k{{display:block;color:{P.LL_TEXT_SEC};font-size:11px;text-transform:uppercase;letter-spacing:.04em}}
.ll-banner{{border-radius:2px;padding:16px 20px;margin-bottom:32px;background:{P.LL_CHICAGO_SURFACE};color:{P.LL_CHICAGO}}}
.ll-score{{font-family:var(--s);font-weight:700;font-size:22px}}
.ll-basis{{font-size:12px;color:{P.LL_TEXT_SEC};margin-top:8px}}
.ll-section{{margin:0 0 32px}}
.ll-h2{{font-family:var(--s);font-weight:700;color:{P.LL_INK};font-size:22px;
margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid {P.LL_GRIDLINE}}}
.ll-table{{width:100%;border-collapse:collapse;font-size:14px}}
.ll-table th{{text-align:left;background:{P.LL_CHICAGO};color:#fff;padding:8px 12px}}
.ll-table td{{padding:8px 12px;border-bottom:1px solid {P.LL_GRIDLINE}}}
.ll-limitations{{margin:0;padding-left:20px}}.ll-limitations li{{margin-bottom:6px}}
.num{{text-align:right;font-variant-numeric:tabular-nums}}
.ll-provenance{{margin-top:40px;background:{P.LL_CARD_BG};color:{P.LL_CARD_TEXT};
padding:20px 24px;border-radius:2px;font-size:13px}}
.ll-prov-title{{font-family:var(--s);font-weight:700;font-size:16px;margin-bottom:8px}}
.ll-provenance div{{margin-bottom:4px;color:{P.LL_CARD_SUBTITLE}}}
.ll-provenance strong{{color:{P.LL_CARD_TEXT}}}
.ll-prov-inputs{{width:100%;border-collapse:collapse;margin-top:8px}}
.ll-prov-inputs th{{text-align:left;border-bottom:1px solid rgba(255,255,255,.12);padding:4px 8px;color:{P.LL_CARD_MUTED}}}
.ll-prov-inputs td{{padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);color:{P.LL_CARD_SUBTITLE}}}
.ll-prov-brand{{margin-top:12px;font-family:var(--s);color:{P.LL_CARD_MUTED}}}
{draft_css}
@media print{{body{{background:#fff}}}}
"""


def run(config_path: str, input_path: str, out_dir: str, *, final: bool = False) -> dict:
    config = load_config(config_path)
    read = read_table(input_path)
    spec = _spec()
    report = run_preflight(read, spec, config)
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    provenance = build_provenance(
        tool=TOOL, tool_version=TOOL_VERSION, inputs=[read], config=config,
        validation_status=validation_status_label(report.status, report.n_warnings),
        extra={"Basis": "full cost attribution (six layers + distributor margin)"})
    if not report.passed:
        paths = write_report(report, config, str(out), provenance=provenance, draft=not final,
                             basename="data-readiness-report", title="Retailer Scorecard Data Readiness Report")
        return {"status": "blocked", "readiness_report": paths["html"]}

    frame = to_frame(read, report, spec)
    contributions = calculate_contributions(build_inputs(frame))

    limitations = [f.message for f in report.findings if f.severity == "warning"]
    if not limitations:
        limitations.append("No warnings — the cost-to-serve profile passed preflight cleanly.")

    csv_path = out / "contribution-scorecard.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.writer(fh)
        w.writerow(["retailer_id", "name", "gross_revenue", "true_contribution",
                    "contribution_margin_rate", "rank_by_gross", "rank_by_contribution"])
        for c in sorted(contributions, key=lambda c: c.rank_by_contribution):
            w.writerow([c.retailer_id, c.name, round(c.gross_revenue, 2), round(c.true_contribution, 2),
                        round(c.contribution_margin_rate, 4), c.rank_by_gross, c.rank_by_contribution])
    html_path = out / "retailer-contribution-scorecard.html"
    html_path.write_text(_deliverable_html(config, contributions, limitations, provenance, draft=not final),
                         encoding="utf-8")
    n_flips = sum(1 for c in contributions if c.rank_by_gross != c.rank_by_contribution)
    return {"status": "ok", "n_retailers": len(contributions), "n_rank_flips": n_flips,
            "report": str(html_path), "csv": str(csv_path), "n_warnings": report.n_warnings}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="retailer-scorecard client mode")
    ap.add_argument("--config", required=True); ap.add_argument("--input", required=True)
    ap.add_argument("--out", default="client-output"); ap.add_argument("--final", action="store_true")
    args = ap.parse_args(argv)
    result = run(args.config, args.input, args.out, final=args.final)
    if result["status"] == "blocked":
        print(f"BLOCKED — data not ready. See {result['readiness_report']}")
        return 3
    print(f"{result['n_retailers']} retailers · {result['n_rank_flips']} rank flip(s) "
          "(revenue rank != contribution rank)")
    print(f"report -> {result['report']}\ncsv    -> {result['csv']}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
