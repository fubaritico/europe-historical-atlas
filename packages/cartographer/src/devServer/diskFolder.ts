/**
 * A folder on disk, as an endpoint needs it — paths relative to its root: `years/` for the year save,
 * `.autosave/drafts/` for the draft.
 *
 * Injected so an endpoint runs against a map in memory under test, and against `node:fs` in
 * `vite.config.ts`. That is also why there is no Node type here: it compiles with the browser
 * application and runs in the server.
 */
export interface DiskFolder {
  /**
   * Read a file.
   * @param relativePath - e.g. `index.json`
   * @returns its text, or `null` when there is no such file
   */
  read: (relativePath: string) => string | null
  /**
   * Write a file whole, creating its folder when needed.
   * @param relativePath - e.g. `1100/registry.json.tmp`
   * @param text - its full content
   */
  write: (relativePath: string, text: string) => void
  /**
   * Move a file over another, replacing it — atomic on one disk.
   * @param fromPath - the file written
   * @param toPath - where it ends up
   */
  rename: (fromPath: string, toPath: string) => void
}
