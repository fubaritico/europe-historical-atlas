---
name: review
description: Multi-agent code review for security, architecture, quality, and accessibility. Produces JSON findings and iterates up to 3 times.
triggers:
  - review code
  - check compliance
  - run review
  - code review
---

# Review — Multi-Agent Code Reviewer

Orchestrates 4 parallel domain-expert subagents to review changed files against project rules.
Produces a structured JSON report with findings sorted by severity.

## Prerequisites

- `pnpm type-check && pnpm lint && pnpm test` must PASS before triggering review (once the tooling is
  installed — Phase 0.1). If any fail, fix them first — the reviewer assumes clean static analysis.

## Execution Flow

### Step 1 — Scope Detection

Determine which files to review (priority order):

1. User-specified files/directories
2. Files changed on current branch vs main/master (`git diff --name-only main...HEAD`)
3. Staged files (`git diff --cached --name-only`)
4. Files in last commit (`git diff --name-only HEAD~1`)

Filter to: `*.ts`, `*.js`, `*.json`, `*.glsl`, `index.html` (exclude `node_modules`, `build/`, `dist/`,
lock files, and archived config under `files/claude-archive/`).

**Then widen the scope to the blast radius.** The changed files are where the diff *is*, not where it
*bites* — on 2026-09-16 the two worst defects of the session were both in untouched code. Before
dispatching, list the state the diff reads or writes (module-level handles, params objects, shared grids,
dispatch tables) and add every file that touches that state to the scope. Tell the agents which files are
the diff and which are the radius, and instruct them to review both.

### Step 2 — Load Context

Read all files in scope. Reference guides per dimension live in `references/`:
`security.md`, `architecture.md`, `quality.md`, `accessibility.md`.

**Do not frame the problem for the agents.** A prompt that says what to look for gets back what it asked
for. State what changed and what the state touches; let each agent decide what matters in its dimension.
Every framing you add is a place the review cannot look.

### Step 3 — Dispatch 4 Parallel Custom Subagents

Launch all 4 **custom subagents** simultaneously using the Agent tool. Each is defined in
`.claude/agents/review/` with its own domain-specific system prompt. Pass each the list of files in
scope (paths + content).

Subagents (by `name` / `agent_type`):

1. **`review-security`** — security vulnerabilities (XSS, injection, secrets, unvalidated input)
2. **`review-architecture`** — architecture rules (DI/seams, SOLID, GPU-leak, structure)
3. **`review-quality`** — code quality (JSDoc, `any`, `console.log`, dead code, GPU dispose)
4. **`review-accessibility`** — WCAG 2.1 AA on HTML overlays + canvas fallback/keyboard equivalence

Each subagent returns ONLY a JSON array of findings (no prose). Schema: `references/schema.json`.
An empty array is a legitimate, welcome answer — see the shared protocol appended to each agent file.

### Step 4 — Aggregate & Score

Merge findings. Per-category score:

```
category_score = max(0, 100 - (critical * 25) - (high * 10) - (medium * 3) - (low * 1))
```

Overall weights (sum = 100%): security 35%, architecture 30%, quality 25%, accessibility 10%.

Verdict thresholds: `ready` = 80-100 **and** nothing critical/high left open; `needs-attention` = 60-79;
`needs-work` = under 60.

**Treat the number as a rough sort, never as a measurement.** It is an arithmetic dressing over severities
an agent chose, so it is only as calibrated as they are — and it is more precise-looking than it deserves.
Report it to one decimal at most, and **never let it override a reading of the findings themselves**: a
score of 95 with one unfixed `high` is not a pass. When in doubt, say `needs-attention` and name what is
open. On 2026-09-16 the skill produced a confident "95.5" from a set of severities that included a missing
JSDoc tag filed as `high`.

### Step 5 — Verify before reporting

Three checks, in this order — a review that ships a wrong finding costs more than one that finds nothing:

1. **`needs_verification: true`** → run the `verification_query` against `opensrc/` (there is **no
   context7** here) or the web. Common cases: three.js API shape, deprecated methods, Vite HMR behaviour.
   If the usage turns out correct, discard the finding and adjust the score.
2. **Any finding carrying a computed figure** — a contrast ratio, a byte count, a complexity bound —
   **re-derive it yourself** from the `evidence` field. Agents produce confident arithmetic; on
   2026-09-16 an accessibility figure was right, but only checking established that.
3. **Any finding with a `suggestion`** — read `what_breaks_if_fixed_naively` and decide whether the
   remedy actually holds. **Two remedies were wrong that day while both findings were right**; one would
   have reintroduced the very bug the code existed to fix. Keep the finding, replace the remedy, and say
   plainly in the report that you did.

### Step 6 — Report to User

Present findings grouped by severity (critical first), then by category, followed by the score summary and
verdict. Say explicitly which findings you are **not** fixing and why — a finding left open by decision is
a different thing from one that was missed, and the report must not blur them.

### Step 7 — Fix Loop (max 3 iterations)

If verdict is NOT `ready`: fix `critical` then `high` findings, re-run only affected agents on modified
files, repeat up to 3 times total.

### Step 8 — Handle Remaining Violations

If violations remain after 3 iterations: present them and ask **store** (write to
`review-results/YYYY-MM-DD_HHmmss.json`) or **ignore**.

## Output Format

The final JSON report follows `references/schema.json`.

## Integration

Triggered by the main agent after every code session that produces changes, immediately after
`pnpm type-check && pnpm lint && pnpm test` passes. Mandatory for new/modified modules, new significant
refactors, and any change to shared code (ports, utils). Optional (user decides) for config-only or
docs-only changes.

---

IMPORTANT: Give the developer the table of findings (critical, high, medium, low), with columns:
`ID`, `Sév`, `Catégorie`, `Description`, `Statut`. THIS IS MANDATORY.

`Statut` must distinguish three outcomes, because they are not the same thing: **corrigé**,
**corrigé autrement** (the finding held, the proposed remedy did not — say what you did instead), and
**ouvert** (left open by decision — say whose decision and why). A finding silently absorbed into
"corrigé" when you actually did something else is how a review stops being trustworthy.

Where a finding was discarded on verification, say so too. A review that never discards anything is a
review that is not verifying.
