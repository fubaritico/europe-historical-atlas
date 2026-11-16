import type { ChainReading } from './readVassalChain'
import type { ChangedVassalLink, LinkAnswer, NewVassalLink } from './saveVassalLink'

/** Where a line « Vassal de » stands. */
export type NewLinkStatus =
  /** Being filled, or as the base holds it. */
  | { kind: 'filling' }
  /** Saved at « Enregistrer » without its suzerain — required: said under the field. */
  | { kind: 'missing' }
  /** Being saved — the line is held until the server answers. */
  | { kind: 'saving' }
  /** Refused by a rule of the server, with its sentence. */
  | { kind: 'refused'; message: string }
  /** The save failed — the server unreachable or broken; the console keeps why. */
  | { kind: 'failed' }

/** A line « Vassal de »: a link already in the base, or one being entered. */
export interface PendingLine {
  /** Its key, stable while it lives. */
  readonly key: string
  /** The link it shows, for a line already in the base; absent for a new one. */
  readonly link?: string
  /** The suzerain and source as the base holds them, for a line already in it — what tells it changed. */
  readonly original?: {
    readonly suzerain: number | string
    readonly source: number | string | null
  }
  /** The suzerain chosen — required —, `null` for none yet. */
  readonly suzerain: number | string | null
  /** The source chosen — facultative —, `null` for none. */
  readonly source: number | string | null
  /** Where it stands. */
  readonly status: NewLinkStatus
  /** Whether its suzerain is ticked « souverain » — the chain stops there, no ⊕ after it. */
  readonly sovereign: boolean
  /** Its vassal, once the line below it was saved and left the block (review ARCH-002). */
  readonly vassal?: number | string
}

/** What the lines' save is wired to. */
export interface PendingWiring {
  /** Saves a new link of vassalage. */
  readonly saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  /** Changes a link of vassalage. */
  readonly updateLink: (change: ChangedVassalLink) => Promise<LinkAnswer>
  /** Removes a link of vassalage. */
  readonly deleteLink: (link: string) => Promise<LinkAnswer>
  /** Reads the chain again once something is saved. */
  readonly onSaved: () => void
  /** Called with the error once a save fails, for the screen to say it. */
  readonly onFailed: (error: unknown) => void
}

/**
 * Whether a line differs from the base: new, or its suzerain or source changed.
 * @param line - the line
 * @returns whether « Enregistrer » has something to save for it
 */
export function changed(line: PendingLine): boolean {
  const { original } = line
  if (original === undefined) return true
  return original.suzerain !== line.suzerain || original.source !== line.source
}

/**
 * Each line's vassal, from the lowest up: the suzerain of the line below, the holder's title for the first.
 * @param lines - the lines
 * @param holder - the holder's title
 * @returns the vassals, in the lines' order
 */
export function vassalsOf(
  lines: readonly PendingLine[],
  holder: number | string | null
): (number | string | null)[] {
  return lines.map(
    (line, index) => line.vassal ?? (index === 0 ? holder : (lines[index - 1]?.suzerain ?? null))
  )
}

/**
 * The lines of a chain read: one per link above the holder, its suzerain and source as the base holds them; the last
 * ticked when the chain ends on a sovereign there.
 * @param reading - the reading
 * @returns the lines
 */
export function linesOf(reading: ChainReading): PendingLine[] {
  return reading.steps.map((step, index) => {
    const suzerain = reading.titles[index + 1]?.id ?? null
    const last = index === reading.steps.length - 1
    return {
      key: step.link,
      link: step.link,
      ...(suzerain === null ? {} : { original: { suzerain, source: step.source } }),
      suzerain,
      source: step.source,
      status: { kind: 'filling' },
      sovereign: last && reading.end === 'sovereign',
    }
  })
}

/**
 * A line just added by ⊕: nothing chosen.
 * @returns the line
 */
export function emptyLine(): PendingLine {
  return {
    key: crypto.randomUUID(),
    suzerain: null,
    source: null,
    status: { kind: 'filling' },
    sovereign: false,
  }
}

/**
 * The lines once one is chosen in: its suzerain or source set, its status reset; a link's suzerain changed drops the
 * lines above it — the old suzerain's chain — and unticks it (review ARCH-001).
 * @param lines - the lines
 * @param choice - the line, the field and the id
 * @param choice.key - the line's key
 * @param choice.field - the suzerain or the source
 * @param choice.id - the id chosen, `null` emptied
 * @returns the lines
 */
export function withChoice(
  lines: readonly PendingLine[],
  choice: { key: string; field: 'suzerain' | 'source'; id: number | string | null }
): readonly PendingLine[] {
  const at = lines.findIndex((line) => line.key === choice.key)
  const keep = choice.field === 'suzerain' && lines[at]?.link !== undefined ? at + 1 : lines.length
  const reset = choice.field === 'suzerain' ? { sovereign: false } : {}
  return lines
    .slice(0, keep)
    .map((line) =>
      line.key === choice.key
        ? { ...line, [choice.field]: choice.id, status: { kind: 'filling' as const }, ...reset }
        : line
    )
}

/**
 * The lines once one is ticked or unticked « souverain » — only while that title is still its suzerain (QUAL-001).
 * @param lines - the lines
 * @param tick - the line, the title ticked, and the new value
 * @param tick.key - the line's key
 * @param tick.title - the title the box was saved for
 * @param tick.sovereign - the new value
 * @returns the lines
 */
export function withSovereign(
  lines: readonly PendingLine[],
  tick: { key: string; title: number | string; sovereign: boolean }
): readonly PendingLine[] {
  return lines.map((line) =>
    line.key === tick.key && line.suzerain === tick.title
      ? { ...line, sovereign: tick.sovereign }
      : line
  )
}
