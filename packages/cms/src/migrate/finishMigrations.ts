import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { addedReferences, shortReferencesLeft } from './addedReferences'
import { typeOnlyImports } from './typeOnlyImports'

import type { MigrationSnapshot } from './addedReferences'

/**
 * A migration's snapshot, read — named in the error when it cannot be, so a broken one is found among them all.
 * @param file - the snapshot's path
 * @returns the snapshot
 * @throws when it is not JSON with its tables — the migration is then left as the generator wrote it
 */
function snapshotAt(file: string): MigrationSnapshot {
  let read: unknown
  try {
    read = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`[CMS] the snapshot ${path.basename(file)} cannot be read`, { cause: error })
  }
  if (typeof read !== 'object' || read === null || !('tables' in read)) {
    throw new Error(`[CMS] the snapshot ${path.basename(file)} has no tables`)
  }
  return read as MigrationSnapshot
}

/**
 * The migrations of a folder: its TypeScript files but the index Payload writes beside them — one rule, read by
 * `finishMigrations`, `referencesLeft` and `migrate:create` (review ARCH-003 of CMS-280).
 * @param folder - the migrations' folder
 * @returns their file names
 */
export function migrationFiles(folder: string): string[] {
  return readdirSync(folder).filter((file) => file.endsWith('.ts') && file !== 'index.ts')
}

/**
 * Finish, in place, every migration of a folder the generator wrote: its types imported as types
 * (`typeOnlyImports`), and each column it adds with a foreign key written with the actions its snapshot declares
 * (`addedReferences`) — the two things Payload's and Drizzle's generators get wrong. The index Payload writes beside
 * them is left out; a migration with no snapshot beside it (written by hand) gets only the first; one already right
 * is left untouched.
 * @param folder - the migrations' folder
 * @returns the names of the files rewritten
 */
export function finishMigrations(folder: string): string[] {
  const fixed: string[] = []
  for (const file of migrationFiles(folder)) {
    const where = path.join(folder, file)
    const source = readFileSync(where, 'utf8')
    const snapshotFile = where.replace(/\.ts$/, '.json')
    const typed = typeOnlyImports(source)
    const rewritten = existsSync(snapshotFile)
      ? addedReferences(typed, snapshotAt(snapshotFile))
      : typed
    if (rewritten !== source) {
      writeFileSync(where, rewritten)
      fixed.push(file)
    }
  }
  return fixed
}

/**
 * The added columns every generated migration of a folder still writes with no foreign-key action — what
 * `finishMigrations` could not complete (`shortReferencesLeft`). A migration with no snapshot beside it — written by
 * hand — is not read: its author chose its text.
 * @param folder - the migrations' folder
 * @returns each file with its columns left, empty when every reference is whole
 */
export function referencesLeft(folder: string): { file: string; columns: string[] }[] {
  return migrationFiles(folder)
    .filter((file) => existsSync(path.join(folder, file.replace(/\.ts$/, '.json'))))
    .map((file) => ({
      file,
      columns: shortReferencesLeft(readFileSync(path.join(folder, file), 'utf8')),
    }))
    .filter((left) => left.columns.length > 0)
}
