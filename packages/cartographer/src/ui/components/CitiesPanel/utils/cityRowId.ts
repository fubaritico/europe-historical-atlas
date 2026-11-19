/**
 * The DOM id of a city's row in `{Cities}` — a name for the row in the page. The list no longer scrolls by it
 * (CARTO-485: it draws only its rows in view, and scrolls by the row's place); the tests count the rows drawn by it.
 * @param id - the city's id
 * @returns the row's id
 */
export function cityRowId(id: string): string {
  return `city-row-${id}`
}
