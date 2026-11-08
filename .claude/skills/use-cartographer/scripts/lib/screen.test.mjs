import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calibrate, parseBarPosition } from './screen.mjs'

describe('parseBarPosition', () => {
  it('reads the French bar, west written O', () => {
    assert.deepEqual(parseBarPosition('4°13′O 39°46′N'), [-(4 + 13 / 60), 39 + 46 / 60])
  })

  it('reads east and the English west', () => {
    assert.deepEqual(parseBarPosition('0°39′E 38°50′N'), [0.65, 38 + 50 / 60])
    assert.deepEqual(parseBarPosition('1°21′W 42°00′N'), [-1.35, 42])
  })

  it('refuses text that is not a position', () => {
    assert.throws(() => parseBarPosition('Retracing Kingdom of Castile'), /not a position/)
  })
})

describe('calibrate', () => {
  it('gives back the hover and the screen point measured on 2026-11-08', () => {
    const toScreen = calibrate(
      { x: 200, y: 200, at: [-4.1, 42.8167] },
      { x: 1200, y: 750, at: [0.8833, 40.7833] }
    )
    assert.deepEqual(toScreen([-4.1, 42.8167]).map(Math.round), [200, 200])
    // Anchor 23 at Milagro was on screen at 666,341, clicked there and confirmed by the bar.
    assert.deepEqual(toScreen([-1.776, 42.301]).map(Math.round), [666, 341])
  })

  it('refuses two hovers on one vertical', () => {
    assert.throws(
      () => calibrate({ x: 1, y: 1, at: [0, 40] }, { x: 1, y: 9, at: [0, 41] }),
      /both axes/
    )
  })
})
