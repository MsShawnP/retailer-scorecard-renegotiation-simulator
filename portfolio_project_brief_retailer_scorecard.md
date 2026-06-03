# Portfolio Project Brief — Retailer Scorecard & Renegotiation Simulator

**Status:** Brief stage — direction locked (interactive renegotiation simulator)
**Tier:** 2 (high-value; compounds with shipped pieces; supplies Question Engine Q1)
**Priority:** Build before the Question Engine — it produces the cost-to-serve verdict logic the engine's flagship question depends on.

---

### 1. The Pain

Founders are trapped by logo worship. They celebrate their largest specialty-food retail partners on the investor deck while being blind to what those partners actually cost. Gross revenue by retailer is visible in any ERP; true net-net contribution is invisible — because no standard accounting package assigns working-capital drag, portal/compliance labor, OTIF penalties, deduction-dispute hours, or retailer-specific returns to an individual account. The CEO ranks customers by the one number they can see (gross) and is blind to the one that matters (net-net).

The deeper pain is emotional. Founders feel they *can't* say no to a retail giant. They swallow margin-eroding terms, absorb chargebacks, and over-fund trade spend because losing the logo feels existential. Without an exact, auditable cost figure, leadership has no financial conviction — no spine — to push back or walk away.

- **Felt most acutely by:** CEO/founder (owns the relationship and the fear). CFO co-owns the cost side.
- **Acute at:** $10M–$100M, when one or two anchor retailers dominate the book and the terms were set when the brand had no leverage.
- **Compounds:** the unprofitable anchor scales its losses in lockstep with volume — and the longer the bad terms sit, the harder they are to renegotiate.

#### The Status Quo

Gross revenue by retailer from the ERP, a separate deductions spreadsheet, and a vague sense that "Walmart is a lot of work." Nobody has ever loaded the full cost of a retailer into a single comparable number. The CEO walks into the annual buyer meeting with no idea where their walk-away line is.

### 2. Why This Piece

The reframe is what makes it. "Cost to serve by retailer" is the single most done-to-death analysis in CPG consulting — every piece overlaps it because everyone builds it. The exciting version isn't the math; it's the question: **should you fire your biggest customer?** The drama is the inversion — the retailer ranked #1 by revenue flips to last by true contribution, on screen, when you load in the costs nobody attributes. *Your proudest win is your heaviest anchor* is a gut-punch, and gut-punches make skeptical readers stop.

