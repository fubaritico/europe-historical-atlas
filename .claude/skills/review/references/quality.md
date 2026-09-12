# Quality — Review Rules

> Authoritative rules live in the subagent prompt `.claude/agents/review/quality.md` (QUAL-0xx).
> JSDoc (QUAL-003/004/005) is mandatory on every exported function, typed constant, and interface
> property. Exempt: build output (`dist/**`, `build/**`) and test files (`*.test.*`, `*.spec.*`).

Summary of what `review-quality` checks (see the agent for full detail):

- **QUAL-001** `console.log` (use `console.warn`/`console.error`); **QUAL-002** explicit `any`;
  **QUAL-002b** mixed type/value imports (use `import type`).
- **QUAL-003/004/005** missing JSDoc on interface properties / functions / exported ports & public members.
- **QUAL-006** unsorted or unused imports (external → internal aliases → relative → `import type`).
- **QUAL-007** oversized function / god module; **QUAL-008** dead code; **QUAL-009** duplication;
  **QUAL-010** stale JSDoc; **QUAL-011** GPU resource leak (missing `dispose()`).
- **QUAL-012** empty catch / lost error context; **QUAL-013** magic numbers/strings;
  **QUAL-014** non-null assertion abuse (esp. under `noUncheckedIndexedAccess`).

Finding schema: `schema.json`.
