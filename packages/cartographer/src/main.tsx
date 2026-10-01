import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * The Cartographer's entry point.
 *
 * What it renders is a placeholder and says so: a landmark and a heading, which is the smallest thing that
 * makes `pnpm dev:cartographer` *show* that Vite, React and the JSX transform are wired. An empty
 * `<StrictMode />` would have proved the same chain to a test and nothing at all to a human opening the page.
 * The real screen arrives with the canvas and the chrome; it will live in its own module, not here.
 *
 * The JSX is written inline rather than as a component on purpose: a component declared in this file would be
 * one Fast Refresh cannot reload, which is exactly what `react-refresh/only-export-components` is for.
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

createRoot(container).render(
  <StrictMode>
    <main>
      <h1>Cartographe</h1>
    </main>
  </StrictMode>
)
