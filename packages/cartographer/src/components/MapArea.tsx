import { isAssetError } from '@europe-historical-atlas/core/data/assetError'

import { MapCanvas } from './MapCanvas'
import { writeAction, writePosition, writeResult } from './statusBar'
import { useEditorAssets } from './useEditorAssets'

import type { Backdrop } from '../backdropSource'
import type { PaintStyle } from '../canvas/painter'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { VectorLayers } from '../vectorLayers'
import type {
  ComputePhase,
  ProgressReport,
} from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { RefObject } from 'react'

/**
 * The canvas area, and the three states it can be in: waiting for its backdrop, unable to get one, or
 * drawing.
 *
 * **Why the area and not the application.** The dev's call, 2026-10-07: a missing backdrop must not stop
 * the window from opening. The other regions appear in their resting state — which `s00`'s Background
 * already specifies (*"no file is loaded"*, `{Polities}` empty, Undo and Redo disabled) and which owes
 * nothing to the terrain. What is blocked is **this area and what depends on it**: without the DEM there
 * is no coordinate system, so a year has nothing to project against. The order is the one he stated —
 * the backdrop is baked, *then* a year is laid on it.
 *
 * **There is no partial success.** Either asset failing is a failure, and the elevation-threshold
 * fallback the atlas keeps is deliberately not wired (see `backdropSource.ts`): a shoreline that is
 * quietly wrong would be read for the rest of a year's life as the author's own bad tracing.
 */

/**
 * How to fetch and bake the backdrop.
 *
 * A function rather than a ready promise, so this component can supply its own progress sink and show a
 * real wait instead of a guessed one. It is still called **once** — see {@link MapArea}.
 * @param onProgress - announced before each phase of the bake
 * @returns the drawable backdrop and the frame it defines
 */
export type BackdropLoad = (onProgress: ProgressReport) => Promise<EditorAssets>

/**
 * Everything the canvas needs before it can draw.
 *
 * **Declared here, structurally, rather than imported from whichever module produces it** — the shape
 * this component needs, provided by the caller, as `rules/modular-architecture.md` prescribes. It is
 * also what keeps a test able to hand over a literal.
 */
export interface EditorAssets {
  /** The baked terrain and the frame it defines. */
  backdrop: Backdrop
  /** The coastline and the rivers, in backdrop pixels. */
  vectors: VectorLayers
}

/** What {@link MapArea} needs. */
export interface MapAreaProps {
  /** The store the canvas draws from and navigates. */
  store: CartographerStoreHook
  /** How to get the backdrop. */
  load: BackdropLoad
  /** The colours and sizes, from `design/chrome.css`. */
  style: PaintStyle
  /** What to call the editorial zone on screen. */
  zoneLabel: string
  /** What a screen reader is told the drawing surface is. */
  label: string
  /**
   * The status bar's node, owned by the shell and written into on every pointer sample.
   *
   * **Handed in rather than created here, because the bar is a row of the shell and not an overlay on
   * the map** (2026-10-08, when the grid landed). It stays a ref rather than becoming state for the
   * reason the whole area is imperative: a pointer emits a move per device sample, and reconciling at
   * that rate is what kills canvas applications.
   */
  statusRef: RefObject<HTMLElement | null>
  /** The status bar's action zone, beside the position — same reasons, same ownership. */
  actionRef: RefObject<HTMLElement | null>
  /** The status bar's result zone, beside the action. */
  resultRef: RefObject<HTMLElement | null>
  /** Where the polities' colours come from — shared with the panels. */
  colours: PolityColourSource
}

/** What each phase of a bake is called, for the waiting line. */
const PHASE_LABELS: Record<ComputePhase, string> = {
  rasterise: 'tracing the territories',
  expand: 'expanding to the coasts',
  colours: 'assigning the colours',
  bake: 'compositing the relief',
  borders: 'deriving the borders',
}

/** How the area fills its parent, in all three states, so nothing jumps when one replaces another. */
const FILL = { position: 'absolute', inset: 0 } as const

/** Centred prose, for the two states that have no map to show. */
const NOTICE = {
  ...FILL,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '2rem',
  textAlign: 'center',
} as const

