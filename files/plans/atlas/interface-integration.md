# The atlas's interface in React — integrating Claude Design's lot B — ATLAS-329, ATLAS-392

> Asked by the dev, 2026-11-24: _« regarder toutes les maquettes, surtout le lot 2B qu'a produit Claude Design, et
> commencer à faire un plan et des tickets d'intégration de l'interface utilisateur. Et comment on gérerait la
> superposition entre l'interface React et le partage de l'état de l'application entre du React et du non-React. »_
> **A draft: every line marked _proposed_ is mine until the dev says otherwise** (`by` column, § 7).
>
> **The dev's answer, same evening** — the cut is taken: _« l'important, c'est de poser la couche React par-dessus la
> carte, de partager donc ce store »_, then the buttons, then what is worth it, **with the frieze's place kept: it is in
> the MVP**. And three corrections: **only the canvas is not React** — the canvas and its keyboard and mouse gestures;
> the loading screen is React too (my reason to keep it out was wrong: `index.html` holds the canvas alone, the splash
> is built by JavaScript today). **The plates are indicative** — the boxes and the modals were proposals, and **the dev
> retouches the graphic pieces for me to integrate**: nothing is lifted from a plate as it stands.

**Read from**: the lot B plates (`files/resources/claude-design/atlas-html/planches-lot-b/`, its `README.md`, the PNGs in
`atlas-png/… Interface-png LOT2/`), inventoried 2026-11-24; the scenarios `scenarii/s01`, `s11`–`s17`, the holes
`s99-holes.md`; `rules/architecture.md` (« The atlas and the design system »); `packages/atlas/src/main.ts`,
`app/mapUi.ts`, `ui/yearSwitch.ts`, `tunables/devState.ts`. The plates are **ignored by git** (`files/resources/`):
this plan names them, never copies them.

## 1. What is already decided — the ground

- **The interface is React**, a root mounted **beside** the canvas, never around it (the dev, 2026-11-08). The canvas
  is never a React component (2026-11-01).
- **It is built with `fubaritico-ds`**, white-label: the atlas overrides its tokens (2026-11-01).
- **Per-frame state never goes through a component** — camera, zoom, hover, a drag (`troubleshooting.md`).
- **The map and the interface share state through one store that lives outside React** — Zustand's vanilla store is
  the one named (`architecture.md`); Zustand itself is **still undecided** (ATLAS-392).
- **The error screens**: a failure before the first map replaces the splash by an error screen, never a half-made map
  (ATLAS-394); after, a modal over a veil with « Réessayer » (ATLAS-395) — `rules/error-handling.md`.
- **The tone**: lot B (2026-11-08) — the ink `#24130A`, the dark header band `.dk` of 72 px, white bodies, parchment
  feet. The ornament plates (40–52) are **inspiration**, the dev redraws some motifs himself (2026-11-19).

## 2. The screens, and the ticket each one lands in

