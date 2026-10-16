/**
 * Pull a line toward the camera along its line of sight, so it wins the depth test without moving.
 *
 * The coastline used to be lifted straight up to clear the relief, and a lifted line seen at an angle
 * slides up the screen by about its own height: measured on 2026-10-16 as a visible shift of the whole
 * shoreline northward (*« un léger décalage vers le haut »*). Moving a vertex along the ray from the
 * camera instead leaves its projection where it was — a point anywhere on that ray lands on the same
 * pixel — while bringing it nearer, so the terrain it sits on no longer hides it.
 *
 * Done in the vertex shader, in view space, because the ray depends on where the camera is each frame.
 */

import type { LineBasicMaterial, WebGLProgramParametersWithUniforms } from 'three'
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js'

/** The uniform the injected code reads, in world units. */
export const DEPTH_BIAS_UNIFORM = 'lineDepthBias'

/** The line of `project_vertex` after which the view-space position is final for built-in materials. */
const BUILT_IN_ANCHOR = '#include <project_vertex>'

/** The line of three's fat-line shader after which both view-space endpoints exist. */
const FAT_LINE_ANCHOR = 'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );'

/**
 * GLSL moving a view-space position toward the camera by `bias` along its own ray.
 *
 * The camera sits at the view-space origin, so scaling the position shortens its distance and keeps its
 * direction. Clamped at zero so a point closer than the bias collapses onto the camera rather than
 * flipping behind it.
 * @param name - the `vec4` view-space variable to move
 * @returns the statement
 */
export function pullTowardCamera(name: string): string {
  return `${name}.xyz *= max( 0.0, 1.0 - ${DEPTH_BIAS_UNIFORM} / max( length( ${name}.xyz ), 1e-6 ) );`
}

/**
 * Rewrite a vertex shader so it pulls its positions toward the camera.
 * @param vertexShader - the shader source
 * @param kind - `built-in` for a material using `project_vertex`, `fat` for three's `LineMaterial`
 * @returns the rewritten source
 * @throws when the anchor the rewrite needs is not in the source — a three upgrade that moved it would
 *   otherwise leave the line unbiased, and hidden again, with nothing to say why
 */
export function injectDepthBias(vertexShader: string, kind: 'built-in' | 'fat'): string {
  const anchor = kind === 'built-in' ? BUILT_IN_ANCHOR : FAT_LINE_ANCHOR
  if (!vertexShader.includes(anchor))
    throw new Error(`depth bias: the ${kind} vertex shader no longer contains "${anchor}"`)
  const pulled =
    kind === 'built-in'
      ? `${pullTowardCamera('mvPosition')}\ngl_Position = projectionMatrix * mvPosition;`
      : `${pullTowardCamera('start')}\n${pullTowardCamera('end')}`
  return `uniform float ${DEPTH_BIAS_UNIFORM};\n${vertexShader.replace(anchor, `${anchor}\n${pulled}`)}`
}

/**
 * Make a line material pull its vertices toward the camera by `bias` world units.
 * @param material - the thin or fat line material
 * @param kind - which shader it compiles
 * @param bias - how far toward the camera, in world units; zero or less leaves the material untouched
 * @returns nothing; the material is changed in place
 */
export function applyDepthBias(
  material: LineBasicMaterial | LineMaterial,
  kind: 'built-in' | 'fat',
  bias: number
): void {
  if (bias <= 0) return
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms): void => {
    shader.uniforms[DEPTH_BIAS_UNIFORM] = { value: bias }
    shader.vertexShader = injectDepthBias(shader.vertexShader, kind)
  }
  // Keeps three from sharing a compiled program with an unbiased material of the same type.
  material.customProgramCacheKey = (): string => `depth-bias-${kind}`
}
