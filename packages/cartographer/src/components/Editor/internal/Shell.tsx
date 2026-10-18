import { Placeholder } from './Placeholder'

import type { ReactNode } from 'react'

/**
 * The editor's five zones, and no knowledge of what goes in them.
 *
 * **The shell of the shell/view/binding split** (`react-canvas-and-panels`), which is exactly the layer
 * the design system replaces: it owns the grid and the landmarks, never a value and never the store. A
 * test renders it with five strings.
 *
 * **The grid is the handoff's**, lifted into `styles/shell.css` rather than decided here — four rows (30px bar,
 * 26px document bar, the body, 24px status) and three columns inside the body (the tool rail, the
 * canvas, a 280px dock).
 *
 * **The class names are the whole contract with `shell.css`**, and nothing in the gate checks that the
 * two agree — a guard was written for it on 2026-10-08 and then removed, for a reason worth keeping: a
 * drifted class name collapses the grid **visibly**, on the first `pnpm dev:cartographer`. It is not the
 * silent-drift family the two geographic boxes belong to, and the test needed either `@types/node`
 * (absent) or `test.css: true` (Vitest stubs CSS imports to an empty string by default) to read the
 * stylesheet at all. Not worth a dependency for a defect the eye catches first.
 *
 * **An unfilled zone is drawn, named and empty**, which is the point of building this now: the dev's
 * call, 2026-10-08 — *"prévoir des emplacements vides pour les zones vides pas encore faites, comme ça
 * déjà ça mettra un peu d'ordre."* A zone that renders nothing at all is indistinguishable from a zone
 * whose CSS failed.
 */

/**
 * What goes in each zone. Only the canvas is required — everything else is still to be built, and the
 * shell says so on screen rather than collapsing.
 */
export interface ShellProps {
  /**
   * The page's `<h1>`, placed inside the canvas landmark.
   *
   * **It belongs to the shell because the shell owns the landmarks.** A heading loose in the body is
   * reached by no landmark, which is what a screen reader navigates by — and the map *is* this page's
   * main content, so `<main>` is where its name belongs. Guarded by `main.test.tsx`, which asserts
   * `main > h1` and caught this the moment the grid moved the heading out.
   */
  heading?: ReactNode
  /** Top bar: the file, its modified mark, the global actions. Step 5. */
  appbar?: ReactNode
  /** Document bar: the open year's tab. Step 5. */
  docbar?: ReactNode
  /** The tool rail — ⟨navigate⟩, ⟨draw⟩, ⟨edit⟩. Step 4d-2 (c2). */
  rail?: ReactNode
  /** The map. The only zone that exists today. */
  canvas: ReactNode
  /** The panels: `{Polities}`, `{Details}`, `{History}`, `{Overrides}`. Step 5. */
  dock?: ReactNode
  /** The status bar: where the pointer is, what is being done and to whom. */
  status?: ReactNode
}

/**
 * Lay the editor out.
 *
 * **Only the canvas zone is a landmark today.** `<main>` is correct for it and costs nothing; the rail
 * would want `role="toolbar"` and the dock a labelled `<aside>`, but a toolbar announcing itself with no
 * controls in it is worse for a screen reader than a plain box. Those roles arrive with their contents,
 * which is the same rule this package already applies to its `aria-live` regions.
 * @param props - what to put in each zone; omit a zone to get a named placeholder
 * @param props.heading - the page's `<h1>`, placed inside the canvas landmark
 * @param props.appbar - the top bar's content
 * @param props.docbar - the document bar's content
 * @param props.rail - the tool rail's content
 * @param props.canvas - the map, the one zone always given
 * @param props.dock - the panels' content
 * @param props.status - the status bar; an empty status row when omitted
 * @returns the five zones, laid out
 */
export function Shell({ heading, appbar, docbar, rail, canvas, dock, status }: ShellProps) {
  // Render
  return (
    <div className="shell">
      <div className="shell__appbar">{appbar ?? <Placeholder name="app bar" />}</div>
      <div className="shell__docbar">{docbar ?? <Placeholder name="document bar" />}</div>
      <div className="shell__body">
        <div className="shell__rail">{rail ?? <Placeholder name="tools" />}</div>
        <main className="shell__canvas">
          {heading}
          {canvas}
        </main>
        <div className="shell__dock">{dock ?? <Placeholder name="panels" />}</div>
      </div>
      {status ?? <div className="shell__status" />}
    </div>
  )
}
