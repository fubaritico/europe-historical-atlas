/**
 * The kinds of icon an event can stand as — the one name the 3D models, the flat drawings and the settings share.
 */

import type { EventIcon as ContentEventIcon } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * Every icon of the content format but the pin, which `../pin` draws — and the cathedral, a building, which no event
 * type of the content can choose yet: it stands on the map only through the dev's preview (`app/devPreview`), until
 * the day it gets its type (ATLAS-434).
 */
export type EventIconKind = Exclude<ContentEventIcon, 'pin'> | 'cathedral'
