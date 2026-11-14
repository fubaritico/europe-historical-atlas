import { Button } from '@fubaritico/react/Button'
import { FieldArray, useFormikContext } from 'formik'
import { useRef } from 'react'

import { emptyCommunity } from '../utils/sheetValues'

import { CommunityLine } from './CommunityLine'

import type { Say } from '../utils/say'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * The religious communities the sources attest in the city at that date (CMS-433) — Formik's `FieldArray`, as the lines
 * of the sources: a button adds one, each has its own to remove it, after which the keyboard is on the add button.
 * None is a sheet with no community entered yet.
 * @param props - the confessions and the translator
 * @param props.confessions - every confession of the CMS's list
 * @param props.say - the translator
 * @returns the field
 */
export function CommunitiesField({
  confessions,
  say,
}: {
  confessions: readonly RecordChoice[]
  say: Say
}) {
  // Context
  const { values } = useFormikContext<SheetValues>()

  // Refs — a community's remove button goes with it: the focus goes to the add button, never to the page
  const adder = useRef<HTMLDivElement>(null)

  // Render
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('communities')}</legend>
      <p className="city-sheet__help">
        {confessions.length === 0 ? say('confessionsNone') : say('communitiesHelp')}
      </p>
      <FieldArray name="communities">
        {(list) => (
          <>
            {values.communities.map((community, index) => (
              <CommunityLine
                key={community.key}
                index={index}
                confessions={confessions}
                onRemove={() => {
                  list.remove(index)
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
                  list.push(emptyCommunity())
                }}
              >
                {say('addCommunity')}
              </Button>
            </div>
          </>
        )}
      </FieldArray>
    </fieldset>
  )
}
