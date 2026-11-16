import { useRef, useState } from 'react'

import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'

/** Where a line « Vassal de » being entered stands. */
export type NewLinkStatus =
  /** Being filled: the suzerain or the source still to choose. */
  | { kind: 'filling' }
  /** Both chosen, the link being saved — the line is held until the server answers. */
  | { kind: 'saving' }
  /** Refused by a rule of the server, with its sentence. */
  | { kind: 'refused'; message: string }
  /** The save failed — the server unreachable or broken; the console keeps why. */
  | { kind: 'failed' }

/** A line « Vassal de » being entered, not saved yet. */
export interface PendingLine {
  /** Its key, stable while it lives. */
  readonly key: string
  /** The suzerain chosen, `null` for none yet. */
  readonly suzerain: number | string | null
  /** The source chosen, `null` for none yet. */
  readonly source: number | string | null
  /** Where it stands. */
  readonly status: NewLinkStatus
  /** Whether its suzerain was ticked « souverain » — the chain stops there, no ⊕ after it. */
  readonly sovereign: boolean
  /**
   * Its vassal, once the line below it was saved and left the block — until then, the suzerain of the line below (or
   * the title the chain stops at, for the first). Kept on the line so a line saved never shifts another's vassal.
   */
  readonly vassal?: number | string
}

/** The lines being entered under the chain, and their gestures. */
export interface PendingLinks {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /** Adds a line above the last. */
  readonly add: () => void
  /** Closes a line unsaved, and those above it — their vassal was its suzerain. */
  readonly remove: (key: string) => void
  /** Chooses a line's suzerain or source, or empties it — ignored while the line is being saved. */
  readonly choose: (key: string, field: 'suzerain' | 'source', id: number | string | null) => void
  /** Says a title was ticked or unticked « souverain » — on the line only while that title is still its suzerain. */
  readonly markSovereign: (key: string, title: number | string, sovereign: boolean) => void
  /** Forgets every line — another holder chosen. */
  readonly clear: () => void
}

/** What a line's save is wired to. */
export interface PendingWiring {
  /** Saves a link of vassalage. */
  readonly saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  /** Reads the chain again once a link is saved. */
  readonly onSaved: () => void
  /** Called with the error once a save fails, for the screen to say it. */
  readonly onFailed: (error: unknown) => void
}

/** What a line's save acts on. */
interface LineTargets {
  /** The save and what follows it. */
  readonly wiring: PendingWiring
  /** Sets the lines. */
  readonly setLines: (change: (current: readonly PendingLine[]) => readonly PendingLine[]) => void
  /** Changes one line, found by its key — a line closed since is not found, and nothing changes. */
  readonly update: (key: string, change: Partial<PendingLine>) => void
  /** The lines as last drawn. */
  readonly live: { readonly current: readonly PendingLine[] }
}

/**
 * The lines once a title is ticked or unticked on one — only while that title is still its suzerain (review QUAL-001):
 * an answer for a suzerain since replaced changes nothing on the line.
 * @param lines - the lines
 * @param tick - the line, the title ticked, and the new value
 * @param tick.key - the line's key
 * @param tick.title - the title the box was saved for
 * @param tick.sovereign - the new value
 * @returns the lines
 */
function withSovereign(
  lines: readonly PendingLine[],
  tick: { key: string; title: number | string; sovereign: boolean }
): readonly PendingLine[] {
  return lines.map((line) =>
    line.key === tick.key && line.suzerain === tick.title
      ? { ...line, sovereign: tick.sovereign }
      : line
  )
}

/**
 * A line just added by ⊕: nothing chosen.
 * @returns the line
 */
function emptyLine(): PendingLine {
  return {
    key: crypto.randomUUID(),
    suzerain: null,
    source: null,
    status: { kind: 'filling' },
    sovereign: false,
  }
}

/**
 * The lines once one is saved: it leaves the block, and the line above it keeps the saved suzerain as its vassal —
 * it no longer has a line below to read it from (review ARCH-002, 2026-11-16).
 * @param lines - the lines
 * @param saved - the line saved
 * @returns the lines left
 */
