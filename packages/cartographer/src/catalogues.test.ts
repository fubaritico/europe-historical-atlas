import { describe, expect, it } from 'vitest'

import { catalogueMismatches, createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { LOCALES } from '@europe-historical-atlas/core/i18n/locale'
import { parseMessage } from '@europe-historical-atlas/core/i18n/messageFormat'

import type { SnapLayer, WaterWords, WeldOffer } from './canvas/tools/toolSession'
import type { NoticeTopic } from './persistence/notice'
import type { LayerId } from './state/layersSlice'
import type { EditorTool, PenMode } from './state/toolSlice'
import type {
  Anachronism,
  NotASubject,
  WikidataField,
  WikidataSuggestion,
} from './wikidata/wikidataFacts'
import type { WeldRefusal } from '@europe-historical-atlas/core/editor/anchorWeld'
import type { HandPattern } from '@europe-historical-atlas/core/editor/borderHands'
import type { BorderRelation } from '@europe-historical-atlas/core/editor/borderRelation'
import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'
import type { MessageNode } from '@europe-historical-atlas/core/i18n/messageFormat'
import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

// Every catalogue of the Cartographer, found by its file name rather than listed: a catalogue added later is
// checked without anyone remembering to add it here (ATLAS-159).
const MODULES = import.meta.glob<Record<string, unknown>>(
  ['./**/i18n/index.ts', './**/i18n/*/index.ts'],
  { eager: true }
)

/**
 * Whether an export is a catalogue: one record of messages per language.
 * @param value - an export of a catalogue module
 * @returns `true` for a catalogue
 */
function isCatalogue(value: unknown): value is Catalogue<string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    LOCALES.every((locale) => typeof (value as Record<string, unknown>)[locale] === 'object')
  )
}

const CATALOGUES = Object.entries(MODULES).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([, value]) => isCatalogue(value))
    .map(([name, value]) => ({ name, file, catalogue: value as Catalogue<string> }))
)

/**
 * The members of a closed set, from its type: a `Record` over the union fails the type-check when a member
 * is added to the type and not here.
 * @param members - every member, as a record's keys
 * @returns the members
 */
const all = <Member extends string>(members: Record<Member, true>): string[] => Object.keys(members)

/** Yes or no, as the messages that branch on a boolean spell it. */
const YES_NO = all<'yes' | 'no'>({ yes: true, no: true })

/**
 * **Every `select` names every member of a closed set** — QUAL-001 of 2026-10-22: a `select`'s `other` once
 * stood for one real member, so a member added later read as that one in silence (a weld on a border was
 * worded by `other` and nobody saw `stretch` reach it). Now `other` echoes the value it was given, which only
 * a defect reaches, and visibly. Keyed by catalogue, message and argument.
 */