| plates (lot B) | what | scenario | ticket |
| --- | --- | --- | --- |
| 2, 21, 27, 29 | the atlas at rest: the top row (site bar + century), the button bar | s11–s15 | **new** — the shell |
| 19, 22 | the site bar, three states (expanded ≥ 1200, short, folded to the Λ) and its menu | — | **new** — the shell |
| 6, 23 | the century: a capsule with two arrows, the list of twenty centuries | s15 | **new** — replaces `ui/yearSwitch` (ATLAS-333's temporary row); ATLAS-150 is closed |
| 3 | the language list | s11 | ATLAS-266 (Idées) |
| 4, 5 | help: the gestures table, the first visit's tour | s12 | ATLAS-135 (À faire) |
| 8, 9, 10 | the pad, three variants of its corners — **A-19 open** | s13 | ATLAS-149 (Backlog) |
| 11, 12, 13, 51, 52 | the snapshot: its toast, the PNG, the print sheet — **A-20 open** | s14 | **new** |
| 14, 24, 28, 30 | the detail panel (right, 440 px; a drawer from the bottom on a phone and an iPad upright) | — | ATLAS-155 (À faire), with ATLAS-147 and ATLAS-244 for a country |
| 15, 25 | the synchronoptic frieze | — | ATLAS-358 — **in the MVP** (the dev, 24/11), its place kept from the shell on |
| 1a, 20, 31, 32 | the loading screen | s01 | **new**, in React, with ATLAS-394 |
| 20–32 | the touch layouts: the centred bar, the drawers, no pad | — | ATLAS-137 (Backlog) |
| 16–18, 26, 36–39 | the site's pages: Atlas, Sources (stack of dates, a year, a work), About | — | **not the atlas's canvas**: a site — its own epic, after this one |
| 40–52, 48a–d | the ornament kit; the dark theme (a trial) | — | ATLAS-461 (En cours) |

No plate exists for s16 (the share link) nor s17 (the map as a list, ATLAS-140).

## 2b. The layout — the dev, 2026-11-24, late evening (the direction; to be handed to Claude Design)

> _« Tout doit être centré horizontalement. Parce qu'en fait, quand tu feras apparaître la frise synchronoptique, ça
> poussera. Et je pense même que les dates doivent être centrées horizontalement en bas. Et que la barre de boutons, elle
> pourrait être autant à gauche qu'à droite … parce que c'est petit. … Il faut rien de repliable … il faut qu'on arrive
> à gérer l'encombrement. Et ce que je te dis là, ça rendra vraiment un espèce de redimensionnement vertical naturel. »_

- **One column, centred, at the bottom**: the date's selector at the bottom centre — no longer in the top row as on the
  plates. **The frieze appears at the bottom and pushes the date up**: what opens stacks vertically, centred, rather than
  spreading to the sides.
- **The button bar is small**: at the bottom, left or right — either holds.
- **Nothing folds**: an element is there or is not; the clutter is managed by the stacking, which is what gives the
  layout its natural vertical resizing.
- _Proposed, mine_: **the map shrinks rather than being covered** — the canvas takes the height left above the bottom
  column, so nothing of the map hides under the frieze (the canvas already resizes with the window); **the column is
  centred on the map's visible width**, so the detail panel opening on the right (440 px) re-centres it instead of eating
  its right edge.
- The phone's plates already centre their buttons at the bottom (`.pbar`): the desktop and the phone follow one logic.

**Refined the same evening** — _« la barre de navigation que tu as dans le site et dans l'atlas en haut, centrée … En
opposition, la navigation par siècle, en bas, poussable verticalement par la frise synchronoptique, et les contrôles
qu'on avait en bas à gauche, plutôt placés dans une barre de boutons verticale à droite. Donc ce sera transmis à Claude
Design, mais je pense qu'on va vraiment vers ça … il faudra qu'il me fasse une version iPad et mobile aussi, même si ces
versions iPad et mobile fonctionnent très bien comme ça. »_

| where | what |
| --- | --- |
| **top, centred** | the site's navigation bar — the same on the site's pages and over the atlas |
| **bottom, centred** | the century's navigation, pushed up by the frieze when it appears |
| **right, vertical** | the controls (the pad, the snapshot, the language, help, the frieze) in a vertical button bar |

**To Claude Design** (the dev hands it over): the desktop in this layout, then an iPad and a phone version — the
current iPad and phone plates work well and stay the reference until then. One point to draw there, said for the
brief, not decided: the detail panel also opens on the right (440 px) — where the vertical bar sits while it is open.

## 3. React and the map — how they share the state (ATLAS-392)

### The shape — _proposed_

**Two channels, never one**, both created at the composition root (`main.ts`) and handed to both sides:

1. **The atlas's store — the state.** One vanilla store (`createStore` from `zustand/vanilla`, with
   `subscribeWithSelector`, as the Cartographer's store is built). It holds **settled facts**, each written by **one**
   owner (the glossary's _propriétaire d'un état_). The map writes what it knows, the interface what the reader chose.
   React reads it through `useStore(store, selector)`, one selector per value; the map's side through
   `store.subscribe(selector, listener)`.
2. **The map's commands — a port.** What the interface asks the map to **do** — pan, zoom a step, go home, fly to a
   place, focus, take the snapshot — is a function call on an injected interface (`MapCommands`), not a value written in
   the store. **Why**: a command is an event, not a state. Written in the store, « fly to Paris » has to be cleared after
   it runs, is lost when written twice in a row, and replays for whoever subscribes late. The port is mocked in every
   test of a button; the store is created with literals.

Neither side imports the other: the React root receives `{ store, commands }`; the map's modules receive the store's
slice they need, declared structurally in their own layer (`modular-architecture.md`, the counter-move).

### What goes where — the contract

| fact or gesture | written by | read by | channel |
| --- | --- | --- | --- |
| the years that have a map | the map, at startup | the century | store |
| the year asked, the year shown | the interface (the reader's choice), the map (once drawn) | the map, the century, the snapshot | store |
| the loading: its stage and its share (0–1) | the map's pipeline | the loading screen, the century while a year loads | store — **a few writes a second at most, never per frame** |
| an error to say, and whether it can be retried | the map | the error screen, the modal | store; « Réessayer » is a command |
| what is selected: an event, a city, a country (an id) | the map (a click on it), the interface (the frieze, the search, the list) | the detail panel, the map (its highlight) | store |
| the focus: on or off | the map | the pad (« Revenir »), help's wording, the live announcement (A11Y-301) | store |
| the detail level shown (the palier, 0–3) | the map, **when it changes** — never the zoom itself | whatever shows the zoom | store |
| the interface's language | the interface | the interface, the map (the seas' names) | store, kept in `localStorage` (A-16) |
| which overlay is open — one at a time | the interface | the interface | store (or React alone — § 7, D4) |
| the camera's pose, the zoom, the hover | the map | **nobody outside the map** | neither |
| pan, zoom a step, home, fly to a place, focus, leave the focus, retry, snapshot | the interface | the map | **commands** |

**The year today lives in `dev.political.year`** (the dev panel's live tunables), written by the temporary year
switch. Moving it into the store is the first ticket's work: the dev panel then writes the store too, so a slider and
a button never disagree.

### Where it lives — _proposed_

- **The store and the commands' contract**: `packages/atlas/src/app/` (wiring and the app's state), its pure
  reducers testable with literals.
- **React**: `packages/atlas/src/ui/`, laid out as the Cartographer's (`ui/components/<Name>/`, its `hooks/`,
  `internal/`, `utils/`, `i18n/`; shared pieces in `ui/hooks`, `ui/utils`) — `architecture.md`, « Components ». The
  existing ESLint row `ui` already keeps it out of `scene/`, `camera/`, `controls/`; one more line forbids `three` in
  `ui/`.
