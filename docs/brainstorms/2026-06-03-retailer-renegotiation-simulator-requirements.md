---
date: 2026-06-03
topic: retailer-renegotiation-simulator
---

# Retailer Renegotiation Simulator

## Summary

An interactive portfolio piece that reveals which retailers actually make money after attributing six hidden cost layers, lets the visitor renegotiate terms or model walking away, and shows the financial consequence of each decision — deployed as a self-explanatory tool on synthetic Cinderhaven data with the cost engine built as a reusable component for the Question Engine.

---

## Problem Frame

Specialty food founders at $10M–$100M rank their retail partners by gross revenue because that's the only number their ERP gives them. The true cost of serving each retailer — deductions, trade spend, working-capital drag from slow payment terms, compliance labor, swell/returns, and logistics variance — is never attributed to a specific account. The CEO walks into an annual buyer meeting with no idea what the retailer actually costs or where the walk-away line is.

The result: founders accept margin-eroding terms from anchor retailers because losing the logo feels existential, while the profitable accounts quietly subsidize the unprofitable ones. The longer bad terms sit, the harder they are to renegotiate, and the loss compounds with the account's own growth.

The status quo is gross revenue by retailer from the ERP, a separate deductions spreadsheet, and a vague sense that the big accounts are "a lot of work." Nobody has loaded the full cost of a retailer into a single comparable number.

---

## Actors

- A1. **Cold visitor (portfolio prospect):** A specialty food CEO, founder, or CFO browsing the Lailara portfolio. Arrives without context, explores the tool solo, and judges whether Lailara understands their problem.
- A2. **Guided visitor:** A warm lead who received a link from Lailara and may be walked through the tool in a meeting. Same tool, but with narration.

---

## Key Flows

- F1. **Self-guided exploration**
  - **Trigger:** A1 lands on the tool from the Lailara website
  - **Actors:** A1
  - **Steps:**
    1. Visitor reads the headline and one-sentence framing
    2. Visitor chooses path: narrative reasoning or jump to simulator
    3. If narrative: visitor reads editorial explanation of each cost layer with interactive visual examples, then arrives at the simulator
    4. If simulator: visitor sees the animated gross-vs-true ranking flip
    5. Visitor selects a retailer and explores renegotiation levers, seeing the 24-month trajectory and live ranking updates
    6. Visitor toggles "walk away" on a retailer and sees initial impact
    7. Visitor moves to the dedicated redeployment view with capacity sliders and before/after portfolio comparison
  - **Outcome:** Visitor understands the cost-to-serve inversion, has explored the fix-or-fire decision, and leaves with a clear impression of Lailara's analytical capability
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7, R8, R9

- F2. **Guided walkthrough**
  - **Trigger:** A2 receives a link and opens the tool, possibly screen-sharing with Lailara
  - **Actors:** A2
  - **Steps:** Same as F1, but the Lailara consultant controls pacing and provides verbal context
  - **Outcome:** Same as F1, with deeper understanding from narration
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7, R8, R9

---

## Requirements

**Entry and navigation**

- R1. The tool opens with a bold headline and a single sentence of context that frames the problem without explaining the full methodology.
- R2. Below the headline, the visitor chooses between two paths: "Show me the reasoning" (narrative path) or "Let me explore" (simulator path). Both paths lead to the same simulator.

**Narrative path (methodology)**

- R3. The narrative path presents each of the six cost layers (deductions, trade spend, working-capital drag, labor overhead, swell/returns, logistics variance) with editorial prose explaining what it is, how it's attributed to a specific retailer, and why it matters.
- R4. Each cost layer section includes an interactive visual example showing how that layer applies to a specific retailer's cost stack.

**The ranking inversion (hook)**

- R5. The tool displays an animated ranking of 7+ retailers, showing gross revenue ranking transforming into true contribution ranking. Both rankings are visible (simultaneously or sequentially) so the inversion is unmistakable.
- R6. Retailers reached through distributors (e.g., Whole Foods via UNFI) include the distributor's costs (margins, terms, compliance) folded into that retailer's cost-to-serve, so the ranking compares direct and distributed channels on equal footing.

