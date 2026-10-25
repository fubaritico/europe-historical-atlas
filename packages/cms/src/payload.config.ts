import path from 'path'
import { fileURLToPath } from 'url'

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { en } from '@payloadcms/translations/languages/en'
import { fr } from '@payloadcms/translations/languages/fr'
import { buildConfig } from 'payload'

import { Actors } from './collections/Actors'
import { Events } from './collections/Events'
import { EventTypes } from './collections/EventTypes'
import { Places } from './collections/Places'
import { Sources } from './collections/Sources'
import { Users } from './collections/Users'

/** This file's folder: the import map and the generated types are written beside it. */
const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Read a setting `.env` must provide.
 * @param name - the variable
 * @returns its value
 */
function required(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`[CMS] ${name} is missing from packages/cms/.env`)
  }
  return value
}

/**
 * The contribution tool — local, a SQLite file, French first (CMS-219).
 *
 * **No locale fallback**: an English field nobody wrote stays empty, in the admin and in the export, rather than
 * showing the French under an English label — what the atlas does with a missing English text is CMS-227's
 * decision.
 */
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Atlas historique de l’Europe' },
  },
  collections: [Events, EventTypes, Places, Actors, Sources, Users],
  localization: {
    locales: [
      { code: 'fr', label: 'Français' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'fr',
    fallback: false,
  },
  i18n: { supportedLanguages: { fr, en }, fallbackLanguage: 'fr' },
  secret: required('PAYLOAD_SECRET'),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: sqliteAdapter({ client: { url: required('DATABASE_URL') } }),
})
