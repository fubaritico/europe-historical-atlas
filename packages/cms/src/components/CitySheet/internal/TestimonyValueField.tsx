import { useFormikContext } from 'formik'

import { importanceChoices } from '../utils/importanceChoices'

import { ChoiceField } from './ChoiceField'
import { ConfessionField } from './ConfessionField'
import { HolderLineFields } from './HolderLineFields'
import { NumberField } from './NumberField'
import { ReasonLineField } from './ReasonLineField'

import type { Say } from '../utils/say'
import type { SheetLists, SheetValues } from '../utils/sheetValues'

/**
 * The one value a line's subject names: the inhabitants for the population, an importance, a reason, the polity that
 * held the city with its Wikidata id, a community's confession — nothing until the subject is chosen.
 * @param props - the line's rank, the CMS's lists and the translator
 * @param props.index - the line's rank, from 0
 * @param props.lists - the reasons a line may give, the confessions it may name
 * @param props.say - the translator
 * @returns the field, or nothing
 */
export function TestimonyValueField({
  index,
  lists,
  say,
}: {
  index: number
  lists: SheetLists
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
      return <ReasonLineField name={`${path}.reason`} reasons={lists.reasons} say={say} />
    case 'holder':
      return <HolderLineFields path={path} say={say} />
    case 'community':
      return (
        <ConfessionField
          name={`${path}.confession`}
          help={say('lineConfessionHelp')}
          confessions={lists.confessions}
          say={say}
        />
      )
    default:
      return null
  }
}
