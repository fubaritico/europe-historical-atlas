import { useState } from 'react'

import type { SaveSovereign } from '../utils/saveSovereign'

/** Where the box's save stands. */
export type BoxState =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'refused'; message: string } | { kind: 'failed' }

/** The box's save and where it stands. */
export interface SovereignSave {
  /** Where it stands. */
  readonly state: BoxState
  /**
   * Ticks or unticks a title — ignored while a save is in flight (QUAL-022).
   * @param title - the title
   * @param sovereign - the new value
   * @param onSaved - called with it once saved
   */
  readonly toggle: (
    title: number | string,
    sovereign: boolean,
    onSaved: (sovereign: boolean) => void
  ) => void
}

/**
 * « Souverain » saved on a title (the dev, 2026-11-16): one save at a time; a refusal is said in the server's words, a
 * failure in a toast and the console.
 * @param save - ticks or unticks it in the base
 * @param onFailed - called once a save fails, for the screen to say it
 * @returns its state and its toggle
 */
export function useSovereignSave(save: SaveSovereign, onFailed: () => void): SovereignSave {
  const [state, setState] = useState<BoxState>({ kind: 'idle' })
  return {
    state,
    toggle: (title, sovereign, onSaved) => {
      if (state.kind === 'saving') return
      setState({ kind: 'saving' })
      save(title, sovereign).then(
        (answer) => {
          if (answer.kind === 'saved') {
            setState({ kind: 'idle' })
            onSaved(sovereign)
            return
          }
          console.warn(`[CMS] a title's sovereignty was refused: ${answer.message}`)
          setState({ kind: 'refused', message: answer.message })
        },
        (error: unknown) => {
          console.error('[CMS] a title’s sovereignty could not be saved', error)
          setState({ kind: 'failed' })
          onFailed()
        }
      )
    },
  }
}
