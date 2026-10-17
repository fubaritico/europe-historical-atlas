/**
 * What a Wikidata item says about a polity, read from the API's answer, and what the editor makes of it
 * (CARTO-243, the dev's call of 2026-10-17: names, dates and suzerain, *« le plus d'informations, le mieux »*).
 *
 * **Wikidata proposes, the author decides.** A medieval item is often thin — the Kingdom of Norway's has no
 * capital — and sometimes noisy: the Kingdom of Jerusalem's *country* lists modern Syria and Lebanon. So
 * nothing here writes a field: it reads the item into plain facts, and compares them with the form. The
 * data is CC0; images (flags, arms) are left out, their licence being per file on Commons.
 *
 * Pure: the item is the JSON the API sent, the rest are literals — measured on four real items of the dev's
 * 1100 on 2026-10-17 (County of Tripoli, Kingdom of Jerusalem, Armenian Cilicia, and a *category* entered by
 * mistake for the Emirate of Mosul).
 */

/** The properties read, by their Wikidata number. */
const PROPERTY = {
  instanceOf: 'P31',
  inception: 'P571',
  dissolved: 'P576',
  country: 'P17',
  partOf: 'P361',
  replaces: 'P1365',
  follows: 'P155',
  replacedBy: 'P1366',
  followedBy: 'P156',
} as const

/** Items that are pages about Wikipedia itself, never a polity — an id entered by mistake. */
const NOT_A_SUBJECT: Readonly<Record<string, string>> = {
  Q4167836: 'a Wikipedia category',
  Q4167410: 'a disambiguation page',
  Q13406463: 'a Wikipedia list',
}

/** The facts the editor uses, read from one item. */
export interface WikidataFacts {
  /** The item's id, `Q…`. */
  id: string
  /** Its name in English and in French, when the item has one. */
  labels: { en: string | null; fr: string | null }
  /** The year it began, or `null` when the item does not say. */
  inception: number | null
  /** The year it ended, or `null` when the item does not say. */
  dissolved: number | null
  /** The items it belonged to — *country* (P17) then *part of* (P361) — as `Q…`, best rank first. */
  belongsTo: string[]
  /** What it followed (P1365, P155), as `Q…`. */
  predecessors: string[]
  /** What followed it (P1366, P156), as `Q…`. */
  successors: string[]
  /** Its Wikipedia articles, by language, as URLs. */
  wikipedia: { en: string | null; fr: string | null }
  /** When the item is not a subject at all — *"a Wikipedia category"* — or `null`. */
  notASubject: string | null
}

/** One claim of the API's answer, reduced to what is read. */
interface Claim {
  rank?: string
  mainsnak?: { datavalue?: { value?: unknown } }
}

/**
 * Read an unknown value as a record, or `null`.
 * @param value - anything
 * @returns the value as a record, or `null` when it is not an object
 */
function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * The claims of a property, the deprecated ones dropped and the preferred ones first — Wikidata's ranks.
 * @param claims - the item's `claims`
 * @param property - e.g. `P571`
 * @returns the claims kept, best rank first
 */
function claimsOf(claims: Record<string, unknown>, property: string): Claim[] {
  const list = claims[property]
  if (!Array.isArray(list)) return []
  const kept = (list as Claim[]).filter((claim) => claim.rank !== 'deprecated')
  return [
    ...kept.filter((claim) => claim.rank === 'preferred'),
    ...kept.filter((claim) => claim.rank !== 'preferred'),
  ]
}

/**
 * The year of a Wikidata time — `+1102-00-00T00:00:00Z` is 1102, `-0044-03-15T…` is −44.
 * @param time - the time string
 * @returns the year, or `null` when the string is not a Wikidata time
 */
export function yearOfTime(time: string): number | null {
  const match = /^([+-])(\d+)-/.exec(time)
  if (match === null) return null
  const year = Number(match[2])
  return match[1] === '-' ? -year : year
}

/**
 * The first year a property gives.
 * @param claims - the item's claims
 * @param property - a time property
 * @returns the year, or `null`
 */
function firstYear(claims: Record<string, unknown>, property: string): number | null {
  for (const claim of claimsOf(claims, property)) {
    const time = recordOf(claim.mainsnak?.datavalue?.value)?.time
    if (typeof time === 'string') return yearOfTime(time)
  }
  return null
}

/**
 * Every item a set of properties points to, in order, without repeats.
 * @param claims - the item's claims
 * @param properties - item properties
 * @returns the `Q…` ids
 */
function itemsOf(claims: Record<string, unknown>, properties: readonly string[]): string[] {
  const ids: string[] = []
  for (const property of properties)
    for (const claim of claimsOf(claims, property)) {
      const id = recordOf(claim.mainsnak?.datavalue?.value)?.id
      if (typeof id === 'string' && !ids.includes(id)) ids.push(id)
    }
  return ids
}

/**
 * A label in one language.
 * @param entity - the item
 * @param language - `en`, `fr`
 * @returns the label, or `null`
 */
function labelOf(entity: Record<string, unknown>, language: string): string | null {
  const value = recordOf(recordOf(entity.labels)?.[language])?.value
  return typeof value === 'string' ? value : null
}

/**
 * The URL of a Wikipedia article from its sitelink.
 * @param entity - the item
 * @param language - `en`, `fr`
 * @returns the URL, or `null` when the item has no article in that language
 */
