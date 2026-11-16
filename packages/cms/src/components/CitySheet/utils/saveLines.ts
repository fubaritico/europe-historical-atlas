import { changed, sovereignChanged, vassalsOf, waitingOf } from './pendingLine'

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
 * How the block's save ended, for the sheet to say it (review QUAL-001, 2026-11-16): everything saved, or where it
 * stopped — the sentence already said under a line, under the holder's « Souverain », or in a toast for a link closed
 * by ✕ that the server kept; or nothing sent, the sheet missing its year or its holder; or another save running.
 */
export type ChainAnswer = 'saved' | 'line' | 'holder' | 'removal' | 'no-year' | 'no-holder' | 'busy'

/** One step of the save: whether it wrote anything, and where it stopped — `null` when it went through. */
interface StepAnswer {
  /** Whether anything was written. */
  readonly saved: boolean
  /** Where it stopped, `null` when everything was saved. */
  readonly stop: ChainAnswer | null
}

/**
 * Saves the block at the sheet's « Enregistrer » (the dev, 2026-11-16). **The holder ticked « Souverain »**: its title
 * ticked, then its own links of vassalage removed — the city a sovereign state, no chain. **Otherwise** nothing
 * is sent while a line misses its suzerain — said under it —; then the links closed by ✕ are removed, the lines changed
 * are changed and the new ones added, lowest first, then each box changed is saved on its suzerain, and the holder
 * unticked last. The first refused or failed keeps its sentence and stops the rest. The chain is read again once
 * anything was saved.
 * @param state - the lines, the links removed, the holder and its sovereignty, the year
 * @param targets - what the saves act on
 * @returns `'saved'` when everything was, otherwise where it stopped
 */
export async function saveLines(state: LinesState, targets: LinesTargets): Promise<ChainAnswer> {
  // Nothing waits — a sheet with no holder among them: nothing to send, nothing to say
  if (waitingOf(state.lines, state.removed, state.sovereignty) === 0) return 'saved'
  if (state.holder === null) {
    console.warn('[CMS] the chain was not saved: the sheet has no holder')
    return 'no-holder'
  }
  if (state.sovereignty.sovereign) return saveSovereignState(state, state.holder, targets)
  const missing = state.lines.filter((line) => line.suzerain === null)
  for (const line of missing) updateLine(targets, line.key, { status: { kind: 'missing' } })
  if (missing.length > 0) {
    console.warn(
      `[CMS] the chain was not saved: ${String(missing.length)} line(s) without a suzerain`
    )
    return 'line'
  }
  if (state.year === null) {
    console.warn('[CMS] the chain was not saved: the sheet has no year')
    return 'no-year'
  }
  const year = state.year
  const holder = state.holder
  const steps = [
    () => removeLinks(state.removed, targets),
    () => saveChanged(state, { holder, year }, targets),
    () => saveBoxes(state, targets),
    () => untickHolder(state, holder, targets),
  ]
  let saved = false
  for (const step of steps) {
    const answer = await step()
    saved ||= answer.saved
    if (answer.stop !== null) return finish(saved, answer.stop, targets)
  }
  return finish(saved, 'saved', targets)
}

/**
 * The holder unticked « Souverain », last: its title answers to someone again — when the base held it sovereign.
 * @param state - the block
 * @param holder - the holder's title
 * @param targets - what the saves act on
 * @returns whether it was saved, and where it stopped
 */
async function untickHolder(
  state: LinesState,
  holder: number | string,
  targets: LinesTargets
): Promise<StepAnswer> {
  if (!state.sovereignty.was) return { saved: false, stop: null }
  const ok = await holderAnswered(() => targets.wiring.saveSovereign(holder, false), targets)
  return { saved: ok, stop: ok ? null : 'holder' }
}

/**
 * The holder ticked « Souverain »: its title ticked first, unless the base holds it so already, then its own links
 * removed — those closed by ✕ too. The lines being entered go with the chain: a sovereign answers to no one.
 * @param state - the block
 * @param holder - the holder's title
 * @param targets - what the saves act on
 * @returns `'saved'` when everything was, otherwise where it stopped
 */
async function saveSovereignState(
  state: LinesState,
  holder: number | string,
  targets: LinesTargets
): Promise<ChainAnswer> {
  // The tick first (review SEC-001): should a removal fail after it, the city is sovereign with links to remove
  // again — none lost
  let saved = false
  if (!state.sovereignty.was) {
    if (!(await holderAnswered(() => targets.wiring.saveSovereign(holder, true), targets)))
      return 'holder'
    saved = true
  }
  for (const link of new Set([...state.removed, ...state.sovereignty.links])) {
    // A link that cannot be removed is said under the holder's box
    if (!(await holderAnswered(() => targets.wiring.deleteLink(link), targets))) {
      return finish(saved, 'holder', targets)
    }
    saved = true
    targets.setRemoved((current) => current.filter((one) => one !== link))
  }
  return finish(saved, 'saved', targets)
}

