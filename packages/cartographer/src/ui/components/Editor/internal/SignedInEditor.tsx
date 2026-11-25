import { useRef } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { APP_MESSAGES } from '../../../i18n/app'
import { writeResult } from '../../../utils/statusBar'
import { MapArea } from '../../MapArea'
import { ToolRailPanel } from '../../ToolRailPanel'
import { useRelayedResults } from '../hooks/useRelayedResults'

import { AppBarPanel } from './AppBarPanel'
import { DocBarPanel } from './DocBarPanel'
import { Dock } from './Dock'
import { Shell } from './Shell'
import { StatusRow } from './StatusRow'

import type { EditorProps } from '../editorProps'
import type { ReactNode } from 'react'

/**
 * The editor once someone is signed in (CARTO-535): the shell filled, with the map in its zone and the status bar in
 * its row, and who is signed in at the top bar's right end.
 *
 * **Why this is a component rather than JSX in `main.tsx`.** The status bar's node has to be reachable from two
 * places — the shell renders it, the map writes into it — so something has to hold a ref across both, and a ref needs
 * a component. `main.tsx` cannot: it is a module, not a component, and declaring one there is what Fast Refresh cannot
 * reload (`react-refresh/only-export-components`). It is the binding of the shell/view/binding split
 * (`react-canvas-and-panels`): it knows there is a store and which zone takes what, and holds no layout of its own.
 *
 * The status `<p>` is rendered **after** the canvas in tree order, so its ref is attached after the
 * canvas's. That is safe and worth stating once: nothing reads `statusRef.current` until a pointer
 * moves, which is long after the commit that fills both.
 * @param props - the store, how to load, the names, and the relay for messages from outside React
 * @param props.store - the store the canvas draws from and every panel reads
 * @param props.load - how to fetch and bake the backdrop, handed to the map
 * @param props.style - the colours and sizes the painter reads
 * @param props.heading - the page's `<h1>`, placed by the shell inside the canvas landmark
 * @param props.onOpen - opens the *Open…* dialogue, called by the top bar
 * @param props.onSave - saves the map open, called by the top bar's `[Save]`
 * @param props.onSaveAs - opens the *Save as…* dialogue, called by the top bar
 * @param props.onSaveCopy - saves a copy, called by the top bar
 * @param props.onCopy - copies what is selected, called by the menu bar
 * @param props.onPaste - pastes what the clipboard holds, called by the menu bar
 * @param props.onSelectAll - selects every point of the polity selected, called by the menu bar
 * @param props.onCopySheet - copies the polity selected's sheet alone, called by the menu bar
 * @param props.mapName - the map open's name, for the top bar
 * @param props.history - the canvas's undo and redo, for the document bar's buttons
 * @param props.colours - where the polities' colours come from, for the canvas and the panels
 * @param props.wikidata - where the polity form reads Wikidata from
 * @param props.results - messages from outside React, written into the result zone
 * @param props.account - who is signed in, for the top bar's right end
 * @returns the shell, filled where there is something to put in it
 */
export function SignedInEditor({
  store,
  load,
  style,
  heading,
  history,
  colours,
  wikidata,
  results,
  account,
  // The top bar's gestures, the map's name and the clipboard — onOpen, onSave, onSaveAs, onSaveCopy, onCopy, onPaste,
  // onSelectAll, onCopySheet, mapName — handed on as they are.
  ...bar
}: Omit<EditorProps, 'session'> & { account: ReactNode }) {
  // Store
  const year = store((state) => state.document.year)
  const docked = store((state) => state.panelLayout.docked.length)
  const dockWidth = store((state) => state.panelLayout.dockWidth)

  // Context
  const app = useTranslation(APP_MESSAGES)

  // Refs
  const status = useRef<HTMLElement | null>(null)
  const action = useRef<HTMLElement | null>(null)
  const result = useRef<HTMLElement | null>(null)
  const feature = useRef<HTMLElement | null>(null)

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
      appbar={<AppBarPanel {...bar} store={store} history={history} account={account} />}
      docbar={<DocBarPanel store={store} history={history} />}
      canvas={
        <MapArea
          store={store}
          load={load}
          style={style}
          label={app('mapLabel', { year: String(year) })}
          statusRef={status}
          actionRef={action}
          resultRef={result}
          featureRef={feature}
          colours={colours}
          history={history}
        />
      }
      rail={<ToolRailPanel store={store} colours={colours} />}
      dock={<Dock store={store} colours={colours} onResult={handleResult} wikidata={wikidata} />}
      status={<StatusRow action={action} result={result} position={status} feature={feature} />}
      dockWidth={docked === 0 ? null : dockWidth}
    />
  )
}
