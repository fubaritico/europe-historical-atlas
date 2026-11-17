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
export const ICON_LIFT: Record<EventIconKind, number> = {
  swords: 0.6,
  tower: 0,
  crown: 0,
  cathedral: 0,
  tomb: 0,
}

/**
 * How far the 3D markers and their halo are pulled toward the camera, in their heights (an icon's, a pin's), and the
 * flat drawings and their halos in the drawings' widths (ATLAS-306), so a slope they stand on or turn into does not cut them (the dev, 2026-10-27: *« à l'instar des frontières,
 * quoi qu'il arrive, les avoir toujours devant »*; the flat drawings too, same day). Along the line of sight, so
 * nothing moves on screen (`../../depthBias`); one height clears the swords as they turn. A massif standing between
 * the camera and the icon still hides it, as it should on a relief.
 */
export const ICON_DEPTH_PULL = 1

/**
 * How tall each kind's 3D model stands, in icon heights. The siege's was cut down on sight when it was a tower (the dev,
 * 2026-10-27: *« réduis la taille de la tour »*), 0.7; the trebuchet that replaced it twice that (*« deux fois plus
 * grande par rapport à la taille de départ »*). The battle's swords, 1 first, then 0.85 (the dev, 2026-10-31: *« réduis-la
 * un petit peu »*). The accession's crown, 1 first, then 0.7 (the dev, 2026-11-17, of the crown chosen that day: *« la
 * couronne doit être plus petite »*). **Then every kind at three quarters of that** — 0.85, 1.4 and 0.7 before it — set
 * on the map the same day, half tried first (the dev: *« on va garder ça comme ça »*). The cathedral, 0.6: set on
 * the map at Cologne the same day — 0.95 first, *« réduis sa taille par 2 »*, then *« tu peux l'agrandir un peu »*.
 */
export const ICON_SIZE: Record<EventIconKind, number> = {
  swords: 0.6375,
  tower: 1.05,
  crown: 0.525,
  cathedral: 0.6,
  // A grave is a small thing: judged on the map at Cluny (the dev, 2026-11-17: « c'est juste la bonne taille […]
  // ça peut pas être gros […] c'est pudique, c'est bien »).
  tomb: 0.45,
}

/**
 * Which kinds of 3D icon turn to face the camera, and sway as they do. The crossed swords float and turn; the siege
 * stands on the ground and does not follow the camera (the dev, 2026-10-27, of the tower: *« posée sur le sol, ne pas
 * suivre la caméra »*) — a trebuchet seen side on from the south, its arm throwing east — every kind has its own rule.
 * The crown stands on the ground too (the dev, 2026-11-17: *« elle ne doit pas regarder vers la caméra »*).
 */
export const ICON_FACES_CAMERA: Record<EventIconKind, boolean> = {
  swords: true,
  tower: false,
  crown: false,
  // A building stands on the ground, as it was built.
  cathedral: false,
  // So does a grave, its face to the reader.
  tomb: false,
}

/**
 * Which kinds of 3D icon sway about their own upright (`ICON_SWAY`), whether or not they face the camera. The swords
 * sway either side of facing it; the siege stands still; the crown stands on the ground without following the camera
 * and still sways, so the light runs over its points (the dev, 2026-11-17: *« elle peut rester animée »*).
 */
export const ICON_SWAYS: Record<EventIconKind, boolean> = {
  swords: true,
  tower: false,
  crown: true,
  cathedral: false,
  tomb: false,
}

/**
 * How a kind that does not follow the camera is turned about its upright, for good, in radians. The siege's
 * trebuchet stands in a slight three-quarter turned toward the camera, which looks at the map from the south (the dev,
 * 2026-10-27: *« un trois quarts légèrement tourné vers la caméra »*), facing left (*« face vers la gauche »*): its
 * throw, built east, turned round to the west and 30° toward the reader.
 * Turned toward its target was the other way he named — no event carries where its target stands, so not yet.
 * The cathedral, built with its towers to the west as a church is, is turned 36° so its west front comes toward the
 * reader, a three-quarter (the dev, 2026-11-17, on the map at Cologne) — no longer its choir to the east.
 */
export const ICON_YAW: Record<EventIconKind, number> = {
  swords: 0,
  tower: (-5 * Math.PI) / 6,
  crown: 0,
  cathedral: Math.PI / 5,
  // A slight three-quarter, its face turned to the reader's left — to the right first, toward the key light (the dev,
  // 2026-11-17: « c'est 3/4 droit, peut-être 3/4 gauche »): a trial on sight.
  tomb: -Math.PI / 8,
}

/**
 * How dark the soiled ground about each kind's foot is, 0 none to 1 as dark as its cast shadow — a building's, so it
 * reads as set in the ground (the dev, 2026-11-17, of the cathedral; `shadows/soil`): « il y a suffisamment de
 * granulés autour pour qu'on voit que c'est planté dans le sol ».
 */
export const ICON_SOIL: Record<EventIconKind, number> = {
  swords: 0,
  tower: 0,
  crown: 0,
  cathedral: 1,
  // The same ground as the cathedral's (the dev, 2026-11-17: « avec le même effet au sol que pour la cathédrale »).
  tomb: 1,
}

/**
 * Which kinds are buildings (the dev, 2026-11-17: « quand c'est un bâtiment, pour faire ressortir son volume, on sera
 * obligé d'avoir recours à ce genre d'artifice »). A building has **no halo** behind its 3D model (« tu peux retirer le
 * halo blanc ») and, when one stands on the map, the lights take their **counter-light** from the camera
 * (`light/lighting`) — which then lights every 3D marker of that map, the lights being one rig: to settle the day
 * buildings and other icons stand on the same published map.
 */
export const ICON_BUILDING: Record<EventIconKind, boolean> = {
  swords: false,
  tower: false,
  crown: false,
  cathedral: true,
  // A grave is no building: it keeps its halo, and the map's own lights.
  tomb: false,
}

/** How the icons sway about their own upright, either side of facing the camera (the dev, 2026-10-26). */
export const ICON_SWAY = { amplitudeRad: (25 * Math.PI) / 180, periodSeconds: 4 }

/**
 * The zoom (0 zoomed out, 1 in) around which the icons pass from flat to 3D (the dev, 2026-10-26), and the span over
 * which the one fades into the other — the vassals' reveal does the same (`scene/political/homageReveal`). Moved in from
 * 0.45 so the flat drawing holds longer as the camera closes in (the dev, 2026-10-27: *« le sprite devrait survivre plus
 * longtemps au zoom »*), then to 0.85, so the 3D icon comes within the closest level of detail only (its stop is at
 * 0.8, `scene/detail/detailLevels`) — the dev, 2026-11-17: *« elles apparaissent trop tôt lorsque l'on zoome »*, 0.75
 * tried first, then *« c'est mieux quand ça apparaît au dernier moment »*.
 */
export const ICON_CROSS_FADE = { zoom: 0.85, span: 0.1 }

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

/**
 * How wide the halo behind a 3D marker is, in its heights — an icon's, and since ATLAS-306 a pin's — 2.2, widened on
 * sight (the dev, 2026-10-26).
 */
export const ICON_HALO_SPAN = 2.6

/**
 * How wide the halo behind a flat drawing seen from afar is, in drawing widths (ATLAS-306) — so a battle drawn over a
 * country's name still detaches from it (the dev, 2026-10-29). Proposed, to judge on the map.
 */
export const FLAT_HALO_SPAN = 2
