/** What a key does to a list: move the keys' cursor to a row, choose a row, or nothing. */
export type ListKeyAction = { move: number } | { choose: number } | null

/** Where each moving key sends the cursor, given where it is and how many rows there are. */
const MOVES: Record<string, (at: number, count: number) => number> = {
  ArrowDown: (at, count) => (at + 1) % count,
  // From no row at all, ↑ starts at the bottom, as a list entered from below would.
  ArrowUp: (at, count) => (at < 0 ? count - 1 : (at - 1 + count) % count),
  Home: () => 0,
  End: (_, count) => count - 1,
}

/**
 * What a key does to a listbox, given where the keys' cursor is — ↑ ↓ wrap, Home and End jump, ‹enter›
 * and ‹space› choose the row the cursor is on. Pure, so every key is a literal in its tests.
 * @param at - the index the cursor is on, or `-1` before any move
 * @param key - the key, as `KeyboardEvent.key`
 * @param count - how many rows there are
 * @returns the action, or `null` for a key the list does not take
 */
export function listKeyAction(at: number, key: string, count: number): ListKeyAction {
  if (count === 0) return null
  const move = MOVES[key]
  if (move !== undefined) return { move: move(at, count) }
  if ((key === 'Enter' || key === ' ') && at >= 0 && at < count) return { choose: at }
  return null
}