function articleOf(entity: Record<string, unknown>, language: string): string | null {
  const title = recordOf(recordOf(entity.sitelinks)?.[`${language}wiki`])?.title
  if (typeof title !== 'string') return null
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

/**
 * Read one item of the API's answer (`wbgetentities`) into facts.
 * @param entity - the item, as the API sent it
 * @returns the facts, or `null` when the value is not an item at all
 */
export function readEntity(entity: unknown): WikidataFacts | null {
  const item = recordOf(entity)
  if (item === null || typeof item.id !== 'string' || 'missing' in item) return null
  const claims = recordOf(item.claims) ?? {}
  const kinds = itemsOf(claims, [PROPERTY.instanceOf])
  const notASubject = kinds.map((kind) => NOT_A_SUBJECT[kind]).find((name) => name !== undefined)
  return {
    id: item.id,
    labels: { en: labelOf(item, 'en'), fr: labelOf(item, 'fr') },
    inception: firstYear(claims, PROPERTY.inception),
    dissolved: firstYear(claims, PROPERTY.dissolved),
    belongsTo: itemsOf(claims, [PROPERTY.country, PROPERTY.partOf]),
    predecessors: itemsOf(claims, [PROPERTY.replaces, PROPERTY.follows]),
    successors: itemsOf(claims, [PROPERTY.replacedBy, PROPERTY.followedBy]),
    wikipedia: { en: articleOf(item, 'en'), fr: articleOf(item, 'fr') },
    notASubject: notASubject ?? null,
  }
}

/**
 * An item's name for the author: English, else French, else its id.
 * @param facts - the item's facts
 * @returns the name
 */
export function nameOf(facts: WikidataFacts): string {
  return facts.labels.en ?? facts.labels.fr ?? facts.id
}

/**
 * A year, or `?` where Wikidata says nothing.
 * @param year - the year, or `null`
 * @returns the text
 */
function yearOrUnknown(year: number | null): string {
  return year === null ? '?' : String(year)
}

/**
 * An item's years as one span — *"1102–1289"*, a `?` where Wikidata says nothing.
 * @param facts - the item's facts
 * @returns the span
 */
export function spanOf(facts: WikidataFacts): string {
  return `${yearOrUnknown(facts.inception)}–${yearOrUnknown(facts.dissolved)}`
}

/**
 * Whether the year edited falls outside the polity's Wikidata dates — *"County of Tripoli 1102–1289:
 * does not exist yet in 1100"*. A warning, never a refusal (the correction tools' rule).
 * @param year - the year being edited
 * @param facts - the item's facts
 * @returns the sentence for the author, or `null` when the dates hold the year or say nothing
 */
export function anachronism(year: number, facts: WikidataFacts): string | null {
  const span = spanOf(facts)
  const name = nameOf(facts)
  if (facts.inception !== null && facts.inception > year)
    return `Wikidata: ${name} ${span} — does not exist yet in ${String(year)}`
  if (facts.dissolved !== null && facts.dissolved < year)
    return `Wikidata: ${name} ${span} — no longer exists in ${String(year)}`
  return null
}

/** A field of the form Wikidata can fill. */
export type WikidataField = 'name' | 'existsFrom' | 'existsTo' | 'suzerain'

/** What Wikidata proposes for one field of the form. */
export interface WikidataSuggestion {
  /** The field. */
  field: WikidataField
  /** The value to write into the form, as the form holds it (a year as text, a polity's id). */
  value: string
  /** What the author reads — the suzerain's name rather than its id. */
  shown: string
  /** `empty` — the field is blank, take it; `differs` — the author wrote something else; `same` — agreed. */
  state: 'empty' | 'differs' | 'same'
}

/** The form's fields Wikidata is compared with, as the form holds them. */
export interface WikidataComparable {
  /** As typed. */
  name: string
  /** As typed: empty, or a year. */
  existsFrom: string
  /** As typed: empty, or a year. */
  existsTo: string
  /** The suzerain's id, or `null`. */
  suzerain: string | null
}

/** A polity of the year, reduced to what the suzerain match reads. */
export interface PolityWithWikidata {
  /** Its id. */
  id: string
  /** Its name. */
  name: string
  /** Its Wikidata id, or `null`. */
  wikidata: string | null
}

/**
 * Compare one field with its proposal.
 * @param field - the field
 * @param held - what the form holds, `''` or `null` for nothing
 * @param value - what Wikidata proposes
 * @param shown - how the proposal reads
 * @returns the suggestion
 */
function compare(
  field: WikidataField,
  held: string | null,
  value: string,
  shown: string
): WikidataSuggestion {
  const state =
    held === null || held.trim() === '' ? 'empty' : held.trim() === value ? 'same' : 'differs'
  return { field, value, shown, state }
}

/**
 * What Wikidata proposes for the form: the name (English, else French), the two years, and the suzerain —
 * the first item the polity belongs to that a polity of this year carries as its own Wikidata id. Wikidata's
 * *country* on a medieval item mixes modern states in, so nothing outside the year's registry is offered.
 * @param form - the form's current values
 * @param facts - the item's facts
 * @param polities - the polities of the year, the one edited excluded
 * @returns one suggestion per field Wikidata has something for
 */
export function suggestionsFor(
  form: WikidataComparable,
  facts: WikidataFacts,
  polities: readonly PolityWithWikidata[]
): WikidataSuggestion[] {
  const out: WikidataSuggestion[] = []
  const name = facts.labels.en ?? facts.labels.fr
  if (name !== null) out.push(compare('name', form.name, name, name))
  if (facts.inception !== null)
    out.push(
      compare('existsFrom', form.existsFrom, String(facts.inception), String(facts.inception))
    )
  if (facts.dissolved !== null)
    out.push(compare('existsTo', form.existsTo, String(facts.dissolved), String(facts.dissolved)))
  const lord = facts.belongsTo
    .map((id) => polities.find((polity) => polity.wikidata === id))
    .find((polity) => polity !== undefined)
  if (lord !== undefined) out.push(compare('suzerain', form.suzerain, lord.id, lord.name))
  return out
}
