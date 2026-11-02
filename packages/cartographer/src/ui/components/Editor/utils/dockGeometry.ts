import type { PanelId } from '../../../../state/panelsSlice'
import type { DockGeometry } from '../../PanelFrame'

/**
 * The column and the other docked panels, read off the page when a drag begins (CARTO-342).
 * @param stack - the column's stack of frames, or `null` before it is mounted
 * @param id - the panel being dragged, left out of the slots
 * @returns the column's box — `null` when no panel is docked, the column hidden — and the other frames' boxes
 */
export function dockGeometry(stack: HTMLElement | null, id: PanelId): DockGeometry {
  if (stack === null) return { dock: null, slots: [] }
  const frames = [...stack.querySelectorAll<HTMLElement>(':scope > .panel-frame')]
  if (frames.length === 0) return { dock: null, slots: [] }
  const slots = frames
    .filter((frame) => frame.dataset.panel !== id)
    .map((frame) => frame.getBoundingClientRect())
  return { dock: stack.getBoundingClientRect(), slots }
}
