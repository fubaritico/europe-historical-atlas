/**
 * The hatches' shaders (ATLAS-399): each stripe is read from a small image repeated on the ground — **baked, never
 * resized with the zoom** (the dev, 2026-11-09: _"it vibrates when you zoom, because it resizes"_) — and the colour of
 * its polity is blended over the baked terrain as a fill's is.
 *
 * The stripes run at 45° on the map, as in the Cartographer: the image is read along `x + z`, one stripe every
 * `stripeWorld` world units. Each image holds one channel per colour (`hatchTextures`), so its mipmaps — the reduced
 * copies the GPU reads from afar — blend the colours rather than flicker between them.
 */

import { BLEND_GLSL } from '../tintOnRelief'

/**
 * The name of a hatch colour's attribute.
 * @param rank - the colour's rank in its piece, `0` first
 * @returns `colour0`, `colour1`…
 */
export function hatchColourAttribute(rank: number): string {
  return `colour${String(rank)}`
}

/** The vertex stage: the relief's uv, the stripe coordinate along the diagonal, the piece's colours and their count. */
export const HATCH_VERTEX_SHADER = /* glsl */ `
  attribute vec3 colour0;
  attribute vec3 colour1;
  attribute vec3 colour2;
  attribute vec3 colour3;
  attribute float count;
  uniform vec2 plane;
  uniform float stripeWorld;
  varying vec2 vUv;
  varying float vStripe;
  varying vec3 vColour0;
  varying vec3 vColour1;
  varying vec3 vColour2;
  varying vec3 vColour3;
  varying float vCount;
  void main() {
    // The relief's uv, as the fills read it: u west→east, v = 1 at the north edge.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    // One unit per stripe, along the diagonal: a stripe is the band between two lines of constant x + z.
    vStripe = (position.x + position.z) / stripeWorld;
    vColour0 = colour0;
    vColour1 = colour1;
    vColour2 = colour2;
    vColour3 = colour3;
    vCount = count;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * The fragment stage: the stripe's colour, as the weights its image gives each of the piece's colours, then the bake's
 * blend. **Every image is read before the choice**: a texture read inside a branch has no derivatives to choose its
 * mipmap by.
 */
export const HATCH_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D stripes2;
  uniform sampler2D stripes3;
  uniform sampler2D stripes4;
  uniform float strength;
  varying vec2 vUv;
  varying float vStripe;
  varying vec3 vColour0;
  varying vec3 vColour1;
  varying vec3 vColour2;
  varying vec3 vColour3;
  varying float vCount;
  ${BLEND_GLSL}
  void main() {
    vec4 two = texture2D(stripes2, vec2(vStripe / 2.0, 0.5));
    vec4 three = texture2D(stripes3, vec2(vStripe / 3.0, 0.5));
    vec4 four = texture2D(stripes4, vec2(vStripe / 4.0, 0.5));
    vec4 weights = vCount < 2.5 ? two : (vCount < 3.5 ? three : four);
    vec3 tint = weights.r * vColour0 + weights.g * vColour1 + weights.b * vColour2 + weights.a * vColour3;
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    vec3 tinted = base + (blend(base, tint) - base) * strength;
    gl_FragColor = vec4(toLinear(tinted), 1.0);
    #include <colorspace_fragment>
  }
`
