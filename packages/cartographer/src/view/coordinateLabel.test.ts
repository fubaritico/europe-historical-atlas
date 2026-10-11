import { describe, expect, it } from 'vitest'

import { degreesAndMinutes, formatLonLat } from './coordinateLabel'

describe('degreesAndMinutes', () => {
  describe('happy path', () => {
    it('writes degrees, minutes and a hemisphere', () => {
      expect(degreesAndMinutes(48.85, 'N', 'S')).toBe('48°51′N')
    })
  })

  describe('variants', () => {
    it('never writes a minus sign — it writes the other hemisphere', () => {
      // The atlas settled this on 2026-09-17 for its margin: `-30°` is arithmetic, `30°O` is a place.
      expect(degreesAndMinutes(-4.5, 'E', 'O')).toBe('4°30′O')
      expect(degreesAndMinutes(-33.25, 'N', 'S')).toBe('33°15′S')
    })

    it('pads the minutes to two digits', () => {
      // `48°8′N` reads as a coarser reading than `48°08′N`, and a column of them would not line up.
      expect(degreesAndMinutes(48.13, 'N', 'S')).toBe('48°08′N')
    })

    it('writes 2.35 as 2°21′E, 11.57 as 11°34′E and 48.13 as 48°08′N', () => {
      // s01: "the status bar reads 2°21′E 48°51′N · unclaimed"
      expect(degreesAndMinutes(2.35, 'E', 'O')).toBe('2°21′E')
      expect(degreesAndMinutes(11.57, 'E', 'O')).toBe('11°34′E')
      expect(degreesAndMinutes(48.13, 'N', 'S')).toBe('48°08′N')
    })
  })

  describe('edge cases', () => {
    it('rolls 60 minutes into the next degree instead of writing them', () => {
      // **The trap this module exists around.** Taking the whole degrees first and the minutes
      // separately gives `48°60′` just below 49 — not a coordinate, and it happens on a whole line of
      // latitude, so a reader meets it immediately. Rounding to the minute first makes it impossible.
      expect(degreesAndMinutes(48.9999, 'N', 'S')).toBe('49°00′N')
      expect(degreesAndMinutes(-0.9999, 'E', 'O')).toBe('1°00′O')
    })

    it('calls zero the positive hemisphere rather than inventing a third case', () => {
      // Greenwich is neither east nor west, and the equator neither north nor south. One of the two
      // has to be picked; picking means the label never has a shape nothing else has.
      expect(degreesAndMinutes(0, 'E', 'O')).toBe('0°00′E')
    })

    it('handles the frame’s own corners', () => {
      // The DEM reaches 78.75°E and 11.178401873711783°N.
      expect(degreesAndMinutes(78.75, 'E', 'O')).toBe('78°45′E')
      expect(degreesAndMinutes(11.178401873711783, 'N', 'S')).toBe('11°11′N')
    })
  })

  // L3/L4: N/A — arithmetic over a number the projection produced. A NaN would surface as `NaN°`,
  // which is loud rather than plausible, and is the behaviour `rules/error-handling.md` prefers.
})

describe('formatLonLat', () => {
  describe('happy path', () => {
    it('writes longitude first, then latitude', () => {
      // Longitude first, as the document stores a point — so the label and the data read in the same
      // order, and a reader comparing the two is not silently transposing them.
      expect(formatLonLat([2.35, 48.85])).toBe('2°21′E 48°51′N')
    })
  })

  describe('variants', () => {
    it('does not transpose the two axes', () => {
      // The same two numbers the other way round must not produce the same string.
      expect(formatLonLat([48.85, 2.35])).toBe('48°51′E 2°21′N')
    })

    it('writes a position west of Greenwich and south of the equator', () => {
      expect(formatLonLat([-9.5, -3.25])).toBe('9°30′O 3°15′S')
    })
  })

  describe('edge cases', () => {
    it('writes the origin', () => {
      expect(formatLonLat([0, 0])).toBe('0°00′E 0°00′N')
    })
  })
})
