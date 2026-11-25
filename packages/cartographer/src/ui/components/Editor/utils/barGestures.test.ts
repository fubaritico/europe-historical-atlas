import { describe, expect, it } from 'vitest'

import { barGestures } from './barGestures'

import type { EditorProps } from '../editorProps'

/** The eleven fields the bar needs, every one present. */
const NEEDED = [
  'onOpen',
  'onSave',
  'onSaveAs',
  'onSaveCopy',
  'onNewMap',
  'onCloseMap',
  'onCopy',
  'onPaste',
  'onSelectAll',
  'onCopySheet',
  'mapName',
] as const

/**
 * The editor's props, each a distinct marker so a field handed in another's place shows.
 * @returns the props
 */
function props(): Omit<EditorProps, 'session' | 'start'> {
  const marked = Object.fromEntries(
    [
      ...NEEDED,
      'store',
      'load',
      'style',
      'heading',
      'history',
      'colours',
      'wikidata',
      'results',
    ].map((key) => [key, { marker: key }])
  )
  return marked as unknown as Omit<EditorProps, 'session' | 'start'>
}

describe('barGestures', () => {
  describe('happy path', () => {
    it('hands the bar every gesture it needs, and the map’s name, each its own', () => {
      const picked = barGestures(props()) as unknown as Record<string, { marker: string }>

      expect(Object.keys(picked).sort()).toEqual([...NEEDED].sort())
      for (const key of NEEDED) expect(picked[key]?.marker).toBe(key)
    })
  })

  describe('variants', () => {
    it('leaves out what the bar does not need — the store, the backdrop, the panels', () => {
      const picked = barGestures(props())

      expect('store' in picked || 'load' in picked || 'colours' in picked).toBe(false)
    })
  })

  // L3, L4: N/A — a pick of fields; nothing is read nor refused.

  describe('edge cases', () => {
    it('keeps the very functions it was handed', () => {
      const given = props()

      expect(barGestures(given).onSave).toBe(given.onSave)
    })
  })
})