export function withoutSaved(
  lines: readonly PendingLine[],
  saved: PendingLine
): readonly PendingLine[] {
  const at = lines.findIndex((one) => one.key === saved.key)
  if (at === -1) return lines
  return lines.flatMap((one, index) => {
    if (index === at) return []
    if (index === at + 1 && saved.suzerain !== null) return [{ ...one, vassal: saved.suzerain }]
    return [one]
  })
}

/**
 * Saves one line: held while it goes; saved, it leaves the block and the chain is read again; refused or failed, it
 * says so — on the line only while it still lives (QUAL-022), the console always.
 * @param line - the line, its suzerain and its source chosen
 * @param at - its vassal and the sheet's year
 * @param at.vassal - the title it is the suzerain of
 * @param at.year - the sheet's year
 * @param targets - what its answer acts on
 */
function sendLine(
  line: PendingLine,
  at: { vassal: number | string; year: number },
  targets: LineTargets
): void {
  if (line.suzerain === null || line.source === null) return
  const { wiring, setLines, update, live } = targets
  update(line.key, { status: { kind: 'saving' } })
  wiring
    .saveLink({ vassal: at.vassal, suzerain: line.suzerain, source: line.source, year: at.year })
    .then(
      (answer) => {
        if (answer.kind === 'saved') {
          setLines((current) => withoutSaved(current, line))
          wiring.onSaved()
          return
        }
        console.warn(`[CMS] a link of vassalage was refused: ${answer.message}`)
        update(line.key, { status: { kind: 'refused', message: answer.message } })
      },
      (error: unknown) => {
        console.error('[CMS] a link of vassalage could not be saved', error)
        if (!live.current.some((one) => one.key === line.key)) return
        update(line.key, { status: { kind: 'failed' } })
        wiring.onFailed(error)
      }
    )
}

/**
 * The lines « Vassal de » under the chain (the dev's mock-up, 2026-11-15, and his words of 2026-11-16: *"a repeating
 * block, which one is free to edit"*): ⊕ adds a line as soon as the one below has its suzerain — Strasbourg → Swabia,
 * ⊕, Swabia → the Empire — without waiting for the sources. **Each line is saved on its own** once its suzerain and its
 * source are chosen, in whatever order; its vassal is the suzerain of the line below, or the title the chain stops at
 * for the first. A line saved leaves the block, and the chain read again shows it; the lines still being entered stay,
 * since they live here, above the reading.
 *
 * One save at a time per line (QUAL-022): a line being saved ignores a new choice; an answer for a line closed since
 * changes nothing on the screen — but a link saved is still read into the chain, since it is in the base.
 * @param top - the title the chain stops at, `null` while it is not read
 * @param year - the sheet's year, `null` while it is not one
 * @param wiring - the save, and what follows it
 * @returns the lines and their gestures
 */
export function usePendingLinks(
  top: number | string | null,
  year: number | null,
  wiring: PendingWiring
): PendingLinks {
  const [lines, setLines] = useState<readonly PendingLine[]>([])
  // The lines as last drawn, for an answer arriving later to know whether its line still lives
  const live = useRef(lines)
  live.current = lines

  const update = (key: string, change: Partial<PendingLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
  }

  const save = (line: PendingLine, vassal: number | string, at: number) => {
    sendLine(line, { vassal, year: at }, { wiring, setLines, update, live })
  }

  return {
    lines,
    add: () => {
      setLines((current) => [...current, emptyLine()])
    },
    remove: (key) => {
      setLines((current) => {
        const at = current.findIndex((line) => line.key === key)
        return at === -1 ? current : current.slice(0, at)
      })
    },
    choose: (key, field, id) => {
      const at = lines.findIndex((line) => line.key === key)
      const line = lines[at]
      if (line === undefined || line.status.kind === 'saving') return
      // A suzerain changed is not the one ticked « souverain » (review ARCH-001): the box starts unticked for it
      const next: PendingLine = {
        ...line,
        [field]: id,
        status: { kind: 'filling' },
        ...(field === 'suzerain' ? { sovereign: false } : {}),
      }
      update(key, next)
      const vassal = line.vassal ?? (at === 0 ? top : (lines[at - 1]?.suzerain ?? null))
      if (vassal !== null && year !== null) save(next, vassal, year)
    },
    markSovereign: (key, title, sovereign) => {
      setLines((current) => withSovereign(current, { key, title, sovereign }))
    },
    clear: () => {
      setLines([])
    },
  }
}
