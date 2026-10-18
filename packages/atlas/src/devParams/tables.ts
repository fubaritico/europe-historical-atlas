/**
 * The dev-panel declaration table, assembled from the per-group modules.
 *
 * Kept apart from the groups themselves because it is the one place that must know about all of them at
 * once: the guard tests walk it to check that every default sits inside its own slider and that every
 * field appears in a display order.
 */

import { CAMERA_CONTROLS, CAMERA_CONTROL_ORDER, DEFAULT_CAMERA_TUNING } from './camera'
import { COASTLINE_CONTROLS, COASTLINE_CONTROL_ORDER, DEFAULT_COASTLINE_PARAMS } from './coastline'
import { DEFAULT_EXTENT_PARAMS, EXTENT_CONTROLS, EXTENT_CONTROL_ORDER } from './extent'
import { DEFAULT_FRAME_PARAMS, FRAME_CONTROLS, FRAME_CONTROL_ORDER } from './frame'
import { DEFAULT_POLITICAL_PARAMS, POLITICAL_CONTROLS, POLITICAL_CONTROL_ORDER } from './political'
import { DEFAULT_RELIEF_PARAMS, RELIEF_CONTROLS, RELIEF_CONTROL_ORDER } from './relief'
import { DEFAULT_RHUMB_PARAMS, RHUMB_CONTROLS, RHUMB_CONTROL_ORDER } from './rhumb'
import { DEFAULT_RIVER_PARAMS, RIVER_CONTROLS, RIVER_CONTROL_ORDER } from './river'
import { DEFAULT_ROSE_PARAMS, ROSE_CONTROLS, ROSE_CONTROL_ORDER } from './rose'
import { DEFAULT_TRIBE_PARAMS, TRIBE_CONTROLS, TRIBE_CONTROL_ORDER } from './tribes'
import { DEFAULT_VASSAL_PARAMS, VASSAL_CONTROLS, VASSAL_CONTROL_ORDER } from './vassals'

/** Every declared control table, paired with its defaults and display order — used by the guard tests. */
export const ALL_CONTROL_TABLES = [
  {
    name: 'relief',
    controls: RELIEF_CONTROLS,
    defaults: DEFAULT_RELIEF_PARAMS,
    order: RELIEF_CONTROL_ORDER,
  },
  {
    name: 'coastline',
    controls: COASTLINE_CONTROLS,
    defaults: DEFAULT_COASTLINE_PARAMS,
    order: COASTLINE_CONTROL_ORDER,
  },
  {
    name: 'rhumb',
    controls: RHUMB_CONTROLS,
    defaults: DEFAULT_RHUMB_PARAMS,
    order: RHUMB_CONTROL_ORDER,
  },
  {
    name: 'rose',
    controls: ROSE_CONTROLS,
    defaults: DEFAULT_ROSE_PARAMS,
    order: ROSE_CONTROL_ORDER,
  },
  {
    name: 'river',
    controls: RIVER_CONTROLS,
    defaults: DEFAULT_RIVER_PARAMS,
    order: RIVER_CONTROL_ORDER,
  },
  {
    name: 'vassals',
    controls: VASSAL_CONTROLS,
    defaults: DEFAULT_VASSAL_PARAMS,
    order: VASSAL_CONTROL_ORDER,
  },
  {
    name: 'tribes',
    controls: TRIBE_CONTROLS,
    defaults: DEFAULT_TRIBE_PARAMS,
    order: TRIBE_CONTROL_ORDER,
  },
  {
    name: 'political',
    controls: POLITICAL_CONTROLS,
    defaults: DEFAULT_POLITICAL_PARAMS,
    order: POLITICAL_CONTROL_ORDER,
  },
  {
    name: 'frame',
    controls: FRAME_CONTROLS,
    defaults: DEFAULT_FRAME_PARAMS,
    order: FRAME_CONTROL_ORDER,
  },
  {
    name: 'extent',
    controls: EXTENT_CONTROLS,
    defaults: DEFAULT_EXTENT_PARAMS,
    order: EXTENT_CONTROL_ORDER,
  },
  {
    name: 'camera',
    controls: CAMERA_CONTROLS,
    defaults: DEFAULT_CAMERA_TUNING,
    order: CAMERA_CONTROL_ORDER,
  },
] as const

/**
 * A flat control list rendered as one group — the shape the grouping check expects.
 * @param title - the group's heading
 * @param keys - the fields it contains, in display order
 * @returns the group
 */
export function asGroup(
  title: string,
  keys: readonly PropertyKey[]
): { title: string; keys: PropertyKey[] } {
  return { title, keys: [...keys] }
}
