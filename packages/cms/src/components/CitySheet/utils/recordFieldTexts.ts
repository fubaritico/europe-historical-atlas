import type { Say } from './say'

/** Every sentence a record field says: the place's, a line's source's. */
export interface RecordFieldTexts {
  /** Its label. */
  label: string
  /** The example in the empty field. */
  placeholder: string
  /** The sentence under it. */
  help: string
  /** The name of the list of matches. */
  list: string
  /** What the list says when the base has nothing of that name. */
  none: string
  /** What the field says when the search failed. */
  searchFailed: string
  /**
   * The name of the button that removes the record held.
   * @param name - the record's name
   * @returns the button's name
   */
  remove: (name: string) => string
}

/**
 * The place field's texts.
 * @param say - the translator
 * @returns its sentences
 */
export function placeTexts(say: Say): RecordFieldTexts {
  return {
    label: say('place'),
    placeholder: say('placePlaceholder'),
    help: say('placeHelp'),
    list: say('placeList'),
    none: say('placeNone'),
    searchFailed: say('placeSearchFailed'),
    remove: (name) => say('placeRemove', { name }),
  }
}

/**
 * A line's source field's texts.
 * @param say - the translator
 * @returns its sentences
 */
export function sourceTexts(say: Say): RecordFieldTexts {
  return {
    label: say('source'),
    placeholder: say('sourcePlaceholder'),
    help: say('sourceHelp'),
    list: say('sourceList'),
    none: say('sourceNone'),
    searchFailed: say('sourceSearchFailed'),
    remove: (name) => say('sourceRemove', { name }),
  }
}
