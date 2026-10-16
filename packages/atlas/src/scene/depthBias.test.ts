import { LineBasicMaterial, ShaderLib } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { describe, expect, it } from 'vitest'

import { DEPTH_BIAS_UNIFORM, applyDepthBias, injectDepthBias, pullTowardCamera } from './depthBias'

import type { WebGLProgramParametersWithUniforms } from 'three'

/**
 * Run a material's compile hook against a shader, as three would.
 * @param material - the material
 * @param vertexShader - the source handed to the hook
 * @returns what the hook left in the shader
 */
const compile = (
  material: LineBasicMaterial | LineMaterial,
  vertexShader: string
): WebGLProgramParametersWithUniforms => {
  const shader = { uniforms: {}, vertexShader } as unknown as WebGLProgramParametersWithUniforms
  material.onBeforeCompile(shader, undefined as never)
  return shader
}

describe('depthBias', () => {
  describe('happy path', () => {
    it('rewrites the real thin-line shader of this three version, recomputing the clip position', () => {
      // LineBasicMaterial compiles the `basic` shader; the anchor must be in it, not in a stand-in.
      const out = injectDepthBias(ShaderLib.basic.vertexShader, 'built-in')
      expect(out.startsWith(`uniform float ${DEPTH_BIAS_UNIFORM};`)).toBe(true)
      expect(out).toContain(pullTowardCamera('mvPosition'))
      expect(out.indexOf('gl_Position = projectionMatrix * mvPosition;')).toBeGreaterThan(
        out.indexOf(pullTowardCamera('mvPosition'))
      )
    })

    it('rewrites the real fat-line shader, moving both endpoints before the clip maths', () => {
      const shader = new LineMaterial().vertexShader
      const out = injectDepthBias(shader, 'fat')
      expect(out).toContain(pullTowardCamera('start'))
      expect(out).toContain(pullTowardCamera('end'))
      expect(out.indexOf(pullTowardCamera('end'))).toBeLessThan(out.indexOf('vec4 clipStart'))
    })

    it('hands the bias to the program as a uniform when the material compiles', () => {
      const material = new LineBasicMaterial()
      applyDepthBias(material, 'built-in', 0.009)
      const shader = compile(material, ShaderLib.basic.vertexShader)
      expect(shader.uniforms[DEPTH_BIAS_UNIFORM]).toEqual({ value: 0.009 })
      expect(shader.vertexShader).toContain(pullTowardCamera('mvPosition'))
    })
  })

  describe('variants', () => {
    it('keeps a biased program apart from an unbiased one of the same type', () => {
      const biased = new LineBasicMaterial()
      applyDepthBias(biased, 'built-in', 0.009)
      expect(biased.customProgramCacheKey()).not.toBe(
        new LineBasicMaterial().customProgramCacheKey()
      )
    })

    it('scales the view-space position toward the origin, where the camera is', () => {
      // A point on the ray keeps its pixel: only its distance changes.
      expect(pullTowardCamera('p')).toBe(
        `p.xyz *= max( 0.0, 1.0 - ${DEPTH_BIAS_UNIFORM} / max( length( p.xyz ), 1e-6 ) );`
      )
    })
  })

  describe('managed errors', () => {
    it('refuses a shader whose anchor moved, rather than leaving the line unbiased and hidden', () => {
      expect(() => injectDepthBias('void main() {}', 'built-in')).toThrow('project_vertex')
      expect(() => injectDepthBias('void main() {}', 'fat')).toThrow('instanceEnd')
    })
  })

  // L4 (unmanaged errors): N/A — string rewriting and a hook; three compiles the result.

  describe('edge cases', () => {
    it('leaves the material untouched with no bias', () => {
      const material = new LineBasicMaterial()
      applyDepthBias(material, 'built-in', 0)
      expect(compile(material, ShaderLib.basic.vertexShader).vertexShader).toBe(
        ShaderLib.basic.vertexShader
      )
    })
  })
})
