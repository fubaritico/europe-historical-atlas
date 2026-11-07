/**
 * The holders ticked that a box of the advanced filters stands for in the map open (`s20`): a holder ticked on another
 * map and listed in none of this one's boxes would hide cities with nothing on screen to untick — so it filters nothing.
 * @param ticked - the holders ticked, as the store keeps them
 * @param keys - every key a box of the dialogue stands for (`holderChoices`)
 * @returns those that filter
 */
export function tickedHolders(
  ticked: ReadonlySet<string>,
  keys: ReadonlySet<string>
): ReadonlySet<string> {
  return new Set([...ticked].filter((key) => keys.has(key)))
}
