import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Unmounts whatever a test rendered, after every test.
 *
 * `@testing-library/react` would do this by itself, but only on a condition this repository does not meet:
 * read in its source, it registers its own hook `if (typeof afterEach === 'function')` — that is, only when
 * the runner's hooks are **globals**. Every config here imports `describe`/`it`/`expect` explicitly instead,
 * so the hook is never found and nothing is ever unmounted.
 *
 * What that costs if left out is not a crash but a lie: renders pile up in the same document, and a query for
 * a role finds the previous test's element as well as this one's. The failure reads as an ambiguous selector,
 * which points at the query rather than at the leak.
 *
 * Declared here rather than by switching `globals: true` on, so that one package out of three does not end up
 * with twenty ambient symbols the other two do not have.
 */
afterEach(() => {
  cleanup()
})

/**
 * A 2D context, because jsdom has none.
 *
 * `HTMLCanvasElement.prototype.getContext` returns `null` under jsdom unless the optional `canvas`
 * package is installed, and `startCanvasController` **throws** on a null context by decision — a browser that
 * cannot give one cannot run this editor. Without this stub, every test that mounts the real entry would
 * fail on an environment limitation rather than on anything about the application.
 *
 * It records nothing on purpose: what the painter draws is asserted in `canvas/painter.test.ts` against a
 * recording fake, where the assertions belong. This one only has to exist.
 */
/** What every member of the inert context is. */
const noop = (): void => undefined

/** A context whose every method does nothing and whose every assignment is accepted. */
const inertContext = (): CanvasRenderingContext2D =>
  new Proxy({}, { get: () => noop, set: () => true }) as CanvasRenderingContext2D

// Through `unknown`, which this repository otherwise treats as a smell — and here is what it asserts and
// why nothing narrower works. `getContext` is an **overload set of five signatures** ('2d',
// 'bitmaprenderer', 'webgl', 'webgl2', string), so no single function type sufficiently overlaps it and
// TypeScript says so. What is being claimed is only that tests never ask for anything but '2d'. The
// cast is test-only; the production path takes the real member and checks its result for `null`.
HTMLCanvasElement.prototype.getContext = vi.fn(
  inertContext
) as unknown as typeof HTMLCanvasElement.prototype.getContext

/**
 * A `ResizeObserver`, for the same reason: jsdom has none, and the canvas watches its own element rather
 * than the window so that a splitter being dragged is noticed. The stub never fires — the sizes jsdom
 * reports are zero anyway — so what it buys is that constructing one does not throw.
 */
globalThis.ResizeObserver = class {
  /** Never fires: jsdom reports every box as zero. */
  observe = noop
  /** Never fires. */
  unobserve = noop
  /** Never fires. */
  disconnect = noop
}

/**
 * `showModal()` and `close()` on `<dialog>`, because jsdom has neither — and the design system's `Modal`
 * drives the native element through them (its README: `isOpen` calls `showModal()` / `close()`).
 *
 * The stand-in does what a test can observe: it sets and removes `open`, so the dialogue's content is in
 * the document exactly while it is open, and on opening it focuses an `autofocus` descendant, as the
 * browser's dialogue focusing steps do. No top layer, no focus trap, no `::backdrop` —
 * none of which jsdom could render or a test could assert anyway; those are the browser's.
 */
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
  // The one focusing step a test can see: the browser moves focus to an `autofocus` descendant.
  this.querySelector<HTMLElement>('[autofocus]')?.focus()
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
