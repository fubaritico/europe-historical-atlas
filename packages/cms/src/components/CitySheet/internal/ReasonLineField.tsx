import { ChoiceField } from './ChoiceField'

import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The reason a line of the sources gives, from the CMS's list.
 * @param props - where it is, the list and the translator
 * @param props.name - its path in the form's values
 * @param props.reasons - every reason of the CMS's list
 * @param props.say - the translator
 * @returns the field
 */
export function ReasonLineField({
  name,
  reasons,
  say,
}: {
  name: string
  reasons: readonly RecordChoice[]
  say: Say
}) {
  return (
    <ChoiceField
      name={name}
      label={say('reason')}
      help={say('reasonsHelp')}
      choices={reasons.map((reason) => ({ value: reason.id, label: reason.name }))}
      prompt={say('reasonChoose')}
      named={(value) => say('reasonNamed', { value })}
    />
  )
}
