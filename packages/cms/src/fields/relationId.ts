/**
 * The id a relationship holds, whether Payload hands it bare or populated. Its own module, free of Payload's
 * server code, because the contribution screens read it in the page too.
 * @param value - the field's value
 * @returns the id, or `null` when none is chosen
 */
export function relationId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = value.id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

/**
 * The ids a relationship with many holds, bare or populated — an empty list for none.
 * @param value - the field's value
 * @returns the ids, in order
 */
export function relationIds(value: unknown): (number | string)[] {
  if (!Array.isArray(value)) return []
  return value.map(relationId).filter((id): id is number | string => id !== null)
}
