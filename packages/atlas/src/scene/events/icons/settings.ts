/**
 * How the icons stand on the map, as tuned on sight (the dev, 2026-10-26): their size, their lift, their sway, where
 * the 3D fades into the flat drawing, how big the flat drawing and the halo stand. **A look stays beside what it
 * draws**: a model's proportions in `meshes/`, a drawing's rim and colours in `flat/`, the lights and the halo's glow
 * in `light/`, the colours in `palette`.
 */

import type { EventIconKind } from './kinds'

/**
 * How tall an icon stands, in world units — the map is 12 wide; a pin is 0.12 to the top of its head. Set on sight
 * (the dev, 2026-10-26): 0.13, halved, then a little smaller again.
 */
export const EVENT_ICON_HEIGHT = 0.05

/**
 * How far each kind of icon floats above its place, in icon heights. The crossed swords turn and sway with nothing
 * under them, so they float clear of the relief, which would otherwise swallow their hilts (the dev, 2026-10-26); a
 * shape with a base would stand on the ground — every kind has its own rule.
 */
export const ICON_LIFT: Record<EventIconKind, number> = { swords: 0.6, tower: 0, crown: 0 }

/**
 * How far the 3D icons and their halo are pulled toward the camera, in icon heights, and the flat drawings in their own
 * widths, so a slope they stand on or turn into does not cut them (the dev, 2026-10-27: *« à l'instar des frontières,
 * quoi qu'il arrive, les avoir toujours devant »*; the flat drawings too, same day). Along the line of sight, so
 * nothing moves on screen (`../../depthBias`); one height clears the swords as they turn. A massif standing between
 * the camera and the icon still hides it, as it should on a relief.
 */
export const ICON_DEPTH_PULL = 1

/**
 * How tall each kind's 3D model stands, in icon heights. The tower was cut down on sight (the dev, 2026-10-27: *« réduis
 * la taille de la tour »*).
 */
export const ICON_SIZE: Record<EventIconKind, number> = { swords: 1, tower: 0.7, crown: 1 }

/**
 * Which kinds of 3D icon turn to face the camera, and sway as they do. The crossed swords float and turn; the tower
 * stands on the ground, still and upright, its door to the south (the dev, 2026-10-27: *« posée sur le sol, ne pas
 * suivre la caméra et ne pas être animée »*) — every kind has its own rule.
 */
export const ICON_FACES_CAMERA: Record<EventIconKind, boolean> = {
  swords: true,
  tower: false,
  crown: true,
}

/** How the icons sway about their own upright, either side of facing the camera (the dev, 2026-10-26). */
export const ICON_SWAY = { amplitudeRad: (25 * Math.PI) / 180, periodSeconds: 4 }

/**
 * The zoom (0 zoomed out, 1 in) around which the icons pass from flat to 3D (the dev, 2026-10-26), and the span over
 * which the one fades into the other — the vassals' reveal does the same (`scene/political/homageReveal`). Moved in from
 * 0.45 so the flat drawing holds longer as the camera closes in (the dev, 2026-10-27: *« le sprite devrait survivre plus
 * longtemps au zoom »*) — a first value, to be set on the map.
 */
export const ICON_CROSS_FADE = { zoom: 0.6, span: 0.1 }

/**
 * How wide a flat icon is, in 3D icon heights. Its drawing is cropped to the swords (`flat/eventIconSvg`), so the
 * sprite is the swords' own width — set so the blades keep the size the dev chose on sight (2026-10-26); the smaller
 * pommels narrowed the crop, and the span with it.
 */
export const ICON_FLAT_SPAN = 1

/** How far above the 3D icon's middle a flat icon is centred, in icon heights — raised a little, on sight. */
export const ICON_FLAT_RAISE = 0.2

/** The fewest pixels a flat icon keeps on screen, so it stays legible zoomed far out. */
export const ICON_FLAT_MIN_PIXELS = 20

/** How wide the halo behind a 3D icon is, in icon heights — 2.2, widened on sight (the dev, 2026-10-26). */
export const ICON_HALO_SPAN = 2.6
