import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { CHROME_PAINT_STYLE } from './canvas/style'
import { MapCanvas } from './components/MapCanvas'
import { openEmptyYear } from './state/openEmptyYear'
import { createCartographerStore } from './state/store'
import { RENDER_FRAME } from './view/backdropFrame'
import { UNFRAMED } from './view/viewport'

/**
 * The Cartographer's entry point, and its composition root: it builds the store and mounts the page.
 *
 * What it renders is a placeholder and says so: a landmark, a heading, and **the year read back out of the
 * store**, which is the smallest thing that makes `pnpm dev:cartographer` *show* that Vite, React, the JSX
 * transform and the cross-package import all hold. An empty `<StrictMode />` would have proved the first
 * three to a test and nothing at all to a human opening the page. The real screen arrives with the canvas and
 * the chrome; it will live in its own module, not here.
 *
 * **Why the year is read imperatively rather than through the hook.** The JSX is written inline because a
 * component declared in this file is one Fast Refresh cannot reload — that is what
 * `react-refresh/only-export-components` is for — and a hook needs a component to live in. So the value is
 * taken with `getState()`, which is also the honest shape for a value that cannot change before the first
 * paint. The hook itself is exercised under React in `state/editionSlice.test.ts`, with `renderHook`.
 *
 * **The copier is injected here, and that is the whole point of the factory.** Neither
 * `createCartographerStore` nor the edition slice imports `cloneYearDocument`; this root hands it over. A
 * store reached by `import` from a pure module is the global singleton `rules/modular-architecture.md`
 * forbids, and the undo line needs a copier whatever we do — so there was a seam to pass through regardless.
 *
 * **The store is built from slices, one per owner of a piece of state**, combined in `state/store.ts` where
 * the middleware also lives. Today the only slice is the edition — the document and its undo line; the
 * active tool, the viewport, the visible layers and each panel's own rows join it as they are built. The
 * `edition:` key here is that structure showing through, and it is why there is one.
 *
 * `StrictMode` is kept, and it is not free: it double-invokes renders and effects in development to surface
 * impure ones. That is the defect a canvas editor produces most easily, since painting is a side effect and
 * the temptation is to do it during a render. Better it shouts now than once two canvases are wired.
 *
 * A missing `#root` **throws**, which is a decision rather than a detail (`rules/error-handling.md`): the
 * element is declared in `index.html`, so its absence means the HTML and this file disagree — a build fault,
 * not a runtime condition. The template's `getElementById('root')!` is the tempting alternative and the worse
 * one, since the assertion silences the check it appears to perform and `createRoot(null)` then fails inside
 * React with a message about something else. Creating a `div` to mount into would be worse still: the
 * application would run, detached, and nothing would say so.
 */
const container = document.getElementById('root')

if (!container) {
  throw new Error('Cartographer: #root is missing from index.html — nothing to mount into.')
}

/** The year the editor opens on. 1100 is the first century to be contributed (P3, measured against OHM). */
const FIRST_YEAR = 1100

/**
 * Off-screen but readable — the heading stays for a screen reader and leaves the canvas the whole surface.
 *
 * `display: none` would remove it from the accessibility tree, which is the opposite of the point: the
 * canvas carries only a name, so this heading is the only thing announcing what the page *is*.
 */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

const store = createCartographerStore({
  edition: {
    document: openEmptyYear(FIRST_YEAR),
    clone: cloneYearDocument,
  },
  // Opened unframed on purpose: nothing can know what fits until the canvas has a box, and the canvas
  // replaces this at its first sizing. See `UNFRAMED`.
  viewport: { viewport: UNFRAMED },
})

createRoot(container).render(
  <StrictMode>
    <main style={{ position: 'absolute', inset: 0 }}>
      <h1 style={visuallyHidden}>Cartographe — année {store.getState().document.year}</h1>
      <MapCanvas
        store={store}
        frame={RENDER_FRAME}
        style={CHROME_PAINT_STYLE}
        zoneLabel={`zone éditoriale — ${String(store.getState().document.year)}`}
        label={`Carte de l'année ${String(store.getState().document.year)}, en cours d'édition`}
      />
    </main>
  </StrictMode>
)
