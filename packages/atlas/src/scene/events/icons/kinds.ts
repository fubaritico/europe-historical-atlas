/**
 * The kinds of icon an event can stand as — the one name the 3D models, the flat drawings and the settings share.
 */

import type { EventIcon as ContentEventIcon } from '@europe-historical-atlas/core/data/contentFormat'

/** Every icon of the content format but the pin, which `../pin` draws. */
export type EventIconKind = Exclude<ContentEventIcon, 'pin'>
