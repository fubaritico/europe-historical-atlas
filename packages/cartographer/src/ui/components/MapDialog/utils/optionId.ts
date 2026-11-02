/**
 * An option's id, from its map — unique in the page, and safe in an id whatever the name.
 * @param map - the map
 * @returns the id
 */
export function optionId(map: string): string {
  return `map-option-${encodeURIComponent(map).replace(/[^A-Za-z0-9_-]/g, '_')}`
}
