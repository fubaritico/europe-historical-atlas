import type { PolitiesPanelMessageKey } from '../i18n'
import type { RemovalReport } from '@europe-historical-atlas/core/editor/documentEdits'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

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
 * Which of the two things that go with a polity there are — the question lists only those.
 * @param pending - the polity and what goes with it
 * @returns `none`, `rings`, `vassals` or `both`
 */
function whatGoes(pending: PendingDeletion): string {
  if (pending.rings === 0) return pending.vassals === 0 ? 'none' : 'vassals'
  return pending.vassals === 0 ? 'rings' : 'both'
}

/**
 * The confirmation's question — `s07`'s *"Delete Duchy of Normandy? Its 3 rings go; its 2 vassals become
 * sovereign."* What goes is listed; what does not exist is not mentioned, so a polity with no territory and
 * no vassal is asked about by name alone (`s07`, *"lists nothing else"*).
 * @param pending - the polity and what goes with it
 * @param t - the panel's messages, in the page's language
 * @returns the question
 */
export function deletionQuestion(
  pending: PendingDeletion,
  t: Translate<PolitiesPanelMessageKey>
): string {
  return t('deleteQuestion', {
    what: whatGoes(pending),
    name: pending.name,
    rings: pending.rings,
    vassals: pending.vassals,
  })
}

/**
 * The result zone's line once it is done — what went, and that undo brings it back.
 * @param pending - the polity as it was named
 * @param report - what the document says went
 * @param t - the panel's messages, in the page's language
 * @returns the line
 */
export function deletionResult(
  pending: PendingDeletion,
  report: RemovalReport,
  t: Translate<PolitiesPanelMessageKey>
): string {
  return t('deleteResult', { name: pending.name, rings: report.rings, vassals: pending.vassals })
}
