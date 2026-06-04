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

### 2026-06-03 — Orphaned Workers DNS record blocked Cloudflare Pages custom domain

**Attempted:** Added custom domain `retailer-scorecard.lailarallc.com` to a new Cloudflare Pages project after the old project had been deleted. Expected Pages to auto-configure DNS for a zone in the same account.

**Why it didn't work:** Deleting a Cloudflare Pages project does NOT clean up the underlying Worker script or its custom domain bindings. The old Worker `retailer-scorecard-renegotiation-simulator` still existed with a custom domain route, which held a read-only AAAA record (`100::`) on the hostname. This record blocked CNAME creation (error 81062) and couldn't be deleted via DNS API (error 1043, read-only). The wrangler OAuth token's fixed scopes don't include DNS write, so multiple approaches failed. `wrangler login` also timed out twice when run in background.

**What we tried instead:** Traced the `origin_worker_id` from the DNS record metadata to the Workers Domains API (`/accounts/{id}/workers/domains`). Found the orphaned custom domain binding. Deleted it via Workers Domains API, which released the DNS lock. Then created the CNAME with a separate API token that had DNS edit scope, and re-added the Pages custom domain.

**Status:** Resolved — 2026-06-03. Key lesson: when a Pages project is deleted, check Workers scripts and Workers Domains for orphaned bindings before attempting custom domain setup on a new project.

**Tags:** cloudflare, pages, workers, dns, custom-domain, orphaned-record, deployment

### 2026-06-04 — /improve audit flagged README as stale when it was already complete

**Attempted:** During the /improve audit, the Explore subagent reported README.md as 0.3 KB. Based on this, flagged it as CRITICAL — "says Early stage and Stack TBD." Presented this to the user as a top finding.

**Why it didn't work:** The Explore subagent's file size estimate was stale or inaccurate. The README had already been rewritten to 70 lines (commit 5ed859c) in a prior session. A direct Read of the file confirmed it was complete and followed the template. The finding was a false positive that had to be walked back after presenting it.

**What we tried instead:** Re-read the file directly, confirmed it was already complete, checked git log to verify the rewrite commit. Marked the task as "already done" and moved on.

**Status:** Resolved — 2026-06-04. Key lesson: during audits, always Read the actual file content before flagging it as a finding. Don't trust file size estimates or subagent directory scans as a proxy for file content. Verify before presenting findings to the user.

**Tags:** improve, audit, false-positive, subagent, explore-agent, readme, file-size-estimate
