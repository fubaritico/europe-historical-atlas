import { describe, expect, it, vi } from 'vitest'

import { PrefilledAddNew } from '../internal/PrefilledAddNew'

import { addNewProps } from './addNewProps'

import type { ReactElement } from 'react'

vi.mock('../internal/PrefilledAddNew', () => ({ PrefilledAddNew: () => null }))

/** A « + » whose drawer opens on Bursa. */
const onBursa = { data: { place: 13696 }, label: 'Créer un nom d’époque pour ce lieu' }

describe('addNewProps', () => {
  describe('happy path', () => {
    it('leaves Payload’s own « + » to a field with nothing to prefill', () => {
      expect(
        addNewProps({
          collection: 'titles',
          prefilled: undefined,
          readOnly: false,
          onCreate: vi.fn(),
        })
      ).toEqual({ allowCreate: true })
    })
  })

  describe('variants', () => {
    it('puts ours after the list, with its data, its label and the answer, and squares the list', () => {
      const onCreate = vi.fn()
      const props = addNewProps({
        collection: 'period-names',
        prefilled: onBursa,
        readOnly: false,
        onCreate,
      })
      expect(props.allowCreate).toBe(false)
      expect('className' in props && props.className).toBe(
        'city-sheet__relation--prefilled relationship--allow-create'
      )
      const button = ('AfterInput' in props ? props.AfterInput : null) as ReactElement<{
        collection: string
        initialData: unknown
        label: string
        onCreate: unknown
      }> | null
      expect(button?.type).toBe(PrefilledAddNew)
      expect(button?.props).toEqual({
        collection: 'period-names',
        initialData: { place: 13696 },
        label: 'Créer un nom d’époque pour ce lieu',
        onCreate,
      })
    })
  })

  // L3: N/A — nothing is refused; L4: N/A — no async work, no value that can fail to arrive.

  describe('edge cases', () => {
    it('shows no « + » at all on a prefilled field held read-only', () => {
      expect(
        addNewProps({
          collection: 'period-names',
          prefilled: onBursa,
          readOnly: true,
          onCreate: vi.fn(),
        })
      ).toEqual({ allowCreate: false })
    })
  })
})
