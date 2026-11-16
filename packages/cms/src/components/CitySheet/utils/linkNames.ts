import type { PendingWiring } from './pendingLine'
import type { ChainReading } from './readVassalChain'

/** A link of vassalage named by its two titles, as the chain read named them. */
export interface LinkNames {
  /** The vassal's title. */
  readonly vassal: string
  /** The suzerain's title. */
  readonly suzerain: string
}

/**
 * Names a link of the chain by its two titles — what a toast says of a link the server kept (the dev, 2026-11-16: « le
 * bon message »). `steps[i]` brought `titles[i + 1]` above `titles[i]`.
 * @param readings - the chain's readings, as the block was loaded from them
 * @param link - the link's id
 * @returns its vassal and suzerain, `null` when no reading holds it
 */
export function linkNamesOf(readings: readonly ChainReading[], link: string): LinkNames | null {
  for (const reading of readings) {
    const index = reading.steps.findIndex((step) => step.link === link)
    const vassal = reading.titles[index]
    const suzerain = reading.titles[index + 1]
    if (index >= 0 && vassal !== undefined && suzerain !== undefined)
      return { vassal: vassal.name, suzerain: suzerain.name }
  }
  return null
}

/** What the block's saves are wired to: a link the server keeps is said with the names of its two titles. */
export interface BlockWiring extends Omit<PendingWiring, 'onRemovalStopped'> {
  /**
   * Called once a link closed by ✕ is not removed, with its vassal and suzerain as the chain read named them — `null`
   * for a link the read does not hold — and the server's sentence, `null` when it did not answer.
   */
  readonly onRemovalStopped: (names: LinkNames | null, message: string | null) => void
}

/**
 * The block's wiring as the save needs it: a link the server keeps handed on with its two titles' names.
 * @param wiring - the block's wiring
 * @param readings - the chain's readings, as the block was loaded from them
 * @returns the wiring of the save
 */
export function withLinkNames(
  wiring: BlockWiring,
  readings: readonly ChainReading[]
): PendingWiring {
  return {
    ...wiring,
    onRemovalStopped: (link, message) => {
      wiring.onRemovalStopped(linkNamesOf(readings, link), message)
    },
  }
}
