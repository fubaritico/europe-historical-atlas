import type { RemovalReport } from '@europe-historical-atlas/core/editor/documentEdits'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * What deleting a polity would do, said before and after — the confirmation's question (`s07`, D2) and
 * the result zone's line. Pure, so every sentence is tested with literals.
 *
 * **What goes, in the author's words**: its rings, and its vassals' homage — they become sovereign. The
 * anchors it shares with a neighbour stay, which is not said: nothing on screen moves, so there is nothing
 * to warn about.
 */

/** A polity about to be deleted, as the confirmation names it. */
export interface PendingDeletion {
  /** Its id — what the store deletes. */
  id: string
  /** Its name, verbatim — what the author reads. */
  name: string
  /** How many rings it holds. */
  rings: number
  /** How many polities hold it as their suzerain — they become sovereign. */
  vassals: number
}

/**
 * Read what deleting a polity would do.
 * @param document - the year
 * @param polityId - who would be deleted
 * @returns the polity's name and what goes with it, or `null` when no polity has that id
 */
export function pendingDeletion(document: YearDocument, polityId: string): PendingDeletion | null {
  const polity = document.polities.find((candidate) => candidate.id === polityId)
  if (polity === undefined) return null
  const claim = document.claims.find((held) => held.polity === polityId)
  return {
    id: polity.id,
    name: polity.name,
    rings: claim?.rings.length ?? 0,
    vassals: document.polities.filter((candidate) => candidate.suzerain === polityId).length,
  }
}

/**
 * A count with its noun, singular for one.
 * @param count - how many
 * @param one - the singular
 * @param many - the plural
 * @returns e.g. `"3 rings"`, `"1 vassal"`
 */
function counted(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`
}

/**
 * The confirmation's question — `s07`'s *"Delete Duchy of Normandy? Its 3 rings go; its 2 vassals become
 * sovereign."* What goes is listed; what does not exist is not mentioned, so a polity with no territory and
 * no vassal is asked about by name alone (`s07`, *"lists nothing else"*).
 * @param pending - the polity and what goes with it
 * @returns the question
 */
export function deletionQuestion(pending: PendingDeletion): string {
  const clauses = [
    ...(pending.rings === 0 ? [] : [`its ${counted(pending.rings, 'ring goes', 'rings go')}`]),
    ...(pending.vassals === 0
      ? []
      : [`its ${counted(pending.vassals, 'vassal becomes', 'vassals become')} sovereign`]),
  ]
  const what = clauses.join('; ')
  return what === '' ? `Delete ${pending.name}?` : `Delete ${pending.name}? I${what.slice(1)}.`
}

/**
 * The result zone's line once it is done — what went, and that undo brings it back.
 * @param pending - the polity as it was named
 * @param report - what the document says went
 * @returns the line
 */
export function deletionResult(pending: PendingDeletion, report: RemovalReport): string {
  const vassals =
    pending.vassals === 0 ? '' : `, ${counted(pending.vassals, 'vassal', 'vassals')} now sovereign`
  return `deleted ${pending.name} — ${counted(report.rings, 'ring', 'rings')}${vassals} · ctrl+Z brings it back`
}
