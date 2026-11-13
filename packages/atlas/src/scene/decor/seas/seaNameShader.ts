/**
 * The seas' names' shader (ATLAS-440): the name's image, see-through, drawn **over the sea only** — the dev, 2026-11-13:
 * *"it is shown only in the sea's zones"*. A letter's pixel over land is dropped against the land mask's coast, the
 * same test the fills make the other way (`political/tintOnRelief`, `LAND_GLSL`): wherever an arc is laid, no letter
 * reaches the land.
 */

import { LAND_GLSL } from '../../political/tintOnRelief'

/**
 * The vertex shader: the image's coordinates as laid, and the point's place on the map — its `u` east, its `v` north, as
 * the land mask is read (`fillShader`'s `vUv`).
 */
export const SEA_NAME_VERTEX_SHADER = /* glsl */ `
  uniform vec2 plane;
  varying vec2 vUv;
  varying vec2 vMapUv;
  void main() {
    vUv = uv;
    vMapUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** The fragment shader: nothing over land; over the sea, the image at the names' opacity. */
export const SEA_NAME_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float opacity;
  varying vec2 vUv;
  varying vec2 vMapUv;
  ${LAND_GLSL}
  void main() {
    if (!overWater(vMapUv)) discard;
    vec4 texel = texture2D(map, vUv);
    gl_FragColor = vec4(texel.rgb, texel.a * opacity);
    #include <colorspace_fragment>
  }
`
