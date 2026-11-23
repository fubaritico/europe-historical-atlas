/**
 * Wikidata's names for many items at once — the French, English and multilingual labels and the French aliases — read for the control
 * of the names (`pnpm names:check`, CMS-495). Pure: the URL out, the answer in; `fetchLabels` fetches.
 */

import { z } from 'zod/mini'

/** What Wikidata calls one item. */
export interface ItemLabels {
  /** Its French label, `null` when it has none. */
  fr: string | null
  /** Its English label, `null` when it has none. */
  en: string | null
  /**
   * Its multilingual label (`mul`, Wikidata's default name for every language since 2024), `null` when it has none —
   * some places have no other.
   */
  mul: string | null
  /** Its other French names. */
  aliasesFr: string[]
}

/** The most items Wikidata's `wbgetentities` answers for in one request. */
export const LABELS_LOT = 50

/**
 * The request for the names of a lot of items.
 * @param ids - at most {@link LABELS_LOT} items: `Q90`
 * @returns the API's URL, asking for JSON
 */
export function labelsUrl(ids: readonly string[]): string {
  const query = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    props: 'labels|aliases',
    languages: 'fr|en|mul',
    ids: ids.join('|'),
  })
  return `https://www.wikidata.org/w/api.php?${query.toString()}`
}

/** One name in one language. */
const term = z.object({ value: z.string() })

/** What the API answers — only the fields read; an item it does not know comes back with `missing` and no names. */
const labelsAnswer = z.object({
  entities: z.record(
    z.string(),
    z.object({
      missing: z.optional(z.string()),
      labels: z.optional(z.record(z.string(), term)),
      aliases: z.optional(z.record(z.string(), z.array(term))),
    })
  ),
})

/**
 * An item's label in one language.
 * @param labels - its labels, by language
 * @param language - the language: `fr`
 * @returns the label, `null` when the item has none in that language
 */
function labelIn(labels: Record<string, { value: string }>, language: string): string | null {
  return labels[language]?.value ?? null
}

/**
 * The names of each item of the answer.
 * @param value - the API's JSON
 * @returns each item's names, by its id — an item Wikidata does not know has no entry; throws on an answer that is not
 *   the API's
 */
export function readLabelsAnswer(value: unknown): Map<string, ItemLabels> {
  const names = new Map<string, ItemLabels>()
  for (const [id, entity] of Object.entries(labelsAnswer.parse(value).entities)) {
    // An item Wikidata does not know comes back flagged `missing`: left out, so the control lists it as unknown — a
    // mistyped or merged item to correct — rather than as one with no name (review QUAL-001)
    if (entity.missing !== undefined) continue
    const labels = entity.labels ?? {}
    names.set(id, {
      fr: labelIn(labels, 'fr'),
      en: labelIn(labels, 'en'),
      mul: labelIn(labels, 'mul'),
      aliasesFr: (entity.aliases?.fr ?? []).map((alias) => alias.value),
    })
  }
  return names
}
