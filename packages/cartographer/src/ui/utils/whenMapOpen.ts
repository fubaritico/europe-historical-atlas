/**
 * A command that needs a map open, as the start screen has none (CARTO-536): run with the map's session when there is
 * one, declined in the console otherwise — the menus grey it there, so only a key reaches it (the dev's table, CARTO-535:
 * on the start screen, ‹cmd+O› alone).
 * @param session - the map's session, or `null` on the start screen
 * @param command - the command's name, for the console
 * @param run - what it does with the session
 * @returns the command
 */
export function whenMapOpen<T>(
  session: T | null,
  command: string,
  run: (session: T) => void
): () => void {
  return () => {
    if (session !== null) {
      run(session)
      return
    }
    console.warn(`[Cartographer] ${command} declined: no map is open`)
  }
}
