// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { MODE_INDEX } from './tintOnRelief'

describe('MODE_INDEX', () => {
  it('numbers the four blend modes as the shader switches on them', () => {
    // blend() in the fragment shader: 1 multiply, 2 overlay, 3 softLight, anything else normal. GLSL
    // cannot import blendChannel, so the numbering is the contract between the two copies.
    expect(MODE_INDEX).toEqual({ normal: 0, multiply: 1, overlay: 2, softLight: 3 })
  })
})
