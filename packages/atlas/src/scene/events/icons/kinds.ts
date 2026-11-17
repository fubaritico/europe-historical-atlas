/**
 * The kinds of icon an event can stand as — the one name the 3D models, the flat drawings and the settings share.
 */

import type { EventIcon as ContentEventIcon } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * Every icon of the content format but the pin, which `../pin` draws — and two kinds no event type of the content can
 * choose yet, stood on the map only through the dev's preview (`app/preview`): the cathedral, a building, until it
 * gets its type (ATLAS-434); the tomb, a death's grave, until the deaths get theirs (ATLAS-288).
 */
export type EventIconKind = Exclude<ContentEventIcon, 'pin'> | 'cathedral' | 'tomb'
