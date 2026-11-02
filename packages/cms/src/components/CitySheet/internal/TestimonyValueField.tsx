import { useFormikContext } from 'formik'

import { importanceChoices } from '../utils/importanceChoices'

import { ChoiceField } from './ChoiceField'
import { HolderLineFields } from './HolderLineFields'
import { NumberField } from './NumberField'

import type { Say } from '../utils/say'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * The one value a line's subject names: the inhabitants for the population, an importance, a reason, the polity that
 * held the city with its Wikidata id — nothing until the subject is chosen.
 * @param props - the line's rank, the reasons and the translator
 * @param props.index - the line's rank, from 0
 * @param props.reasons - the reasons a line may give
 * @param props.say - the translator
 * @returns the field, or nothing
 */
export function TestimonyValueField({
  index,
  reasons,
  say,
}: {
  index: number
  reasons: readonly RecordChoice[]
  say: Say
}) {
  const { values } = useFormikContext<SheetValues>()
  const path = `testimonies.${String(index)}`
  switch (values.testimonies[index]?.subject) {
    case 'population':
      return (
        <NumberField
          name={`${path}.population`}
          label={say('inhabitants')}
          help={say('inhabitantsHelp')}
        />
      )
    case 'importance':
      return (
        <ChoiceField
          name={`${path}.importance`}
          label={say('lineImportance')}
          help={say('lineImportanceHelp')}
          choices={importanceChoices(say)}
          prompt={say('importanceChoose')}
          named={(value) => say('lineImportanceNamed', { value })}
        />
      )
    case 'reason':
      return (
        <ChoiceField
          name={`${path}.reason`}
          label={say('reason')}
          help={say('reasonsHelp')}
          choices={reasons.map((reason) => ({ value: reason.id, label: reason.name }))}
          prompt={say('reasonChoose')}
          named={(value) => say('reasonNamed', { value })}
        />
      )
    case 'holder':
      return <HolderLineFields path={path} say={say} />
    default:
      return null
  }
}
