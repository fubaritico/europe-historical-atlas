import { ChoiceField } from './ChoiceField'

import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * A confession from the CMS's list (CMS-433) — a community's, or the one a line of the sources speaks of.
 * @param props - where it is, its help, the list and the translator
 * @param props.name - its path in the form's values
 * @param props.help - the sentence under it
 * @param props.confessions - every confession of the CMS's list
 * @param props.say - the translator
 * @returns the field
 */
export function ConfessionField({
  name,
  help,
  confessions,
  say,
}: {
  name: string
  help: string
  confessions: readonly RecordChoice[]
  say: Say
}) {
  return (
    <ChoiceField
      name={name}
      label={say('confession')}
      help={help}
      choices={confessions.map((confession) => ({ value: confession.id, label: confession.name }))}
      prompt={say('confessionChoose')}
      named={(value) => say('confessionNamed', { value })}
    />
  )
}