const CLOSED: Readonly<Record<string, readonly string[]>> = {
  'ALARM_MESSAGES.title.topic': all<NoticeTopic>({ year: true, draft: true, snapshot: true }),
  'TOOL_MESSAGES.toolName.tool': all<EditorTool>({
    navigate: true,
    draw: true,
    edit: true,
    retrace: true,
  }),
  'TOOL_MESSAGES.penMode.mode': all<PenMode>({
    free: true,
    coast: true,
    river: true,
    pencil: true,
  }),
  'CANVAS_MESSAGES.zoomInTo.tool': all<Exclude<EditorTool, 'navigate'>>({
    draw: true,
    edit: true,
    retrace: true,
  }),
  'CANVAS_MESSAGES.following.water': all<WaterWords['water']>({
    coast: true,
    river: true,
    unnamed: true,
  }),
  'CANVAS_MESSAGES.retracingFollowing.water': all<WaterWords['water']>({
    coast: true,
    river: true,
    unnamed: true,
  }),
  'CANVAS_MESSAGES.insertedFromWater.water': all<WaterWords['water']>({
    coast: true,
    river: true,
    unnamed: true,
  }),
  'CANVAS_MESSAGES.drawing.edge': all<'edge' | 'corner' | 'none'>({
    edge: true,
    corner: true,
    none: true,
  }),
  'CANVAS_MESSAGES.retracing.edge': all<'edge' | 'corner' | 'none'>({
    edge: true,
    corner: true,
    none: true,
  }),
  'CANVAS_MESSAGES.drawingNoWater.layer': all<SnapLayer>({ coast: true, river: true }),
  'CANVAS_MESSAGES.tooFar.verb': all<'draw' | 'edit'>({ draw: true, edit: true }),
  'CANVAS_MESSAGES.notWelded.why': all<'nothing' | WeldRefusal['refused']>({
    nothing: true,
    pinch: true,
    collapse: true,
  }),
  'CANVAS_MESSAGES.welded.whose': all<'none' | 'named'>({ none: true, named: true }),
  'CANVAS_MESSAGES.welded.onto': all<WeldOffer['kind']>({ anchor: true, stretch: true }),
  'CANVAS_MESSAGES.borderUnder.relation': all<BorderRelation>({
    sovereign: true,
    vassal: true,
    'co-vassal': true,
    unclaimed: true,
    coastline: true,
  }),
  'MAP_AREA_MESSAGES.phase.phase': all<ComputePhase>({
    rasterise: true,
    expand: true,
    colours: true,
    bake: true,
    borders: true,
    names: true,
  }),
  'LAYERS_PANEL_MESSAGES.layerName.id': all<LayerId>({
    backdrop: true,
    fills: true,
    coastline: true,
    rivers: true,
    borders: true,
    unclaimed: true,
  }),
  'BORDER_MESSAGES.handName.hand': all<HandPattern | 'auto'>({
    auto: true,
    solid: true,
    dotted: true,
    dashed: true,
    double: true,
    none: true,
  }),
  'BORDER_MESSAGES.handButton.hand': all<HandPattern | 'auto'>({
    auto: true,
    solid: true,
    dotted: true,
    dashed: true,
    double: true,
    none: true,
  }),
  'POLITIES_PANEL_MESSAGES.deleteQuestion.what': all<'none' | 'rings' | 'vassals' | 'both'>({
    none: true,
    rings: true,
    vassals: true,
    both: true,
  }),
  'WIKIDATA_PANEL_MESSAGES.notASubject.kind': all<NotASubject>({
    category: true,
    disambiguation: true,
    list: true,
  }),
  'WIKIDATA_PANEL_MESSAGES.anachronism.when': all<Anachronism['when']>({
    notYet: true,
    noLonger: true,
  }),
  'WIKIDATA_PANEL_MESSAGES.fieldName.field': all<WikidataField>({
    name: true,
    existsFrom: true,
    existsTo: true,
    suzerain: true,
  }),
  'WIKIDATA_PANEL_MESSAGES.verb.state': all<WikidataSuggestion['state']>({
    empty: true,
    differs: true,
    same: true,
  }),
  // The shell's empty zones — `Editor/internal/Placeholder`'s `PlaceholderZone`, private to its folder.
  'EDITOR_MESSAGES.placeholder.zone': ['appBar', 'docBar', 'tools', 'panels'],
  // The design system's eight hue bands (`@fubaritico/behaviors`' `hueName`), and `describeColour`'s bands.
  'COLOUR_PICKER_MESSAGES.chromatic.hue': [
    'red',
    'orange',
    'yellow',
    'green',
    'cyan',
    'blue',
    'purple',
    'pink',
  ],
  'COLOUR_PICKER_MESSAGES.chromatic.lightness': ['veryDark', 'dark', 'light', 'veryLight', 'none'],
  'COLOUR_PICKER_MESSAGES.chromatic.saturation': ['grayish', 'vivid', 'none'],
  'COLOUR_PICKER_MESSAGES.achromatic.shade': ['black', 'white', 'darkGray', 'lightGray', 'gray'],
  'OVERWRITE_MESSAGES.question.known': YES_NO,
  'PERSISTENCE_MESSAGES.notSavedChanged.known': YES_NO,
  'PERSISTENCE_MESSAGES.draftSetAside.logged': YES_NO,
}

