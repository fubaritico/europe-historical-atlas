import { IconButton } from '@fubaritico/react/IconButton'

import { TESTIMONY_SUBJECTS } from '@europe-historical-atlas/core/data/cityImportance'

import { ChoiceField } from './ChoiceField'
import { FormRelationField } from './FormRelationField'
import { TestimonyValueField } from './TestimonyValueField'
import { TextField } from './TextField'

import type { CitySheetMessageKey } from '../i18n'
import type { Say } from '../utils/say'
import type { SheetLists } from '../utils/sheetValues'
import type { TestimonySubject } from '@europe-historical-atlas/core/data/cityImportance'

/** Each subject's label in the screen's texts. */
const SUBJECT_KEYS: Readonly<Record<TestimonySubject, CitySheetMessageKey>> = {
  population: 'population',
  importance: 'lineImportance',
  reason: 'reason',
  holder: 'holderSubject',
  community: 'communitySubject',
}

/**
 * One line of the sources: which source, what it speaks about, the one value that subject names, where in the source,
 * its own words — and a button to remove the line.
 * @param props - the line's rank, the lists and the removal
 * @param props.index - its rank in the lines, from 0
 * @param props.lists - the reasons a line may give, the confessions it may name
 * @param props.onRemove - removes the line
 * @param props.say - the translator
 * @returns the line
 */
export function TestimonyLine({
  index,
  lists,
  onRemove,
  say,
}: {
  index: number
  lists: SheetLists
  onRemove: () => void
  say: Say
}) {
  const path = `testimonies.${String(index)}`
  const rank = index + 1

  return (
    <fieldset className="city-sheet__line">
      <legend className="city-sheet__legend">{say('line', { rank })}</legend>
      <FormRelationField
        name={`${path}.source`}
        collection="sources"
        label={say('source')}
        description={say('sourceHelp')}
      />
      <ChoiceField
        name={`${path}.subject`}
        label={say('subject')}
        help={say('subjectHelp')}
        choices={TESTIMONY_SUBJECTS.map((value) => ({ value, label: say(SUBJECT_KEYS[value]) }))}
        prompt={say('subjectChoose')}
        named={(value) => say('subjectNamed', { value })}
      />
      <TestimonyValueField index={index} lists={lists} say={say} />
      <TextField name={`${path}.where`} label={say('where')} help={say('whereHelp')} />
      <TextField name={`${path}.quotation`} label={say('quotation')} help={say('quotationHelp')} />
      <div className="city-sheet__line-actions">
        <IconButton
          type="button"
          size="sm"
          icon="XMark"
          aria-label={say('removeLine', { rank })}
          onClick={onRemove}
        />
      </div>
    </fieldset>
  )
}
