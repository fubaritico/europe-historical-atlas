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

### Step 2 — Load Context

Read all files in scope. Reference guides per dimension live in `references/`:
`security.md`, `architecture.md`, `quality.md`, `accessibility.md`.

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

### Step 4 — Aggregate & Score

Merge findings. Per-category score:

```
category_score = max(0, 100 - (critical * 25) - (high * 10) - (medium * 3) - (low * 1))
```

Overall weights (sum = 100%):

- Security: 35%
- Architecture: 30%
- Quality: 25%
- Accessibility: 10%

Verdict thresholds:

- 80-100 + no critical/high remaining → `ready`
- 60-79 → `needs-attention`
- < 60 → `needs-work`

### Step 5 — Report to User

Present findings grouped by severity (critical first), then by category, followed by the score summary
and verdict.

### Step 6 — Verify Ambiguous Findings

For findings with `needs_verification: true`:

1. Run the `verification_query` against `opensrc/` (see CLAUDE.md → Source code reference) or the web.
2. If confirmed → proceed with fix. If the usage is correct → discard the finding, adjust score.

There is **no context7** in this project — always verify via `opensrc/` or the web. Common scenarios:
three.js API correctness, deprecated methods, Vite HMR behavior.

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

IMPORTANT: Give the developer the table of findings (Critical, high, medium, low), with columns:
`ID`, `Sév`, `Catégorie`, `Description`, `Statut`. THIS IS MANDATORY.
