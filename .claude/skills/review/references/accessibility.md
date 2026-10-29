# Accessibility — Review Rules

> Authoritative rules live in the subagent prompt `.claude/agents/review/accessibility.md` (A11Y-0xx).
> Scope: HTML UI overlays (buttons, links, inputs, panels, dialogs). The WebGL `<canvas>` is opaque to
> assistive tech — it MUST carry a text fallback / accessible name, and every map interaction
> (navigation, picking) MUST have a keyboard-operable, DOM-accessible equivalent.

Summary of what `review-accessibility` checks (see the agent for full detail):

- **A11Y-001** interactive element without an accessible name; **A11Y-002** image without alt.
- **A11Y-003** missing/wrong semantic role (incl. canvas accessible name + role);
  **A11Y-004** form control without label; **A11Y-005** insufficient color contrast (overlays);
  **A11Y-006** target too small (≥ 24×24px, WCAG 2.5.8 AA; 44×44 is AAA, not required).
- **A11Y-007** color as sole information channel; **A11Y-008** missing keyboard operability / focus styles;
  **A11Y-009** missing/incorrect ARIA state; **A11Y-010** dynamic content without a live region.
- **A11Y-011** animation without `prefers-reduced-motion`; **A11Y-012** positive `tabindex`.

Finding schema: `schema.json`.
