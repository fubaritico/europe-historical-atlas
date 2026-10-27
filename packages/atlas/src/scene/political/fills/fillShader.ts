/**
 * The fills' shaders: the vertex stage mixes the two levels of homage the zoom stands between, the fragment stage
 * blends the tint over the baked terrain as the bake does.
 */

import { BLEND_GLSL } from '../tintOnRelief'

/**
 * The name of a level's tint attribute.
 * @param level - the display level
 * @returns `tint0`, `tint1`…
 */
export function tintAttribute(level: number): string {
  return `tint${String(level)}`
}

/**
 * The vertex stage for a number of levels: the texture coordinate comes from the world position, as the
 * relief's does, and the tint is the mix of the two levels around `detail`.
 * @param levels - how many tint levels the geometry carries, at least one
 * @returns the GLSL source
 */
export function fillVertexShader(levels: number): string {
  // One attribute name per level; the last one is what `tintAt` returns once every test has failed.
  const count = Math.max(1, Math.floor(levels))
  const names = Array.from({ length: count }, (_, level) => tintAttribute(level))
  const last = names[names.length - 1] ?? tintAttribute(0)
  return /* glsl */ `
  #define LEVELS ${String(count)}
  ${names.map((name) => `attribute vec3 ${name};`).join('\n  ')}
  uniform vec2 plane;
  uniform float detail;
  varying vec2 vUv;
  varying vec3 vTint;
  vec3 tintAt(float level) {
    ${names
      .slice(0, -1)
      .map((name, level) => `if (level < ${String(level)}.5) return ${name};`)
      .join('\n    ')}
    return ${last};
  }
  void main() {
    // The relief's uv: u west→east, v = 1 at the north edge (z = -depth/2), the texture flipped to match.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    float top = float(LEVELS - 1);
    float d = clamp(detail, 0.0, top);
    float below = floor(d);
    vTint = mix(tintAt(below), tintAt(min(below + 1.0, top)), d - below);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
}

/** The fragment stage: the bake's blend, in sRGB as the bake does it, then back to linear for output. */
export const FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float strength;
  varying vec2 vUv;
  varying vec3 vTint;
  ${BLEND_GLSL}
  void main() {
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    vec3 tinted = base + (blend(base, vTint) - base) * strength;
    gl_FragColor = vec4(toLinear(tinted), 1.0);
    #include <colorspace_fragment>
  }
`
