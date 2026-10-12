# Save and open a year — local mode (2026-10-12, evening, dev remote)

> Asked by the dev, 2026-10-12: *"enregistrer et lire à l'ouverture va devenir très important"* — and,
> the same evening, *"je veux que tu sois capable de coder l'enregistrement en mode offline d'un fichier
> que tu pourrais ouvrir en mode offline"*, then drive the application in the browser to prove it.
> Scenarios: `s04` (save, reopen identical), `s15` (offline: three files under
> `packages/atlas/public/years/<year>/` plus `years/index.json`). Hole `H-28`.

## Decisions taken tonight

| | decision | by |
| --- | --- | --- |
| D1 | **The Cartographer's dev server writes the year** (`PUT /__years/<year>`), straight into `packages/atlas/public/years/<year>/`, and lists the year in `years/index.json`. Not the File System Access API: its native folder dialog cannot be driven remotely, so nothing could be proved tonight | dev (authorised the write endpoint explicitly) |
| D2 | **Reading needs nothing new**: the Cartographer's `publicDir` *is* the atlas's, so `/years/<year>/*.json` is already served; `core` already reads and cross-checks the three files | measured |
| D3 | The endpoint accepts only a same-machine request: `Host` is `localhost`/`127.0.0.1`/`[::1]`, `Origin` equals `http://<Host>`, the year is an integer, the body is under a size cap, and **the three files pass `core`'s schemas and cross-checks before anything is written** | me, under the dev's go |
| D4 | **The year opens at start-up** if the manifest lists it; otherwise the editor starts empty, as today | me — reading of *"lire à l'ouverture"* |
| D5 | **A year that is listed and fails to read blocks saving**, with an on-screen message and `console.error`. Starting empty and letting ‹ctrl+s› write would overwrite good-but-unreadable files with an empty year | me — error-handling decision, to confirm |
| D6 | **If the author edits before the start-up read lands, the read is not applied** and saving is blocked (newest call wins) | me, to confirm |
| D7 | Opening resets the undo line (`open` already does — the history belonged to the file closed) | `s04` |
| D8 | Writes go through temporary files then a rename, the manifest last, so a crash mid-save leaves the previous year whole | me |
| D10 | **Saved years are never committed** — working copies, to keep drawings, debug the tools, master the format. Year folders are git-ignored; `years/index.json` is marked skip-worktree on the dev's machine (`known-issues.md`) | dev |
| D9 | JSON is written readable: indented objects, arrays of numbers on one line — a year is corrected by hand over months and must diff readably | me |

## What this rung does NOT do (declared)

- **No modified marker and no "save, discard, cancel"** (`s04` *close with unsaved work*).
- **No `[Save as…]`** and no year picker: the editor saves and opens **its own year** (1100).
- **No download fallback** for a browser without the dev server — the built site cannot save (`s15`'s
  online tier is the Netlify Function, later, behind the same port).
- **No status-bar count of polities and vertices on the title bar** — the count is in the result zone.

## Rungs

1. `devServer/` — pure: plan a write from a request (validate, format, manifest). Thin middleware over an
   injected file system. Wired in `vite.config.ts` with `node:fs`.
2. `persistence/` — the client: a `YearArchive` port with its dev-server implementation; a `YearSession`
   that opens on start-up and saves; the ‹ctrl+s› shortcut.
3. Wiring in `main.tsx` and `Editor`.
4. In the browser, by me: draw, save, reload, find it again; compare with the files on disk.
