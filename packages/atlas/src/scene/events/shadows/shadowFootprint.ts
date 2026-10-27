/**
 * Where a marker's shadow falls, and what shape it is — data in, data out (ATLAS-298). The light comes from the
 * north-west, as the relief's own hillshade does (`terrainOptions`' azimuth, 315 by cartographic convention), so a
 * marker's shadow falls the same way as the mountains' (the dev, 2026-10-27: « une ombre portée qui viendrait du
 * nord-ouest vers le sud-est »). A shape is a list of capsules along the shadow's axis, so a pin is two of them and
 * an icon can be described the same way.
 */

/** Where the light that casts the markers' shadows comes from. */
export interface ShadowSun {
  /** Its azimuth, in degrees clockwise from north — 315 is the north-west. */
  azimuthDeg: number
  /** Its height above the horizon, in degrees: the lower, the longer the shadows. */
  elevationDeg: number
}

/** The markers' sun: from the north-west, as the relief's hillshade, fairly low so a small pin casts a readable shadow. */
export const SHADOW_SUN: ShadowSun = { azimuthDeg: 315, elevationDeg: 35 }

/**
 * How dark every marker's shadow is at its darkest — the pins' drawn ones and the icons' projected ones alike (the
 * dev, 2026-10-27: « même type d'ombre, même force, pas plus »), no darker than the relief's own deepest shade
 * (« qu'elle ne soit pas plus forte que les reliefs » — 0.45 was).
 */
export const SHADOW_OPACITY = 0.2

/**
 * A stroke of the shadow: a segment along the shadow's axis, thickened by a radius — a stem is a long one, a ball's
 * shadow one whose two ends are the same point.
 */
export interface ShadowCapsule {
  /** Where it starts along the axis, from the marker's foot toward the shadow's tip, in world units. */
  from: number
  /** Where it ends along the axis, in world units. */
  to: number
  /** Its half-width, in world units. */
  radius: number
}

/** A marker's shadow: its strokes and how soft their edges are. */
export interface ShadowFootprint {
  /** Its strokes, along the axis. */
  capsules: readonly ShadowCapsule[]
  /**
   * How far each stroke's edge fades, as a share of that stroke's own radius — so a thin stem casts a thin shadow and
   * a ball a soft disc (the dev, 2026-10-27: « l'ombre de la tige doit être vachement plus fine »; one softness in
   * world units, set by the head, made the stem's shadow four times its width).
   */
  softness: number
}

/** A pin's measures, as `pin`'s style gives them. */
export interface PinMeasures {
  /** The stem's height. */
  height: number
  /** The head's radius. */
  radius: number
  /** The stem's radius. */
  stemRadius: number
}

/**
 * The way the shadows fall on the ground, as a unit vector `[x, z]` in the world — east is +X, south is +Z: away from
 * the sun.
 * @param sun - where the light comes from
 * @returns the direction the shadows fall
 */
export function shadowDirection(sun: ShadowSun): [number, number] {
  const azimuth = (sun.azimuthDeg * Math.PI) / 180
  // Toward the sun: north is −Z, east +X; the shadow falls the other way.
  return [-Math.sin(azimuth), Math.cos(azimuth)]
}

/**
 * The way the light travels, as a unit vector `[x, y, z]` in the world: down, and toward where the shadows fall.
 * @param sun - where the light comes from
 * @returns the light's direction
 */
export function sunFall(sun: ShadowSun): [number, number, number] {
  const [x, z] = shadowDirection(sun)
  const elevation = (sun.elevationDeg * Math.PI) / 180
  return [x * Math.cos(elevation), -Math.sin(elevation), z * Math.cos(elevation)]
}

/**
 * How far along the ground the shadow of a point at this height falls from its foot.
 * @param height - the point's height above the ground
 * @param sun - where the light comes from
 * @returns the distance, in the same units
 */
export function shadowReach(height: number, sun: ShadowSun): number {
  return height / Math.tan((sun.elevationDeg * Math.PI) / 180)
}

/**
 * A pin's shadow: its stem from the foot to where the head's shadow lands, and the head as a disc there.
 * @param pin - the pin's measures
 * @param sun - where the light comes from
 * @returns the footprint
 */
export function pinFootprint(pin: PinMeasures, sun: ShadowSun): ShadowFootprint {
  const tip = shadowReach(pin.height, sun)
  return {
    capsules: [
      { from: 0, to: tip, radius: pin.stemRadius },
      { from: tip, to: tip, radius: pin.radius },
    ],
    // Each edge fading over a little more than half its stroke's radius: soft, and as thin as what casts it.
    softness: 0.6,
  }
}