- **Builds on / complements:** Deduction Recovery (shipped), Trade Spend Leakage (#3), Where the Money Comes From (shipped). Carves a distinct lane — see §8.
- **Supplies the Question Engine:** the cost-to-serve model built here IS the verdict logic for the engine's Q1 ("which retailers make me money after deductions, trade spend, and cost-to-serve"). Built as a clean callable Python component, the engine imports it instead of reimplementing it.
- **Reinforces** the primary CEO buyer; the renegotiation framing is squarely a founder's decision.

### 3. The Portfolio Piece

**Working title:** *Should You Fire Your Biggest Customer?*

The reader lands on two side-by-side rankings of Cinderhaven's retailers: by gross revenue, and by true all-in contribution. The lists don't match — the proudest logo has flipped to the bottom. That's the hook. Then the piece hands over the controls, and crucially, it doesn't leave the CEO scared and stuck — it walks them all the way to a decision.

#### Structure

- **Part 1 — The hook (the inversion):** Gross ranking vs. true-contribution ranking, side by side, with the flip animated. One sentence: *the customer you're proudest of is the one costing you the most.* Layered on top: the **trajectory view** — the anchor account's loss isn't static; it scales with its own growth. "At current trajectory this account costs you $X over the next 24 months." This turns "you're losing money" into "you're accelerating into a wall," and it's on-brand with the practice's compounding-cost motif (short-ship doom loop, data debt).
- **Part 2 — The proof (the methodology panel):** A transparent, auditable breakdown of exactly how true contribution is computed — the costs nobody attributes to a retailer. This earns credibility with the CFO/controller who will probe it (see Credibility Marker).
- **Part 3 — The leverage (the renegotiation simulator):** The interactive core, in two moves.
  - *The walk-away line.* Drag the levers of a real renegotiation — payment terms, trade spend, price, OTIF, MOQ/fill — and watch the contribution ranking reshuffle live. Find the exact terms change that flips an unprofitable retailer positive, or the number that justifies walking.
  - *The redeployment answer.* This is what completes the piece. The CEO's instant rebuttal to "you're losing money on them" is "I can't fire them, that's 35% of my revenue." So the tool answers it: firing or shrinking the account frees working capital, production capacity, and trade-spend budget — and the model reapplies those to the profitable accounts at *their* real contribution rates. "Losing them costs $X in revenue but frees $Y in cash and Z% capacity; redeployed at your good accounts' margins, you net +$W." That converts a scary chart into a permission slip with a number behind it. Setup → gut-punch → resolution; the CEO leaves decided, not anxious.

#### The Cost-to-Serve Model — Allocation Matrix

True contribution = gross revenue minus six operational layers, each attributed to the specific retailer, each tied to a simulator lever. The third column — **how winnable the lever actually is** — is the unfakeable tell that the author has sat across from a buyer, not just modeled one. The sliders are not all equally movable.

| Cost component | Attribution method | The lever — and its real-world negotiability |
|---|---|---|
| Deductions & chargebacks | Categorized via retailer-specific reason-code taxonomies (OTIF, shortages, pricing) | **Partly** — compliance is on you; published waiver bands rarely move |
| Trade spend | Amortized slotting, promo discounts, MCBs | **Often** — the most negotiable lever; promo % is where the real give is |
| Working-capital drag | Per-retailer payment terms against blended cost of capital | **Sometimes** — terms move with scale or leverage, and slowly |
| Labor overhead | Hours on custom portals, EDI exceptions, dispute resolution | **Internal** — fixed by automation or admin surcharge, not by the buyer |
| Swell & returns | Retailer-specific unsaleables/damage rates | **Rarely** — contractual return thresholds are sticky |
| Logistics variance | Freight differentials, MOQ penalties, pallet programs | **Sometimes** — bracket pricing and MOQ are negotiable, especially mid-tier |

#### The Margin Math

For a $25M demo brand, the typical reveal: the anchor retailer at ~35% of gross revenue runs at *negative* true contribution once 60-day terms (~$300K working-capital drag at blended cost of capital), trade spend, deduction leakage, and compliance labor are loaded in. The CEO has been subsidizing their biggest customer with the margin from their smallest ones. The simulator then sizes the fix three ways: the *flip* (terms 60→45 + 2 pts of trade spend swings it six figures positive), the *trajectory* (left alone, the loss compounds to $X over 24 months as the account grows), and the *redeployment* (walking frees $Y cash + Z% capacity, net +$W when reapplied to profitable accounts). Three numbers the CEO has never had: what it costs, what it'll cost, and what to do about it.

#### Before / After

- **Before:** CEO ranks customers by revenue, feels unable to push back on the big one, walks into the buyer meeting with no leverage and takes whatever terms are offered.
- **After:** CEO opens the simulator, sees the true ranking and the trajectory, drags the levers to find the achievable fix, knows the redeployment math if they walk, and enters the meeting with a walk-away line and the math to defend it.

#### Who Else Sees This?

- **Primary audience:** CEO/founder.
- **Secondary audience:** CFO (owns the cost inputs), the board ("are we subsidizing our anchor customer?" is a board-level question).
- **How it gets shared:** CEO runs the simulator before a renegotiation; forwards the contribution ranking to the CFO with "is this right?" — which is the start of an engagement.

### 4. Technical Specification

#### Repo

- **Repo name:** `retailer-cost-to-serve`
- **Repo description:** Interactive cost-to-serve model and renegotiation simulator for specialty food brands.

#### Tech Stack

| Tool | Role in This Project |
|------|---------------------|
| Python | The cost-allocation engine as a clean, decoupled, callable component — imported directly by the Question Engine (Q1) with no code duplication. The reusable core, designed for reuse from day one. |
| FastAPI | Serves model calculations and state changes to the front end (coherent with the Question Engine's stack, so the shared-core story holds) |
| JS + D3 | The interactive simulator: the animated ranking flip and the data-driven re-sort as sliders move. The inversion and the redeploy are D3 moments. Steers away from Streamlit (flagged overused). |
| SQL | Aggregates retailer-level cost components from the unified Cinderhaven platform schema |

Data flow: Cinderhaven platform (SSOT) → SQL → Python cost-allocation core → forks to (a) FastAPI → D3 front end and (b) Question Engine Q1.

#### Deliverables

| Deliverable | Format | Purpose |
|------------|--------|---------|
| Renegotiation simulator | FastAPI + D3/JS on Fly.io | The interactive leverage tool — the piece's reason to exist |
| Cost-to-serve model | Python component in repo | Reusable core; the Question Engine imports it for Q1 |
| Methodology panel | In-app + HTML/PDF | The audit-credibility artifact — how true contribution is computed, transparently |

#### Deployment

- **Where:** FastAPI app on Fly.io (consistent with EDI Pre-flight / Question Engine).
- **URL structure:** `https://[app-name].fly.dev` or custom domain.
- **How a prospect finds it:** Portfolio link; LinkedIn post on the "fire your biggest customer" hook; the animated inversion is the share object.

#### Simulated Data Sources

Reads from the Cinderhaven Data Platform (SSOT) — modeling NetSuite (sales/AR/terms), 3PL portal (freight/pallet), retailer portals (deduction reason codes, OTIF), and the trade spend tracker. The model consumes the platform's clean schema; messiness lives upstream.

### 5. Skills Demonstrated

- Building a defensible cost-allocation model — attributing costs nobody normally assigns to a customer (the rare, credible part).
- Modeling the working-capital cost of payment terms — the lever most analyses omit.
- Scenario/redeployment modeling — proving the *consequence* of a decision, not just diagnosing it.
- Interactive decision tooling that produces leverage, not just a view (D3 + FastAPI).
- Designing a reusable component consumed by another piece (the Question Engine) — software thinking, not one-off analysis.
- Reframing a commodity analysis into a decision a CEO actually faces.

### 6. Foot-in-the-Door Offering

- **Offering name:** "Retailer Profitability Diagnostic"
- **Format:** Fixed-fee 2–3 week engagement.
- **Price range:** $18K–$30K.
- **What the client gets:** Their actual retailers loaded into the cost-to-serve model, the true-contribution ranking, the trajectory projection, and a renegotiation simulator tuned to their data — so they walk into their next buyer meeting with a walk-away line, the redeployment math, and the conviction to use both.
- **Why this piece is the sales collateral:** The CEO runs the demo on Cinderhaven, sees their own anchor-customer fear reflected, and wants the real number. CTA: "We'll do this on your retailers. Two weeks, fixed fee."

#### Client Lift

- **What the client has to do:** One 60-minute kickoff; read-only ERP access + deduction/trade-spend trackers. ~3 hours of controller time.
- **What we need from them:** 12 months of sales + AR by retailer, payment terms by retailer, deduction remittances, trade spend by retailer, freight/pallet costs. (Same spine as Contract-to-Cash — engagements compound.)

#### The DIY Defense

- Attributing working-capital cost, compliance labor, and swell to a *specific retailer* requires allocation logic that exists in no standard report. An internal analyst produces gross revenue by retailer and stops — the hard 80% is the cost attribution, not the chart.
- Getting the levers to interact correctly (a price change shifts trade-spend %, a terms change shifts carrying cost) requires modeling the interactions a static spreadsheet can't represent without breaking — and the redeployment math requires knowing each account's true contribution rate, which is the very thing the brand doesn't have.

### 7. Marketing / Distribution

- **Portfolio integration:** Flagship interactive piece; links into the Question Engine as Q1's deep-dive.
- **LinkedIn:** Animated GIF of the D3 ranking inversion — "Your top customer is subsidizing your smallest accounts. Here's the math." Link the live simulator.
- **SEO / organic:** "cost to serve by retailer," "is [retailer] profitable for suppliers," "retailer payment terms working capital."
- **Shareability:** The live simulator is the share object; the gross-vs-true ranking flip is the screenshot.
- **Lead capture:** Simulator open and ungated on synthetic data. "Run this model on your own data — 2-week fixed fee" is the gated/high-intent CTA.

### 8. Competitor / Existing Content Scan

- **What exists:** Cost-to-serve is everywhere — enterprise consulting decks, trade-promotion software vendors, generic CPG finance blogs. All of it assumes scale, software, and an analyst team.
- **What's missing:** Nobody frames it as a *renegotiation decision* for a sub-$100M specialty food founder, nobody answers the "but I can't lose that revenue" rebuttal with a redeployment number, and nobody ships an interactive tool that finds the walk-away line. The standard output is a static "here's your cost-to-serve" chart that dies in a slide deck.
- **Your angle:** It's not an analysis, it's leverage with a resolution. The inversion + the trajectory + the live simulator + the redeployment answer is a posture nobody in this segment has taken.

### 9. Cinderhaven Integration

- **Reads from the Cinderhaven Data Platform (SSOT).** Consumer, not owner. No schema ownership changes; may need a clean `payment_terms_by_retailer` field and a `returns_rate` field if not already modeled.
- **Reuses existing SQL** from Deduction Recovery and Where the Money Comes From; new logic is the cost allocation, the working-capital model, the trajectory projection, and the redeployment math.
- **Same retailers** — Walmart, Costco, Whole Foods (UNFI), KeHE, DTC. The inversion needs one retailer engineered to be high-revenue / negative-true-contribution so the flip is dramatic — and honest on the data.
- **Consistency maintained** — sits above shipped pieces; numbers must reconcile with Where the Money Comes From and Deduction Recovery.

### 10. Tactical Notes

- The model's credibility lives or dies on the working-capital and labor-attribution logic. Get those defensible; they're the part competitors skip and the part a CFO will probe.
- Build the cost-to-serve model as a clean importable component from the start — the Question Engine depends on it. Don't bury the logic in the front end.
- Make the inversion real, not rigged. The flip must follow from honest costs on realistic Cinderhaven data, or a skeptic spots the thumb on the scale.
- The levers must interact correctly (terms → carrying cost, price → trade-spend %), and the negotiability tags must be honest — a fantasy walk-away line built on un-winnable levers is worse than no tool.
- The redeployment math is only as credible as the profitable accounts' contribution rates it reuses — make sure those are derived by the same model, not assumed.

#### The Credibility Marker

Modeling the **working-capital carrying cost of payment terms by retailer** — turning "Walmart pays in 60, Costco in 30" into an attributed dollar penalty against the brand's own cost of capital. Anyone can subtract deductions from revenue; loading the cost of money tied up in a slow-paying retailer's receivables is the tell that the author understands the financial mechanics, not just the spreadsheet.

#### Data Paranoia / Security

- **What's sensitive:** Retailer-level margins, payment terms, trade spend rates, cost of capital — among the most guarded numbers a brand has, and the renegotiation framing raises the stakes further.
- **How the narrative reassures:** The public app runs entirely on synthetic Cinderhaven data. The engagement emphasizes the model runs in the client's environment, anonymized retailer labels available, numbers never leave.

### 11. Implementation Checklist

- [ ] **Data architecture:** Verify `payment_terms_by_retailer` and `returns_rate` are active in the platform schema; add if not.
- [ ] **Data engineering:** Engineer the synthetic dataset so one major retailer mirrors realistic revenue velocity but runs net-negative on working capital + deductions — honest, not rigged.
- [ ] **Backend — core:** Build the Python cost-allocation engine; test the lever interactions (price change auto-scales percentage-based trade spend; terms change flows to carrying cost).
- [ ] **Backend — trajectory:** Add the 24-month projection that scales the account's loss with its growth.
- [ ] **Backend — redeployment:** Model freed working capital / capacity / trade spend reapplied to profitable accounts at their model-derived contribution rates.
- [ ] **Frontend:** Build the D3 transition layout for smooth re-sorting on state change; surface negotiability tags on each lever.
- [ ] **Documentation:** Methodology panel inside the simulator UI.
- [ ] **Component contract:** Confirm the Python core's interface so the Question Engine can import it cleanly for Q1.

### 12. Build Estimate

- **Effort level:** Medium-Large → Large. The base model + simulator was Medium-Large; the trajectory and redeployment layers add a time dimension and a scenario engine the present-tense version didn't have.
- **Dependencies:** Cinderhaven platform retailer/terms/deduction/trade-spend data available; build after the relevant platform fields are confirmed.
- **New skills required:** D3-driven live re-ranking interaction; designing a Python model as a shared component for a downstream consumer; multi-period projection modeling for the trajectory view.

#### Out of Scope

- Predicting buyer *behavior* — the tool finds the mathematical walk-away line and the redeployment consequence; it doesn't model negotiation tactics or whether the buyer says yes.
- Cross-industry generalization — tailor-made for specialty food retail metrics; not DTC-only or enterprise SaaS.
- Data cleanup automation — the demo assumes a clean schema; cleaning raw client data is part of the paid diagnostic.
- Rebuilding Where the Money Comes From (channel-level contribution) — this is the per-retailer cost-to-serve model, simulator, and decision engine, not another "here's the answer" story.

---

*Direction locked: interactive renegotiation simulator, reframed as "should you fire your biggest customer?" — completed by the trajectory view (the loss compounds), the redeployment answer (what to do about it), and honest lever negotiability. Cost-to-serve model built as a callable component the Question Engine reuses for Q1.*
