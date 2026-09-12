# Security — Review Rules

> Authoritative rules live in the subagent prompt `.claude/agents/review/security.md` (SEC-0xx).
> This project is front-end only (TypeScript + three.js + Vite, WebGL canvas + HTML overlays).

Summary of what `review-security` checks (see the agent for full detail):

- **SEC-001** hardcoded secrets/credentials (all files except `.env*`).
- **SEC-002** unsanitized HTML injection (XSS) in DOM overlays / event panels — no `innerHTML =` from
  untrusted data.
- **SEC-003** dynamic code execution (`eval`, `new Function`, string `setTimeout`/`setInterval`).
- **SEC-004** missing validation at trust boundaries (URL params, JSON, loaded assets) — no blind `as`.
- **SEC-005** leaked internal error details; **SEC-006** logging sensitive data;
  **SEC-007** insecure URL scheme; **SEC-008** weak randomness / outdated crypto.

Finding schema: `schema.json`. Verify uncertain API behavior via `opensrc/` or the web (no context7).
