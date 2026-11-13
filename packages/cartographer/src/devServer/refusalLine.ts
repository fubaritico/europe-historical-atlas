/** A refusal as the page sends it: its level, and the console's own sentence. */
export interface RefusalEntry {
  /** `warn` for a gesture the tool declined, `error` for what no gesture should reach (`rules/error-handling.md`). */
  level: 'warn' | 'error'
  /** The sentence written in the console, its `[Cartographer]` tag included. */
  message: string
}

/**
 * Whether what came over the socket is a refusal: a page of another version, or another sender, is not trusted.
 * @param data - what the event carried
 * @returns `true` for a {@link RefusalEntry}
 */
export function isRefusalEntry(data: unknown): data is RefusalEntry {
  if (typeof data !== 'object' || data === null) return false
  const entry = data as Record<string, unknown>
  return (entry.level === 'warn' || entry.level === 'error') && typeof entry.message === 'string'
}

/**
 * A number of the clock on two digits: `7` → `07`.
 * @param value - the number
 * @returns its two digits
 */
const pad = (value: number) => String(value).padStart(2, '0')

/**
 * One line of the refusals' journal (the dev, 2026-11-13: a gesture blocked, and the reason only in a console nobody
 * reads): the local time, the level, the sentence — newlines folded, so one refusal is one line.
 * @param entry - the refusal
 * @param at - when it reached the server
 * @returns the line, ending with a newline
 */
export function refusalLine(entry: RefusalEntry, at: Date): string {
  const stamp = `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
  return `${stamp} ${entry.level.toUpperCase()} ${entry.message.replace(/\s*\n\s*/g, ' ⏎ ')}\n`
}
