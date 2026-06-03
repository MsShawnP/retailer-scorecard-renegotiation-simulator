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

**Status:** Open — artifacts still present. Next session: run `git clean -f -- "frontend/public/fonts*"` after explicit user confirmation, or manually delete via File Explorer.

**Tags:** subagent, windows, powershell, bash-syntax, font-copy, git-clean, artifacts
