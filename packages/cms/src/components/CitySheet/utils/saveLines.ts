import { changed, sovereignChanged, vassalsOf } from './pendingLine'

import type { HolderSovereignty, PendingLine, PendingWiring, SovereigntyError } from './pendingLine'

/** The block as « Enregistrer » finds it. */
export interface LinesState {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /** The links closed by ✕, to remove. */
  readonly removed: readonly string[]
  /** The holder's title, the vassal of the first line. */
  readonly holder: number | string | null
  /** The holder's own « Souverain ». */
  readonly sovereignty: HolderSovereignty
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
  /** Says the holder's « Souverain » refused or failed — `null` once saved. */
  readonly setSovereigntyError: (error: SovereigntyError | null) => void
}

/**
 * Changes one line of the block, found by its key.
 * @param targets - what the saves act on
 * @param key - the line's key
 * @param change - what changes in it
 */
function updateLine(targets: LinesTargets, key: string, change: Partial<PendingLine>): void {
  targets.setLines((current) =>
    current.map((line) => (line.key === key ? { ...line, ...change } : line))
  )
}

/** What one write answers. */
type Answer = { kind: 'saved' } | { kind: 'refused'; message: string }

/**
 * Saves the block at the sheet's « Enregistrer » (the dev, 2026-11-16). **The holder ticked « Souverain »**: its title
 * ticked, then its own links of vassalage removed — the city a sovereign state, no chain. **Otherwise** nothing
 * is sent while a line misses its suzerain — said under it —; then the links closed by ✕ are removed, the lines changed
 * are changed and the new ones added, lowest first, then each box changed is saved on its suzerain, and the holder
 * unticked last. The first refused or failed keeps its sentence and stops the rest. The chain is read again once
 * anything was saved.
 * @param state - the lines, the links removed, the holder and its sovereignty, the year
 * @param targets - what the saves act on
 * @returns `true` when everything was saved
 */
export async function saveLines(state: LinesState, targets: LinesTargets): Promise<boolean> {
  if (state.sovereignty.sovereign) return saveSovereignState(state, targets)
  const missing = state.lines.filter((line) => line.suzerain === null)
  for (const line of missing) updateLine(targets, line.key, { status: { kind: 'missing' } })
  if (missing.length > 0 || state.year === null) return false
  const steps = [
    () => removeLinks(state.removed, targets),
    () => saveChanged(state, targets),
    () => saveBoxes(state, targets),
    () => untickHolder(state, targets),
  ]
  let saved = false
  for (const step of steps) {
    const answer = await step()
    saved ||= answer.saved
    if (!answer.done) return finish(saved, false, targets)
  }
  return finish(saved, true, targets)
}

/**
 * The holder unticked « Souverain », last: its title answers to someone again — when the base held it sovereign.
 * @param state - the block
 * @param targets - what the saves act on
 * @returns whether it was saved or had nothing to save, and whether it was saved
 */
async function untickHolder(
  state: LinesState,
  targets: LinesTargets
): Promise<{ done: boolean; saved: boolean }> {
  if (!state.sovereignty.was || state.holder === null) return { done: true, saved: false }
  const holder = state.holder
  const ok = await holderAnswered(() => targets.wiring.saveSovereign(holder, false), targets)
  return { done: ok, saved: ok }
}

/**
 * The holder ticked « Souverain »: its title ticked first, unless the base holds it so already, then its own links
 * removed — those closed by ✕ too. The lines being entered go with the chain: a sovereign answers to no one.
 * @param state - the block
 * @param targets - what the saves act on
 * @returns `true` when everything was saved
 */
async function saveSovereignState(state: LinesState, targets: LinesTargets): Promise<boolean> {
  if (state.holder === null) return false
  const holder = state.holder
  // The tick first (review SEC-001): should a removal fail after it, the city is sovereign with links to remove
  // again — none lost
  let saved = false
  if (!state.sovereignty.was) {
    if (!(await holderAnswered(() => targets.wiring.saveSovereign(holder, true), targets)))
      return false
    saved = true
  }
  for (const link of new Set([...state.removed, ...state.sovereignty.links])) {
    // A link that cannot be removed is said under the holder's box
    if (!(await holderAnswered(() => targets.wiring.deleteLink(link), targets))) {
      return finish(saved, false, targets)
    }
    saved = true
    targets.setRemoved((current) => current.filter((one) => one !== link))
  }
  return finish(saved, true, targets)
}

/**
 * Reads the chain again once anything was saved.
 * @param saved - whether anything was
 * @param done - whether everything was
 * @param targets - what the saves act on
 * @returns `done`
 */
