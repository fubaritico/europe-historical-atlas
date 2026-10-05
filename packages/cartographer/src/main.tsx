import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from './state/openEmptyYear'
import { createYearStore } from './state/yearStore'

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
 * paint. The hook itself is exercised under React in `state/yearStore.test.ts`, with `renderHook`.
 *
 * **The copier is injected here, and that is the whole point of the factory.** `createYearStore` never
 * imports `cloneYearDocument`; this root hands it over. A store reached by `import` from a pure module is the
 * global singleton `rules/modular-architecture.md` forbids, and the undo line needs a copier whatever we do —
 * so there was a seam to pass through regardless.
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

const store = createYearStore({
  document: openEmptyYear(FIRST_YEAR),
  clone: cloneYearDocument,
})

createRoot(container).render(
  <StrictMode>
    <main>
      <h1>Cartographe</h1>
      <p>Année {store.getState().document.year}</p>
    </main>
  </StrictMode>
)
