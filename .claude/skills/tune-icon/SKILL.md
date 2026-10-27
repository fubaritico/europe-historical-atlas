---
name: tune-icon
description: Tune the look of an event icon on the atlas — its 3D model seen close up or its flat drawing seen from afar — the way the battle swords were tuned on 2026-10-26 — name the form, put candidates on the benches of the dev's own atlas server beside the current one, let him choose on sight, move the choice into the map, check it on the map. Use when an icon is unreadable, too big, too detailed, badly placed, or a new kind of icon is drawn (tower, crown, a city, a siege engin…).
when_to_use: « l'icône », « le sprite », « l'image plate », « la tour », « les épées », « illisible », « réduis la taille », « plus de facettes », « simplifie », « renforce les traits », /icons.html, /svg-icons.html, ATLAS-156, ATLAS-286 to 288.
metadata:
  author: europe-map
  version: "1.0"
---

# Tune an icon

The method the battle swords were tuned with (2026-10-26, ATLAS-156), written down after it was lost once: on
2026-10-27 the tower's flat drawing was tried on a board made outside the repository instead of on the dev's bench.
**The dev judges an icon on sight, on his own server — never on a picture of mine.** I can look first, to bring
only candidates worth his time, but the choice is made on the bench.

## 1. Name the form before touching it

Every icon has **two forms**, and a remark is about one of them ([[name-the-form-before-changing-it]]):

| form | what it is | its code | its bench |
| --- | --- | --- | --- |
| **the 3D icon** | the model, seen close up | `scene/events/icons/meshes/<kind>.ts` | `/icons.html` |
| **the flat drawing** (« le sprite », « l'image plate ») | an SVG ringed with light, seen from afar | `scene/events/icons/flat/<kind>.ts` | `/svg-icons.html` |

Say which one in the first sentence. If the remark is ambiguous, ask — it is the one question worth asking.

How each kind stands, sways and scales is set per kind in `scene/events/icons/settings.ts` (`ICON_LIFT`,
`ICON_SIZE`, `ICON_FACES_CAMERA`, `ICON_SWAY`, `ICON_CROSS_FADE`, `ICON_FLAT_SPAN`, `ICON_HALO_SPAN`…), the lights in
`light/lighting.ts`, the colours in `palette.ts`. **Every kind has its own rules**: the swords float and turn to the
camera; the tower stands on the ground, still (the dev, 2026-10-27).

## 2. Find his server — never start one

His atlas server is his ([[one-dev-server]]): `lsof -iTCP -sTCP:LISTEN -P | grep node` (usually `localhost:5173`).
Give him the address of the bench page on **his** server. If none runs, ask him to start it (`pnpm dev`).

## 3. Put the candidates on the bench, beside the current one

- **Flat drawing** — `packages/atlas/src/bench/svgIconBench.ts`: add each candidate to `CANDIDATES` with a letter
  and a few words (« A — silhouette sombre, porte claire »), **the current drawing kept as the first row**. The bench
  shows every candidate at the sizes it has on the map (16 to 96 px) on the parchment, the relief and the strong
  colours of 1100. A candidate is an SVG built exactly as `flat/eventIconSvg` builds it (same rim, same pass order), so
  what he picks is what the map will show.
- **3D model** — `packages/atlas/src/bench/iconBench.ts` shows the models large from the front and small turning,
  under the map's lights. A candidate model goes beside the current one there.

Three or four candidates that differ on **one idea each**, not ten variations. I may look at them first (headless
Chrome on a copy of the page) to drop what is plainly worse — then **he** looks on his server.

## 4. He chooses — on sight, by its letter

Wait for his choice (« C2 »). He may combine (« A, but with B's door »): make that one, back on the bench. Never pick
for him, never move a candidate into the map before he names it.

## 5. Move the choice into the map

- The chosen drawing or model replaces the kind's file in `flat/` or `meshes/`; the bench candidates are removed, the
  bench back to the map's own drawings.
- His words go in the JSDoc of what changed, dated (« chosen on the legibility bench, « C2 », the dev, 2026-10-26 »).
- Tests: what the choice guarantees, verified against the plausible naive code (`rules/tests.md`).

## 6. Check it on the map

Tell him **where** to look: the event, its place, the zoom (close for the 3D icon, far for the flat drawing). The
bench says the icon is legible; only the map says it reads among the borders and the relief. Commit after his « c'est
bon », never before.

## What the swords taught (2026-10-26) — the starting point for any new icon

- **Flat drawing**: flat, contrasting colours, **no thin outline** (it muddies at 20 px); the `viewBox` **cropped to
  the drawing**, so no pixel goes to empty margin; a parchment-white rim (width 4 in a 64 field) to detach it from
  any country's colour; few shapes — « trop de détails » made the first ones unreadable; two parts never touch so they
  do not merge into another shape (the guards set below the crossing).
- **3D model**: one unit high on its base (`meshes/iconModel` normalises it); `flatShading` gives each face one tone,
  so facets are what make it read; a light rim behind it that follows the camera; a halo to detach it from the map.
- **One icon at a time**, each with its own specifics (« une icône à la fois, chacune ses spécificités »).
