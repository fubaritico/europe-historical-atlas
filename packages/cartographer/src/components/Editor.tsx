import { useRef } from 'react'

import { MapArea } from './MapArea'
import { PolitiesPanel } from './PolitiesPanel'
import { Shell } from './Shell'
import { writeResult } from './statusBar'
import { ToolRailPanel } from './ToolRailPanel'
import { useRelayedResults } from './useRelayedResults'

import type { BackdropLoad } from './MapArea'
import type { PaintStyle } from '../canvas/painter'
import type { ResultRelay } from '../persistence/resultRelay'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { ReactNode } from 'react'

/**
 * The editor as a page: the shell, with the map in its zone and the status bar in its row.
 *
 * **Why this exists as a component rather than as JSX in `main.tsx`.** The status bar's node has to be
 * reachable from two places — the shell renders it, the map writes into it — so something has to hold a
 * ref across both, and a ref needs a component. `main.tsx` cannot: it is a module, not a component, and
 * declaring one there is what Fast Refresh cannot reload (`react-refresh/only-export-components`).
 *
 * **It is the binding of the shell/view/binding split** (`react-canvas-and-panels`): it knows there is a
 * store and which zone takes what, and it holds no layout and no value of its own. The four zones it
 * does not fill — the app bar, the document bar, the tool rail, the dock — come back from {@link Shell}
 * as named placeholders, which is the dev's call of 2026-10-08: an empty zone should look deliberately
 * empty rather than broken.
 */

/** What the page needs, which is what the map needs plus the store. */
export interface EditorProps {
  /** The store the canvas draws from and navigates. */
  store: CartographerStoreHook
  /** How to fetch and bake the backdrop. */
  load: BackdropLoad
  /** The colours and sizes the painter reads. */
  style: PaintStyle
  /** What to call the editorial zone on the canvas. */
  zoneLabel: string
  /** What a screen reader is told the drawing surface is. */
  label: string
  /** The page's `<h1>`, which {@link Shell} places inside the canvas landmark. */
  heading: ReactNode
  /** Where the polities' colours come from — one source for the canvas and every panel. */
  colours: PolityColourSource
  /**
   * Messages from outside React for the result zone — what opening and saving the year say
   * (`persistence/resultRelay.ts`).
   */
  results: ResultRelay
}

/**
 * Render the editor.
 *
 * The status `<p>` is rendered **after** the canvas in tree order, so its ref is attached after the
 * canvas's. That is safe and worth stating once: nothing reads `statusRef.current` until a pointer
 * moves, which is long after the commit that fills both.
 * @param props - the store, how to load, the names, and the relay for messages from outside React
 * @returns the shell, filled where there is something to put in it
 */
export function Editor({
  store,
  load,
  style,
  zoneLabel,
  label,
  heading,
  colours,
  results,
}: EditorProps) {
  // Refs
  const status = useRef<HTMLElement | null>(null)
  const action = useRef<HTMLElement | null>(null)
  const result = useRef<HTMLElement | null>(null)

  // Handlers
  const handleResult = (message: string | null) => {
    writeResult(result.current, message)
  }

  // Effects
  useRelayedResults(results, result)

  // Render
  return (
    <Shell
      heading={heading}
      canvas={
        <MapArea
          store={store}
          load={load}
          style={style}
          zoneLabel={zoneLabel}
          label={label}
          statusRef={status}
          actionRef={action}
          resultRef={result}
          colours={colours}
        />
      }
      rail={<ToolRailPanel store={store} colours={colours} />}
      dock={<PolitiesPanel store={store} colours={colours} onResult={handleResult} />}
      status={
        // No `aria-live`, and that is the accessibility decision rather than an omission: this text
        // changes on every pointer sample, so announcing it would make a screen reader unusable — the
        // very failure `role="status"` exists to avoid elsewhere. A keyboard reader gets nothing from it
        // today, which is honest; what will serve them is the anchor list of step 5, not a firehose.
        <p className="shell__status">
          <span className="shell__action" ref={action} />
          {/* The one zone that speaks: a result is rare and discrete, unlike the action and the position,
              which change on every pointer sample and would drown a screen reader (A11Y-001). */}
          <span className="shell__result" ref={result} role="status" />
          <span className="shell__position" ref={status} />
        </p>
      }
    />
  )
}
