import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAtlasStore, interfaceSideOf } from '../state/atlasStore'

import { mountInterface } from './mountInterface'

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * Mount the interface over a store whose map has started.
 * @returns the store and the mounted interface
 */
function mounted() {
  const store = createAtlasStore()
  store.getState().started([1100, 1200], 1100)
  const faces: ReturnType<typeof mountInterface>[] = []
  act(() => {
    faces.push(
      mountInterface(document.body, {
        side: interfaceSideOf(store),
        yearSwitchLabel: 'Changer d’année',
      })
    )
  })
  const [face] = faces
  if (face === undefined) throw new Error('not mounted')
  return { store, face }
}

// ATLAS-519: the React interface, in an element of its own beside the canvas.
describe('mountInterface', () => {
  describe('happy path', () => {
    it('lays the interface in its own element of the host, the year switch in it', () => {
      const canvas = document.createElement('canvas')
      document.body.append(canvas)
      mounted()
      const root = document.body.querySelector('.atlas-interface-root')
      expect(root?.parentElement).toBe(document.body)
      expect(root?.contains(canvas)).toBe(false)
      expect(root?.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
        'Changer d’année'
      )
    })
  })

  // L2: N/A — one interface, one layout today; the screens come with ATLAS-520 to 524.
  // L3, L4: N/A — mounting decides nothing; what the interface shows is its components' (YearSwitch.test.tsx).

  describe('edge cases', () => {
    it('lets go of the store on dispose, so a hot reload leaves no listener on the old one (review QUAL-002)', () => {
      const store = createAtlasStore()
      store.getState().started([1100], 1100)
      const subscribe = store.subscribe.bind(store)
      let listening = 0
      vi.spyOn(store, 'subscribe').mockImplementation(
        (listener: Parameters<typeof subscribe>[0]) => {
          listening += 1
          const stop = subscribe(listener)
          return () => {
            listening -= 1
            stop()
          }
        }
      )
      const faces: ReturnType<typeof mountInterface>[] = []
      act(() => {
        faces.push(
          mountInterface(document.body, { side: interfaceSideOf(store), yearSwitchLabel: 'x' })
        )
      })
      expect(listening).toBeGreaterThan(0)
      act(() => {
        faces[0]?.dispose()
      })
      expect(listening).toBe(0)
    })

    it('leaves the page, element and all, on dispose — at the map’s teardown and at a hot reload', () => {
      const { face } = mounted()
      act(() => {
        face.dispose()
      })
      expect(document.body.querySelector('.atlas-interface-root')).toBeNull()
    })
  })
})
