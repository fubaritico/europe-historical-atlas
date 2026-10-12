// @vitest-environment jsdom
import { PerspectiveCamera, Vector3 } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMapControls } from './controls/mapControls'
import { createMapInteraction } from './mapInteraction'

import type { MapInteractionDeps } from './mapInteraction'
import type { SurfaceHit, SurfacePicker } from './picking/surfacePicker'
import type { Mock } from 'vitest'

/** A hit at a known place on the ground. */
const HIT: SurfaceHit = { point: new Vector3(3, 0.4, -7), faceIndex: 12 }

/** How long the tests let a single click wait; shorter than the default, and driven by fake timers. */
const SETTLE = 50

/**
 * Controls that record what they were asked to do.
 *
 * No cast: the interaction asks for exactly four members, so a stand-in can satisfy the contract
 * outright — and a change to any of their signatures fails here rather than at runtime.
 */
type FakeControls = MapInteractionDeps['controls'] & {
  focusOn: Mock<(x: number, z: number) => void>
  panTo: Mock<(x: number, z: number) => void>
  exitFocus: Mock<() => boolean>
  pointerDragged: boolean
}

/**
 * Controls that record what they were asked to do.
 * @param over - what to vary: whether there is a focus to leave, and whether a drag just ended
 * @returns the stand-in controls
 */
function fakeControls(over: { wasFocused?: boolean; pointerDragged?: boolean } = {}): FakeControls {
  return {
    focusOn: vi.fn<(x: number, z: number) => void>(),
    panTo: vi.fn<(x: number, z: number) => void>(),
    exitFocus: vi.fn<() => boolean>(() => over.wasFocused ?? true),
    pointerDragged: over.pointerDragged ?? false,
  }
}

/**
 * A picker that always answers the same thing.
 * @param hit - what it finds under the pointer
 * @returns the stand-in picker
 */
function fakePicker(hit: SurfaceHit | null): SurfacePicker & { pick: ReturnType<typeof vi.fn> } {
  return { pick: vi.fn(() => hit) }
}

/**
 * An interaction bound to a detached element and an isolated key target.
 * @param over - what to vary: the hit, the select seam, whether a focus is open
 * @returns the element, the stand-ins and the mounted interaction
 */
function mount(
  over: {
    hit?: SurfaceHit | null
    onSelect?: (h: SurfaceHit | null) => void
    wasFocused?: boolean
    pointerDragged?: boolean
  } = {}
) {
  const element = document.createElement('canvas')
  document.body.appendChild(element)
  const controls = fakeControls({
    ...(over.wasFocused === undefined ? {} : { wasFocused: over.wasFocused }),
    ...(over.pointerDragged === undefined ? {} : { pointerDragged: over.pointerDragged }),
  })
  const picker = fakePicker(over.hit === undefined ? HIT : over.hit)
  const keyTarget = new EventTarget()
  const interaction = createMapInteraction({
    element,
    picker,
    controls,
    keyTarget,
    clickSettleMs: SETTLE,
    ...(over.onSelect ? { onSelect: over.onSelect } : {}),
  })
  return { element, controls, picker, keyTarget, interaction }
}

/** Fire a mouse gesture at a place on the element. */
function fire(element: HTMLElement, type: string, detail = 1): void {
  element.dispatchEvent(new MouseEvent(type, { clientX: 100, clientY: 80, detail, bubbles: true }))
}

/** Fire the real sequence a browser sends for a double-click: click, click, dblclick. */
function doubleClick(element: HTMLElement): void {
  fire(element, 'click', 1)
  fire(element, 'click', 2)
  fire(element, 'dblclick', 2)
}

