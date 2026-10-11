import type { PixelSize, ViewportPoint } from './viewport'

/**
 * Where a menu opened at a point must sit to stay inside the window — a right-click on the last rows
 * of the dock, in a low window, would otherwise open it half off-screen, and a fixed element cannot be
 * scrolled into view (session review ARCH-004 / A11Y-007).
 *
 * As a platform's context menu does: below and to the right of the point when it fits, flipped above or
 * to the left when it does not, and held inside the window when it fits neither way.
 * @param at - where it was asked for, in viewport pixels
 * @param menu - its size, measured
 * @param screen - the window's size
 * @returns where its top-left corner goes
 */
export function placeMenu(at: ViewportPoint, menu: PixelSize, screen: PixelSize): ViewportPoint {
  return {
    x: placeAlong(at.x, menu.width, screen.width),
    y: placeAlong(at.y, menu.height, screen.height),
  }
}

/**
 * One axis of {@link placeMenu}.
 * @param from - the point
 * @param length - the menu's extent
 * @param room - the window's extent
 * @returns the menu's start on that axis
 */
function placeAlong(from: number, length: number, room: number): number {
  if (from + length <= room) return from
  if (from - length >= 0) return from - length
  return Math.max(0, room - length)
}
