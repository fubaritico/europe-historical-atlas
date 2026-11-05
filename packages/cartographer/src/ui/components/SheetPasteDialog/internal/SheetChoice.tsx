import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useState } from 'react'

import { SHEET_FIELDS } from '@europe-historical-atlas/core/editor/pasteSheet'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { POLITY_FORM_MESSAGES } from '../../PolityForm'
import { SHEET_PASTE_MESSAGES } from '../i18n'
import { sheetTable } from '../utils/sheetRow'

import type { SheetField, SheetLine } from '@europe-historical-atlas/core/editor/pasteSheet'
import type { ChangeEvent } from 'react'

/** What the choice shows and reports. */
export interface SheetChoiceProps {
  /** The copied polity's name. */
  from: string
  /** The polity of the map's name. */
  name: string
  /** The map the sheet was copied in. */
  map: string
  /** The fields that differ, in the form's order. */
  lines: readonly SheetLine[]
  /** Paste the fields ticked. */
  onPaste: (fields: readonly SheetField[]) => void
  /** Close without pasting. */
  onCancel: () => void
}

/**
 * The fields of a sheet's paste, one line each: its name, the map's value, the copied one, and a box — ticked when
 * offered, greyed when not (a suzerain the map does not hold). Mounted afresh at each opening, so every box starts
 * ticked (`s22` « # 3 »).
 * @param props - the two names, the map, the lines and the two answers
 * @param props.from - the copied polity's name
 * @param props.name - the polity of the map's name
 * @param props.map - the map the sheet was copied in
 * @param props.lines - the fields that differ
 * @param props.onPaste - pastes the fields ticked
 * @param props.onCancel - closes without pasting
 * @returns the card
 */
export function SheetChoice({ from, name, map, lines, onPaste, onCancel }: SheetChoiceProps) {
  // Context
  const t = useTranslation(SHEET_PASTE_MESSAGES)
  const field = useTranslation(POLITY_FORM_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [ticked, setTicked] = useState<ReadonlySet<SheetField>>(
    () => new Set(lines.filter((line) => line.offered).map((line) => line.field))
  )

  // Handlers
  const handleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    const which = SHEET_FIELDS.find((each) => each === event.target.value)
    // Each box's value is its line's field: another value is a defect, said.
    if (which === undefined) {
      console.error(
        `[Cartographer] a sheet's box names "${event.target.value}", which is no field.`
      )
      return
    }
    setTicked((before) => {
      const next = new Set(before)
      if (next.has(which)) next.delete(which)
      else next.add(which)
      return next
    })
  }
  const paste = (): void => {
    onPaste(lines.map((line) => line.field).filter((each) => ticked.has(each)))
  }

  // Render
  return (
    <Card>
      <Card.Header>{t('title', { from, name })}</Card.Header>
      <Card.Body>
        <p className="short-dialogue__text">{t('intro', { map, name })}</p>
        {sheetTable(lines, ticked, (each) => field(each), handleToggle, t)}
      </Card.Body>
      <Card.Footer align="end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {action('cancel')}
        </Button>
        <Button ref={autofocusOnOpen} type="button" onClick={paste}>
          {t('paste')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
