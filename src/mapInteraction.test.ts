// @vitest-environment jsdom
import { Vector3 } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMapInteraction } from './mapInteraction'

import type { MapControls } from './controls/mapControls'
import type { SurfaceHit, SurfacePicker } from './picking/surfacePicker'

/** A hit at a known place on the ground. */
const HIT: SurfaceHit = { point: new Vector3(3, 0.4, -7), faceIndex: 12 }

/** Controls that record what they were asked to do. */
function fakeControls(): MapControls & { flyTo: ReturnType<typeof vi.fn> } {
  return { flyTo: vi.fn() } as unknown as MapControls & { flyTo: ReturnType<typeof vi.fn> }
}

/** A picker that always answers the same thing. */
function fakePicker(hit: SurfaceHit | null): SurfacePicker & { pick: ReturnType<typeof vi.fn> } {
  return { pick: vi.fn(() => hit) }
}

/** An interaction bound to a detached element. */
function mount(hit: SurfaceHit | null = HIT, onSelect?: (h: SurfaceHit | null) => void) {
  const element = document.createElement('canvas')
  document.body.appendChild(element)
  const controls = fakeControls()
  const picker = fakePicker(hit)
  const interaction = createMapInteraction(
    onSelect ? { element, picker, controls, onSelect } : { element, picker, controls }
  )
  return { element, controls, picker, interaction }
}

/** Fire a mouse gesture at a place on the element. */
function fire(element: HTMLElement, type: string, clientX = 100, clientY = 80): void {
  element.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('createMapInteraction', () => {
  describe('happy path', () => {
    it('flies to where a double-click met the terrain', () => {
      const { element, controls } = mount()
      fire(element, 'dblclick')
      expect(controls.flyTo).toHaveBeenCalledWith(3, -7)
    })

    it('reports a single click to whoever is listening', () => {
      const onSelect = vi.fn()
      const { element } = mount(HIT, onSelect)
      fire(element, 'click')
      expect(onSelect).toHaveBeenCalledWith(HIT)
    })
  })

  describe('variants', () => {
    it('does not fly on a single click', () => {
      // The dev's split, settled on 2026-09-17: a click designates, it does not move the camera. A
      // reader who wants to read a place must not lose their framing to it.
      const { element, controls } = mount()
      fire(element, 'click')
      expect(controls.flyTo).not.toHaveBeenCalled()
    })

    it('does not select on a double-click beyond forwarding the two clicks that make it', () => {
      const onSelect = vi.fn()
      const { element, controls } = mount(HIT, onSelect)
      fire(element, 'dblclick')
      expect(controls.flyTo).toHaveBeenCalledTimes(1)
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('asks the picker where the pointer actually was', () => {
      const { element, picker } = mount()
      fire(element, 'dblclick', 250, 140)
      expect(picker.pick).toHaveBeenCalledWith(250, 140, expect.anything())
    })

    it('flies by the ground position, ignoring the height it met', () => {
      // The camera target lives on the ground plane; carrying the hit's Y would tilt the whole frame.
      const { element, controls } = mount()
      fire(element, 'dblclick')
      expect(controls.flyTo).toHaveBeenCalledWith(HIT.point.x, HIT.point.z)
    })
  })

  describe('managed errors', () => {
    it('does nothing when a double-click meets nothing', () => {
      // Past the edge of the world: there is no place to fly to, and inventing one would be worse.
      const { element, controls } = mount(null)
      fire(element, 'dblclick')
      expect(controls.flyTo).not.toHaveBeenCalled()
    })

    it('still reports a click that met nothing, which is itself an answer', () => {
      const onSelect = vi.fn()
      const { element } = mount(null, onSelect)
      fire(element, 'click')
      expect(onSelect).toHaveBeenCalledWith(null)
    })
  })

  describe('unmanaged errors', () => {
    it('takes a click with nobody listening', () => {
      const { element } = mount()
      expect(() => {
        fire(element, 'click')
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('stops answering once unbound', () => {
      const { element, controls, interaction } = mount()
      interaction.dispose()
      fire(element, 'dblclick')
      expect(controls.flyTo).not.toHaveBeenCalled()
    })

    it('can be unbound twice', () => {
      const { interaction } = mount()
      interaction.dispose()
      expect(() => {
        interaction.dispose()
      }).not.toThrow()
    })
  })
})
