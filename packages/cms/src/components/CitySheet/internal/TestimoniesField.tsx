import { Button } from '@fubaritico/react/Button'
import { FieldArray, useFormikContext } from 'formik'
import { useRef } from 'react'

import { emptyTestimony } from '../utils/sheetValues'

import { TestimonyLine } from './TestimonyLine'

import type { Say } from '../utils/say'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * What the sources say of the city, one line a thing said (decision 5) — Formik's `FieldArray`: a button adds a line,
 * each line has its own to remove it, after which the keyboard is on the add button. None is a sheet with no source
 * yet.
 * @param props - the reasons, the search of the sources and the translator
 * @param props.reasons - the reasons a line may give
 * @param props.searchSources - the sources matching what was typed, from the base
 * @param props.say - the translator
 * @returns the field
 */
export function TestimoniesField({
  reasons,
  searchSources,
  say,
}: {
  reasons: readonly RecordChoice[]
  searchSources: (query: string) => Promise<RecordChoice[]>
  say: Say
}) {
  const { values } = useFormikContext<SheetValues>()
  // The line's remove button goes with the line: the focus goes to the add button, never to the page
  const adder = useRef<HTMLDivElement>(null)
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('testimonies')}</legend>
      <p className="city-sheet__help">{say('testimoniesHelp')}</p>
      <FieldArray name="testimonies">
        {(lines) => (
          <>
            {values.testimonies.map((line, index) => (
              <TestimonyLine
                key={line.key}
                index={index}
                reasons={reasons}
                searchSources={searchSources}
                onRemove={() => {
                  lines.remove(index)
                  adder.current?.querySelector('button')?.focus()
                }}
                say={say}
              />
            ))}
            <div ref={adder}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  lines.push(emptyTestimony())
                }}
              >
                {say('addLine')}
              </Button>
            </div>
          </>
        )}
      </FieldArray>
    </fieldset>
  )
}
