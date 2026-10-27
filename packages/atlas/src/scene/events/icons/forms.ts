/**
 * One icon's place on the relief, in its three forms: where its 3D icon stands and how it is turned (drawn as an
 * instance, `iconInstances`), where its halo and its flat drawing stand (drawn as facing squares, `billboards`) — and
 * the one place their heights are written.
 */

import { Quaternion, Vector3 } from 'three'

import { ICON_FACES_CAMERA, ICON_FLAT_RAISE, ICON_LIFT, ICON_SIZE } from './settings'

import type { EventIconKind } from './kinds'
import type { WorldPoint } from '../../relief/drapeProjection'

/** An icon to stand on the relief. */
export interface PlacedEventIcon {
  /** Where it stands, on the relief before exaggeration. */
  ground: WorldPoint
  /** Which shape. */
  kind: EventIconKind
}

/** One icon on the map, in its forms, and what keeps it on the relief. */
export interface PlacedForms {
  /** Where the 3D icon's base stands, in the world — read when its instance is posed. */
  position: Vector3
  /** How the 3D icon is turned — written at each frame, read when its instance is posed. */
  quaternion: Quaternion
  /** Where the halo's middle stands, behind the 3D icon's middle. */
  haloAt: Vector3
  /** Where the flat drawing's middle stands, for afar. */
  flatAt: Vector3
  /** Its place's height, on the relief before exaggeration. */
  ground: number
  /** How far above its place the 3D icon floats. */
  lift: number
  /** Whether its 3D icon turns to face the camera at each frame; one that does not keeps the pose it was stood in. */
  turns: boolean
  /** How tall its own 3D model stands, in world units — the icon height times its kind's size (`ICON_SIZE`). */
  size: number
}

/**
 * Set an icon's three forms at their heights over the relief, scaled as it is: the 3D icon floating at its lift, the
 * halo at its middle, the flat icon a little above. The one place these heights are written — the forms are built
 * with it and follow the relief's exaggeration with it.
 * @param forms - the icon's forms
 * @param scale - the relief's vertical scale
 * @returns nothing
 */
export function standForms(forms: PlacedForms, scale: number): void {
  const base = forms.ground * scale + forms.lift
  forms.position.setY(base)
  forms.haloAt.setY(base + forms.size / 2)
  // About where the 3D icon's middle is, so the one fades into the other in place (the dev, 2026-10-26).
  forms.flatAt.setY(base + forms.size * (0.5 + ICON_FLAT_RAISE))
}

/**
 * Place one icon: its three forms over the same point, standing on the relief at its unscaled height until the first
 * frame scales it (`setReliefScale`).
 * @param at - which icon and where it stands
 * @param height - how tall the 3D icon stands
 * @returns the forms
 */
export function placeIcon(at: PlacedEventIcon, height: number): PlacedForms {
  const [x, y, z] = at.ground
  const forms = {
    position: new Vector3(x, 0, z),
    quaternion: new Quaternion(),
    haloAt: new Vector3(x, 0, z),
    flatAt: new Vector3(x, 0, z),
    ground: y,
    lift: ICON_LIFT[at.kind] * height,
    turns: ICON_FACES_CAMERA[at.kind],
    size: ICON_SIZE[at.kind] * height,
  }
  // Every height is set here, in the one place that writes them.
  standForms(forms, 1)
  return forms
}
