import { Checkbox } from '@fubaritico/react/Checkbox'

import { sheetValueText } from './sheetValueText'

import type { SheetPasteMessageKey } from '../i18n'
import type { SheetField, SheetLine } from '@europe-historical-atlas/core/editor/pasteSheet'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { ChangeEvent } from 'react'

/**
 * One line of the sheet's paste: the field's box — its name the polity form's — the map's value, the copied one. The
 * box carries the field as its value, so one handler serves every line.
 * @param line - the field that differs
 * @param ticked - whether its box is ticked
 * @param label - the field's name, in the page's language
 * @param onToggle - the boxes' one handler, reading the field from the box's value
 * @param t - the dialogue's words
 * @returns the row
 */
export function sheetRow(
  line: SheetLine,
  ticked: boolean,
  label: string,
  onToggle: (event: ChangeEvent<HTMLInputElement>) => void,
  t: Translate<SheetPasteMessageKey>
) {
  const copied = sheetValueText(line.copied, t)
  return (
    <tr key={line.field}>
      <th scope="row">
        <Checkbox
          size="sm"
          label={label}
          value={line.field}
          checked={line.offered && ticked}
          disabled={!line.offered}
          onChange={onToggle}
        />
      </th>
      <td>{sheetValueText(line.current, t)}</td>
      <td>{line.offered ? copied : `${copied} (${t('notOffered')})`}</td>
    </tr>
  )
}

/**
 * The sheet's paste's table: a head naming the two columns, a row per field that differs.
 * @param lines - the fields that differ
 * @param ticked - the fields ticked
 * @param label - a field's name, in the page's language
 * @param onToggle - the boxes' one handler
 * @param t - the dialogue's words
 * @returns the table
 */
export function sheetTable(
  lines: readonly SheetLine[],
  ticked: ReadonlySet<SheetField>,
  label: (field: SheetField) => string,
  onToggle: (event: ChangeEvent<HTMLInputElement>) => void,
  t: Translate<SheetPasteMessageKey>
) {
  return (
    <table className="sheet-paste">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">{t('here')}</th>
          <th scope="col">{t('copied')}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) =>
          sheetRow(line, ticked.has(line.field), label(line.field), onToggle, t)
        )}
      </tbody>
    </table>
  )
}
