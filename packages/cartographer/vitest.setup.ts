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
 * It records nothing on purpose: what the painter draws is asserted in `canvas/paint/painter.test.ts` against a
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
 * the document exactly while it is open, on opening it focuses an `autofocus` descendant, and on closing
 * it gives the focus back to what held it before — as the browser's dialogue focusing steps do. No top layer, no focus trap, no `::backdrop` —
 * none of which jsdom could render or a test could assert anyway; those are the browser's.
 */
/** The element focused before each dialogue opened — the browser gives it the focus back on close. */
const focusedBeforeOpening = new WeakMap<HTMLDialogElement, Element | null>()

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  focusedBeforeOpening.set(this, document.activeElement)
  this.setAttribute('open', '')
  // The one focusing step a test can see: the browser moves focus to an `autofocus` descendant.
  this.querySelector<HTMLElement>('[autofocus]')?.focus()
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
  // The browser's closing steps give the focus back to what held it before the dialogue opened; when that
  // element can no longer take it (a button disabled meanwhile), the focus falls to the body. Found in the
  // browser on 2026-10-12, where it threw the focus of the polity panel away — the stand-in now does it too.
  const before = focusedBeforeOpening.get(this)
  focusedBeforeOpening.delete(this)
  if (before instanceof HTMLElement) {
    before.focus()
    if (document.activeElement !== before && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
  this.dispatchEvent(new Event('close'))
}

/**
 * `showPopover()` and `hidePopover()`, because jsdom 30 has neither **and still hides every popover**: its
 * own default stylesheet carries `[popover]:not(:popover-open) { display: none }`, so an element with a
 * `popover` attribute is invisible until something opens it, and nothing can. Since the design system's
 * 0.6.0 the `Dropdown` menu is a `popover="manual"` it opens itself (2026-10-13, the DS handoff) — and it
 * skips the call when the method is missing, so under jsdom the menu stayed hidden and its options could
 * not be found by role.
 *
 * Same shape as the dialogue's stand-in: what a test can observe. `:popover-open` is the browser's state
 * and cannot be set from here, so the stand-in marks the element with an attribute and a rule shows what
 * carries it. No top layer: jsdom renders nothing anyway.
 *
 * **`!important`, and it is needed, measured**: jsdom's computed style ranks rules by specificity without
 * the cascade's origins, so its own `[popover]:not(:popover-open):not(dialog[open])` (0,3,1) beat a plain
 * author rule (0,2,0) — the attribute was set, the six options were there, and `display` stayed `none`.
 */
const POPOVER_OPEN = 'data-test-popover-open'
const popoverStyle = document.createElement('style')
popoverStyle.textContent = `[popover][${POPOVER_OPEN}] { display: block !important; }`
document.head.append(popoverStyle)

HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
  this.setAttribute(POPOVER_OPEN, '')
}
HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
  this.removeAttribute(POPOVER_OPEN)
}

/**
 * `scrollIntoView`, because jsdom has none and lays nothing out. `{Polities}` scrolls the row the keys
 * are on into view; under jsdom there is nothing to scroll, so the stub records nothing and only has to
 * exist — the same reason as the 2D context above.
 */
Element.prototype.scrollIntoView = noop