/**
 * Reads the chain again once anything was saved.
 * @param saved - whether anything was
 * @param answer - how the save ended
 * @param targets - what the saves act on
 * @returns `answer`
 */
function finish(saved: boolean, answer: ChainAnswer, targets: LinesTargets): ChainAnswer {
  if (saved) targets.wiring.onSaved()
  return answer
}

/**
 * Removes links, one after the other — each one forgotten by the block once removed. Its line already gone from the
 * screen, a link the server keeps is said in a toast (the dev, 2026-11-16: « c'est un toast »).
 * @param links - the links
 * @param targets - what the saves act on
 * @returns whether any was removed, and where it stopped
 */
async function removeLinks(links: readonly string[], targets: LinesTargets): Promise<StepAnswer> {
  let saved = false
  for (const link of links) {
    const ok = await attempt(() => targets.wiring.deleteLink(link), 'a link of vassalage removed', {
      refused: (message) => {
        targets.wiring.onRemovalStopped(link, message)
      },
      failed: () => {
        targets.wiring.onRemovalStopped(link, null)
      },
    })
    if (!ok) return { saved, stop: 'removal' }
    saved = true
    targets.setRemoved((current) => current.filter((one) => one !== link))
  }
  return { saved, stop: null }
}

/**
 * Saves the lines changed, lowest first — each new one with its vassal, each existing one changed in place.
 * @param state - the block
 * @param sheet - the holder's title and the year, both known
 * @param sheet.holder - the holder's title, the vassal of the first line
 * @param sheet.year - the sheet's year
 * @param targets - what the saves act on
 * @returns whether any was saved, and where it stopped
 */
async function saveChanged(
  state: LinesState,
  sheet: { holder: number | string; year: number },
  targets: LinesTargets
): Promise<StepAnswer> {
  const { year } = sheet
  const vassals = vassalsOf(state.lines, sheet.holder)
  let saved = false
  for (const [index, line] of state.lines.entries()) {
    if (!changed(line)) continue
    const vassal = vassals[index] ?? null
    const { suzerain, source } = line
    // Unreachable once the lines missing a suzerain stopped the save: every line below has one, so has a vassal
    if (suzerain === null || vassal === null) {
      console.error('[CMS] a line reached its save without a suzerain or a vassal', line)
      return { saved, stop: 'line' }
    }
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
    if (!ok) return { saved, stop: 'line' }
    saved = true
    updateLine(targets, line.key, { status: { kind: 'filling' }, original: { suzerain, source } })
  }
  return { saved, stop: null }
}

/**
 * Saves each line's « Souverain » changed, on its suzerain's title.
 * @param state - the block
 * @param targets - what the saves act on
 * @returns whether any was saved, and where it stopped
 */
async function saveBoxes(state: LinesState, targets: LinesTargets): Promise<StepAnswer> {
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
    if (!ok) return { saved, stop: 'line' }
    saved = true
    updateLine(targets, line.key, { wasSovereign: sovereign })
  }
  return { saved, stop: null }
}

/** Where an answer is said besides the console: the holder's box, a line, or a toast. */
interface AnswerPlace {
  /** Says it saved — the holder's box forgets its last error. */
  readonly saved?: () => void
  /** Says it refused, with the server's sentence. */
  readonly refused: (message: string) => void
  /** Says it failed. */
  readonly failed: () => void
}

/**
 * Sends one write and says its answer where it belongs, and in the console always (review ARCH-003: one skeleton for
 * the holder's box, the lines and the links removed).
 * @param send - the write
 * @param what - what is written, for the console
 * @param place - where the answer is said
 * @returns `true` when saved
 */
async function attempt(
  send: () => Promise<Answer>,
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
  return attempt(send, 'the holder’s sovereignty', {
    saved: () => {
      targets.setSovereigntyError(null)
    },
    refused: (message) => {
      targets.setSovereigntyError({ kind: 'refused', message })
    },
    failed: () => {
      targets.setSovereigntyError({ kind: 'failed' })
      targets.wiring.onFailed()
    },
  })
}

/**
 * Sends one write of a line — its answer said under it.
 * @param send - the write
 * @param targets - what the answer acts on
 * @param what - what is written, for the console
 * @param key - the line it is for
 * @returns `true` when saved
 */
function answered(
  send: () => Promise<Answer>,
  targets: LinesTargets,
  what: string,
  key: string
): Promise<boolean> {
  return attempt(send, what, {
    refused: (message) => {
      updateLine(targets, key, { status: { kind: 'refused', message } })
    },
    failed: () => {
      updateLine(targets, key, { status: { kind: 'failed' } })
      targets.wiring.onFailed()
    },
  })
}