- **The plain-DOM pieces of today** (`ui/notice`, `ui/errorNet`, `ui/progressOverlay`, `ui/yearSwitch`) are replaced
  one by one by their React screen, each in the ticket that builds it — never two versions on screen.

### Everything but the canvas is React — decided by the dev, 2026-11-24

The canvas and its keyboard and mouse gestures stay the map's; **every other element on screen is React, the loading
screen included**. `index.html` holds the canvas alone and the splash is built by JavaScript today (`app/mapUi.ts`),
so nothing showed before the JavaScript anyway: React is mounted **first**, beside the canvas, the loading screen its
first screen, then the map starts under it. What remains to measure is React's own weight before the first paint
(~45 kB gzipped per `architecture.md`, not measured here) — in ticket 2, before and after. The error screen
(ATLAS-394) and the modal (ATLAS-395) are React screens fed by the store.

## 4. The design system and lot B

- **Tokens**: the atlas's theme overrides `@fubaritico/tokens` — the ink, the button's gradient, the cream, the
  surfaces, the three fonts (Cinzel, IM Fell English, EB Garamond — all three under the OFL, from memory, to check in
  ticket 2; served from the site rather than a font CDN — _proposed_).
- **Behaviour from the design system, the dress from the atlas** — _proposed_: a dialog, a listbox, tabs, a toggle
  button come from `@fubaritico/react` (focus, keyboard, roles); the ornamented pieces — the round button and its key,
  the capsule, the framed window and its corners, the dark band, the drawer — are the atlas's components over them.
  **Whether some of them belong in the design system is the dev's call** (§ 7, D2).
- **The plates are indicative, the pieces are the dev's** (24/11): he retouches the graphic elements — the frames,
  the cartouches, the boxes and modals the plates proposed — and I integrate what he hands over. Until a piece
  arrives, a component is built with its structure, its behaviour and its tokens, and a plain dress.
