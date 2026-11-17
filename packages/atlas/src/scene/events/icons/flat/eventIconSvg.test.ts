import { describe, expect, it } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'

import { EVENT_ICON_SVG_STYLE, drawingSvg, eventIconSvg } from './eventIconSvg'
import { PIN_DRAWING } from './pin'
import { TOWER_DRAWING } from './tower'
import { TREBUCHET_DRAWING } from './trebuchet'

import type { Drawing } from './drawing'
import type { EventIconKind } from '../kinds'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown', 'cathedral', 'tomb']

/**
 * The rim's width a drawing is given: its first stroke, the rim pass coming first.
 * @param svg - the drawing
 * @returns the width, in the drawing's units
 */
function widthOf(svg: string): number {
  return Number(/stroke-width="([\d.]+)"/.exec(svg)?.[1])
}

describe('eventIconSvg', () => {
  describe('happy path', () => {
    it.each(KINDS)('draws the %s with an explicit size, so it rasterises', (kind) => {
      const svg = eventIconSvg(kind)
      expect(svg).toMatch(/^<svg [^>]*width="128" height="128" viewBox="[-\d. ]+">/)
      expect(svg.endsWith('</svg>')).toBe(true)
    })
  })

  describe('variants', () => {
    it('rings the drawing with the light rim before painting it, so the rim is under it', () => {
      const svg = eventIconSvg('swords')
      const rim = svg.indexOf(`stroke="${EVENT_ICON_SVG_STYLE.rim}"`)
      const body = svg.indexOf(`fill="${EVENT_ICON_SVG_STYLE.silhouette}"`)
      expect(rim).toBeGreaterThan(-1)
      expect(rim).toBeLessThan(body)
    })

    it('crosses the two swords at right angles', () => {
      const svg = eventIconSvg('swords')
      expect(svg).toContain('rotate(45 32 32)')
      expect(svg).toContain('rotate(-45 32 32)')
    })

    it('crops the swords to their own extent, so no pixel goes to margin', () => {
      expect(eventIconSvg('swords')).toContain('viewBox="10 10 44 44"')
    })

    it.each([
      ['swords', ['#111111']],
      ['tower', ['#111111']],
    ] as const)('paints the %s as one silhouette, with no outline', (kind, colours) => {
      const svg = eventIconSvg(kind, EVENT_ICON_PALETTE, {
        ...EVENT_ICON_SVG_STYLE,
        silhouette: '#111111',
        rim: '#eeeeee',
      })
      // The body's shapes end on their fill; the rim's go on to their stroke.
      const fills = new Set([...svg.matchAll(/fill="([^"]+)"\/>/g)].map((match) => match[1]))
      expect(fills).toEqual(new Set(colours))
      expect(svg).not.toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
    })

    it("cuts the reserve tower's door into its outline, so the rim follows into the doorway", () => {
      const svg = drawingSvg(TOWER_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      // One shape, drawn twice — under, in the rim, then over, in the silhouette — and its outline climbs the doorway.
      const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1])
      expect(paths).toHaveLength(2)
      for (const path of paths) expect(path).toContain('L28 48 Q32 43 36 48 L36 58')
      expect(svg).toContain('viewBox="6.5 9.5 51 51"')
    })

    it('draws the siege as the trebuchet, cropped to it and its stone', () => {
      expect(eventIconSvg('tower')).toBe(
        drawingSvg(TREBUCHET_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      )
      expect(eventIconSvg('tower')).toContain('viewBox="-6 -6 82 82"')
    })

    it('draws every rim as thick on screen: wider in a wider drawing, in proportion to the swords’', () => {
      const swords = widthOf(eventIconSvg('swords'))
      expect(swords).toBe(EVENT_ICON_SVG_STYLE.rimWidth)
      // The siege's drawing is 82 wide to the swords' 44.
      expect(widthOf(eventIconSvg('tower'))).toBeCloseTo((swords * 82) / 44, 1)
    })

    it('outlines a detailed drawing, and paints it in the palette and the style given', () => {
      // No kind is outlined since the crown became a silhouette (2026-11-17): a drawing of the test's own.
      const detailed: Drawing = {
        viewBox: [0, 0, 44, 44],
        outlined: true,
        groups: [
          { transform: '', shapes: [{ element: '<rect width="9" height="9"/>', colour: 'gold' }] },
        ],
      }
      const svg = drawingSvg(
        detailed,
        { ...EVENT_ICON_PALETTE, gold: '#00ff00' },
        { ...EVENT_ICON_SVG_STYLE, rim: '#ff00ff' }
      )
      expect(svg).toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
      expect(svg).toContain('fill="#00ff00"')
      expect(svg).toContain('stroke="#ff00ff"')
    })

    it('draws the crown in the swords’ 44 frame, one dark silhouette with no line: saw teeth and three balls', () => {
      // ATLAS-287, « S3 » on the bench (the dev, 2026-11-17).
      const svg = eventIconSvg('crown')
      expect(svg).toContain('viewBox="0 0 44 44"')
      expect(widthOf(svg)).toBeCloseTo(EVENT_ICON_SVG_STYLE.rimWidth)
      expect(svg).not.toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
      expect(svg).not.toContain(EVENT_ICON_PALETTE.gold)
      // Each shape is drawn twice, rim then body: one body, three balls.
      expect(svg.match(/<path /g)).toHaveLength(2)
      expect(svg.match(/<circle /g)).toHaveLength(6)
    })

    it('sets each ball of the crown on a point of its body, so they read as one shape', () => {
      const svg = eventIconSvg('crown')
      const body = /<path d="([^"]+)"/.exec(svg)?.[1] ?? ''
      const points = [...body.matchAll(/L([\d.]+) ([\d.]+)/g)].map((point) => [
        Number(point[1]),
        Number(point[2]),
      ])
      const balls = [
        ...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#fdf6e3"/g),
      ]
      expect(balls).toHaveLength(3)
      for (const ball of balls) {
        // A point of the body lies inside the ball.
        const reached = points.some(
          ([x, y]) =>
            Math.hypot((x ?? Number.NaN) - Number(ball[1]), (y ?? Number.NaN) - Number(ball[2])) <
            Number(ball[3])
        )
        expect(reached).toBe(true)
      }
    })
  })

  describe('the cathedral', () => {
    it('shows its west front: one silhouette, its openings, gallery, rose and doors in the rim’s light', () => {
      // The dev, 2026-11-17: « tu peux faire le fronton avec les deux tours », then « trop brut […] on voit la rosace ».
      const svg = eventIconSvg('cathedral')
      // The shapes of the second pass alone end on their fill: the rim's pass strokes them too.
      const bodies = [...svg.matchAll(/ fill="([^"]+)"\/>/g)].map((shape) => shape[1])

      expect(bodies[0]).toBe(EVENT_ICON_SVG_STYLE.silhouette)
      // Four openings, the gallery, the rose, three doors, two round windows.
      expect(bodies.slice(1)).toEqual(Array.from({ length: 11 }, () => EVENT_ICON_SVG_STYLE.rim))
    })
  })

  describe('the tomb', () => {
    it('sets its cross solid on the stone, in the rim’s own light', () => {
      // The dev, 2026-11-17: « il faut que ce soit blanc plein, pour la croix ».
      const svg = eventIconSvg('tomb')
      const bodies = [...svg.matchAll(/<path d="[^"]+" fill="([^"]+)"\/>/g)].map((path) => path[1])

      // After the rim's pass: the stone in the silhouette's brown, then the cross in the rim's colour.
      expect(bodies).toEqual([EVENT_ICON_SVG_STYLE.silhouette, EVENT_ICON_SVG_STYLE.rim])
    })
  })

  // L3: N/A — every kind is a member of a closed union; nothing is refused
  // L4: N/A — no async work, nothing external

  describe('the plain pin', () => {
    it('draws the pin in the swords’ 44 frame, one dark silhouette with no line, ringed by the rim of 4', () => {
      // ATLAS-298, « A » on the bench (the dev, 2026-10-27).
      const svg = drawingSvg(PIN_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      expect(svg).toContain('viewBox="10 10 44 44"')
      expect(widthOf(svg)).toBeCloseTo(EVENT_ICON_SVG_STYLE.rimWidth)
      expect(svg).toContain(`fill="${EVENT_ICON_SVG_STYLE.silhouette}"`)
      expect(svg).not.toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
    })
  })

  describe('edge cases', () => {
    it('gives every shape both its rim and its body, none drawn once', () => {
      const svg = eventIconSvg('tower')
      const shapes = svg.match(/<(path|rect|circle) /g) ?? []
      expect(shapes.length % 2).toBe(0)
    })
  })
})
