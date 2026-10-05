import { describe, expect, it } from 'vitest'

import { moveAnchor } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  firstSharedAnchor,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'

import { RENDER_FRAME } from '../view/backdropFrame'
import { lonLatToScreen, projectAnchors, projectToBackdrop } from '../view/projection'

import { backdropRect, buildScene, editorialZoneRect, projectedRings } from './scene'

import type { SceneInputs } from './scene'
import type { BackdropFrame } from '../view/projection'
import type { Viewport } from '../view/viewport'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The real backdrop, imported rather than re-declared.
 *
 * A first version wrote the literal out here, which is the copy `rules/modular-architecture.md` calls the
 * worst kind: a fixture that can drift from the thing it is meant to verify, with nothing failing.
 */
const FRAME: BackdropFrame = RENDER_FRAME

const NATIVE: Viewport = { scale: 1, originX: 0, originY: 0 }

/**
 * Inputs with whatever a test needs.
 * @param overrides - the parts this test cares about
 * @returns complete inputs
 */
function inputs(document: YearDocument, overrides: Partial<SceneInputs> = {}): SceneInputs {
  return {
    anchorsInBackdrop: projectToBackdrop(document.anchors, FRAME),
    backdropImage: null,
    frame: FRAME,
    viewport: NATIVE,
    selected: new Set<number>(),
    zoneLabel: 'editorial zone',
    ...overrides,
  }
}

