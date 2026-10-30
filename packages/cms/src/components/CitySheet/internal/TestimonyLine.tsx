import { IconButton } from '@fubaritico/react/IconButton'

import { TESTIMONY_SUBJECTS } from '@europe-historical-atlas/core/data/cityImportance'

import { sourceTexts } from '../utils/recordFieldTexts'

import { ChoiceField } from './ChoiceField'
import { RecordField } from './RecordField'
import { TestimonyValueField } from './TestimonyValueField'
import { TextField } from './TextField'

import type { CitySheetMessageKey } from '../i18n'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'
import type { TestimonySubject } from '@europe-historical-atlas/core/data/cityImportance'

/** Each subject's label in the screen's texts. */
const SUBJECT_KEYS: Readonly<Record<TestimonySubject, CitySheetMessageKey>> = {
  population: 'population',
  importance: 'lineImportance',
  reason: 'reason',
}

/**
 * One line of the sources: which source, what it speaks about, the one value that subject names, where in the source —
 * and a button to remove the line.
 * @param props - the line's rank, the lists, the search and the removal
 * @param props.index - its rank in the lines, from 0
 * @param props.reasons - the reasons a line may give
 * @param props.searchSources - the sources matching what was typed, from the base
 * @param props.onRemove - removes the line
 * @param props.say - the translator
 * @returns the line
 */
export function TestimonyLine({
  index,
  reasons,
  searchSources,
  onRemove,
  say,
}: {
  index: number
  reasons: readonly RecordChoice[]
  searchSources: (query: string) => Promise<RecordChoice[]>
  onRemove: () => void
  say: Say
}) {
  const path = `testimonies.${String(index)}`
  const rank = index + 1

  return (
    <fieldset className="city-sheet__line">
      <legend className="city-sheet__legend">{say('line', { rank })}</legend>
      <RecordField name={`${path}.source`} texts={sourceTexts(say)} search={searchSources} />
      <ChoiceField
        name={`${path}.subject`}
        label={say('subject')}
        help={say('subjectHelp')}
        choices={TESTIMONY_SUBJECTS.map((value) => ({ value, label: say(SUBJECT_KEYS[value]) }))}
        prompt={say('subjectChoose')}
        named={(value) => say('subjectNamed', { value })}
      />
      <TestimonyValueField index={index} reasons={reasons} say={say} />
      <TextField name={`${path}.where`} label={say('where')} help={say('whereHelp')} />
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