function finish(saved: boolean, done: boolean, targets: LinesTargets): boolean {
  if (saved) targets.wiring.onSaved()
  return done
}

/**
 * Removes links, one after the other — each one forgotten by the block once removed.
 * @param links - the links
 * @param targets - what the saves act on
 * @returns whether all were removed, and whether any was
 */
async function removeLinks(
  links: readonly string[],
  targets: LinesTargets
): Promise<{ done: boolean; saved: boolean }> {
  let saved = false
  for (const link of links) {
    if (!(await answered(() => targets.wiring.deleteLink(link), targets, 'a link of vassalage'))) {
      return { done: false, saved }
    }
    saved = true
    targets.setRemoved((current) => current.filter((one) => one !== link))
  }
  return { done: true, saved }
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
    updateLine(targets, line.key, { status: { kind: 'saving' } })
    const ok = await answered(
      () =>
        line.link === undefined
          ? targets.wiring.saveLink({ vassal, suzerain, source, year })
          : targets.wiring.updateLink({
              link: line.link,
              suzerain,
              source,
              sourceChanged: line.original?.source !== source,
            }),
      targets,
      'a link of vassalage',
      line.key
    )
    if (!ok) return { done: false, saved }
    saved = true
    updateLine(targets, line.key, { status: { kind: 'filling' }, original: { suzerain, source } })
  }
  return { done: true, saved }
}

/**
 * Saves each line's « Souverain » changed, on its suzerain's title.
 * @param state - the block
 * @param targets - what the saves act on
 * @returns whether all were saved, and whether any was
 */
async function saveBoxes(
  state: LinesState,
  targets: LinesTargets
): Promise<{ done: boolean; saved: boolean }> {
  let saved = false
  for (const line of state.lines) {
    if (!sovereignChanged(line) || line.suzerain === null) continue
    const { suzerain, sovereign } = line
    const ok = await answered(
      () => targets.wiring.saveSovereign(suzerain, sovereign),
      targets,
      'a title’s sovereignty',
      line.key
    )
    if (!ok) return { done: false, saved }
    saved = true
    updateLine(targets, line.key, { wasSovereign: sovereign })
  }
  return { done: true, saved }
}

/** Where an answer is said besides the console: the holder's box, or a line. */
interface AnswerPlace {
  /** Says it saved — the holder's box forgets its last error. */
  readonly saved?: () => void
  /** Says it refused, with the server's sentence. */
  readonly refused: (message: string) => void
  /** Says it failed — the toast too, through the wiring. */
  readonly failed: () => void
}

/**
 * Sends one write and says its answer where it belongs, and in the console always (review ARCH-003: one skeleton for
 * the holder's box and the lines).
 * @param send - the write
 * @param targets - what the answer acts on
 * @param what - what is written, for the console
 * @param place - where the answer is said
 * @returns `true` when saved
 */
async function attempt(
  send: () => Promise<Answer>,
  targets: LinesTargets,
  what: string,
  place: AnswerPlace
): Promise<boolean> {
  try {
    const answer = await send()
    if (answer.kind === 'saved') {
      place.saved?.()
      return true
    }
    console.warn(`[CMS] ${what} was refused: ${answer.message}`)
    place.refused(answer.message)
  } catch (error) {
    console.error(`[CMS] ${what} could not be saved`, error)
    place.failed()
    targets.wiring.onFailed(error)
  }
  return false
}

/**
 * Sends a write of the holder's sovereignty — its tick, or the removal of one of its links — its answer said under
 * the holder's box.
 * @param send - the write
 * @param targets - what the answer acts on
 * @returns `true` when saved
 */
function holderAnswered(send: () => Promise<Answer>, targets: LinesTargets): Promise<boolean> {
  return attempt(send, targets, 'the holder’s sovereignty', {
    saved: () => {
      targets.setSovereigntyError(null)
    },
    refused: (message) => {
      targets.setSovereigntyError({ kind: 'refused', message })
    },
    failed: () => {
      targets.setSovereigntyError({ kind: 'failed' })
    },
  })
}

/**
 * Sends one write of the block — its answer said on its line when it has one.
 * @param send - the write
 * @param targets - what the answer acts on
 * @param what - what is written, for the console
 * @param key - the line it is for; absent for a link removed
 * @returns `true` when saved
 */
function answered(
  send: () => Promise<Answer>,
  targets: LinesTargets,
  what: string,
  key?: string
): Promise<boolean> {
  return attempt(send, targets, what, {
    refused: (message) => {
      if (key !== undefined) updateLine(targets, key, { status: { kind: 'refused', message } })
    },
    failed: () => {
      if (key !== undefined) updateLine(targets, key, { status: { kind: 'failed' } })
    },
  })
}
