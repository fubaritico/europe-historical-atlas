import type { ChainReading } from './readVassalChain'
import type { SaveSovereign } from './saveSovereign'
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
  /** Whether its suzerain is ticked « souverain » — the chain stops there, no ⊕ after it. Saved at « Enregistrer ». */
  readonly sovereign: boolean
  /** Whether the base holds its suzerain « souverain » — what tells the box changed. */
  readonly wasSovereign: boolean
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
  /** Ticks or unticks « souverain » on a title. */
  readonly saveSovereign: SaveSovereign
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
 * Whether a line's « Souverain » differs from the base — for a line whose suzerain is chosen.
 * @param line - the line
 * @returns whether « Enregistrer » has its suzerain's sovereignty to save
 */
export function sovereignChanged(line: PendingLine): boolean {
  return line.suzerain !== null && line.sovereign !== line.wasSovereign
}

/** The holder's own « Souverain » (the dev, 2026-11-16): a sovereignty of one link, the city a sovereign state. */
export interface HolderSovereignty {
  /** Whether it is ticked on the screen. */
  readonly sovereign: boolean
  /** Whether the base holds it so. */
  readonly was: boolean
  /** The holder's own links of vassalage, in every reading — removed at « Enregistrer » once it is ticked. */
  readonly links: readonly string[]
}

/** Why the holder's « Souverain » was not saved: the server's sentence, or a failure the console keeps. */
export type SovereigntyError = { kind: 'refused'; message: string } | { kind: 'failed' }

/** The holder answering to someone, with no link of its own: what the block holds before any chain is read. */
export const NO_SOVEREIGNTY: HolderSovereignty = { sovereign: false, was: false, links: [] }

/**
 * How many changes wait for « Enregistrer »: ticked sovereign, the holder's links to remove and its tick; otherwise the
 * lines new or changed, the links closed by ✕, the boxes changed, and the holder unticked.
 * @param lines - the block's lines
 * @param removed - the links closed by ✕
 * @param holder - the holder's sovereignty
 * @returns the count
 */
export function waitingOf(
  lines: readonly PendingLine[],
  removed: readonly string[],
  holder: HolderSovereignty
): number {
  if (holder.sovereign) return new Set([...removed, ...holder.links]).size + (holder.was ? 0 : 1)
  return (
    lines.filter(changed).length +
    removed.length +
    lines.filter(sovereignChanged).length +
    (holder.was ? 1 : 0)
  )
}

/**
 * The holder's sovereignty in the readings of its chain: ticked when the first stops on the holder itself, a
 * sovereign; its links, the first step of every reading.
 * @param readings - the chain's readings at the sheet's year
 * @returns the holder's sovereignty
 */
export function sovereigntyOf(readings: readonly ChainReading[]): HolderSovereignty {
  const first = readings[0]
  const was = first?.end === 'sovereign' && first.titles.length === 1
  const links = readings.flatMap((reading) =>
    reading.steps[0] === undefined ? [] : [reading.steps[0].link]
  )
  return { sovereign: was, was, links: [...new Set(links)] }
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
 * ticked when the chain ends on a sovereign there. No reading, no line.
 * @param reading - the reading, `undefined` for none
 * @returns the lines
 */
export function linesOf(reading: ChainReading | undefined): PendingLine[] {
  if (reading === undefined) return []
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
      wasSovereign: last && reading.end === 'sovereign',
    }
  })
}

/**
 * The lines once one is closed by ✕: it and the lines above it go — no longer this chain's.
 * @param lines - the lines
 * @param key - the line closed
 * @returns the lines kept, and the link the line showed, to remove; `null` when no line has that key
 */
export function closeLine(
  lines: readonly PendingLine[],
  key: string
): { kept: readonly PendingLine[]; link: string | undefined } | null {
  const at = lines.findIndex((line) => line.key === key)
  if (at === -1) return null
  return { kept: lines.slice(0, at), link: lines[at]?.link }
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
    wasSovereign: false,
  }
}

/**
 * The lines once one is chosen in: its suzerain or source set, its status reset; a link's suzerain changed drops the
 * lines above it — the old suzerain's chain — and unticks it (review ARCH-001), the base's value forgotten with the old
 * suzerain: a new one is saved sovereign only once ticked.
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
  const reset = choice.field === 'suzerain' ? { sovereign: false, wasSovereign: false } : {}
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
