# Retailer Scorecard & Renegotiation Simulator

**Live:** https://retailer-scorecard.lailarallc.com

Interactive cost-to-serve model that reveals which retailers actually make
money after full cost attribution across six layers — deductions, trade
spend, working-capital drag, labor overhead, swell/returns, and logistics
variance. Renegotiation levers let the user adjust terms and see rankings
reshuffle live; a walk-away toggle models the redeployment consequence of
dropping an unprofitable account.

## Cinderhaven context

Built on the Cinderhaven synthetic dataset — a ~$25M specialty food brand,
50 SKUs across 5 product lines and 6 contracted retailers. Data is synthetic;
methodology and deliverables are real.

## What it finds

- **Animated ranking flip** — gross revenue ranking inverts when true
  contribution is applied. The crown-jewel account by revenue ranks last
  after cost attribution.
- **Renegotiation simulator** — five levers (trade spend rate, payment
  terms, compliance labor, swell rate, logistics variance) with
  negotiability tags and realistic ranges. Adjustments reshuffle rankings
  live.
- **Walk-away toggle** — removes a retailer and models redeployment math:
  how much volume other accounts can absorb, with capacity constraint
  sliders the CEO can adjust per retailer.
- **24-month trajectory projection** — compounding loss trajectory for
  unprofitable accounts, showing the cost of inaction over time.
- **Methodology panel** — transparent, auditable breakdown of all six cost
  layers with formulas and assumptions visible.

## Stack

- React 19, TypeScript 6, D3 v7 (frontend SPA)
- Python 3.13 cost-allocation engine (importable module for Question Engine Q1)
- Vite 8 (build tooling)
- Vitest + pytest (93 tests: 77 frontend, 16 engine)
- Cloudflare Pages via Wrangler (deployment)
- ESLint, @testing-library/react, jsdom (dev tooling)

## Data contract

**Canonical baseline:** 50 SKUs · 5 product lines (AS·PS·SC·DG·SB) · 6 retailers
(Walmart·Costco·Whole Foods·Sprouts·Kroger·Regional Group) · 10 channels
(6 retail + UNFI·KeHE·DPI + DTC)

## Run

```
git clone https://github.com/MsShawnP/retailer-scorecard-renegotiation-simulator.git
cd retailer-scorecard-renegotiation-simulator/frontend
npm install
npm run dev
```

Python engine (standalone):

```
cd retailer-scorecard-renegotiation-simulator
python -c "from engine.cost_model import calculate_contributions; print('ok')"
```

---

Built by [Lailara LLC](https://lailarallc.com) — data hygiene and analytics
consulting for specialty food brands scaling into national retail.
