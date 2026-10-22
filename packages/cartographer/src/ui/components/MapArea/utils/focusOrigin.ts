/**
 * The attribute set on the canvas while its focus came from the pointer, read by `shell.css`.
 *
 * Exported so the stylesheet's selector and this module cannot name two different things without a
 * test noticing.
 */
export const FOCUS_ORIGIN_ATTRIBUTE = 'data-focus-origin'

/**
 * Remembers on the node whether its focus arrived by the pointer, so the focus ring can be hidden then
 * and only then.
 *
 * **Why not `:focus-visible` alone.** The browser stops showing the ring after a click, but switches it
 * back on at the first key pressed while the element is focused — and using this canvas *is* pressing
 * keys: ‹P›, ‹A›, ‹space›, the arrows. So a mouse author would get the ring back within a second.
 *
 * **Why not remove the ring outright.** The canvas is focusable for the keyboard pan and zoom, and
 * someone arriving by ‹Tab› needs to see where the focus landed — WCAG 2.4.7, level AA. A pointer user
 * already knows: they just clicked it.
 *
 * So the origin is recorded at `pointerdown` and forgotten at `blur`. A key pressed afterwards changes
 * nothing; leaving and coming back by ‹Tab› shows the ring again.
 *
 * @param node - The focusable element; the attribute is written on it.
 * @returns The teardown: removes both listeners and the attribute.
 */
export function trackFocusOrigin(node: HTMLElement): () => void {
  const fromPointer = () => {
    node.setAttribute(FOCUS_ORIGIN_ATTRIBUTE, 'pointer')
  }
  const forget = () => {
    node.removeAttribute(FOCUS_ORIGIN_ATTRIBUTE)
  }
  node.addEventListener('pointerdown', fromPointer)
  node.addEventListener('blur', forget)
  return () => {
    node.removeEventListener('pointerdown', fromPointer)
    node.removeEventListener('blur', forget)
    forget()
  }
}