/** What the waiting state shows. */
export interface BackdropWaitingProps {
  /** Progress through the bake, in `[0, 1]`. */
  fraction: number
  /** The phase about to run, or `null` before the first announcement. */
  phase: ComputePhase | null
}

/**
 * The wait.
 *
 * **`role="status"` and not `"alert"`**: nothing has gone wrong, so this must not interrupt a screen
 * reader — the same split the atlas's notices already make, where the severity is declared rather than
 * inferred from which code path spoke.
 *
 * **It carries a real fraction, from the bake's own announcements.** The compute port reports each phase
 * before running it, so the number is measured rather than animated. A bar that moved on a timer would
 * be the kind of progress indicator that lies when the machine is slow — which is exactly when someone
 * reads it.
 * @param props - the progress so far and the phase about to run
 * @returns the waiting notice
 */
export function BackdropWaiting({ fraction, phase }: BackdropWaitingProps) {
  const percent = Math.round(fraction * 100)
  // What the bar measures, named for a screen reader. A `<progress>` exposes its own value natively, so
  // this must say what is progressing and not repeat the number. Derived per render rather than fixed:
  // a hard-coded phase would go stale, which is the same gap as no label, just later. Same pattern as
  // the atlas's own progress overlay, which keeps the `aria-label` in step with its caption.
  const measuring = phase === null ? 'Preparing the backdrop' : PHASE_LABELS[phase]
  return (
    <div style={NOTICE} role="status">
      <p>Preparing the backdrop…</p>
      <progress value={fraction} max={1} aria-label={measuring}>
        {percent} %
      </progress>
      {phase === null ? null : <p>{PHASE_LABELS[phase]}</p>}
    </div>
  )
}

/** What the failure state shows. */
export interface BackdropFailureProps {
  /** Whatever was thrown. */
  error: unknown
}

/**
 * The failure.
 *
 * **`role="alert"`, because this one is blocking** — there is nothing behind it to go back to, and the
 * author cannot draw. The atlas settled the same pair: a blocking notice interrupts and carries no
 * dismiss button, since a close button would promise something to go back to.
 *
 * **It names the file and how it failed when it can.** An `AssetError` carries which asset broke, the
 * class of failure and a one-clause detail, which is the difference between *"something went wrong"* and
 * a message someone can act on. The title deliberately claims nothing about the cause: pretending to
 * know more is what once had this project blame the JSON for a file that was simply absent.
 * @param props - the thrown value
 * @returns the blocking notice
 */
export function BackdropFailure({ error }: BackdropFailureProps) {
  const detail = isAssetError(error)
    ? `${error.asset} (${error.failure}) — ${error.detail}`
    : error instanceof Error
      ? error.message
      : String(error)
  return (
    <div style={NOTICE} role="alert">
      <p>The backdrop could not be prepared.</p>
      <p>{detail}</p>
      <p>No year can be opened without it: the relief carries the coordinate system.</p>
    </div>
  )
}

/**
 * The area: wait for the backdrop, then draw.
 * @param props - the store, how to load, and the names
 * @returns the waiting notice, the failure notice, or the canvas
 */
export function MapArea({
  store,
  load,
  style,
  zoneLabel,
  label,
  statusRef,
  actionRef,
  resultRef,
  colours,
}: MapAreaProps) {
  const { assets, error, fraction, phase } = useEditorAssets(load)

  if (error !== null) return <BackdropFailure error={error} />
  if (assets === null) return <BackdropWaiting fraction={fraction} phase={phase} />
  return (
    <div style={FILL}>
      <MapCanvas
        store={store}
        frame={assets.backdrop.frame}
        backdropImage={assets.backdrop.image}
        vectorLayers={assets.vectors}
        onHover={(lonLat) => {
          writePosition(statusRef.current, lonLat)
        }}
        onAction={(sentence) => {
          writeAction(actionRef.current, sentence)
        }}
        onResult={(message) => {
          writeResult(resultRef.current, message)
        }}
        style={style}
        zoneLabel={zoneLabel}
        label={label}
        colours={colours}
      />
    </div>
  )
}
