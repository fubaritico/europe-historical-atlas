/**
 * What a group with no binding does when a variant is chosen: say so. Only the Pen heads a group today;
 * a second one that reached this without being wired would otherwise do nothing, silently.
 * @param id - the variant chosen
 */
export function unwiredGroup(id: string): void {
  console.error(`[Cartographer] the tool rail has no binding for the variant "${id}".`)
}
