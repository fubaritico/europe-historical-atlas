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
 *
 * **Vassalage is read sideways** (CARTO-248): Wikidata has no *vassal of* property. Three roads lead to it,
 * measured on eight real vassals of 1100 — *country* (P17) dated by its *start* and *end* qualifiers (the
 * County of Flanders: Kingdom of France 864–1529, then the Holy Roman Empire); *instance of* a State of the
 * Holy Roman Empire (Bohemia); and *instance of* a vassal state, which says that it is one, not of whom
 * (Burgundy). Five of the eight come out right; the rest stay empty, never wrong in the form unless taken.
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
  startTime: 'P580',
  endTime: 'P582',
} as const

/** The kinds of item (P31) that say something of a polity's lord. */
const KIND = {
  /** *State of the Holy Roman Empire* — its lord is the Empire. */
  imperialState: 'Q26830017',
  /** *Vassal state* — it has a lord, the item does not say which. */
  vassalState: 'Q1371288',
} as const

/** The Holy Roman Empire, lord of every *State of the Holy Roman Empire*. */
const HOLY_ROMAN_EMPIRE = 'Q12548'

/** What kind of page about Wikipedia itself an item is — the panel words it in the page's language. */
export type NotASubject = 'category' | 'disambiguation' | 'list'

/** Items that are pages about Wikipedia itself, never a polity — an id entered by mistake. */
const NOT_A_SUBJECT: Readonly<Record<string, NotASubject>> = {
  Q4167836: 'category',
  Q4167410: 'disambiguation',
  Q13406463: 'list',
}

/** One item a polity belonged to, with the years the item gives for it. */
export interface Belonging {
  /** The item it belonged to, `Q…`. */
  id: string
  /** The *start time* qualifier's year, or `null` when the claim has none or an unknown one. */
  from: number | null
  /** The *end time* qualifier's year, or `null` when the claim has none or an unknown one. */
  to: number | null
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
  /** The items it belonged to — *country* (P17) then *part of* (P361) — best rank first, with their years. */
  belongsTo: Belonging[]
  /** Whether it is an instance of a *State of the Holy Roman Empire*. */
  imperialState: boolean
  /** Whether it is an instance of a *vassal state* — of whom, the item does not say. */
  vassalState: boolean
  /** What it followed (P1365, P155), as `Q…`. */
  predecessors: string[]
  /** What followed it (P1366, P156), as `Q…`. */
  successors: string[]
  /** Its Wikipedia articles, by language, as URLs. */
  wikipedia: { en: string | null; fr: string | null }
  /** When the item is not a subject at all — a Wikipedia category — or `null`. */
  notASubject: NotASubject | null
}

/** One snak of the API's answer — a claim's value or one of its qualifiers — reduced to what is read. */
interface Snak {
  datavalue?: { value?: unknown }
}

