import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'
import type { StateCreator } from 'zustand'

/**
 * What the chrome reads of the clipboard, and the two requests a polity's context menu makes of it (CARTO-345, the dev,
 * 2026-11-05: Copy and Paste the sheet in the menu of a polity, *"to understand that it is what one does"*).
 *
 * **The clipboard itself stays at the root** (`state/heldClipboard.ts`, kept in the tab): this slice holds what it
 * holds, said, so a panel deep in `{Polities}` can light a command without being handed the clipboard; and the
 * requests, a counter and a polity, which the root answers — the copy goes through the one ‹cmd+C›.
 */

/** What the clipboard holds, as the menus name it. */
export type HeldSummary =
  /** Polities, by name, and the map they came from. */
  | { kind: 'polities'; names: readonly string[]; map: string }
  /** Points of a polity, and the map they came from. */
  | { kind: 'points'; polity: string; map: string }
  /** A polity's sheet alone, by its name, and the map it came from. */
  | { kind: 'sheet'; polity: string; map: string }

/**
 * What a clipboard holds, as the menus name it — the one summary the root mirrors into the store and Édition reads.
 * @param content - the clipboard's content, or `null`
 * @returns the summary, or `null` for an empty clipboard
 */
export function summariseClipboard(content: ClipboardContent | null): HeldSummary | null {
  if (content === null) return null
  if (content.kind === 'polities') {
    return {
      kind: 'polities',
      names: content.polities.map((copied) => copied.polity.name),
      map: content.map,
    }
  }
  if (content.kind === 'sheet')
    return { kind: 'sheet', polity: content.polity.name, map: content.map }
  return { kind: 'points', polity: content.polity, map: content.map }
}

/** The slice's state. */
export interface ClipboardState {
  /** What the clipboard holds, or `null` when it is empty — mirrored by the root on each change. */
  held: HeldSummary | null
  /**
   * The last copy a polity's menu asked for — the polity whole, or its sheet alone — a new object each time so asking
   * twice is two copies; `null` until one is. The root selects the polity, then copies as ‹cmd+C› or ‹shift+cmd+C›.
   */
  copyAsked: { polity: string; what: 'all' | 'sheet' } | null
  /** The last paste a polity's menu asked for, onto it — a new object each time; the root pastes as ‹cmd+V›. */
  pasteAsked: { polity: string } | null
  /** The polity whose sheet's paste dialogue is open, or `null`. */
  sheetPasteFor: string | null
}

/** The slice's actions. */
export interface ClipboardActions {
  /**
   * Mirror what the clipboard holds — the root calls it at each change.
   * @param held - the summary, or `null` for an empty clipboard
   */
  setHeld: (held: HeldSummary | null) => void
  /**
   * Ask the root to copy a polity — its menu's « Copier » or « Copier la fiche ».
   * @param polity - the polity's id
   * @param what - the polity whole, or its sheet alone
   */
  askCopy: (polity: string, what: 'all' | 'sheet') => void
  /**
   * Ask the root to paste onto a polity — its menu's « Coller … ».
   * @param polity - the polity's id
   */
  askPaste: (polity: string) => void
  /**
   * Open the sheet's paste dialogue onto a polity — its menu's, or Édition's, « Coller la fiche… ».
   * @param polity - the polity's id
   */
  askSheetPaste: (polity: string) => void
  /** Close the sheet's paste dialogue. */
  closeSheetPaste: () => void
}

/** The slice. */
export type ClipboardSlice = ClipboardState & ClipboardActions

/**
 * Open a clipboard slice: nothing held, nothing asked.
 * @param set - the store's setter
 * @returns the slice
 */
export const createClipboardSlice: StateCreator<
  ClipboardSlice,
  [['zustand/subscribeWithSelector', never]],
  [],
  ClipboardSlice
> = (set) => ({
  held: null,
  copyAsked: null,
  pasteAsked: null,
  sheetPasteFor: null,
  setHeld: (held): void => {
    set({ held })
  },
  askCopy: (polity, what): void => {
    set({ copyAsked: { polity, what } })
  },
  askPaste: (polity): void => {
    set({ pasteAsked: { polity } })
  },
  askSheetPaste: (polity): void => {
    set({ sheetPasteFor: polity })
  },
  closeSheetPaste: (): void => {
    set({ sheetPasteFor: null })
  },
})
