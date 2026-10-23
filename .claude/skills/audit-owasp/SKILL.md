---
name: audit-owasp
description: Full-codebase OWASP Top 10 (2025) security audit using 10 parallel subagents (one per category). Produces structured JSON findings with severity scoring. Use when auditing security, checking OWASP compliance, running a security scan, or hardening the app.
allowed-tools: Agent Read Glob Grep Bash(ls:*)
metadata:
  author: europe-map
  version: "2.0"
---

# Audit OWASP — Full-Codebase Security Audit

Orchestrates 10 parallel domain-expert subagents — one per OWASP Top 10 (2025) category — to audit
the entire codebase (two static bundles, the Cartographer's dev-server endpoints, core, the lint plugin).

**The OWASP Top 10 is revised by edition** (2017, 2021, 2025 — not every year): once a year, check owasp.org for a
new edition, and when one is out, update the table below and the ten `references/` files to it (the dev, 2026-10-23).

**When it runs**: before an application goes online (the Cartographer's demo, CARTO-200; the contribution tool) and
once a year. Between runs, `/review`'s security reviewer reads the `references/` of the categories each diff touches.

## OWASP Top 10:2025 Categories

| # | Category | Key Change from 2021 |
|---|----------|---------------------|
| A01 | Broken Access Control | Now includes SSRF (was A10:2021) |
| A02 | Security Misconfiguration | Was A05:2021 |
| A03 | Software Supply Chain Failures | Expands A06:2021 (Vulnerable Components) |
| A04 | Cryptographic Failures | Was A02:2021 |
| A05 | Injection | Was A03:2021 |
| A06 | Insecure Design | Was A04:2021 |
| A07 | Authentication Failures | Renamed from "Identification and Authentication Failures" |
| A08 | Software & Data Integrity Failures | Same position |
| A09 | Security Logging & Alerting Failures | Renamed from "Logging and Monitoring" |
| A10 | Mishandling Exceptional Conditions | NEW — replaces SSRF (merged into A01) |

## Prerequisites

- `pnpm type-check && pnpm lint && pnpm test` should pass (not strictly required but recommended)
- This audit reads ALL source files — it is a deep scan, not a diff-based review

## Execution Flow

### Step 1 — Scope Detection

Scan the full codebase. Include:
- `packages/atlas/src/**/*.ts` (vanilla three.js app — DOM overlays, URL params, fetched assets)
- `packages/cartographer/src/**/*.{ts,tsx}` (React chrome under `ui/`; `devServer/` runs in the Vite server,
  reads request paths and bodies and writes to disk — the one server-side trust boundary)
- `packages/core/src/**/*.ts` (readers of the year files, pipeline, worker)
- `packages/eslint-plugin-eha/src/**`
- Config files: `*.config.*`, `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.github/workflows/*`, `.husky/*`

Exclude: `node_modules/`, `build/`, `dist/`, `*.test.*`, `*.stories.*`, lock files, `*.d.ts`

### Step 2 — Load Context

Read all files in scope. Group them by layer:
- **UI layer**: `packages/atlas/src/`, `packages/cartographer/src/ui/`
- **Logic layer**: `packages/core/src/`, the rest of `packages/cartographer/src/`
- **Dev-server layer**: `packages/cartographer/src/devServer/`
- **Supply-chain & CI layer**: root configs, `pnpm-workspace.yaml`, `.github/workflows/`, `.husky/`

### Step 3 — Dispatch 10 Parallel Subagents

Launch all 10 agents simultaneously using the Agent tool. Each agent receives:
- The full file list for its relevant layers (some categories scan all layers)
- Its OWASP category reference guide from `references/`
- The JSON output schema
- Instruction to return ONLY a JSON array of findings (no prose)

Each agent prompt:
```
You are a security auditor specialized in OWASP Top 10:2025 category [CATEGORY].
Audit the following codebase files against the checklist in the reference guide.
Return ONLY a valid JSON array of findings. No prose, no markdown fences around the JSON.
If no violations found, return an empty array: []
Each finding must follow this schema:

{
  "id": "OWASP-A0X-NNN",
  "category": "A0X-category-name",
  "severity": "critical|high|medium|low",
  "file": "relative/path/to/file.ts",
  "line": 42,
  "title": "Short description",
  "description": "Detailed explanation of the vulnerability",
  "recommendation": "How to fix it",
  "cwe": "CWE-XXX",
  "needs_verification": false,
  "verification_query": ""
}

Use severity levels:
- critical: actively exploitable, data breach risk
- high: exploitable with some effort, should fix before deploy
- medium: defense-in-depth gap, fix in next sprint
- low: best practice deviation, informational

If a finding depends on runtime behavior or library version you're not 100% certain about,
set "needs_verification": true and provide a "verification_query" to check against `opensrc/` or the web.
```

Agents and their scope:

| # | Agent | Prefix | Layers to audit |
|---|-------|--------|-----------------|
| 1 | Broken Access Control (incl. SSRF) | OWASP-A01 | Dev-server (path traversal), Logic (fetches) |
| 2 | Security Misconfiguration | OWASP-A02 | Supply-chain & CI, Dev-server |
| 3 | Software Supply Chain Failures | OWASP-A03 | All package.json files, lockfile, CI/CD configs |
| 4 | Cryptographic Failures | OWASP-A04 | All layers |
| 5 | Injection | OWASP-A05 | UI, Dev-server |
| 6 | Insecure Design | OWASP-A06 | All layers |
| 7 | Authentication Failures | OWASP-A07 | Dev-server (no auth today — check it is dev-only) |
| 8 | Software & Data Integrity Failures | OWASP-A08 | All layers |
| 9 | Security Logging & Alerting Failures | OWASP-A09 | Dev-server, Logic |
| 10 | Mishandling Exceptional Conditions | OWASP-A10 | Dev-server, UI (error boundaries, the atlas error net) |

### Step 4 — Aggregate & Score

Merge all findings into a single report. Calculate scores:

```
category_score = max(0, 100 - (critical * 25) - (high * 15) - (medium * 5) - (low * 1))
```

Weights for overall score:
- A01 Broken Access Control: 15%
- A02 Security Misconfiguration: 10%
- A03 Software Supply Chain Failures: 8%
- A04 Cryptographic Failures: 12%
- A05 Injection: 15%
- A06 Insecure Design: 8%
- A07 Authentication Failures: 12%
- A08 Software & Data Integrity Failures: 8%
- A09 Security Logging & Alerting Failures: 5%
- A10 Mishandling Exceptional Conditions: 7%

Verdict thresholds:
- 80-100 + no critical → `pass`
- 60-79 → `needs-hardening`
- < 60 or any critical remaining → `fail`

### Step 5 — Report to User

Present findings grouped by severity (critical first), then by OWASP category.
Format as a readable table with columns: ID | Severity | File:Line | Title | CWE

Follow with:
- Score breakdown per category
- Overall score + verdict
- Top 3 priority fixes

### Step 6 — Verify Ambiguous Findings (opensrc / web)

Before recommending fixes, check findings where `needs_verification: true`:
1. Run the `verification_query` against `opensrc/` (authoritative — context7 can lag a version) or the web
2. If confirmed → keep finding
3. If disproved → discard, adjust score
4. Report verification results to user

### Step 7 — Remediation Guidance

For each critical/high finding, provide:
- Exact file + line to modify
- Code snippet showing the fix
- Reference to the relevant CWE

Do NOT auto-fix. Present recommendations and let the user decide.

## Output Schema

```json
{
  "audit_date": "ISO-8601",
  "owasp_version": "2025",
  "scope": { "files_scanned": 0, "layers": [] },
  "findings": [ /* array of finding objects */ ],
  "scores": {
    "A01": 0, "A02": 0, "A03": 0, "A04": 0, "A05": 0,
    "A06": 0, "A07": 0, "A08": 0, "A09": 0, "A10": 0
  },
  "overall_score": 0,
  "verdict": "pass|needs-hardening|fail",
  "summary": {
    "critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0
  }
}
```

## Known Accepted Risks (do NOT flag)

Only risks the dev has accepted, each with its reason, belong here:
- `http://localhost` in dev configs — dev-only, not production
