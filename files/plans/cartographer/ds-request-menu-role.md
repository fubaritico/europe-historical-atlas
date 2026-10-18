# Request to fubaritico-ds — a Menu that announces itself as a menu

> From the europe-historical-atlas Cartographer, 2026-10-18 (CARTO-122). To hand to the design system's Claude.
> **Priority: low.** The dev's call for the Cartographer: accessibility there is courtesy, keyboard welcome, no
> screen-reader gate. Nothing is blocked; this is a correctness note on a shared component.

## What the Cartographer does with `Menu`

`@fubaritico/react` **0.6.0**, `Menu` + `Menu.Item`, used as a **context menu of commands**: right-click a row of the
polity list (or ‹shift+F10›) → *Bring to Front / Bring Forward / Send Backward / Send to Back*. Each item runs an
action; nothing is "selected". Each item carries `aria-keyshortcuts` (passed through to `Menu.Item`) and a `<kbd>`.

## What `Menu` renders today (read in `dist/components/Menu/Menu.js`)

- The container is `ListboxList` with `role="listbox"`, `tabIndex={0}`, `aria-activedescendant`.
- Items are `option`s with `aria-selected`.
- Keys: ‹↓›/‹↑› (wrapping), ‹Home›, ‹End›, ‹Enter›/‹Space› select, ‹Escape› calls `onClose`.
- ‹Tab› and a press outside do nothing — the consumer closes the menu itself (we do, on `focusout` and
  `pointerdown` outside).

So a screen reader announces *"list box, Bring Forward, not selected, 2 of 4"* — the semantics of choosing a
value, not of running a command.

## What we ask

A command menu, following the WAI-ARIA Authoring Practices *Menu and Menubar* pattern
(https://www.w3.org/WAI/ARIA/apg/patterns/menubar/):

1. **Roles**: container `role="menu"`, items `role="menuitem"` — no `aria-selected` on them. Either a prop on
   `Menu` (`kind="command"`, with `"listbox"` the default so nothing changes for current users) or a sibling
   component (`ActionMenu`). Your call.
2. **Same keys as today**, plus the two the pattern expects of a menu: ‹Tab› closes it (calls `onClose`, lets the
   focus move on), and optionally a typed letter moves to the next item starting with it.
3. **Keep passing through** item props — we rely on `aria-keyshortcuts` reaching the `menuitem`.
4. **Positioning stays ours.** We place the menu at the pointer and fold it back inside the window ourselves; no
   need to add placement to the component.

## How we will know

- The menu's container has `role="menu"`, each command `role="menuitem"`, none carries `aria-selected`.
- ‹↓›/‹↑›/‹Home›/‹End›/‹Enter›/‹Escape› behave as today; ‹Tab› closes it.
- `aria-keyshortcuts` on `Menu.Item` lands on the `menuitem` element.
- Released as a minor (`0.7.0` or later); we bump our three `@fubaritico/*` lines together, then switch
  `PolityStackMenu` (which today focuses `[role="listbox"]`) and drop our own ‹Tab› handling if yours covers it.
