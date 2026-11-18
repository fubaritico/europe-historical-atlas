import { describe, expect, it } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

import { contentFiles, contentText } from './contentFiles'

import type {
  ContentCity,
  ContentEvent,
  ContentFile,
  ContentTerritory,
} from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A city sheet, shown in the atlas or not. Only what the split reads is true to life: the rest is never looked at.
 * @param id - its id
 * @param showInAtlas - whether its sheet is ticked
 * @returns the sheet
 */
function city(id: string, showInAtlas: boolean): ContentCity {
  return { id, showInAtlas } as ContentCity
}

const EVENT = { id: 'e1' } as ContentEvent
// Never read by the split nor by the writer: carried as it is.
const TERRITORY = { id: 't1' } as unknown as ContentTerritory

/** A content of one event, three cities — one shown — and one territory. */
const CONTENT: ContentFile = {
  version: CONTENT_FORMAT_VERSION,
  events: [EVENT],
  cities: [city('a', false), city('b', true), city('c', false)],
  territories: [TERRITORY],
}

describe('contentFiles', () => {
  describe('happy path', () => {
    it('gives the atlas the events and only the cities ticked « show in the atlas »', () => {
      const { atlas } = contentFiles(CONTENT)
      expect(atlas.events).toEqual([EVENT])
      expect(atlas.cities.map(({ id }) => id)).toEqual(['b'])
    })

    it('gives the Cartographer everything, as read', () => {
      expect(contentFiles(CONTENT).cartographer).toBe(CONTENT)
    })
  })

  describe('variants', () => {
    it('leaves the territories out of the atlas’s file: it never reads them', () => {
      expect('territories' in contentFiles(CONTENT).atlas).toBe(false)
    })

    it('keeps the version in both files', () => {
      const { atlas, cartographer } = contentFiles(CONTENT)
      expect([atlas.version, cartographer.version]).toEqual([
        CONTENT_FORMAT_VERSION,
        CONTENT_FORMAT_VERSION,
      ])
    })
  })

  // L3: N/A — nothing is refused: the content comes already checked (`readContent`)
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('gives the atlas an empty list when no city is ticked, and a file the schema still reads', () => {
      const { atlas } = contentFiles({ version: CONTENT_FORMAT_VERSION, events: [], cities: [] })
      expect(atlas.cities).toEqual([])
      expect(contentFileSchema.safeParse(atlas).success).toBe(true)
    })
  })
})

describe('contentText', () => {
  describe('happy path', () => {
    it('reads back as the content it was given', () => {
      expect(JSON.parse(contentText(CONTENT))).toEqual(CONTENT)
    })

    it('writes one record a line, so a city changed is one line of a diff', () => {
      const lines = contentText(CONTENT).split('\n')
      expect(lines.filter((line) => line.includes('"showInAtlas"'))).toHaveLength(3)
      for (const id of ['a', 'b', 'c'])
        expect(lines.filter((line) => line.includes(`"id":"${id}"`))).toHaveLength(1)
    })
  })

  describe('variants', () => {
    it('leaves out the territories of a file that has none', () => {
      const text = contentText(contentFiles(CONTENT).atlas)
      expect(text).not.toContain('territories')
      expect(JSON.parse(text)).toEqual(contentFiles(CONTENT).atlas)
    })

    it('writes a field it was never told of, a list one record a line and anything else as it is', () => {
      // The format gains a field: the writer must not drop it — it listed the fields by hand at first.
      const gained = { ...CONTENT, people: [{ id: 'p1' }, { id: 'p2' }], note: { by: 'x' } }
      const text = contentText(gained)
      expect(JSON.parse(text)).toEqual(gained)
      expect(text.split('\n').filter((line) => line.includes('"id":"p'))).toHaveLength(2)
    })

    it('leaves out a field left undefined, as the format reads it', () => {
      const text = contentText({ ...CONTENT, territories: undefined } as unknown as ContentFile)
      expect(text).not.toContain('territories')
      expect(() => JSON.parse(text) as unknown).not.toThrow()
    })

    it('writes the version first, then the events, the cities and the territories', () => {
      const text = contentText(CONTENT)
      const at = ['"version"', '"events"', '"cities"', '"territories"'].map((key) =>
        text.indexOf(key)
      )
      expect(at).toEqual([...at].sort((a, b) => a - b))
      expect(at[0]).toBe(1)
    })

    it('ends with a new line', () => {
      expect(contentText(CONTENT).endsWith('}\n')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('writes an empty list on its own line, still valid JSON', () => {
      const empty = { version: CONTENT_FORMAT_VERSION, events: [], cities: [], territories: [] }
      expect(JSON.parse(contentText(empty))).toEqual(empty)
    })

    it('keeps a name with a quote or a line break in it on its one line', () => {
      const odd = { ...CONTENT, cities: [{ ...city('a', true), id: 'l’«a»\n"b"' }] }
      expect(JSON.parse(contentText(odd))).toEqual(odd)
      expect(
        contentText(odd)
          .split('\n')
          .filter((line) => line.includes('showInAtlas'))
      ).toHaveLength(1)
    })
  })
})
