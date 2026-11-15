import { useRef, useState } from 'react'

import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'

/** Where a line « Vassal de » being entered stands. */
export type NewLinkStatus =
  /** Being filled: the suzerain or the source still to choose. */
  | { kind: 'filling' }
  /** Both chosen, the link being saved — the choices are held until the server answers. */
  | { kind: 'saving' }
  /** Refused by a rule of the server, with its sentence. */
  | { kind: 'refused'; message: string }
  /** The save failed — the server unreachable or broken; the console keeps why. */
  | { kind: 'failed' }

/** A line « Vassal de » being entered: what is chosen on it, where it stands, and how to choose. */
export interface NewLink {
  /** The suzerain chosen, `null` for none yet. */
  readonly suzerain: number | string | null
  /** The source chosen, `null` for none yet. */
  readonly source: number | string | null
  /** Where the line stands. */
  readonly status: NewLinkStatus
  /** Chooses the suzerain, or empties it — ignored while a save is in flight. */
  readonly chooseSuzerain: (id: number | string | null) => void
  /** Chooses the source, or empties it — ignored while a save is in flight. */
  readonly chooseSource: (id: number | string | null) => void
  /** Forgets the line: both choices emptied, and the answer of a save in flight no longer shown on it. */
  readonly reset: () => void
}

/** What an answer to a save acts on. */
interface AnswerTargets {
  /** Whether the line is still the one the save was sent from — not forgotten since. */
  readonly current: () => boolean
  /** Sets where the line stands. */
  readonly setStatus: (status: NewLinkStatus) => void
  /** Called once the link is saved. */
  readonly onAdded: () => void
  /** Called with the error once the save fails. */
  readonly onFailed: (error: unknown) => void
}

/**
 * Acts on the answer to a save: a link saved is read into the chain whatever the line shows — it is in the base; a
 * refusal or a failure is said on the line only while it is still the one it was sent from. Both are said in the
 * console.
 * @param saving - the save sent
 * @param targets - what the answer acts on
 */
function send(saving: Promise<LinkAnswer>, targets: AnswerTargets): void {
  saving.then(
    (answer) => {
      if (answer.kind === 'saved') {
        targets.onAdded()
        return
      }
      console.warn(`[CMS] a link of vassalage was refused: ${answer.message}`)
      if (targets.current()) targets.setStatus({ kind: 'refused', message: answer.message })
    },
    (error: unknown) => {
      console.error('[CMS] a link of vassalage could not be saved', error)
      if (!targets.current()) return
      targets.setStatus({ kind: 'failed' })
      targets.onFailed(error)
    }
  )
}

/**
 * A line « Vassal de » (CMS-422, the dev's mock-up): the link is saved **as soon as its suzerain and its source are
 * both chosen** — no button of its own, the line is the gesture — then `onAdded` reads the chain again and the line
 * becomes one of the chain's. A refusal (a link entered twice) is said under the line; a failure too, in a toast and
 * the console. Either way what was chosen stays, so changing one of the two tries again.
 *
 * **One save at a time** (review of 2026-11-16): while a save is in flight the choices are held, so a second link is
 * never sent behind the first; and an answer reaching a line forgotten since (✕) changes nothing on it — but a link
 * saved is still read into the chain, since it is in the base whatever the line shows.
 * @param saveLink - saves a link of vassalage
 * @param vassal - the title the chain stops at
 * @param year - the sheet's year
 * @param onAdded - called once the link is saved
 * @param onFailed - called with the error once a save fails, for the screen to say it
 * @returns the line's state and its choosers
 */
export function useNewLink(
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>,
  vassal: number | string,
  year: number,
  onAdded: () => void,
  onFailed: (error: unknown) => void
): NewLink {
  const [suzerain, setSuzerain] = useState<number | string | null>(null)
  const [source, setSource] = useState<number | string | null>(null)
  const [status, setStatus] = useState<NewLinkStatus>({ kind: 'filling' })
  // The line's current round: bumped when it is forgotten, so an answer from before says nothing on it
  const round = useRef(0)

  // Saves once both are chosen
  const settle = (nextSuzerain: number | string | null, nextSource: number | string | null) => {
    if (nextSuzerain === null || nextSource === null) {
      setStatus({ kind: 'filling' })
      return
    }
    const sent = round.current
    setStatus({ kind: 'saving' })
    send(saveLink({ vassal, suzerain: nextSuzerain, source: nextSource, year }), {
      current: () => sent === round.current,
      setStatus,
      onAdded,
      onFailed,
    })
  }

  const saving = status.kind === 'saving'
  return {
    suzerain,
    source,
    status,
    chooseSuzerain: (id) => {
      if (saving) return
      setSuzerain(id)
      settle(id, source)
    },
    chooseSource: (id) => {
      if (saving) return
      setSource(id)
      settle(suzerain, id)
    },
    reset: () => {
      round.current += 1
      setSuzerain(null)
      setSource(null)
      setStatus({ kind: 'filling' })
    },
  }
}