/**
 * The `select`s over an open vocabulary: a value the file holds and the interface does not know is shown as it
 * is stored — a rank `lordship`, a key the tooltip has no word for.
 */
const OPEN = new Set([
  'POLITY_MESSAGES.rankName.rank',
  'POLITY_MESSAGES.statusName.status',
  'TOOL_MESSAGES.keyName.key',
])

/** One `select` of a message, wherever it sits in it. */
interface SelectFound {
  /** Where: catalogue, message and argument, as {@link CLOSED} keys it. */
  where: string
  /** The language of the message it was found in. */
  locale: string
  /** Its cases. */
  cases: ReadonlyMap<string, readonly MessageNode[]>
}

/**
 * Every `select` of a parsed message, its nested ones included.
 * @param nodes - the message, parsed
 * @param at - the catalogue and the message, for the key
 * @param locale - the message's language
 * @returns the selects found
 */
function selectsIn(nodes: readonly MessageNode[], at: string, locale: string): SelectFound[] {
  return nodes.flatMap((node) => {
    if (node.kind !== 'select' && node.kind !== 'plural') return []
    const nested = [...node.cases.values()].flatMap((branch) => selectsIn(branch, at, locale))
    return node.kind === 'select'
      ? [{ where: `${at}.${node.name}`, locale, cases: node.cases }, ...nested]
      : nested
  })
}

const SELECTS = CATALOGUES.flatMap(({ name, catalogue }) =>
  LOCALES.flatMap((locale) =>
    Object.entries<string>(catalogue[locale]).flatMap(([key, pattern]) =>
      selectsIn(parseMessage(pattern), `${name}.${key}`, locale)
    )
  )
)

describe('the Cartographer catalogues', () => {
  describe('happy path', () => {
    it('finds the catalogues by their file names', () => {
      expect(CATALOGUES.length).toBe(27)
    })
  })

  describe('variants', () => {
    it.each(CATALOGUES)('$file $name: every message reads in every language', ({ catalogue }) => {
      for (const locale of LOCALES) expect(() => createTranslator(catalogue, locale)).not.toThrow()
    })

    // The type sees a key `fr.json` lacks; only this sees one it has and `en.json` does not.
    it.each(CATALOGUES)('$file $name: both languages hold the same keys', ({ catalogue }) => {
      expect(Object.keys(catalogue.fr).sort()).toEqual(Object.keys(catalogue.en).sort())
    })

    it.each(CATALOGUES)('$file $name: both languages take the same values', ({ catalogue }) => {
      expect(catalogueMismatches(catalogue)).toEqual([])
    })

    it.each(SELECTS.filter((found) => found.where in CLOSED))(
      '$where ($locale) names every member of its closed set, and only those',
      ({ where, cases }) => {
        const named = [...cases.keys()].filter((key) => key !== 'other').sort()
        expect(named).toEqual([...(CLOSED[where] ?? [])].sort())
      }
    )

    it.each(SELECTS.filter((found) => found.where in CLOSED))(
      '$where ($locale) echoes the value in `other`, which only a defect reaches',
      ({ where, cases }) => {
        const argument = where.split('.').at(-1)
        expect(cases.get('other')).toEqual([{ kind: 'argument', name: argument }])
      }
    )
  })

  describe('managed errors', () => {
    // The other way round: an entry naming no select — a message renamed, a catalogue moved — would guard
    // nothing and say nothing.
    it('names in its tables only selects that exist', () => {
      const found = new Set(SELECTS.map((select) => select.where))
      const stale = [...Object.keys(CLOSED), ...OPEN].filter((where) => !found.has(where))
      expect(stale).toEqual([])
    })

    // A select added later must say which it is: no third kind, so none escapes the two checks above.
    it('knows every select as closed or open', () => {
      const unknown = SELECTS.map((found) => found.where).filter(
        (where) => !(where in CLOSED) && !OPEN.has(where)
      )
      expect([...new Set(unknown)]).toEqual([])
    })
  })

  // L4 (unmanaged) and L5 (edge cases) are the engine's, tested in core's i18n.
})
