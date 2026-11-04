/**
 * Focus the element of a menu or of the bar marked with an id — `data-menu` for a title, `data-entry` for a command.
 * @param root - where to look, or `null` before it is mounted
 * @param mark - the data attribute, `menu` or `entry`
 * @param id - the id marked, or `null` for nothing to focus
 */
export function focusMarked(
  root: HTMLElement | null,
  mark: 'menu' | 'entry',
  id: string | null
): void {
  if (id !== null) root?.querySelector<HTMLElement>(`[data-${mark}="${id}"]`)?.focus()
}
