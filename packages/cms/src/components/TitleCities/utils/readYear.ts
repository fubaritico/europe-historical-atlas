/**
 * A number a form field holds, when it holds one — a title's year read from Payload's form state.
 * @param value - the field's value
 * @returns the number, or `null`
 */
export function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * A typed year, when it is one: whole, its sign kept for a year before Christ.
 * @param text - what is typed
 * @returns the year, or `null`
 */
export function yearOf(text: string): number | null {
  return /^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null
}
