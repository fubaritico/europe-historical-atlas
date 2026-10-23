/**
 * The alarms waiting for the author — the notices the dialogue shows (`notice.ts`).
 *
 * **Why a store outside React, as for the questions** (`questionRelay.ts`): what raises an alarm — the opening,
 * a save, the draft keeper — is built in the entry module before any component exists, and an alarm raised at
 * start-up must still be there when the dialogue mounts. The dialogue reads `current`, re-renders on `subscribe`
 * and calls `dismiss` when the author closes it.
 *
 * **One alarm per topic**: a second one of the same topic replaces the first (a save that fails after its doubt
 * says so in its place), and `withdraw` removes it when its topic turns out well.
 */

import type { NoticeTopic } from './notice'

/** One alarm. */
export interface Alarm {
  /** What it is about. */
  topic: NoticeTopic
  /** The sentence the author reads. */
  text: string
}

/** The board. */
export interface AlarmBoard {
  /**
   * Show an alarm, in place of the one of its topic if there is one.
   * @param alarm - the alarm
   */
  raise: (alarm: Alarm) => void
  /**
   * Remove the alarm of a topic; nothing happens when there is none.
   * @param topic - the topic that turned out well
   */
  withdraw: (topic: NoticeTopic) => void
  /** The alarms waiting, oldest first — the same array until one changes. */
  current: () => readonly Alarm[]
  /**
   * Listen to the alarms changing.
   * @param listener - called on each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
  /** The author closed the dialogue: every alarm has been read. */
  dismiss: () => void
}

/**
 * Build a board with no alarm.
 * @returns the board
 */
export function createAlarmBoard(): AlarmBoard {
  let alarms: readonly Alarm[] = []
  const listeners = new Set<() => void>()
  const change = (next: readonly Alarm[]): void => {
    alarms = next
    for (const listener of listeners) listener()
  }
  return {
    raise: (alarm) => {
      change([...alarms.filter((held) => held.topic !== alarm.topic), alarm])
    },
    withdraw: (topic) => {
      if (alarms.some((held) => held.topic === topic))
        change(alarms.filter((held) => held.topic !== topic))
    },
    current: () => alarms,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dismiss: () => {
      if (alarms.length > 0) change([])
    },
  }
}
