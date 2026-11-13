/** A refusal, as it leaves the page. */
export interface JournalEntry {
  /** The console method it was written with. */
  level: 'warn' | 'error'
  /** Its sentence, every argument joined. */
  message: string
}

/** The two console methods a refusal is written with — the console itself in the page, a stand-in in a test. */
export type RefusalConsole = Pick<Console, 'warn' | 'error'>

/**
 * One argument of a refusal as the journal writes it: an error by its name and message, an object as JSON — never
 * `[object Object]`. It never throws, being called inside `console.warn` itself: what JSON cannot write (a loop, a
 * big integer) is written by its kind, `[object Object]`.
 * @param value - the argument
 * @returns its text
 */
function argumentText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (typeof value !== 'object' || value === null) return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    // A loop or a big integer: the console keeps the object itself, the journal its kind.
    return Object.prototype.toString.call(value)
  }
}

/** The tag every refusal of the Cartographer starts with (`rules/error-handling.md`, « No refusal is silent »). */
const TAG = '[Cartographer]'

/**
 * Copy every refusal of the Cartographer to a journal, while still writing it to the console (the dev, 2026-11-13: a
 * gesture blocked, its reason only in a console neither of us reads). Only a message whose first argument starts with
 * the tag is sent: React's warnings and the libraries' stay in the console alone.
 * @param target - the console to listen to; its two methods are replaced, and put back by the returned function
 * @param send - where a refusal goes: the dev server's socket in the page
 * @returns a function that stops the copy
 */
export function journalRefusals(
  target: RefusalConsole,
  send: (entry: JournalEntry) => void
): () => void {
  const original = { warn: target.warn, error: target.error }
  const wrap =
    (level: JournalEntry['level']) =>
    (...args: unknown[]): void => {
      original[level].apply(target, args)
      const [first] = args
      if (typeof first !== 'string' || !first.startsWith(TAG)) return
      send({ level, message: args.map(argumentText).join(' ') })
    }
  target.warn = wrap('warn')
  target.error = wrap('error')
  return () => {
    target.warn = original.warn
    target.error = original.error
  }
}
