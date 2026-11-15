# Quality — Review Rules

> Authoritative rules live in the subagent prompt `.claude/agents/review/quality.md` (QUAL-0xx).
> Not reviewed, because the gate refuses them first: `console.log`, explicit `any`, import order and unused
> imports, a missing `import type`, a missing JSDoc on an exported function. Duplication, magic values and GPU
> leaks belong to `review-architecture`.

Summary of what `review-quality` checks (see the agent for full detail):

- **QUAL-003/005** missing JSDoc on exported interface properties / port types and the public methods a factory
  returns (exported functions are the gate's).
- **QUAL-007** god function past the lint budgets; **QUAL-008** dead code; **QUAL-010** stale JSDoc.
- **QUAL-012** empty catch / lost error context; **QUAL-014** non-null assertion abuse.
- **QUAL-020** a new branch or option with no test; **QUAL-021** a touched module with no tests.
- **QUAL-022** a write sent twice, or a late answer landing over a newer one — one call in flight, stale answers
  dropped (the dev, 2026-11-16: no double calls, no duplicates).

Finding schema: `schema.json`.
