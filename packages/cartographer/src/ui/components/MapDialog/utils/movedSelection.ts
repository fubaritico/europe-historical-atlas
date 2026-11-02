/** Where each key moves the selection, from the index selected (`-1` for none) and the count of choices. */
const MOVES: Readonly<Record<string, (at: number, count: number) => number>> = {
  ArrowDown: (at, count) => Math.min(at + 1, count - 1),
  ArrowUp: (at) => Math.max(at - 1, 0),
  Home: () => 0,
  End: (_at, count) => count - 1,
}

/**
 * The map the keys move the selection to: ‹↑› ‹↓› one row, ‹Home› ‹End› to the first or the last — among the maps
 * that can be opened.
 * @param choices - the maps that can be opened, in the list's order
 * @param selected - the map selected, or `null`
 * @param key - the key pressed
 * @returns the map to select, or `null` when the key moves nothing
 */
export function movedSelection(
  choices: readonly string[],
  selected: string | null,
  key: string
): string | null {
  const move = MOVES[key]
  if (move === undefined || choices.length === 0) return null
  const at = selected === null ? -1 : choices.indexOf(selected)
  return choices[move(at, choices.length)] ?? null
}