- **The plates' CSS is not ported**: written by script, one rule per combination, in fixed pixels (README). Each piece
  is rewritten with variables, the corners as one `<symbol>` + `<use>`; class names are namespaced, the plates reusing
  `.band`, `.row`, `.btn`, `.cap` for different things.
- **A workbench page** shows each piece alone, as the Cartographer's does (memory `workbench-over-storybook`).

## 5. What the plates leave open, or contradict

Mine to fix while building (nothing to ask): the frieze's two defects of 05/11 are still on plate 15; the old frame
generation (`.frame`, `.plate`) and the new one (`.fr`) coexist — the new one is built, the old ones read through it.

For the dev, each in its ticket, never all at once:

| point | plates | in the ticket |
| --- | --- | --- |
| ~~The button bar: bottom left on every plate, bottom right in A-15 and s13~~ — **a vertical bar on the right** (the dev, 24/11, § 2b) | 2, 8, 16 | the shell |
| The frieze's button `T`: on the touch bars, absent from the desktop's at rest | 2, 15, 21 | the frieze |
| A drawer covers the touch bar (detail), the frieze pushes it up — which? | 24, 25, 30 | the touch layouts |
| The close button: « Fermer » + its key on the detail and help, a round cream button in the band per the README | 4, 14, 15 | the kit |
| Laurels on the snapshot's toast (`b-laurier`), while « no laurels without antiquity » (19/11) | 11 | the snapshot |
| A-19 (the pad's corners), A-20 (the snapshot's size) | 8–10, 12–13 | the pad, the snapshot |

## 6. The tickets, in order — the cut taken by the dev, 2026-11-24

Each builds a screen whole, at every breakpoint it has, with its scenario's assertions (`/scenarii-to-code`):

1. **ATLAS-392 — the store and the commands**: the contract above, the year moved out of `dev.political`, the
   temporary year switch reading the store. No screen yet — the ground of all the rest.
2. **React over the map, and the theme**: the root mounted beside the canvas at startup, the design system installed in
   the atlas, the lot B tokens and fonts, React's weight before the first paint measured before and after.
3. **The kit**: round button and its key, capsule, framed window, dark band, drawer — structure and behaviour, dressed
   with the dev's retouched pieces as they arrive, on the workbench page.
4. **The shell**: the site bar, centred at the top, in its three states; the bottom column (§ 2b); the vertical button bar on the right — **the frieze's place kept**
   (the bar moves up when the frieze opens, plate 15). Buttons wired to their commands as each screen lands.
5. **The century** (s15): at the bottom centre (§ 2b); replaces the temporary year switch.
6. ATLAS-358 — **the frieze, in the MVP** · ATLAS-266 — the language (s11) · ATLAS-135 — help and the tour (s12) ·
   ATLAS-149 — the pad (s13, after A-19).
7. ATLAS-155 — the detail panel — needs a click on an event to select it (picking: ATLAS-147, ATLAS-146).
8. **The loading screen** of lot B, in React, with ATLAS-394 and ATLAS-395.
9. **The snapshot** (s14, after A-20) · ATLAS-137 — the touch layouts.
10. The site's pages: their own epic, after the MVP.

## 7. Decisions

| # | question | proposed | by |
| --- | --- | --- | --- |
| D1 | Zustand's vanilla store for the shared state, beside a port of commands | yes — the Cartographer's store, already known; one owner per fact | **the dev, 24/11** (« partager ce store ») |
| D2 | the ornamented pieces in the atlas, or in `fubaritico-ds` | in the atlas first; one moves into the design system when a second application needs it | me — **to decide** |
| D3 | what is React | **everything but the canvas and its gestures**, the loading screen included — my proposal to keep it out was wrong | **the dev, 24/11** |
| D3b | the frieze | in the MVP, its place kept from the shell on | **the dev, 24/11** |
| D4 | « one overlay open at a time » in the store or in React alone | the store: Escape closes an overlay **or** leaves the focus, and the map must know which | me — **to decide** |
| D5 | the layout | the site's bar at the top, centred; the century at the bottom, centred, pushed up by the frieze; the controls in a vertical bar on the right; nothing folds (§ 2b) | **the dev, 24/11** — to Claude Design |
| D6 | the map shrinks under the bottom column; the column centred on the map's visible width | yes (§ 2b) | me — **proposed** |
