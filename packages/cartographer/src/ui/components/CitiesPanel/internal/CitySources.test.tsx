import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { CitySources } from './CitySources'

/**
 * The sources, rendered alone.
 * @param sources - the sources
 * @returns the list's root
 */
function listOf(sources: { title: string; where: string | null }[]): HTMLElement {
  const { container } = renderInEnglish(
    <CitySources
      sources={sources.map((source) => ({
        ...source,
        holder: { name: 'Hainaut', wikidata: null },
      }))}
    />
  )
  const list = container.querySelector('ol')
  if (list === null) throw new Error('no numbered list')
  return list
}

// The dev, 2026-11-16: the sources numbered, each work's title in italics
describe('CitySources', () => {
  describe('happy path', () => {
    it('numbers the sources, each work’s title in italics, where in it after', () => {
      const list = listOf([{ title: 'Gislebert de Mons', where: '§ 2' }])
      expect(list.querySelector('li cite')?.textContent).toBe('Gislebert de Mons')
      expect(list.querySelector('li')?.textContent).toBe('Gislebert de Mons, § 2')
    })
  })

  describe('variants', () => {
    it('gives the title alone when the source says not where', () => {
      expect(listOf([{ title: 'Famille d’Avesnes', where: null }]).textContent).toBe(
        'Famille d’Avesnes'
      )
    })
  })

  describe('edge cases', () => {
    it('keeps both lines of a source given twice', () => {
      const twice = { title: 'Gislebert de Mons', where: '§ 2' }
      expect(listOf([twice, twice]).querySelectorAll('li')).toHaveLength(2)
    })
  })

  // L3, L4: N/A — it shows what it is handed
})
