/**
 * Mark an element with the native `autofocus` attribute, which a `<dialog>`'s `showModal()` honours — the
 * element a dialogue opens with the focus on.
 *
 * **Not React's `autoFocus` prop**, which writes no attribute: it calls `focus()` when the element mounts,
 * and a dialogue's content mounts while the dialogue is still closed, so that call is lost. A ref runs at
 * commit, before the Modal's effect opens the dialogue, so the attribute is there when it looks. One home
 * for the four dialogues that need it (ARCH-001, 2026-10-18).
 * @param node - the element, or `null` on unmount
 */
export function autofocusOnOpen(node: HTMLElement | null): void {
  node?.setAttribute('autofocus', '')
}
