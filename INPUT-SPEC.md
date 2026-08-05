# Retailer Scorecard & Renegotiation Simulator — Client Data Input Specification

Runs the cost-allocation engine on your cost-to-serve inputs: attributes six cost
layers to each retailer and ranks accounts by **true contribution** instead of
gross revenue, surfacing accounts whose revenue rank and contribution rank
disagree. Money tool — every figure is on the full-cost-attribution basis. Not
POS-shaped, so it uses the generic column contract.

## §Retailers — the cost-to-serve profile (required)
One row per retailer account.

| Column | Type | Required | Meaning |
|---|---|---|---|
| `retailer_id` | identifier (text) | **required, unique** | account key |
| `name` | string | **required** | display name |
| `gross_revenue` | number ≥ 0 | **required** | annual gross revenue |
| `cogs_rate` | number ≥ 0 | **required** | COGS as a fraction of revenue |
| `deductions_rate` | number ≥ 0 | **required** | deductions rate |
| `trade_spend_rate` | number ≥ 0 | **required** | trade-spend rate |
| `payment_terms_days` | integer ≥ 0 | **required** | payment terms (working-capital drag) |
| `cost_of_capital` | number ≥ 0 | **required** | annual cost of capital |
| `labor_hours_compliance` | number ≥ 0 | **required** | compliance labor hours |
| `labor_hours_disputes` | number ≥ 0 | **required** | dispute labor hours |
| `labor_rate` | number ≥ 0 | **required** | labor $/hour |
| `returns_rate` | number ≥ 0 | **required** | swell/returns rate |
| `freight_differential_rate` | number ≥ 0 | **required** | freight variance rate |
| `pallet_surcharge_rate` | number ≥ 0 | **required** | pallet surcharge rate |
| `moq_penalty_rate` | number ≥ 0 | **required** | MOQ penalty rate |
| `distributor_margin_rate` | number ≥ 0 | optional (default 0) | distributor margin, if via distributor |
| `growth_rate_annual` | number | optional (default 0) | growth rate (trajectory only) |

Rates are fractions (e.g. 0.082 = 8.2%). True contribution = gross revenue minus
the six attributed cost layers and distributor margin.

## Column mapping (`engagement.yml`)
Map your headers under `columns:`; run:
`python client_mode.py --config engagement.yml --input client-data/retailers.csv`
