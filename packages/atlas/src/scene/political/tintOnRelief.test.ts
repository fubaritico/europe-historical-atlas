// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { allLand } from '../relief/testing/landFixture'

import { FILL_FRAGMENT_SHADER } from './fills/fillShader'
import { HATCH_FRAGMENT_SHADER } from './hatches/hatchShader'
import { MODE_INDEX, landUniforms } from './tintOnRelief'
import { TRIBE_FRAGMENT_SHADER } from './tribes/tribeShader'

describe('MODE_INDEX', () => {
  it('numbers the four blend modes as the shader switches on them', () => {
    // blend() in the fragment shader: 1 multiply, 2 overlay, 3 softLight, anything else normal. GLSL
    // cannot import blendChannel, so the numbering is the contract between the two copies.
    expect(MODE_INDEX).toEqual({ normal: 0, multiply: 1, overlay: 2, softLight: 3 })
  })
})

describe('the land test', () => {
  it.each([
    ['fills', FILL_FRAGMENT_SHADER],
    ['tribes', TRIBE_FRAGMENT_SHADER],
    ['hatches', HATCH_FRAGMENT_SHADER],
  ])('the %s draw nothing over water, before anything else is computed', (_layer, shader) => {
    const main = shader.slice(shader.indexOf('void main()'))
    expect(main).toMatch(/^void main\(\) \{\s*\/\/[^\n]*\n\s*if \(overWater\(vUv\)\) discard;/)
    expect(shader).toContain('uniform sampler2D landWest;')
  })

  it('hands each layer the mask’s two halves and where they meet', () => {
    const land = allLand()
    const uniforms = landUniforms(land)
    expect(uniforms.landWest?.value).toBe(land.west)
    expect(uniforms.landEast?.value).toBe(land.east)
    expect(uniforms.landSplit?.value).toBe(land.split)
  })
})
