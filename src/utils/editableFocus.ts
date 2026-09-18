/**
 * Whether a key press belongs to a form field rather than to the app.
 *
 * Shared rather than answered twice: the map camera asks it of the arrow keys, and the map's gestures
 * ask it of Escape. A second copy would be free to drift from the first, and the failure would be a key
 * that silently stops reaching the field the reader is typing in.
 */

/** Form-control tags whose own key handling must not be hijacked. */
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Whether the focused element is an editable/form control, so keys should reach it rather than the app.
 * @returns `true` when a text field, select, or contenteditable element currently has focus
 */
export function isEditableFocused(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  return el instanceof HTMLElement && (el.isContentEditable || EDITABLE_TAGS.has(el.tagName))
}
