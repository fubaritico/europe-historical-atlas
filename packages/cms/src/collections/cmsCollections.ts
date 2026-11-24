import { Confessions } from './Confessions'
import { Events } from './Events'
import { EventTypes } from './EventTypes'
import { ImportanceReasons } from './ImportanceReasons'
import { People } from './People'
import { PeriodNames } from './PeriodNames'
import { PlacePeriods } from './PlacePeriods'
import { Places } from './Places'
import { SiegeEngines } from './SiegeEngines'
import { Sources } from './Sources'
import { Territories } from './Territories'
import { Titles } from './Titles'
import { Users } from './Users'
import { VassalLinks } from './VassalLinks'

import type { CollectionConfig } from 'payload'

/**
 * The CMS's own collections, in the order the admin lists them — the one list the configuration builds, the schema map
 * draws (CMS-280) and the tests that read the whole schema walk. The MCP plugin adds its keys' collection at build.
 */
export const CMS_COLLECTIONS: readonly CollectionConfig[] = [
  Events,
  EventTypes,
  SiegeEngines,
  Places,
  PlacePeriods,
  PeriodNames,
  ImportanceReasons,
  Confessions,
  People,
  Territories,
  Titles,
  VassalLinks,
  Sources,
  Users,
]
