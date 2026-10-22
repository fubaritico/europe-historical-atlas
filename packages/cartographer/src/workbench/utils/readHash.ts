/**
 * The current hash, without its `#`.
 * @returns the selected plate's id, or `''` when there is no hash
 */
export function readHash(): string {
  return window.location.hash.slice(1)
}
