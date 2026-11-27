import { outranks } from '@europe-historical-atlas/core/data/ranks'

import type { PolityDraft } from './polityDraft'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/**
 * A step of the hierarchical ladder that the ranks contradict: a vassal whose rank scores higher than its suzerain's
 * (CORE-489, the dev, 2026-11-20). **A warning, never a refusal**: the form says it and saves all the same.
 */
export interface RankWarning {
  /** The vassal's name. */
  vassal: string
  /** Its rank, as stored. */
  vassalRank: string
  /** Its suzerain's name. */
  suzerain: string
  /** The suzerain's rank, as stored. */
  suzerainRank: string
}

/** A polity as the check reads it. */
type Ranked = Pick<YearPolity, 'id' | 'name' | 'rank' | 'suzerain'>

/**
 * The polity's own suzerain, when the polity outranks it.
 * @param draft - the form's values
 * @param polities - the year's polities
 * @returns the step at fault, or none
 */
function aboveWarnings(
  draft: Pick<PolityDraft, 'name' | 'rank' | 'suzerain'>,
  polities: readonly Ranked[]
): RankWarning[] {
  const above = polities.find((polity) => polity.id === draft.suzerain)
  if (above === undefined || draft.rank === null || above.rank === null) return []
  if (!outranks(draft.rank, above.rank)) return []
  return [
    { vassal: draft.name, vassalRank: draft.rank, suzerain: above.name, suzerainRank: above.rank },
  ]
}

/**
 * What the ranks contradict about the polity in the form: its own suzerain, when it outranks it, then each of its
 * vassals that outranks it — so lowering a suzerain's rank says it as raising a vassal's does.
 * @param draft - the form's values: the name, the rank and the suzerain chosen
 * @param editing - the id of the polity being edited, `null` for a new one, which has no vassal yet
 * @param polities - the year's polities
 * @returns the steps at fault, the polity's own suzerain first; none when the ranks agree or have no score
 */
export function rankWarnings(
  draft: Pick<PolityDraft, 'name' | 'rank' | 'suzerain'>,
  editing: string | null,
  polities: readonly Ranked[]
): RankWarning[] {
  const found = aboveWarnings(draft, polities)
  const rank = draft.rank
  if (editing === null || rank === null) return found
  for (const below of polities) {
    if (below.suzerain !== editing || below.rank === null || !outranks(below.rank, rank)) continue
    found.push({
      vassal: below.name,
      vassalRank: below.rank,
      suzerain: draft.name,
      suzerainRank: rank,
    })
  }
  return found
}
