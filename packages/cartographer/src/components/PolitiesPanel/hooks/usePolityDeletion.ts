import { useEffect, useRef, useState } from 'react'

import { describeDrawingTarget } from '../../../state/drawingTarget'
import { deletionResult, pendingDeletion } from '../polityDeletion'

import type { CartographerStoreHook } from '../../../state/store'
import type { PendingDeletion } from '../polityDeletion'

/**
 * Deleting the selected polity: ask first (D2), then delete as one undoable step and say what went.
 *
 * **A refusal is said, never silent**: a polity gone between the question and the answer (an undo in
 * between) is reported in the result zone and logged as an error — the panel and the document disagreed.
 * @param store - the store holding the document
 * @param onResult - the status bar's result zone
 * @param onDone - give the focus back to the list, once the dialogue has closed
 * @returns the polity awaiting confirmation, and the three gestures
 */
export function usePolityDeletion(
  store: CartographerStoreHook,
  onResult: (message: string | null) => void,
  onDone: () => void
) {
  // Store actions
  const deletePolity = store((state) => state.deletePolity)

  // Refs
  const answered = useRef(false)

  // State
  const [pending, setPending] = useState<PendingDeletion | null>(null)

  // Handlers
  const askToDelete = () => {
    const { document, target } = store.getState()
    const resolved = describeDrawingTarget(document, target)
    setPending(resolved === null ? null : pendingDeletion(document, resolved.id))
  }
  const cancelDeletion = () => {
    answered.current = true
    setPending(null)
  }
  const confirmDeletion = () => {
    if (pending !== null) {
      const report = deletePolity(pending.id, {
        kind: 'delete-polity',
        label: `delete ${pending.name}`,
      })
      if (report === null) {
        console.error(
          `[Cartographer] "${pending.name}" was no longer in the year; nothing was deleted.`
        )
        onResult(`nothing deleted: ${pending.name} is no longer in the year`)
      } else onResult(deletionResult(pending, report))
    }
    answered.current = true
    setPending(null)
  }

  // Effects
  // The focus goes back to the list only once the dialogue has closed. Closing hands it to the trash that
  // opened it — disabled by then, after a deletion, so the focus would fall to the body. The design
  // system's Modal closes in its own effect, and a child's effects run before its parent's: this one comes
  // after, and has the last word.
  useEffect(() => {
    if (pending === null && answered.current) {
      answered.current = false
      onDone()
    }
  }, [pending, onDone])

  // Return
  return { pending, askToDelete, cancelDeletion, confirmDeletion }
}
