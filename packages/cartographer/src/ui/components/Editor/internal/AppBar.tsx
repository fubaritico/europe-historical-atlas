import { BrandMark } from '../../../icons/brandMark'

import type { ReactNode } from 'react'

/**
 * The top bar (CARTO-555, the dev, 2026-11-25): on the left the mark, with the menus Fichier and Édition against it; the
 * application's name **in the middle of the bar**, alone — the map open is the document tab's, not the bar's (the dev,
 * the same evening); who is signed in and « Se déconnecter » on the right.
 *
 * **No file buttons any more** — « Ouvrir… », « Enregistrer », « Enregistrer sous… » and « Enregistrer une copie »
 * stood here since 2026-10-13 (the design's `appbar`, `design/chrome.js`) and doubled the menu Fichier; they are in
 * Fichier, on the start screen, and under their keys.
 */

/** What the bar shows. */
export interface AppBarProps {
  /** The application's name, written in the middle of the bar. */
  name: string
  /** The menu bar, against the mark (CARTO-345) — built by its binding, which knows the store. */
  menus?: ReactNode
  /** Who is signed in and « Se déconnecter », at the bar's right end (CARTO-535). */
  account?: ReactNode
}

/**
 * Render the top bar.
 * @param props - what to show
 * @param props.name - the application's name
 * @param props.menus - the menu bar, against the mark
 * @param props.account - who is signed in, at the right end
 * @returns the three parts of the bar — the left end, the middle, the right end
 */
export function AppBar({ name, menus, account }: AppBarProps) {
  // Render
  return (
    <>
      <div className="app-start">
        <BrandMark />
        {menus}
      </div>
      <div className="app-brand">
        <span className="app-brand__name">{name}</span>
      </div>
      <div className="bar-actions">{account}</div>
    </>
  )
}
