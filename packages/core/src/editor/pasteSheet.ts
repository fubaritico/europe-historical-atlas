/**
 * Pasting a sheet onto a polity of the map (CARTO-345, `s22` « # 3 », `files/plans/cartographer/copy-paste-between-maps.md`):
 * the fields of a copied polity — its name, rank, dates, colour, suzerain… — onto a polity the map already holds, its
 * outline untouched. The author chooses the fields, line by line; the polity's id is never offered.
 *
 * **The suzerain travels by its name**, as a pasted polity's does (the dev, 2026-11-05): the copied sheet names it,
 * and the target map's polity of that name is the one taken. A suzerain the map does not hold is shown and not
 * offered.
 */

import { updatePolity } from './documentEdits'

import type { CopiedPolity } from './clipboard'
import type { YearDocument } from '../data/yearDocument'
import type { YearPolity } from '../data/yearFormat'

/** A sheet to paste: a polity's, with its suzerain's name — a copied polity's, or a sheet copied alone. */
type Sheet = Pick<CopiedPolity, 'polity' | 'suzerainName'>

/** The fields a sheet's paste offers, in the form's order. The id is never one. */
export const SHEET_FIELDS = [
  'name',
  'shortName',
  'forceShortName',
  'rank',
  'status',
  'suzerain',
  'existsFrom',
  'existsTo',
  'colour',
  'wikidata',
] as const

/** One field of {@link SHEET_FIELDS}. */
export type SheetField = (typeof SHEET_FIELDS)[number]

/** A field's value as the dialogue shows it — the suzerain by its name. */
export type SheetValue = string | number | boolean | null

/** One field that differs between the two sheets. */
export interface SheetLine {
  /** The field. */
  field: SheetField
  /** Its value on the polity of the map. */
  current: SheetValue
  /** Its value on the copied sheet. */
  copied: SheetValue
  /** Whether it can be pasted — `false` for a suzerain the map does not hold, or the polity itself. */
  offered: boolean
}

/**
 * A field's value on a sheet, the suzerain by its name.
 * @param polity - the sheet
 * @param field - the field
 * @param suzerainName - the suzerain's name, as the sheet's map writes it, or `null`
 * @returns the value
 */
function valueOf(polity: YearPolity, field: SheetField, suzerainName: string | null): SheetValue {
  switch (field) {
    case 'suzerain':
      return suzerainName
    case 'shortName':
      return polity.shortName ?? null
    case 'forceShortName':
      return polity.forceShortName === true
    default:
      return polity[field]
  }
}

/**
 * A polity's suzerain's name in its map.
 * @param doc - the map
 * @param polity - the polity
 * @returns the name, or `null` for a sovereign
 * @throws when the suzerain is not in the map — a map opened is cross-checked, so this is a defect
 */
function suzerainNameIn(doc: YearDocument, polity: YearPolity): string | null {
  if (polity.suzerain === null) return null
  const found = doc.polities.find((each) => each.id === polity.suzerain)
  if (found === undefined) {
    throw new Error(`[Cartographer] the suzerain "${polity.suzerain}" names no polity of the map.`)
  }
  return found.name
}

/**
 * The fields that differ between a copied sheet and a polity of the map, in the form's order.
 * @param doc - the map
 * @param copied - the copied polity
 * @param targetId - the polity of the map the sheet would be pasted onto
 * @returns the lines, empty when the two sheets are the same; `null` when the map holds no such polity
 */
export function sheetDifferences(
  doc: YearDocument,
  copied: Sheet,
  targetId: string
): SheetLine[] | null {
  const target = doc.polities.find((polity) => polity.id === targetId)
  if (target === undefined) return null
  const targetSuzerain = suzerainNameIn(doc, target)
  const suzerain =
    copied.suzerainName === null
      ? null
      : doc.polities.find((polity) => polity.name === copied.suzerainName)
  return SHEET_FIELDS.flatMap((field): SheetLine[] => {
    const current = valueOf(target, field, targetSuzerain)
    const value = valueOf(copied.polity, field, copied.suzerainName)
    if (current === value) return []
    // A suzerain the map lacks, or the polity itself, cannot be taken.
    const offered =
      field !== 'suzerain' ||
      copied.suzerainName === null ||
      (suzerain !== undefined && suzerain !== null && suzerain.id !== targetId)
    return [{ field, current, copied: value, offered }]
  })
}

/**
 * Take one field of a copied sheet onto a polity's next sheet — the suzerain found by its name in the map.
 * @param doc - the map
 * @param next - the sheet being built, edited in place
 * @param copied - the copied polity
 * @param field - the field, offered
 * @throws when an offered suzerain is not in the map — `sheetDifferences` offers it only when it is
 */
function takeField(doc: YearDocument, next: YearPolity, copied: Sheet, field: SheetField): void {
  const source = copied.polity
  if (field === 'suzerain') {
    const name = copied.suzerainName
    const found = name === null ? null : doc.polities.find((polity) => polity.name === name)
    if (found === undefined)
      throw new Error(`[Cartographer] the suzerain "${String(name)}" is not in the map.`)
    next.suzerain = found === null ? null : found.id
  } else if (field === 'shortName') {
    if (source.shortName === undefined) delete next.shortName
    else next.shortName = source.shortName
  } else if (field === 'forceShortName') {
    if (source.forceShortName === undefined) delete next.forceShortName
    else next.forceShortName = true
  } else {
    Object.assign(next, { [field]: source[field] })
  }
}

/** Why a sheet was not pasted — nothing was written. */
export type SheetPasteRefusal =
  /** The polity is not in the map: the selection and the map disagree. */
  | 'no-polity'
  /** The name chosen is another polity's in this map. */
  | 'name-taken'
  /** The suzerain chosen would close a loop of homage or seat the polity too deep. */
  | 'homage'

/**
 * Paste the fields chosen of a copied sheet onto a polity of the map, its id and its outline kept.
 * @param doc - the map, edited in place
 * @param copied - the copied polity
 * @param targetId - the polity of the map
 * @param fields - the fields chosen; a field not offered (`sheetDifferences`) is left as it is
 * @returns `true` when it was pasted, or why nothing was
 */
export function pasteSheet(
  doc: YearDocument,
  copied: Sheet,
  targetId: string,
  fields: readonly SheetField[]
): true | SheetPasteRefusal {
  const target = doc.polities.find((polity) => polity.id === targetId)
  if (target === undefined) return 'no-polity'
  const offered = new Set(
    (sheetDifferences(doc, copied, targetId) ?? [])
      .filter((line) => line.offered)
      .map((line) => line.field)
  )
  const next: YearPolity = { ...target }
  for (const field of fields) if (offered.has(field)) takeField(doc, next, copied, field)
  if (next.name !== target.name && doc.polities.some((polity) => polity.name === next.name)) {
    return 'name-taken'
  }
  return updatePolity(doc, next) ? true : 'homage'
}
