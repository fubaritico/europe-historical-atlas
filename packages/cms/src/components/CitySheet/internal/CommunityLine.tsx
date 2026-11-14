import { IconButton } from '@fubaritico/react/IconButton'

import { COMMUNITY_WEIGHTS } from '@europe-historical-atlas/core/data/cityCommunity'

import { ChoiceField } from './ChoiceField'
import { ConfessionField } from './ConfessionField'
import { WeightAttestedField } from './WeightAttestedField'

import type { CitySheetMessageKey } from '../i18n'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'
import type { CommunityWeight } from '@europe-historical-atlas/core/data/cityCommunity'

/** Each weight's label in the screen's texts. */
const WEIGHT_KEYS: Readonly<Record<CommunityWeight, CitySheetMessageKey>> = {
  dominant: 'weightDominant',
  present: 'weightPresent',
}

/**
 * One religious community (CMS-433): its confession, its weight, whether a source says that weight — unticked, the
 * weight is supposed and the map is to show it uncertain — and a button to remove it.
 * @param props - its rank, the confessions, the removal and the translator
 * @param props.index - its rank among the communities, from 0
 * @param props.confessions - every confession of the CMS's list
 * @param props.onRemove - removes the community
 * @param props.say - the translator
 * @returns the community
 */
export function CommunityLine({
  index,
  confessions,
  onRemove,
  say,
}: {
  index: number
  confessions: readonly RecordChoice[]
  onRemove: () => void
  say: Say
}) {
  const path = `communities.${String(index)}`
  const rank = index + 1

  return (
    <fieldset className="city-sheet__line">
      <legend className="city-sheet__legend">{say('community', { rank })}</legend>
      <ConfessionField
        name={`${path}.confession`}
        help={say('confessionHelp')}
        confessions={confessions}
        say={say}
      />
      <ChoiceField
        name={`${path}.weight`}
        label={say('weight')}
        help={say('weightHelp')}
        choices={COMMUNITY_WEIGHTS.map((value) => ({ value, label: say(WEIGHT_KEYS[value]) }))}
        prompt={say('weightChoose')}
        named={(value) => say('weightNamed', { value })}
      />
      <WeightAttestedField name={`${path}.weightAttested`} say={say} />
      <div className="city-sheet__line-actions">
        <IconButton
          type="button"
          size="sm"
          icon="XMark"
          aria-label={say('removeCommunity', { rank })}
          onClick={onRemove}
        />
      </div>
    </fieldset>
  )
}
