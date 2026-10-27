// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { fillVertexShader, tintAttribute } from './fillShader'

describe('fillVertexShader', () => {
  it('declares one tint attribute per level and compiles the count in', () => {
    const source = fillVertexShader(3)
    expect(source).toContain('#define LEVELS 3')
    for (const level of [0, 1, 2])
      expect(source).toContain(`attribute vec3 ${tintAttribute(level)};`)
    expect(source).not.toContain('tint3')
  })

  it('mixes the two levels around the detail uniform', () => {
    expect(fillVertexShader(2)).toMatch(
      /mix\(tintAt\(below\), tintAt\(min\(below \+ 1\.0, top\)\), d - below\)/
    )
  })

  it('reads one level as a single attribute', () => {
    const source = fillVertexShader(1)
    expect(source).toContain('#define LEVELS 1')
    expect(source).toContain('return tint0;')
    expect(source).not.toContain('tint1')
  })
})
