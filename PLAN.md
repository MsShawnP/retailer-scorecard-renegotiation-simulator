# Retailer Scorecard & Renegotiation Simulator — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Build a deployed, self-explanatory interactive portfolio piece that
reveals which retailers actually make money after full cost attribution,
lets the user renegotiate terms via interactive levers to find a fix or
walk-away line, and models the redeployment consequence of dropping an
unprofitable account — all on synthetic Cinderhaven data, with the
Python cost-allocation engine built as a clean importable component for
the Question Engine Q1.

## Why this arc, why now

This is a high-value portfolio piece that compounds with shipped work
(Deduction Recovery, Where the Money Comes From) and directly supplies
the Question Engine Q1 verdict logic. The Question Engine is ~2–3 weeks
out (as of 2026-06-03), so the reusable component needs to be designed
now, not retrofitted later.

## Business question this arc answers

Which of your retail partners actually make you money after deductions,
trade spend, working-capital drag, compliance labor, swell, and
logistics are attributed — and what happens if you renegotiate terms or
walk away and redeploy?

## Scope (from /clarify — 2026-06-03)

**In scope:**
- Animated D3 ranking flip (gross revenue vs. true contribution) as hook
- Six cost layers fully modeled: deductions, trade spend, working-capital
  drag, labor overhead, swell/returns, logistics variance
- Interactive renegotiation simulator with levers per cost component,
  negotiability tags, and realistic ranges
- Redeployment math with capacity constraint sliders (CEO can adjust
  absorption assumptions per retailer)
- Trajectory view (24-month projection of compounding loss)
- Methodology panel (transparent, auditable breakdown)
- Python cost-allocation engine as clean importable component (for Q1)
- Self-explanatory UI — must land without narration for cold portfolio visitors
- Synthetic Cinderhaven data; gaps in platform schema get filled
- Deployment on Cloudflare Pages (static SPA)

**Out of scope:**
- Predicting buyer behavior or negotiation tactics
- Cross-industry generalization beyond specialty food retail
- Client data cleanup automation
- Rebuilding Where the Money Comes From (channel-level contribution)
- DTC-only or enterprise SaaS scenarios

## Tasks

Work in vertical slices — one section/feature end-to-end before moving
to the next. Visualizations get reviewed in their own slice, not
deferred to a polish phase.

- [x] Run /clarify to scope the work
- [x] Run /office-hours to stress-test the idea (green light)
- [x] Run /plan-ceo-review for product gate (ship it)
- [x] Run /plan-eng-review for architecture gate (sound)
- [x] /ce:brainstorm — requirements doc written
- [x] /ce:plan — implementation plan written + doc review (5 agents)
- [x] Address P1 doc review findings before building
- [x] Build U1: Cinderhaven schema audit + synthetic retailer profiles
- [x] Build U2: Python cost-allocation engine (test-first, 16 tests)
- [x] Build U3: Frontend scaffold + TypeScript engine (cross-validated)
- [x] Build U4: Ranking visualization with animated flip
- [x] Build U5: Entry point + navigation + methodology panel
- [x] Build U6: Renegotiation simulator with trajectory
- [x] Build U7: Walk-away toggle + redeployment view
- [x] Build U8: Design polish + Cloudflare Pages deployment
- [x] /ce:review — 10-agent review, 29 fixes applied and redeployed

## Definition of done for this arc

- [x] Deployed interactive tool on Cloudflare Pages accessible from portfolio
- [x] Visitor sees gross-vs-true ranking with animated inversion
- [x] Methodology panel explains all six cost layers transparently
- [x] Renegotiation levers with negotiability tags reshuffle rankings live
- [x] Redeployment math with capacity constraint sliders shows consequence
- [x] Trajectory view shows 24-month compounding loss projection
- [x] Python cost-allocation engine importable by Question Engine Q1
- [x] All data sourced from Cinderhaven platform (gaps filled)
- [x] UI fully self-explanatory without narration

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.

### 2026-06-03 — Retailer Scorecard & Renegotiation Simulator
- Outcome: Shipped to retailer-scorecard.lailarallc.com. 6 retailers,
  animated ranking flip, renegotiation simulator with 5 levers +
  trajectory, walk-away + redeployment view, methodology panel. Python
  cost engine importable by Q1. 93 tests. /ce:review complete (29 fixes).
  /ce:compound complete — `docs/solutions/architecture-patterns/dual-engine-cross-validation-2026-06-03.md` written.
- Tag: (pending)

---

## Improvement history

Track when this project was reviewed and improved via /improve.
Each entry records what was found, what was fixed, and when to
check again.

<!-- Entries are added by /improve — don't delete this section -->

### 2026-06-04 — Improvement pass
- **Trigger:** User-initiated, first /improve on this project
- **What was reviewed:** Code quality (ESLint, TypeScript), project structure, Python dependencies, security (10-point OWASP audit), git hygiene, README, project health tracker
- **What was fixed:**
  - Added requirements.txt for Python engine dependencies
  - Fixed 2 ESLint errors: setState-in-effect in useAnimatedNumber.ts (rAF pattern) and RedeploymentView.tsx (removed redundant cleanup effect)
  - Fixed 2 ESLint warnings: unstable useMemo deps in SimulatorView.tsx (wrapped overrides in useMemo)
  - Removed orphan src/ directory (contained only boilerplate CLAUDE.md, no code)
  - Added Cloudflare Pages security headers (_headers file: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
  - Fixed Postgres DSN password encoding in export_data.py (keyword args instead of string interpolation)
  - Updated project health tracker (dep audit: yes, 0 npm vulnerabilities)
- **Deferred:** Cloudflare API token rotation (manual action, flagged to user). Ranking chart CONTAINER_WIDTH hardcode (cosmetic, viewBox handles scaling). AppView type rename (correct for usage, not worth renaming per project rules).
- **Next review:** 2026-07-04
