import type { ContentFile } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * The export's two files, one per reader (CMS-223; the dev, 2026-11-18: « un fichier d'export qui ne concerne que les
 * villes dont les cases ont été cochées »). One file held everything and weighed 21 MB for 116 cities shown: the atlas
 * read 11 600 city sheets at every visit to draw a hundredth of them.
 */

/** The export's files, by the name each is written under in the atlas's `public/content/`. */
export interface ContentFiles {
  /** `atlas.json` — what the atlas shows: every event, and the cities whose sheet is ticked « show in the atlas ». */
  atlas: ContentFile
  /** `cartographer.json` — everything: every event, every city sheet, every territory. */
  cartographer: ContentFile
}

/**
 * Split the content read out of the base into its two files. Both keep the content format, so one reader and one
 * schema read either.
 * @param content - every event, every city sheet and every territory
 * @returns the atlas's file, without the cities it does not show nor the territories it never reads, and the whole
 */
export function contentFiles(content: ContentFile): ContentFiles {
  return {
    atlas: {
      version: content.version,
      events: content.events,
      cities: content.cities.filter(({ showInAtlas }) => showInAtlas),
    },
    cartographer: content,
  }
}

/**
 * A list as JSON, one record a line.
 * @param records - the list
 * @returns its text; `[]` for an empty one
 */
function recordLines(records: readonly unknown[]): string {
  return records.length === 0
    ? '[]'
    : `[\n${records.map((record) => JSON.stringify(record)).join(',\n')}\n]`
}

/**
 * Write a content file as text: one event, one city, one territory a line. Compact — half the indented file — and
 * still a line per record, so a change to one city is one line of a diff and git stores it as a small delta.
 * Every field of the file is written, a list one record a line and anything else as it is — so a field the format
 * gains later is written without this writer being told (review of 2026-11-18).
 * @param content - the file
 * @returns its JSON, ending with a new line
 */
export function contentText(content: ContentFile): string {
  const fields = Object.entries(content)
    // A field left undefined is absent from the file, as `JSON.stringify` has it.
    .filter(([, value]) => value !== undefined)
    .map(
      ([name, value]: [string, unknown]) =>
        `${JSON.stringify(name)}:${Array.isArray(value) ? recordLines(value) : JSON.stringify(value)}`
    )
  return `{${fields.join(',\n')}}\n`
}
