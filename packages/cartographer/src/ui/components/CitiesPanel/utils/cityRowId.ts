/**
 * The DOM id of a city's row in `{Cities}` — what the list scrolls to when the city is chosen on the map (CARTO-384).
 * @param id - the city's id
 * @returns the row's id
 */
export function cityRowId(id: string): string {
  return `city-row-${id}`
}