**Renegotiation simulator**

- R7. The simulator provides interactive levers for each cost component per retailer. Each lever displays a negotiability tag (e.g., "Often," "Rarely," "Internal," "Sometimes," "Partly") indicating how winnable that lever is in a real negotiation.
- R8. When levers change, the contribution ranking reshuffles live. A 24-month trajectory projection is visible within the simulator panel, showing the compounding cost or benefit of the current terms over time.
- R9. Each slider displays a break-even marker — a tick at the value where that lever alone (holding all others constant) would flip the retailer's contribution to positive. If no break-even exists within the lever's realistic range, the marker is absent and a tooltip explains why. Below the levers, a summary card shows the nearest compound path to break-even: the minimum combined changes across the most negotiable levers, computed by a goal-seek function.

**Walk-away and redeployment**

- R10. Each retailer in the simulator has a "walk away" toggle. When toggled, the simulator surfaces an initial impact summary for that retailer.
- R11. A dedicated redeployment view shows the full consequence of walking away: freed working capital, recovered production capacity, recovered trade-spend budget, and the net effect when those resources are reapplied to remaining retailers at their model-derived contribution rates.
- R12. The redeployment view includes capacity constraint sliders so the visitor can adjust absorption assumptions per remaining retailer (e.g., "Sprouts can absorb 20% more volume").
- R13. The redeployment view includes a before/after comparison of the full portfolio: total revenue, total contribution, total working capital position.

**Cost-allocation engine**

- R14. The cost-allocation engine is a standalone Python component with a clean interface, importable by the Question Engine for Q1 without code duplication.
- R15. The engine accepts per-retailer cost inputs and optional lever overrides, and returns true contribution and ranking for all retailers.

**Data and integrity**

- R16. All data is synthetic, sourced from the Cinderhaven Data Platform. The data must be realistic enough that a skeptical CFO finds the numbers plausible.
- R17. At least one major retailer in the synthetic dataset runs at negative true contribution despite high gross revenue, producing the ranking inversion honestly from the data — not rigged.
- R18. The `returns_rate` and `payment_terms_days` fields must be added to the Cinderhaven platform schema (both currently missing from the retailers table).

**Design and presentation**

- R19. All visual design follows the Lailara Design System v2: Canvas background, Playfair Display + Source Sans 3 (self-hosted), HK teal sequential palette for magnitude-ranked data, Chicago navy for interactive elements, click-to-pin interactions, 200ms ease-out transitions, Economist-style chart rules.
- R20. The tool is desktop-first. It must not break on mobile screens but is not optimized for mobile interaction.
- R21. The tool is fully self-explanatory — a cold visitor can understand the story and use the simulator without external narration.

---

## Acceptance Examples

- AE1. **Covers R5, R6, R17.** Given the synthetic dataset, when the ranking animation plays, at least one retailer that appears in the top 3 by gross revenue appears in the bottom 3 by true contribution, and this inversion follows from the attributed costs, not hardcoded ranking positions.
- AE2. **Covers R7, R8.** Given a retailer with negative true contribution, when the visitor adjusts trade spend down by 2 percentage points and payment terms from 60 to 45 days, the contribution recalculates live, the ranking reshuffles, and the 24-month trajectory projection updates to reflect the compounding effect of the new terms.
- AE3. **Covers R10, R11, R12, R13.** Given a visitor who toggles "walk away" on one retailer, when they enter the redeployment view and set capacity constraints (e.g., Sprouts at 120%, Natural Grocers at 100%), the view shows freed working capital, recovered capacity, and the net portfolio contribution after reallocation — with a clear before/after comparison.
- AE4. **Covers R2, R3, R4.** Given a visitor who chooses "Show me the reasoning," when they read through the narrative, each of the six cost layers has editorial prose and an interactive visual example, and the narrative concludes by leading into the simulator.
- AE5. **Covers R6.** Given a retailer served through UNFI, when the visitor views its cost breakdown, the distributor margin and distributor-specific compliance costs appear as attributed line items within the retailer's cost stack.

