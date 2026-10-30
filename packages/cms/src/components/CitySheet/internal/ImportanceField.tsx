import { importanceChoices } from '../utils/importanceChoices'

import { ChoiceField } from './ChoiceField'

import type { Say } from '../utils/say'

/**
 * The sheet's importance, one of three.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the field
 */
export function ImportanceField({ say }: { say: Say }) {
  return (
    <ChoiceField
      name="importance"
      label={say('importance')}
      help={say('importanceHelp')}
      choices={importanceChoices(say)}
      prompt={say('importanceChoose')}
      named={(value) => say('importanceNamed', { value })}
    />
  )
}
