import { StartScreen } from '../../StartScreen'

import { Shell } from './Shell'

import type { StartScreenProps } from '../../StartScreen'
import type { ReactNode } from 'react'

/** What the shell needs while no map is open. */
export interface StartShellProps {
  /** The page's `<h1>`. */
  heading: ReactNode
  /** The top bar: a new map and *Open…* acting, the rest greyed, who is signed in at its right. */
  appbar: ReactNode
  /** What the start screen reads and does. */
  start: StartScreenProps
}

/**
 * The Cartographer signed in with no map open (CARTO-536, the dev's table of CARTO-535): the chrome — the top bar and its
 * menus — and the start screen where the map would be; no tools, no panels, no status bar.
 * @param props - the heading, the bar, and the start screen's props
 * @param props.heading - the page's `<h1>`
 * @param props.appbar - the top bar
 * @param props.start - what the start screen reads and does
 * @returns the shell
 */
export function StartShell({ heading, appbar, start }: StartShellProps) {
  // Render
  return (
    <Shell
      heading={heading}
      appbar={appbar}
      bare
      docbar={<></>}
      rail={<></>}
      canvas={<StartScreen {...start} />}
      status={<></>}
      dockWidth={null}
    />
  )
}