---

## Success Criteria

- The tool looks exceptional and tells a compelling story grounded in true data — a cold visitor leaves impressed by both the insight and the craft.
- The animated ranking inversion produces a genuine "gut-punch" moment where the visitor's assumption about which retailer is most valuable is overturned.
- A domain expert (specialty food CFO or operator) would find the six cost layers, the attribution logic, and the negotiability tags credible — not hand-wavy or oversimplified.
- The Python cost-allocation engine can be imported by the Question Engine Q1 with a clean function call and no frontend dependencies.

---

## Scope Boundaries

- CTA, lead capture, and sales conversion flow — handled by the Lailara website, not this tool
- Predicting buyer behavior or negotiation tactics — the tool finds the walk-away line, not the negotiation strategy
- Cross-industry generalization — built for specialty food retail metrics only
- Client data cleanup or ingestion — the demo runs on synthetic data; real client data is part of the paid diagnostic
- Rebuilding Where the Money Comes From — this is per-retailer cost-to-serve, not channel-level contribution
- Full mobile-optimized experience — desktop-first with graceful degradation
- DTC-only or enterprise SaaS scenarios
- Real-time data connections — data is pre-computed from the Cinderhaven platform

---

## Key Decisions

- **Retailer-level attribution, not distributor-level:** The ranking shows retailers (Whole Foods, not UNFI). Distributor costs are folded into the retailer they serve. Matches how a CEO thinks about the relationship.
- **Two-path entry:** Visitor self-selects into narrative (reasoning) or simulator (exploration). Both converge at the simulator. Serves both the skeptical CFO and the impatient CEO.
- **Redeployment as a dedicated view:** Separated from the simulator to give the "what if you walk away" decision its own stage and the space it needs for capacity sliders and before/after comparison.
- **Trajectory inside the simulator:** The 24-month compounding projection lives alongside the levers, connecting urgency to action in the same view.
- **Methodology as editorial + interactive:** Each cost layer gets prose explanation and a visual example. Prose earns trust; the interactive example proves it.
- **7+ retailers:** Enough for a dramatic ranking flip and realistic redeployment math. Specific retailer list defined during data design.
- **Lailara Design System v2 required:** All visual design governed by the established design system — not negotiable.

---

## Dependencies / Assumptions

- The Cinderhaven Data Platform schema must include `returns_rate` (currently missing) before the cost engine can model swell/returns per retailer.
- The Cinderhaven Data Platform schema must include `payment_terms_days` on the retailers table (currently missing — doc review found it is not present despite earlier assumption). Required for the working-capital drag calculation.
- The Question Engine Q1 will consume the Python cost-allocation engine; the interface contract should be defined before or during planning.
- Synthetic data must be engineered so the ranking inversion is honest — driven by realistic cost attribution, not manufactured for dramatic effect.
- Deployment infrastructure (Fly.io, Cloudflare, Docker) is available and the user has active accounts.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] What frontend framework wraps the D3 charts and manages state across panels — React (like Deduction Recovery), vanilla JS, or another option?
- [Affects R14, R15][Needs research] What is the exact function interface for the cost-allocation engine that the Question Engine Q1 will consume? Define before building the engine.
- [Affects R8][Technical] Should lever interactions hit a server-side API (FastAPI) or run calculations client-side in JavaScript? Affects latency, architecture, and deployment pattern.
- [Affects R16][Technical] Which specific retailers (names and financial profiles) should the synthetic dataset include? Needs data design work against the Cinderhaven platform.
- [Affects R18][Technical] What schema changes are needed in the Cinderhaven platform beyond `returns_rate`? Audit the platform before building.
