/** Does nothing, for the stand-in's methods. */
function noop(): void {
  // A stand-in: jsdom lays nothing out, so there is nothing to observe.
}

/**
 * A `ResizeObserver` for a test in jsdom, which has none — the design system's `MultiSelect` (0.9.0) measures its
 * field with one. The stand-in never fires, the sizes jsdom reports being zero anyway; what it buys is that
 * constructing one does not throw. The Cartographer's setup carries the same one (`packages/cartographer/vitest.setup.ts`).
 */
globalThis.ResizeObserver = class {
  /** Never fires: jsdom reports every box as zero. */
  observe = noop
  /** Never fires. */
  unobserve = noop
  /** Never fires. */
  disconnect = noop
}
