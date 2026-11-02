/** What, inside a panel's head, keeps its own press — a button, a field, a slider — rather than starting a drag. */
const OWN_PRESS =
  'button, input, select, textarea, a, [role="slider"], [role="menu"], [role="listbox"]'

/**
 * Whether a press starts dragging its panel: on the head, not on a control the head holds.
 * @param target - what the press landed on
 * @returns `true` when the panel should follow the pointer
 */
export function grabsPanel(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('.panel__head') !== null && target.closest(OWN_PRESS) === null
}
