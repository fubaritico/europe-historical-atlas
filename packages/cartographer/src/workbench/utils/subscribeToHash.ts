/**
 * Re-render on every hash change: the hash is the selected plate.
 * @param onChange - called on every hash change, to have React read the hash again
 * @returns the unsubscription
 */
export function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
  }
}
