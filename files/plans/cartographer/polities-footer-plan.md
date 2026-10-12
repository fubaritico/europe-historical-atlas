# `{Polities}` — the action bar at the foot of the panel

> Opened 2026-10-12, at the dev's request: *"pouvoir ajouter ou supprimer une polity à partir d'une petite
> barre localisée en bas du panneau. Supprimez l'icône plus située dans la barre en haut du panneau.
> Regrouper ces manipulations et toutes manipulations ultérieures dans la barre en bas du panneau."*
> **Status: decided 2026-10-12, in progress.**

## What exists, read in the code (2026-10-12)

| piece | state |
| --- | --- |
| `[+ New polity]` | an `IconButton icon="Plus"` in the panel's head (`PolitiesPanel.tsx`, `PolitiesHead`), opening `PolityDialog`; four tests click it by its name *New polity* |
| deleting a polity | **`removePolity` exists in `core`** (`editor/documentEdits.ts`): pure, tested — it drops the identity, the claim and the borders naming it, frees its vassals (sovereign, never dangling), and **never touches the anchor table**, so a neighbour's shared border does not move. **Nothing calls it**: there is no store action, no history step, no button |
| the target | the polity selected in `{Polities}` — *"on choisit qui, puis on agit"* (08/10). An **id**: deleting the polity makes the target stop resolving, so the cursor turns `not-allowed` with no code to write |
| icons | the design system has `Plus` and `Delete` (and `Minus`, `Archive`) |
| the spec | `s07` *"delete a polity that is used"* still speaks of **"appears in 1 year"** — written before P3 (27/09) made the registry **per year**, so that half is obsolete. **`H-17` is open**: *"what becomes of its territory — unclaimed, or given to a neighbour?"* |

## Decisions — 2026-10-12

| | question | decision | by |
| --- | --- | --- | --- |
| **D1** | What does deleting do? | **The polity and its outline go.** Its own points go with it; **the anchors it shares with a neighbour stay**, or the neighbour's border would move with no one having touched it — `s00`'s first real constraint, not a new rule. Vassals become sovereign. The ground is left unclaimed | dev (the outline); the shared anchors are `s00`'s |
| **D2** | Ask before deleting? | **Yes, a confirmation.** It says what goes: *"Delete Duchy of Normandy? Its 3 rings go; its 2 vassals become sovereign."* `[Cancel]` `[Delete]`. Still one undo step | dev |
| **D3** | Which polity? | **The one selected** in `{Polities}`. The trash is enabled only then | dev |
| **D4** | What goes in the bar? | **Add and delete, for now.** Every later panel action goes there too | dev |
| **D5** | Icons the design system lacks | **A directory of our own, `src/icons/`**, one registry of paths; the tool glyphs move in. Drawn on the design's grid, **18×18, stroke 1.4**, shown at 14 px in 26 px buttons, a 24 px bar — the design's own `icon-btn`. The `+` is the design's, so it matches the trash beside it. **The dev's remark: standards are 16/1 and 24/1.5 — to rescale later**, in `known-issues` | me, accepted "pour l'instant" |

## Steps — each reviewed, tested, committed alone

| step | what | done when |
| --- | --- | --- |
| **1** | **The scenario first** — `s07`'s *Removing* rewritten for a per-year registry and the decisions above; a new section *"The panel's action bar"*; `H-17` closed in `s99` with D1; glossary: *action bar* | the dev has read it |
| **2** | **The store**: `deletePolity(id, step)` on the edition slice, undoable — the twin of `createPolity`, wrapping `removePolity`, returning its report or `false` when the id is unknown (said, never silent). Tests: undo restores the claim **and the sharing** (the trap: a restore that gives back coordinates, not shared indices), vassals freed and restored | `ctrl+z` after delete gives the same document, sharing included — proved by the plausible naive code |
| **3a** | **The icons**: `src/icons/` — the registry, the tool glyphs moved in, `plus` from the design and a `trash` drawn on its grid; a workbench page showing them all | the glyphs render alone, side by side |
| **3** | **The bar, a view**: `PolitiesActions` — a strip at the foot of the panel holding `IconButton`s, values from `design/chrome.css`; `[+]` moves there and leaves the head; a workbench entry; sizes and hairline tuned on `/workbench.html`, proved in a real browser | the bar renders alone in the workbench |
| **4** | **Wired**: `[+]` opens the dialogue as before; `[Delete]` deletes the target, disabled with no target, reports in the result zone, logs; the target stops resolving on its own | in the app: select, delete, ‹ctrl+z› |
| **5** | **The confirmation** (D2): a dialogue naming what goes, `[Cancel]` focused by default | in the app: delete asks, cancel keeps |

## What this plan does not do

- **Reassigning a deleted polity's ground to a neighbour** — D1 leaves it unclaimed; reassigning is a
  gesture of its own, later.
- **Deleting several polities at once** — the target is one polity.
- **Moving the Arrange commands into the bar** — D4.
