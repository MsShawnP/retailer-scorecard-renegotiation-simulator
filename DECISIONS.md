# Retailer Scorecard & Renegotiation Simulator — Decisions Log

Permanent record of choices that should survive session turnover.
If a decision is reversed, strike it through and add the replacement
below — don't delete.

---

## Format

Each entry:
- **Date** — when decided
- **Decision** — one sentence, imperative voice
- **Why** — the reasoning, including what was tried and rejected
- **Scope** — what this applies to (file, chunk, deliverable, or "global")
- **Do not** — explicit anti-instructions, if any

---

## Architecture & Pipeline

### 2026-06-03 — Use Heavy tier (full 11-step workflow)
- **Why:** High-value portfolio piece with downstream dependencies
  (Question Engine Q1), complex interactive requirements, and
  long-term maintenance expectations.
- **Scope:** global
- **Do not:** Skip gstack gates (/office-hours, /plan-ceo-review,
  /plan-eng-review)

### 2026-06-03 — Static SPA on Cloudflare Pages, not FastAPI on Fly.io
- **Why:** Every Lailara portfolio piece is a static SPA with
  pre-computed JSON. Client-side TypeScript calculations give
  zero-latency slider response. Fly.io is reserved for full-stack
  apps (Competitive Shelf Intelligence). The brief's FastAPI
  assumption was overturned by portfolio-wide pattern research.
- **Scope:** global — deployment, architecture, data flow
- **Do not:** Add a FastAPI backend or live database connection.
  All data is pre-computed via Python scripts to static JSON.

### 2026-06-03 — React 19 + Vite + TypeScript + D3 stack
- **Why:** Matches retailer-deduction-recovery (the most complex
  interactive piece in the portfolio). React manages state across
  panels; D3 handles animated chart transitions. Observable Plot
  rejected because the simulator's slider-driven real-time
  recalculation needs D3's imperative update model. Recharts
  rejected because it lacks transition control for animated
  ranking reordering.
- **Scope:** global — frontend framework and charting library
- **Do not:** Use Observable Plot, Recharts, or vanilla JS without
  a framework. Do not add Redux or context providers — useState +
  useMemo is sufficient (matches portfolio pattern).

### 2026-06-03 — Dual calculation implementation: Python + TypeScript
- **Why:** The Python cost engine must be importable by Q1 (R14).
  The frontend must recalculate instantly on slider drag (no API
  round-trips). Both requirements are non-negotiable — so the cost
  model formulas exist in both languages, validated against each
  other via shared test fixtures. Maintenance cost accepted for
  zero-latency interaction.
- **Scope:** engine/ (Python) and frontend/src/calculations.ts
  (TypeScript)
- **Do not:** Let the implementations drift — run cross-validation
  before every deploy. Every formula change must be made in both
  languages and verified against shared fixtures.

---

## Data & Schema

[Decisions about data sources, schemas, transformations]

---

## Visualization

### 2026-06-03 — Use Lailara Design System v2 for all visual design
- **Why:** Consistent brand across portfolio pieces. The design system
  (defined in parent CLAUDE.md) prescribes colors, typography, chart
  rules, and interaction patterns. Specifically: HK teal sequential
  palette for magnitude-ranked retailer data, Chicago navy for
  interactive elements, Canvas background, Playfair Display headings,
  Source Sans 3 body, click-to-pin interactions, 200ms ease-out
  transitions, Economist-style chart rules.
- **Scope:** global — all UI, charts, and interactive elements
- **Do not:** Use arbitrary colors, Google Fonts CDN, hover tooltips,
  gradients, 3D effects, or rounded corners beyond 2px border-radius

---

## Output Formats

[Decisions about deliverable formats, structure, organization]

---

## Writing & Voice

[Voice, style, terminology decisions specific to this project]

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
