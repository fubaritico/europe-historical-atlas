import path from 'path'
import { fileURLToPath } from 'url'

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { en } from '@payloadcms/translations/languages/en'
import { fr } from '@payloadcms/translations/languages/fr'
import { buildConfig } from 'payload'

import { ATLAS_NAME } from './atlasName'
import { Actors } from './collections/Actors'
import { Events } from './collections/Events'
import { EventTypes } from './collections/EventTypes'
import { ImportanceReasons } from './collections/ImportanceReasons'
import { PlacePeriods } from './collections/PlacePeriods'
import { Places } from './collections/Places'
import { SiegeEngines } from './collections/SiegeEngines'
import { Sources } from './collections/Sources'
import { Users } from './collections/Users'
import { brandMarkDataUri } from './components/BrandMark/utils/brandMarkDataUri'
import { mcpAccess } from './mcp/mcpAccess'

/** This file's folder: the import map and the generated types are written beside it. */
const dirname = path.dirname(fileURLToPath(import.meta.url))

/** The mark's component, in the import map's terms (from `src/`). */
const BRAND_MARK_PATH = '/components/BrandMark/BrandMark#BrandMark'

/** The mark in the navigation: a little larger than Payload's 18 px icon, the dev's ask (2026-10-30). */
const NAV_MARK_SIDE = 24

/** The mark on the login page, in place of Payload's logo. */
const LOGIN_MARK_SIDE = 96

/** The side the tab's icon is drawn at; the browser scales it to its 16 or 32 px. */
const TAB_MARK_SIDE = 32

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
    // Dark only, the dev's call (2026-10-30)
    theme: 'dark',
    components: {
      graphics: {
        Icon: { path: BRAND_MARK_PATH, clientProps: { side: NAV_MARK_SIDE, names: 'dashboard' } },
        Logo: { path: BRAND_MARK_PATH, clientProps: { side: LOGIN_MARK_SIDE, names: 'atlas' } },
      },
    },
    meta: {
      titleSuffix: ` — ${ATLAS_NAME}`,
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: brandMarkDataUri(TAB_MARK_SIDE) }],
    },
  },
  collections: [
    Events,
    EventTypes,
    SiegeEngines,
    Places,
    PlacePeriods,
    ImportanceReasons,
    Actors,
    Sources,
    Users,
  ],
  localization: {
    locales: [
      { code: 'fr', label: 'Français' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'fr',
    fallback: false,
  },
  i18n: { supportedLanguages: { fr, en }, fallbackLanguage: 'fr' },
  plugins: [mcpAccess()],
  secret: required('PAYLOAD_SECRET'),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: sqliteAdapter({ client: { url: required('DATABASE_URL') } }),
})
