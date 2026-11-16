import { changed, vassalsOf } from './pendingLine'

import type { PendingLine, PendingWiring } from './pendingLine'

/** The block as « Enregistrer » finds it. */
export interface LinesState {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /** The links closed by ✕, to remove. */
  readonly removed: readonly string[]
  /** The holder's title, the vassal of the first line. */
  readonly holder: number | string | null
  /** The sheet's year, `null` while it is not one. */
  readonly year: number | null
}

/** What saving the block acts on. */
export interface LinesTargets {
  /** The saves, and what follows them. */
  readonly wiring: PendingWiring
  /** Sets the lines. */
  readonly setLines: (change: (current: readonly PendingLine[]) => readonly PendingLine[]) => void
  /** Sets the links to remove. */
  readonly setRemoved: (change: (current: readonly string[]) => readonly string[]) => void
  /** Changes one line, found by its key. */
  readonly update: (key: string, change: Partial<PendingLine>) => void
}

/**
 * Saves the block at the sheet's « Enregistrer » (the dev, 2026-11-16): nothing is sent while a line misses its
 * suzerain — said under it —; then the links closed by ✕ are removed, the lines changed are changed and the new ones
 * added, lowest first; the first refused or failed keeps its sentence and stops the rest. The chain is read again once
 * anything was saved.
 * @param state - the lines, the links removed, the holder, the year
 * @param targets - what the saves act on
 * @returns `true` when everything was saved
 */
export async function saveLines(state: LinesState, targets: LinesTargets): Promise<boolean> {
  const missing = state.lines.filter((line) => line.suzerain === null)
  for (const line of missing) targets.update(line.key, { status: { kind: 'missing' } })
  if (missing.length > 0 || state.year === null) return false
  let saved = false
  for (const link of state.removed) {
    if (!(await answered(() => targets.wiring.deleteLink(link), targets))) {
      if (saved) targets.wiring.onSaved()
      return false
    }
    saved = true
    targets.setRemoved((current) => current.filter((one) => one !== link))
  }
  const complete = await saveChanged(state, targets)
  if (saved || complete.saved) targets.wiring.onSaved()
  return complete.done
}

/**
 * Saves the lines changed, lowest first — each new one with its vassal, each existing one changed in place.
 * @param state - the block
 * @param targets - what the saves act on
 * @returns whether all were saved, and whether any was
 */
async function saveChanged(
  state: LinesState,
  targets: LinesTargets
): Promise<{ done: boolean; saved: boolean }> {
  const vassals = vassalsOf(state.lines, state.holder)
  let saved = false
  for (const [index, line] of state.lines.entries()) {
    const vassal = vassals[index] ?? null
    if (!changed(line)) continue
    if (line.suzerain === null || vassal === null || state.year === null)
      return { done: false, saved }
    const { suzerain, source } = line
    const year = state.year
    targets.update(line.key, { status: { kind: 'saving' } })
    const ok = await answered(
      () =>
        line.link === undefined
          ? targets.wiring.saveLink({ vassal, suzerain, source, year })
          : targets.wiring.updateLink({ link: line.link, suzerain, source }),
      targets,
      line.key
    )
    if (!ok) return { done: false, saved }
    saved = true
    targets.update(line.key, { status: { kind: 'filling' }, original: { suzerain, source } })
  }
  return { done: true, saved }
}

/**
 * Sends one write and says its answer — on its line when it has one, in the console always.
 * @param send - the write
 * @param targets - what the answer acts on
 * @param key - the line it is for; absent for a link removed
 * @returns `true` when saved
 */
async function answered(
  send: () => Promise<{ kind: 'saved' } | { kind: 'refused'; message: string }>,
  targets: LinesTargets,
  key?: string
): Promise<boolean> {
  try {
    const answer = await send()
    if (answer.kind === 'saved') return true
    console.warn(`[CMS] a link of vassalage was refused: ${answer.message}`)
    if (key !== undefined)
      targets.update(key, { status: { kind: 'refused', message: answer.message } })
  } catch (error) {
    console.error('[CMS] a link of vassalage could not be saved', error)
    if (key !== undefined) targets.update(key, { status: { kind: 'failed' } })
    targets.wiring.onFailed(error)
  }
  return false
}
