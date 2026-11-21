import { useMemo } from 'react'

import { useNameFollowsPlace } from '../hooks/useNameFollowsPlace'

import { FormRelationField } from './FormRelationField'

import type { Say } from '../utils/say'

/**
 * « Nom d'époque » (CMS-495; the dev, 2026-11-21): the name the place bore at the sheet's date — Ankara is « Ancyre »
 * in 1100 — chosen among the names of **that place** with Payload's own relationship field, or created by its « + »
 * in a drawer, where its languages and its sources are entered, a source created by its own « + ». Before a place is
 * chosen there is no name to offer: a sentence says so in the field's stead.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the field, or the sentence that asks for the place first
 */
export function PeriodNameField({ say }: { say: Say }) {
  const place = useNameFollowsPlace()
  // One object per place: the field empties its options whenever its filter changes identity (`RelationField`)
  const ofThisPlace = useMemo(() => ({ place: { equals: place } }), [place])

  // Render
  if (place === null) {
    return (
      <div className="city-sheet__field">
        <span className="city-sheet__label">{say('periodName')}</span>
        <p className="city-sheet__help">{say('periodNameNoPlace')}</p>
      </div>
    )
  }
  return (
    <FormRelationField
      name="periodName"
      collection="period-names"
      label={say('periodName')}
      description={say('periodNameHelp')}
      only={ofThisPlace}
    />
  )
}
