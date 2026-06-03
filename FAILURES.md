# Retailer Scorecard & Renegotiation Simulator — Failure Log

What was attempted that didn't work, why it didn't work, and what was
tried next.

Lower bar than DECISIONS.md — capture failures even when they didn't
produce a durable rule. The whole point: future-you (or future-Claude)
shouldn't re-attempt dead ends because the lesson got lost.

---

## Format

### YYYY-MM-DD — [One-line failure description]

**Attempted:** [What was tried]

**Why it didn't work:** [Concrete reason, not "it broke." If the
failure mode was technical, name the specific issue. If the failure
mode was scope or approach, name that.]

**What we tried instead:** [The next attempt, which may also have
failed and may have its own entry below]

**Status:** Resolved / open / abandoned

**Tags:** [keywords for future text-search]

---

## Entries

### 2026-06-03 — Subagent Bash cp syntax created garbled directory artifacts on Windows

**Attempted:** Subagent used `cp "source" "dest"` (Bash syntax) to copy woff2 font files into `frontend/public/fonts/` while running on a Windows PowerShell host.

**Why it didn't work:** PowerShell treats `cp` as an alias for `Copy-Item`, not Bash `cp`. The quoted argument with the full path including `&&` chaining was interpreted as a literal directory name — PowerShell created a directory whose name is the entire shell command string. The font files were already present from a prior manual copy, so the app works, but two artifact directories now exist as untracked git files requiring `git clean -f` to remove.

**What we tried instead:** Used `Remove-Item -Force` via PowerShell with a wildcard — did not find them (encoding mismatch). Used `git clean -f` — blocked by CLAUDE.md safety rule requiring explicit user confirmation before running destructive git commands.

**Status:** Resolved — artifacts deleted via PowerShell regex match (`Get-ChildItem | Where-Object { $_.Name -match 'fonts.*&&' } | Remove-Item`) on 2026-06-03. `git clean -f` was not needed.

**Tags:** subagent, windows, powershell, bash-syntax, font-copy, git-clean, artifacts

### 2026-06-03 — KeHE modeled as a retailer instead of a distributor

**Attempted:** U1 subagent created retailer profiles in retailers.json with KeHE as one of 7 "retailers" in the ranking chart.

**Why it didn't work:** KeHE is a distributor (like UNFI), not a retailer. R6 explicitly requires "Distributor costs (UNFI, KeHE) folded into the retailer they serve." The model already has a `distributor_margin` cost layer — KeHE's margin should be attributed to the retailers it distributes for, not shown as a standalone account. The ranking currently shows 7 bars when it should show 6 (or however many actual retailers exist after removing KeHE).

**What we tried instead:** Removed KeHE as a standalone entry. Marked Sprouts and Regional Group as `is_via_distributor: true` with `distributor_name: "KeHE"` and `distributor_margin_rate: 0.08`. KeHE's 8% margin now appears in their cost stacks. Ranking dropped from 7 to 6 bars. Sprouts fell from #1 to #2 contribution (Costco now #1). Updated export script, retailers.json, test fixtures, expected outputs, and all tests.

**Status:** Resolved — 2026-06-03.

**Tags:** data-model, distributor, kehe, R6, retailers-json, subagent-error
