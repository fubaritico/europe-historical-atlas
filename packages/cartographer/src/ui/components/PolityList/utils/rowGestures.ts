import type { ViewportPoint } from '../../../../viewport/viewport'
import type { MouseEvent } from 'react'

/**
 * A row's three pointer gestures: a click aims at its polity, a double-click opens its dialogue (`s07`),
 * a right-click its menu (`s16`).
 * @param id - the row's polity
 * @param onChoose - aim at it
 * @param onMenu - open its menu at the pointer
 * @param onEdit - open its dialogue
 * @returns the row's handlers
 */
export function rowGestures(
  id: string,
  onChoose: (id: string) => void,
  onMenu: (id: string, at: ViewportPoint) => void,
  onEdit: (id: string) => void
) {
  return {
    onClick: () => {
      onChoose(id)
    },
    onDoubleClick: () => {
      onEdit(id)
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault()
      onMenu(id, { x: event.clientX, y: event.clientY })
    },
  }
}
