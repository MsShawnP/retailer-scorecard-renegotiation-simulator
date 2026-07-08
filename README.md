# Retailer Scorecard & Renegotiation Simulator

An interactive cost-to-serve model that reveals which retailers actually make money after full cost attribution — and lets you rehearse the renegotiation before you have it.

**Live:** https://retailer-scorecard.lailarallc.com

## What it does

Attributes six cost layers to each retailer account — deductions, trade spend, working-capital drag, labor overhead, swell/returns, and logistics variance — and ranks accounts by true contribution instead of gross revenue.

- **Animated ranking flip** — gross revenue ranking inverts when true contribution is applied. The crown-jewel account by revenue ranks last after cost attribution.
- **Renegotiation simulator** — five levers (trade spend rate, deductions rate, payment terms, swell/returns rate, logistics variance) with negotiability tags and realistic ranges. Adjustments reshuffle rankings live. Labor overhead is shown but held fixed — it is an internal operational cost, not a buyer-negotiable term.
- **Walk-away toggle** — removes a retailer and models redeployment math: how much volume other accounts can absorb, with capacity constraint sliders the CEO can adjust per retailer.
- **24-month trajectory projection** — compounding loss trajectory for unprofitable accounts, showing the cost of inaction over time.
- **Methodology panel** — transparent, auditable breakdown of all six cost layers with formulas and assumptions visible.

## Why it matters

Gross revenue is how most brands rank their retail accounts, and it is routinely the wrong answer: the biggest account by revenue can be the least profitable after deductions, trade spend, and the working capital its payment terms consume. Executives sense this but rarely have the attribution to prove it — so the unprofitable relationship continues by default.

This tool turns that intuition into a negotiation position. It shows which specific lever makes an account profitable, what the terms would have to be, and — via the walk-away model — what the realistic alternative is if the retailer won't move. Knowing the walk-away math is the difference between asking for better terms and negotiating them.

## Quick start

Frontend:

```bash
git clone https://github.com/MsShawnP/retailer-scorecard-renegotiation-simulator.git
cd retailer-scorecard-renegotiation-simulator/frontend
npm install
npm run dev
```

Python engine (standalone):

```bash
cd retailer-scorecard-renegotiation-simulator
python -c "from engine.cost_model import calculate_contributions; print('ok')"
```

Tests:

```bash
cd frontend && npm test   # 77 frontend tests (Vitest)
pytest tests/             # 16 engine tests
```

## Tech stack

- React 19, TypeScript, D3 v7 (frontend SPA)
- Python 3.13 cost-allocation engine (importable module)
- Vite (build tooling)
- Vitest + pytest (93 tests: 77 frontend, 16 engine)
- Cloudflare Pages via Wrangler (deployment)
- ESLint, @testing-library/react, jsdom (dev tooling)

## Project structure

- `frontend/` — React SPA (views, simulator, D3 visualizations)
- `engine/` — Python cost-allocation engine (`cost_model.py`)
- `tests/` — pytest suite for the engine
- `scripts/` — data pipeline scripts

## Data contract

Built on the Cinderhaven synthetic dataset — a fictional ~$25M specialty food brand. Data is synthetic; methodology and deliverables are real. **Canonical baseline:** 50 SKUs · 5 product lines (AS·PS·SC·DG·SB) · 6 retailers (Walmart·Costco·Whole Foods·Sprouts·Kroger·Regional Group) · 10 channels (6 retail + UNFI·KeHE·DPI + DTC).

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Lailara LLC](https://lailarallc.com) — data hygiene and analytics consulting for specialty food brands scaling into national retail.
