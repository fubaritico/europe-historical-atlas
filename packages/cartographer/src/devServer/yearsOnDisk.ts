import type { YearsFolder } from './yearWriteEndpoint'

/**
 * The years folder on the real disk — the one implementation of {@link YearsFolder} that is not a map in
 * memory.
 *
 * **The file-system calls are handed in, not imported**, for two reasons that are not ceremony. This
 * package compiles against the browser's types, where `node:fs` does not exist, so a Node import here
 * would not type-check; and handing them in is what lets a test drive every branch — a missing file, a
 * refused permission, a folder to create — with stubs, which is how the review of 2026-10-12 asked for the
 * adapter to be proved. `vite.config.ts` passes the real `node:fs` functions and holds nothing else.
 */

/** The file-system calls the folder needs, shaped like `node:fs`'s synchronous ones. */
export interface DiskCalls {
  /**
   * Read a file as UTF-8.
   * @param path - an absolute path
   * @returns its text
   * @throws an error carrying `code: 'ENOENT'` when there is no such file
   */
  readFile: (path: string) => string
  /**
   * Write a file whole, as UTF-8.
   * @param path - an absolute path
   * @param text - its content
   */
  writeFile: (path: string, text: string) => void
  /**
   * Create a folder and its parents; nothing happens when it exists.
   * @param path - an absolute path
   */
  makeFolder: (path: string) => void
  /**
   * Move a file over another.
   * @param fromPath - an absolute path
   * @param toPath - an absolute path
   */
  rename: (fromPath: string, toPath: string) => void
}

/**
 * Whether a caught value says *there is no such file* — the one failure that is an answer, not a fault.
 * @param error - what was thrown
 * @returns `true` for `ENOENT`
 */
function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/**
 * The folder a path sits in, by its last slash.
 * @param path - an absolute path
 * @returns everything before the last `/`
 */
function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'))
}

/**
 * Build the years folder over a root and the disk calls.
 *
 * Every relative path it receives is built by the endpoint from a whole-number year and fixed names, so
 * joining with a slash cannot climb out of the root.
 * @param root - the absolute path of `years/`, with or without a trailing slash
 * @param disk - the file-system calls
 * @returns the folder
 */
export function createYearsFolderOnDisk(root: string, disk: DiskCalls): YearsFolder {
  const base = root.replace(/\/$/, '')
  const at = (relativePath: string): string => `${base}/${relativePath}`
  return {
    read: (relativePath) => {
      try {
        return disk.readFile(at(relativePath))
      } catch (error: unknown) {
        // Absent is an answer the endpoint acts on — it refuses the save and says why. Any other failure,
        // a permission or a disk error, is thrown on, and the endpoint answers 500.
        if (isMissingFile(error)) return null
        throw error
      }
    },
    write: (relativePath, text) => {
      const target = at(relativePath)
      disk.makeFolder(folderOf(target))
      disk.writeFile(target, text)
    },
    rename: (fromPath, toPath) => {
      disk.rename(at(fromPath), at(toPath))
    },
  }
}
