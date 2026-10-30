import { Checkbox } from '@fubaritico/react/Checkbox'
import { Dropdown } from '@fubaritico/react/Dropdown'
import { useFormikContext } from 'formik'

import { NumberField } from './NumberField'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * One end of the date — its year, month and day; « vers » and its margin; the calendar, shown only once a day is
 * typed, since a calendar counts only for a day.
 * @param props - which end, its title and the translator
 * @param props.end - `start` or `end`
 * @param props.title - what the end is called
 * @param props.help - a sentence under the title, for the end only
 * @param props.say - the translator
 * @returns the end's fields
 */
export function MomentFields({
  end,
  title,
  help,
  say,
}: {
  end: 'start' | 'end'
  title: string
  help?: string
  say: Say
}) {
  const { values, getFieldProps, setFieldValue } = useFormikContext<SheetValues>()
  const moment = values.date[end]
  const path = `date.${end}`

  // Handlers
  const handleCalendar = (value: string) => {
    void setFieldValue(`${path}.calendar`, value)
  }

  return (
    <fieldset className="city-sheet__moment">
      <legend className="city-sheet__legend">{title}</legend>
      {help !== undefined && <p className="city-sheet__help">{help}</p>}
      <div className="city-sheet__row">
        <NumberField name={`${path}.year`} label={say('year')} help={say('yearHelp')} />
        <NumberField name={`${path}.month`} label={say('month')} help={say('monthHelp')} />
        <NumberField name={`${path}.day`} label={say('day')} help={say('dayHelp')} />
      </div>
      <div className="city-sheet__row">
        <Checkbox
          {...getFieldProps({ name: `${path}.circa`, type: 'checkbox' })}
          label={say('circa')}
        />
        <NumberField name={`${path}.margin`} label={say('margin')} help={say('marginHelp')} />
        {moment.day.trim() !== '' && (
          <Dropdown
            label={say('calendar')}
            options={[
              { value: 'julian', label: say('julian') },
              { value: 'gregorian', label: say('gregorian') },
            ]}
            selectedValue={moment.calendar}
            onSelect={handleCalendar}
            menuAriaLabel={say('calendarHelp')}
          />
        )}
      </div>
    </fieldset>
  )
}
