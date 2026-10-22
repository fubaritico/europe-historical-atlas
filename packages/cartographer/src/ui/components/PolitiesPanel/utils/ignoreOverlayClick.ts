/**
 * A click on the backdrop does nothing — deliberately: a dialogue holding typed work must not lose it to a
 * stray click (the design system's own warning). Escape, Cancel and the cross close it.
 */
export function ignoreOverlayClick(): void {
  // Deliberately nothing.
}
