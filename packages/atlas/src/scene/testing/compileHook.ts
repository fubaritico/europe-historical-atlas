/**
 * Run a material's compile hook as three would, with no renderer: a test reads what the hook leaves in the shader —
 * its uniforms and its rewritten vertex stage (`../depthBias`).
 */

import type { Material, WebGLProgramParametersWithUniforms } from 'three'

/**
 * Hand a material's `onBeforeCompile` a shader, as three's `getProgram` does.
 * @param material - the material
 * @param vertexShader - the source three would hand it
 * @returns the shader, as the hook left it
 */
export function compileHook(
  material: Material,
  vertexShader: string
): WebGLProgramParametersWithUniforms {
  const shader = { uniforms: {}, vertexShader } as unknown as WebGLProgramParametersWithUniforms
  material.onBeforeCompile(shader, undefined as never)
  return shader
}
