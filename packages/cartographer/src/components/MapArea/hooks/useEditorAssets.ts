import { useEffect, useRef, useState } from 'react'

import type { BackdropLoad, EditorAssets } from '../editorAssets'
import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** What the area needs to know while the backdrop is on its way. */
export interface EditorAssetsState {
  /** The backdrop and the vector layers, once both are in. */
  assets: EditorAssets | null
  /** Whatever was thrown, if anything was. */
  error: unknown
  /** Progress through the bake, in `[0, 1]`. */
  fraction: number
  /** The phase about to run, or `null` before the first announcement. */
  phase: ComputePhase | null
}

/**
 * Load the editor's assets once, and report where that got to.
 *
 * **What is held once is the promise, not a boolean — and the difference is a bug this got wrong first.**
 * `StrictMode` runs setup → cleanup → setup synchronously on the first mount, and `main.tsx` wraps the
 * app in it on purpose. The first version kept a `started` flag: the second setup saw it and returned
 * immediately, so the only `.then` in existence stayed bound to the **first** invocation's closure — whose
 * cleanup had just cancelled it. The assets loaded, the terrain baked, and the answer was dropped on the
 * floor: the editor sat on *"Preparing the backdrop…"* for ever. Found in review, and only because
 * the test was made to assert that the canvas actually appears — counting the calls could not see it.
 *
 * So: the **promise** lives in a ref, created on whichever invocation finds the ref empty, and **every**
 * invocation attaches its own listener to it with its own `ignore` flag. The throwaway first invocation
 * then cancels only its own redundant listener, and the surviving one still fires.
 *
 * **The progress sink goes through a ref for exactly the same reason.** It is handed to `load` once, at
 * creation, so a sink captured by the first invocation would be silenced by that invocation's cleanup —
 * the same defect, one level down, and invisible because a missing progress bar looks like a fast load.
 * Delegating to `progress.current` keeps it pointed at the live invocation.
 *
 * **A late answer is dropped rather than written**, which is cleanliness rather than necessity: React 18
 * and later make a state write on an unmounted tree a silent no-op. It is kept because the flag is the
 * same mechanism the correctness above needs, so there is nothing extra to carry.
 * @param props - the store, how to load, and the names
 * @returns the waiting notice, the failure notice, or the canvas
 */
export function useEditorAssets(load: BackdropLoad): EditorAssetsState {
  // Refs
  const inFlight = useRef<Promise<EditorAssets> | null>(null)
  const progress = useRef<(at: number, running: ComputePhase) => void>(() => undefined)

  // State
  const [assets, setAssets] = useState<EditorAssets | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [fraction, setFraction] = useState(0)
  const [phase, setPhase] = useState<ComputePhase | null>(null)

  // Effects
  useEffect(() => {
    let ignore = false
    progress.current = (at, running) => {
      if (ignore) return
      setFraction(at)
      setPhase(running)
    }
    inFlight.current ??= load((at, running) => {
      progress.current(at, running)
    })
    inFlight.current.then(
      (ready) => {
        if (!ignore) setAssets(ready)
      },
      (failed: unknown) => {
        if (!ignore) setError(failed)
      }
    )
    return () => {
      ignore = true
    }
  }, [load])

  // Return
  return { assets, error, fraction, phase }
}