/** One claim of the API's answer, reduced to what is read. */
interface Claim {
  rank?: string
  mainsnak?: Snak
  qualifiers?: Record<string, unknown>
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
 * The year of a snak holding a time.
 * @param snak - a claim's value or a qualifier
 * @returns the year, or `null` when the snak holds no time — an *unknown value* among them
 */
function yearOfSnak(snak: Snak | undefined): number | null {
  const time = recordOf(snak?.datavalue?.value)?.time
  return typeof time === 'string' ? yearOfTime(time) : null
}

/**
 * The year of a claim's time qualifier.
 *
 * An *unknown value* — the item says the claim began, not when — reads as no bound, like a claim with no
 * qualifier: the lord stays proposed, and the author decides.
 * @param claim - the claim
 * @param property - `P580` or `P582`
 * @returns the first year the qualifier gives, or `null`
 */
function qualifierYear(claim: Claim, property: string): number | null {
  const snaks = recordOf(claim.qualifiers)?.[property]
  if (!Array.isArray(snaks)) return null
  for (const snak of snaks as Snak[]) {
    const year = yearOfSnak(snak)
    if (year !== null) return year
  }
  return null
}

/**
 * The first year a property gives.
 * @param claims - the item's claims
 * @param property - a time property
 * @returns the year, or `null`
 */
function firstYear(claims: Record<string, unknown>, property: string): number | null {
  for (const claim of claimsOf(claims, property)) {
    const year = yearOfSnak(claim.mainsnak)
    if (year !== null) return year
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
 * Every item a set of properties points to, with each claim's years — a repeat dropped only when its years
 * are the same too, since one lord may come back after another.
 * @param claims - the item's claims
 * @param properties - item properties
 * @returns the belongings, in order
 */
function belongingsOf(claims: Record<string, unknown>, properties: readonly string[]): Belonging[] {
  const out: Belonging[] = []
  for (const property of properties)
    for (const claim of claimsOf(claims, property)) {
      const id = recordOf(claim.mainsnak?.datavalue?.value)?.id
      if (typeof id !== 'string') continue
      const from = qualifierYear(claim, PROPERTY.startTime)
      const to = qualifierYear(claim, PROPERTY.endTime)
      if (!out.some((seen) => seen.id === id && seen.from === from && seen.to === to))
        out.push({ id, from, to })
    }
  return out
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
    belongsTo: belongingsOf(claims, [PROPERTY.country, PROPERTY.partOf]),
    imperialState: kinds.includes(KIND.imperialState),
    vassalState: kinds.includes(KIND.vassalState),
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

/** The year edited lies outside an item's dates — worded by the panel, in the page's language. */
export interface Anachronism {
  /** `notYet` — the item begins after the year; `noLonger` — it ended before. */
  when: 'notYet' | 'noLonger'
  /** The item's name ({@link nameOf}). */
  name: string
  /** Its years ({@link spanOf}). */
  span: string
  /** The year edited. */
  year: number
}

/**
 * Whether the year edited falls outside the polity's Wikidata dates — *"County of Tripoli 1102–1289:
 * does not exist yet in 1100"*. A warning, never a refusal (the correction tools' rule).
 * @param year - the year being edited
 * @param facts - the item's facts
 * @returns what the warning says, or `null` when the dates hold the year or say nothing
 */
export function anachronism(year: number, facts: WikidataFacts): Anachronism | null {
  const said = { name: nameOf(facts), span: spanOf(facts), year }
  if (facts.inception !== null && facts.inception > year) return { when: 'notYet', ...said }
  if (facts.dissolved !== null && facts.dissolved < year) return { when: 'noLonger', ...said }
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
 * Whether a belonging's years hold the year — both ends included, a missing end open.
 * @param belonging - the belonging
 * @param year - the year being edited
 * @returns `true` when the year falls within its years
 */
function holds(belonging: Belonging, year: number): boolean {
  return (
    (belonging.from === null || belonging.from <= year) &&
    (belonging.to === null || belonging.to >= year)
  )
}

/**
 * Whether a belonging carries a year at all.
 * @param belonging - the belonging
 * @returns `true` when the claim has a start or an end
 */
function isDated(belonging: Belonging): boolean {
  return belonging.from !== null || belonging.to !== null
}

/**
 * The items that may be the polity's lord in the year edited, the likeliest first: the belongings whose
 * years hold the year, then the undated ones, then the Holy Roman Empire for one of its States. A belonging
 * dated outside the year is no lord of it — Flanders' Empire of 1529–1556 in 1100.
 * @param facts - the item's facts
 * @param year - the year being edited
 * @returns the `Q…` ids, without repeats
 */
export function lordsIn(facts: WikidataFacts, year: number): string[] {
  const dated = facts.belongsTo.filter((belonging) => isDated(belonging) && holds(belonging, year))
  const undated = facts.belongsTo.filter((belonging) => !isDated(belonging))
  const ids = [...dated, ...undated].map((belonging) => belonging.id)
  if (facts.imperialState) ids.push(HOLY_ROMAN_EMPIRE)
  return ids.filter((id, index) => ids.indexOf(id) === index)
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
 * the first of its lords in the year edited (`lordsIn`) that a polity of this year carries as its own
 * Wikidata id. Wikidata's *country* on a medieval item mixes modern states in, so nothing outside the year's
 * registry is offered.
 * @param form - the form's current values
 * @param facts - the item's facts
 * @param polities - the polities of the year, the one edited excluded
 * @param year - the year being edited
 * @returns one suggestion per field Wikidata has something for
 */
export function suggestionsFor(
  form: WikidataComparable,
  facts: WikidataFacts,
  polities: readonly PolityWithWikidata[],
  year: number
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
  const lord = lordsIn(facts, year)
    .map((id) => polities.find((polity) => polity.wikidata === id))
    .find((polity) => polity !== undefined)
  if (lord !== undefined) out.push(compare('suzerain', form.suzerain, lord.id, lord.name))
  return out
}