describe('scene', () => {
  describe('happy path', () => {
    it('projects every anchor once, in document order', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document))

      const first = document.anchors[0]
      if (first === undefined) throw new Error('fixture: the document has no anchors')

      expect(scene.anchors).toHaveLength(document.anchors.length)
      expect(scene.anchors[0]).toEqual(lonLatToScreen(first, FRAME, NATIVE))
    })

    it('gives one outline per ring of every claim', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document))

      // The fixture holds two polities, one ring each.
      expect(scene.rings).toHaveLength(2)
      expect(scene.rings[0]).toHaveLength(4)
    })

    it('puts the editorial zone where its own corners project', () => {
      const document = sharedBorderDocument()
      const zone = document.editorialZone

      const rect = editorialZoneRect(document, inputs(document))

      expect([rect.x, rect.y]).toEqual(lonLatToScreen([zone.west, zone.north], FRAME, NATIVE))
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.height).toBeGreaterThan(0)
    })

    it('carries the zone’s name and the selection through untouched', () => {
      const selected = new Set([1, 2])

      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document, { selected, zoneLabel: 'la planche' }))

      expect(scene.zoneLabel).toBe('la planche')
      expect(scene.selected).toBe(selected)
    })
  })

  describe('variants', () => {
    it('follows the viewport, so panning moves everything together', () => {
      const document = sharedBorderDocument()
      const panned: Viewport = { scale: 1, originX: 100, originY: -40 }

      const still = buildScene(document, inputs(document))
      const moved = buildScene(document, inputs(document, { viewport: panned }))

      expect(moved.anchors[0]?.[0]).toBeCloseTo((still.anchors[0]?.[0] ?? 0) + 100, 9)
      expect(moved.editorialZone.x).toBeCloseTo(still.editorialZone.x + 100, 9)
    })

    it('keeps the zone’s height honest at any zoom, both corners being projected', () => {
      const document = sharedBorderDocument()

      const one = editorialZoneRect(document, inputs(document))
      const two = editorialZoneRect(
        document,
        inputs(document, { viewport: { ...NATIVE, scale: 2 } })
      )

      expect(two.height).toBeCloseTo(one.height * 2, 6)
      expect(two.width).toBeCloseTo(one.width * 2, 6)
    })

    it('marks a selection of any size', () => {
      for (const selected of [new Set<number>(), new Set([0]), new Set([0, 1, 2, 3, 4, 5])]) {
        const document = sharedBorderDocument()

        expect(buildScene(document, inputs(document, { selected })).selected.size).toBe(
          selected.size
        )
      }
    })
  })

  describe('variants — the backdrop', () => {
    it('puts the whole grid on screen, which is the coordinate system itself', () => {
      const document = sharedBorderDocument()

      const rect = backdropRect(FRAME, inputs(document))

      expect(rect).toEqual({ x: 0, y: 0, width: FRAME.size.width, height: FRAME.size.height })
    })

    it('scales and moves the grid with the view', () => {
      const document = sharedBorderDocument()
      const view: Viewport = { scale: 0.5, originX: 30, originY: -20 }

      const rect = backdropRect(FRAME, inputs(document, { viewport: view }))

      expect(rect.x).toBe(30)
      expect(rect.y).toBe(-20)
      expect(rect.width).toBeCloseTo(FRAME.size.width / 2, 9)
      expect(rect.height).toBeCloseTo(FRAME.size.height / 2, 9)
    })

    it('carries an image into the scene, and nothing when there is none', () => {
      const document = sharedBorderDocument()
      const image = {} as CanvasImageSource

      expect(buildScene(document, inputs(document)).backdrop).toBeNull()
      expect(buildScene(document, inputs(document, { backdropImage: image })).backdrop?.image).toBe(
        image
      )
    })
  })

  describe('managed errors', () => {
    it('gives no outline for a document that claims nothing', () => {
      const document = sharedBorderDocument()
      document.claims = []

      expect(buildScene(document, inputs(document)).rings).toEqual([])
    })

    it('gives no anchor for a document with none', () => {
      const document = sharedBorderDocument()
      document.anchors = []
      document.claims = []

      expect(buildScene(document, inputs(document)).anchors).toEqual([])
    })

    it('skips an index no anchor answers, rather than throwing inside a paint', () => {
      const document = sharedBorderDocument()
      const claim = document.claims[0]
      if (claim !== undefined) claim.rings = [[0, 1, 999]]

      const rings = projectedRings(document, projectAnchors(document.anchors, FRAME, NATIVE))

      expect(rings[0]).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. Below is the hostile viewport.
    it('carries a viewport at scale zero through loudly', () => {
      const dead: Viewport = { scale: 0, originX: 0, originY: 0 }

      const document = sharedBorderDocument()
      const scene = buildScene(document, inputs(document, { viewport: dead }))

      expect(scene.anchors[0]?.[0]).toBe(0)
      expect(Number.isFinite(scene.editorialZone.width)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('keeps a shared anchor a single position, so two outlines move together', () => {
      // The format's whole point: anchors 1 and 2 are the shared limit between France and the Empire.
      const document = sharedBorderDocument()
      const shared = firstSharedAnchor(document)
      moveAnchor(document, shared, [1, 47])

      const scene = buildScene(document, inputs(document))
      const moved = scene.anchors[shared]
      const [france, empire] = scene.rings

      expect(moved).toBeDefined()
      expect(france).toContainEqual(moved)
      expect(empire).toContainEqual(moved)
    })

    it('projects a shared anchor once, not once per ring that holds it', () => {
      const document = sharedBorderDocument()
      const shared = firstSharedAnchor(document)

      const scene = buildScene(document, inputs(document))
      const inFrance = scene.rings[0]?.find((point) => point === scene.anchors[shared])
      const inEmpire = scene.rings[1]?.find((point) => point === scene.anchors[shared])

      // The same array, by reference, in both outlines — two copies could drift apart.
      expect(inFrance).toBe(scene.anchors[shared])
      expect(inEmpire).toBe(scene.anchors[shared])
    })

    it('answers for a zone the view has scrolled off, rather than clamping it', () => {
      const far: Viewport = { scale: 1, originX: -5000, originY: -5000 }

      const document = sharedBorderDocument()
      const rect = editorialZoneRect(document, inputs(document, { viewport: far }))

      expect(rect.x).toBeLessThan(0)
      expect(rect.width).toBeGreaterThan(0)
    })
  })
})