/** Fire a key press at the key target. */
function press(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true })
  target.dispatchEvent(event)
  return event
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('createMapInteraction', () => {
  describe('happy path', () => {
    it('focuses on where a double-click met the terrain', () => {
      const { element, controls } = mount()
      fire(element, 'dblclick')
      expect(controls.focusOn).toHaveBeenCalledWith(3, -7)
    })

    it('pans to where a single click met the terrain, once it has settled', () => {
      const { element, controls } = mount()
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.panTo).toHaveBeenCalledWith(3, -7)
    })

    it('reports a settled single click to whoever is listening', () => {
      const onSelect = vi.fn()
      const { element } = mount({ onSelect })
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(onSelect).toHaveBeenCalledWith(HIT)
    })

    it('leaves the focus on Escape', () => {
      const { keyTarget, controls } = mount()
      press(keyTarget, 'Escape')
      expect(controls.exitFocus).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('does not pan when the click turns out to be half of a double-click', () => {
      // The browser sends click, click, dblclick. Acting on the first would leave the focus a beat
      // before the double-click entered it, and the remembered viewpoint would be recaptured at ground
      // level — which quietly destroys the only thing Escape is for.
      const { element, controls } = mount()
      doubleClick(element)
      vi.advanceTimersByTime(SETTLE * 10)
      expect(controls.panTo).not.toHaveBeenCalled()
      expect(controls.focusOn).toHaveBeenCalledTimes(1)
    })

    it('announces one selection for a double-click, not two', () => {
      const onSelect = vi.fn()
      const { element } = mount({ onSelect })
      doubleClick(element)
      vi.advanceTimersByTime(SETTLE * 10)
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('does not answer the click a drag-pan ends with', () => {
      // The browser sends one after any press-and-release on the same element, however far the pointer
      // travelled. Acting on it would turn every release of the map into a flight nobody asked for.
      const { element, controls } = mount({ pointerDragged: true })
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE * 10)
      expect(controls.panTo).not.toHaveBeenCalled()
    })

    it('keeps only the latest of two single clicks in quick succession', () => {
      const { element, controls } = mount()
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE / 2)
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.panTo).toHaveBeenCalledTimes(1)
    })

    it('swallows the key press only when there was a focus to leave', () => {
      const open = mount({ wasFocused: true })
      expect(press(open.keyTarget, 'Escape').defaultPrevented).toBe(true)
      const closed = mount({ wasFocused: false })
      expect(press(closed.keyTarget, 'Escape').defaultPrevented).toBe(false)
    })

    it('ignores every key that is not Escape', () => {
      const { keyTarget, controls } = mount()
      press(keyTarget, 'Enter')
      press(keyTarget, 'ArrowLeft')
      press(keyTarget, 'a')
      expect(controls.exitFocus).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('does not focus on a double-click past the edge of the world', () => {
      const { element, controls } = mount({ hit: null })
      fire(element, 'dblclick')
      expect(controls.focusOn).not.toHaveBeenCalled()
    })

    it('does not leave the focus on a click that designated nothing', () => {
      // Stripping the close-up for a click that met no ground would punish a miss.
      const { element, controls } = mount({ hit: null })
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.panTo).not.toHaveBeenCalled()
    })

    it('still reports the miss to whoever is listening', () => {
      const onSelect = vi.fn()
      const { element } = mount({ hit: null, onSelect })
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(onSelect).toHaveBeenCalledWith(null)
    })

    it('leaves Escape to a form field that has the focus', () => {
      // lil-gui is full of them, and Escape inside one cancels the edit.
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      const { keyTarget, controls } = mount()
      press(keyTarget, 'Escape')
      expect(controls.exitFocus).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('does not need anyone to be listening for a click to work', () => {
      const { element, controls } = mount()
      expect(() => {
        fire(element, 'click')
        vi.advanceTimersByTime(SETTLE)
      }).not.toThrow()
      expect(controls.panTo).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('drops a click still waiting when the interaction is torn down', () => {
      // Otherwise a click settles onto a camera nobody is driving any more.
      const { element, controls, interaction } = mount()
      fire(element, 'click')
      interaction.dispose()
      vi.advanceTimersByTime(SETTLE * 10)
      expect(controls.panTo).not.toHaveBeenCalled()
    })

    it('stops answering the pointer once disposed', () => {
      const { element, controls, interaction } = mount()
      interaction.dispose()
      fire(element, 'dblclick')
      expect(controls.focusOn).not.toHaveBeenCalled()
    })

    it('stops answering Escape once disposed, the key target being shared', () => {
      const { keyTarget, controls, interaction } = mount()
      interaction.dispose()
      press(keyTarget, 'Escape')
      expect(controls.exitFocus).not.toHaveBeenCalled()
    })

    it('can be disposed twice', () => {
      const { interaction } = mount()
      interaction.dispose()
      expect(() => {
        interaction.dispose()
      }).not.toThrow()
    })
  })
})

/** The gestures bound to a genuine camera, so the two modules' idea of a drag has to agree. */
function compose() {
  const element = document.createElement('canvas')
  document.body.appendChild(element)
  const camera = new PerspectiveCamera(50, 1, 0.1, 300)
  const controls = createMapControls(camera, element, {
    extent: { minX: -6, maxX: 6, minZ: -6, maxZ: 6 },
    minDistance: 2,
    maxDistance: 10,
    minPitchDeg: 45,
    maxPitchDeg: 70,
    panSpeed: 8,
    zoomSpeed: 0.1,
    smoothingTau: 0.12,
    initialZoom: 0.5,
    enableDrag: true,
    enableEdgeScroll: false,
    edgeScrollMargin: 24,
    edgeScrollSpeed: 10,
    flyDurationMs: 700,
    flyFocusZoom: 1,
    flyArcZoom: 0,
  })
  const interaction = createMapInteraction({
    element,
    picker: fakePicker(HIT),
    controls,
    keyTarget: new EventTarget(),
    clickSettleMs: SETTLE,
  })
  return { element, controls, interaction }
}

/** Press, move and release — the sequence a grab-and-drag pan is made of. */
function dragBy(element: HTMLElement, pixels: number): void {
  element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 80, bubbles: true }))
  window.dispatchEvent(
    new MouseEvent('pointermove', { clientX: 100 + pixels, clientY: 80, bubbles: true })
  )
  window.dispatchEvent(
    new MouseEvent('pointerup', { clientX: 100 + pixels, clientY: 80, bubbles: true })
  )
}

describe('createMapInteraction over the real controls', () => {
  describe('happy path', () => {
    it('does not fly after a drag-pan, however the click arrives', () => {
      const { element, controls, interaction } = compose()
      dragBy(element, 120)
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE * 10)
      expect(controls.flying).toBe(false)
      interaction.dispose()
      controls.dispose()
    })
  })

  describe('variants', () => {
    it('still answers a click that barely moved, a hand on a button never being still', () => {
      const { element, controls, interaction } = compose()
      dragBy(element, 2)
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.flying).toBe(true)
      interaction.dispose()
      controls.dispose()
    })

    it('answers a click that followed a drag, once the pointer has been pressed again', () => {
      const { element, controls, interaction } = compose()
      dragBy(element, 120)
      dragBy(element, 1)
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.flying).toBe(true)
      interaction.dispose()
      controls.dispose()
    })
  })

  // L3 (managed errors): N/A — covered against the stand-in controls above.

  describe('unmanaged errors', () => {
    it('treats a press that never moved as a click', () => {
      const { element, controls, interaction } = compose()
      element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 80 }))
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 100, clientY: 80 }))
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.flying).toBe(true)
      interaction.dispose()
      controls.dispose()
    })
  })

  describe('edge cases', () => {
    it('reports a click when dragging is switched off, whatever the pointer did', () => {
      const { element, controls, interaction } = compose()
      controls.options.enableDrag = false
      dragBy(element, 200)
      fire(element, 'click')
      vi.advanceTimersByTime(SETTLE)
      expect(controls.flying).toBe(true)
      interaction.dispose()
      controls.dispose()
    })
  })
})
