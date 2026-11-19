import { useCallback, useRef, useState } from 'react'

import { showListRow } from '../../../utils/showListRow'
import { CITY_ROW_HEIGHT, ROWS_BEYOND_VIEW, rowWindow } from '../utils/rowWindow'

import type { RowWindow } from '../utils/rowWindow'

/** What a list that draws only its rows in view is handed. */
export interface RowWindowHandle {
  /** The list element's ref: it listens to its scroll and its size for as long as the element lives. */
  listRef: (list: HTMLUListElement | null) => (() => void) | undefined
  /** The rows to draw, and the gaps standing for the others. */
  rows: RowWindow
  /** Scroll the list to a row given by its index, drawn or not. */
  show: (index: number) => void
}

/**
 * The rows of `{Cities}`' list that are in view (CARTO-485, `rowWindow`), bound to the list element: its scroll and its
 * height are listened to, and the window moves **only when the first row in view changes** — a scroll within a row
 * renders nothing.
 * @param count - how many rows the list holds
 * @returns the list's ref, the rows to draw, and the way to scroll to a row
 */
export function useRowWindow(count: number): RowWindowHandle {
  // Refs
  const list = useRef<HTMLUListElement | null>(null)

  // State
  const [firstInView, setFirstInView] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)

  // Handlers
  const listRef = useCallback((node: HTMLUListElement | null) => {
    list.current = node
    if (node === null) return undefined
    const readScroll = (): void => {
      setFirstInView(Math.floor(node.scrollTop / CITY_ROW_HEIGHT))
    }
    const readHeight = (): void => {
      setViewHeight(node.clientHeight)
    }
    readScroll()
    readHeight()
    node.addEventListener('scroll', readScroll, { passive: true })
    // The panel is dragged to any height (CARTO-385): the element is watched, not the window.
    const observer = new ResizeObserver(readHeight)
    observer.observe(node)
    return () => {
      node.removeEventListener('scroll', readScroll)
      observer.disconnect()
      list.current = null
    }
  }, [])
  const show = useCallback((index: number) => {
    if (list.current === null) return
    showListRow(list.current, { top: index * CITY_ROW_HEIGHT, height: CITY_ROW_HEIGHT })
  }, [])

  // Return
  return {
    listRef,
    rows: rowWindow({
      count,
      rowHeight: CITY_ROW_HEIGHT,
      firstInView,
      viewHeight,
      beyond: ROWS_BEYOND_VIEW,
    }),
    show,
  }
}
