/**
 * Pull a line or a mesh toward the camera along its line of sight, so it wins the depth test without moving.
 *
 * The coastline used to be lifted straight up to clear the relief, and a lifted line seen at an angle
 * slides up the screen by about its own height: measured on 2026-10-16 as a visible shift of the whole
 * shoreline northward (*« un léger décalage vers le haut »*). Moving a vertex along the ray from the
 * camera instead leaves its projection where it was — a point anywhere on that ray lands on the same
 * pixel — while bringing it nearer, so the terrain it sits on no longer hides it.
 *
 * Done in the vertex shader, in view space, because the ray depends on where the camera is each frame. Shared by the
 * lines laid on the relief and the 3D event icons, which the slopes would otherwise cut into (ATLAS-296).
 */

import type { Material, WebGLProgramParametersWithUniforms } from 'three'

/** The uniform the injected code reads, in world units — the same name in every material it rewrites, lines and meshes. */
export const DEPTH_BIAS_UNIFORM = 'depthBias'

/**
 * The line of `project_vertex` after which the view-space position is final for built-in materials — instanced ones
 * included, since the chunk applies the instance's matrix before the model-view one.
 */
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
 * @param kind - `built-in` for a material using `project_vertex` (lines and meshes alike), `fat` for three's
 *   `LineMaterial`
 * @returns the rewritten source
 * @throws when the anchor the rewrite needs is not in the source — a three upgrade that moved it would
 *   otherwise leave the line unbiased, and hidden again, with nothing to say why
 */
export function injectDepthBias(vertexShader: string, kind: 'built-in' | 'fat'): string {
  // The line to insert after, which must still be in this three's shader.
  const anchor = kind === 'built-in' ? BUILT_IN_ANCHOR : FAT_LINE_ANCHOR
  if (!vertexShader.includes(anchor))
    throw new Error(`depth bias: the ${kind} vertex shader no longer contains "${anchor}"`)
  // Built-in: pull the one position and reproject it. Fat line: pull both endpoints of the segment.
  const pulled =
    kind === 'built-in'
      ? `${pullTowardCamera('mvPosition')}\ngl_Position = projectionMatrix * mvPosition;`
      : `${pullTowardCamera('start')}\n${pullTowardCamera('end')}`
  // Declare the uniform at the top, and put the pull right after the anchor.
  return `uniform float ${DEPTH_BIAS_UNIFORM};\n${vertexShader.replace(anchor, `${anchor}\n${pulled}`)}`
}

/**
 * Make a material pull its vertices toward the camera by `bias` world units. Each material keeps its own bias, even
 * where two share a compiled program: three holds the uniforms per material (`WebGLRenderer.js`, `getProgram`).
 * @param material - a built-in material (a thin line, a mesh) or a fat line's
 * @param kind - which shader it compiles
 * @param bias - how far toward the camera, in world units; zero or less leaves the material untouched
 * @returns nothing; the material is changed in place
 */
export function applyDepthBias(material: Material, kind: 'built-in' | 'fat', bias: number): void {
  if (bias <= 0) return
  applyLiveDepthBias(material, kind, { value: bias })
}

/** A pull toward the camera that may change after its material compiled. */
export interface LiveDepthBias {
  /** How far toward the camera, in world units — read again by three at every frame. */
  value: number
}

/**
 * Make a material pull its vertices toward the camera by however far `bias` says at each frame: the shader holds the
 * object itself, so a new `value` reaches the next frame with no recompile — three uploads a material's uniforms again
 * at its first draw of every render (`WebGLRenderer.js`, `setProgram`, `_currentMaterialId` reset after each render).
 * @param material - a built-in material (a thin line, a mesh) or a fat line's
 * @param kind - which shader it compiles
 * @param bias - the pull, shared with whoever changes it
 * @returns nothing; the material is changed in place
 */
export function applyLiveDepthBias(
  material: Material,
  kind: 'built-in' | 'fat',
  bias: LiveDepthBias
): void {
  // When three compiles the material: hand the bias to the shader and rewrite its vertex stage.
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms): void => {
    shader.uniforms[DEPTH_BIAS_UNIFORM] = bias
    shader.vertexShader = injectDepthBias(shader.vertexShader, kind)
  }
  // Keeps three from sharing a compiled program with an unbiased material of the same type.
  material.customProgramCacheKey = (): string => `depth-bias-${kind}`
}
