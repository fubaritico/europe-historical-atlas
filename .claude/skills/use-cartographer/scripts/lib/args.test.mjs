import assert from 'node:assert/strict'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { formatLonLat, parseBox, parseHover, parseNumbers, yearFolder } from './args.mjs'

describe('parseNumbers', () => {
  it('reads the numbers, negative ones included', () => {
    assert.deepEqual(parseNumbers('-10,35.5', 2, '--x'), [-10, 35.5])
  })

  it('refuses an empty field, which Number would read as 0', () => {
    assert.throws(() => parseNumbers('-1,,0,40', 4, '--box'), /--box wants 4 numbers/)
  })

  it('refuses a wrong count and a word', () => {
    assert.throws(() => parseNumbers('1,2,3', 4, '--box'), /4 numbers/)
    assert.throws(() => parseNumbers('1,abc', 2, 'a position'), /a position/)
  })
})

describe('parseBox', () => {
  it('is absent when the option is', () => {
    assert.equal(parseBox(undefined), undefined)
  })

  it('reads west, south, east, north', () => {
    assert.deepEqual(parseBox('-10,35,1,44'), [-10, 35, 1, 44])
  })

  it('refuses a box whose sides are swapped', () => {
    assert.throws(() => parseBox('1,35,-10,44'), /west < east/)
  })
})

describe('parseHover', () => {
  it('reads the screen point and the bar position copied as it is', () => {
    assert.deepEqual(parseHover('200,200,4°06′O 42°49′N'), {
      x: 200,
      y: 200,
      at: [-(4 + 6 / 60), 42 + 49 / 60],
    })
  })

  it('refuses a screen point that is not a number', () => {
    assert.throws(() => parseHover('x,200,4°06′O 42°49′N'), /a hover/)
  })
})

describe('yearFolder', () => {
  it('reads a bare name as a folder of years/ in the checkout', () => {
    assert.equal(yearFolder('1100', '/repo'), join('/repo', 'packages/atlas/public/years', '1100'))
  })

  it('reads a name with a slash as a path', () => {
    assert.equal(yearFolder('/tmp/1100', '/repo'), '/tmp/1100')
  })
})

describe('formatLonLat', () => {
  it('prints three decimals, about 100 m', () => {
    assert.equal(formatLonLat([-1.77556, 42.30119]), '-1.776,42.301')
  })
})
