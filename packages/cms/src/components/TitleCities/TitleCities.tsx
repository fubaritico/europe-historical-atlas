'use client'

import { Button, RelationshipInput, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { useAttachCities } from './hooks/useAttachCities'
import { CityResults } from './internal/CityResults'
import { YearField } from './internal/YearField'
import { mapYear } from './utils/mapYear'
import { numberOf, yearOf } from './utils/readYear'

/** What the block says of itself. */
const ABOUT =
  'Choisissez les villes de son district. Une ville sans fiche à cette date reçoit la sienne, tenue par ce titre ; une ville sans détenteur y est rattachée. Leur ligne de source reprend celle du titre, marquée « déduite de son district ». Une ville tenue par un autre, ou qu’une source donne à un autre, est laissée telle quelle et dite.'

/**
 * The block of a saved title (CMS-507): the year — the map's that covers the title, proposed — the cities chosen by
 * name, and « Rattacher ».
 * @param props - the title
 * @param props.title - its id
 * @returns the block
 */
function SavedTitleCities({ title }: { title: number | string }) {
  // Context
  const from = numberOf(useFormFields(([fields]) => fields['date.start.year']?.value))
  const to = numberOf(useFormFields(([fields]) => fields['date.end.year']?.value))

  // State
  const [typedYear, setTypedYear] = useState<string | null>(null)
  const { places, setPlaces, results, running, attach } = useAttachCities(title)

  // Derived
  const proposed = mapYear(from, to)
  const yearText = typedYear ?? (proposed === null ? '' : String(proposed))
  const year = yearOf(yearText)

  // Render
  return (
    <div className="field-type">
      <h3>Les villes sous son autorité à cette date</h3>
      <p className="field-description">{ABOUT}</p>
      <YearField text={yearText} valid={year !== null} onType={setTypedYear} />
      <RelationshipInput
        path="title-cities-places"
        relationTo={['places']}
        hasMany
        label="Villes"
        // Held while the cities are attached: a choice made meanwhile would be cleared by the answer (review QUAL-002)
        readOnly={running}
        value={places}
        onChange={(chosen) => {
          // Payload hands `null` once the field is emptied, whatever its type says
          setPlaces(Array.isArray(chosen) ? chosen : [])
        }}
      />
      <Button
        buttonStyle="secondary"
        size="medium"
        disabled={running || year === null || places.length === 0}
        onClick={() => {
          if (year !== null) void attach(year)
        }}
      >
        {running ? 'Rattachement…' : 'Rattacher'}
      </Button>
      <CityResults results={results} />
    </div>
  )
}

/**
 * « Les villes sous son autorité à cette date », on a title's page (CMS-507; the dev, 2026-11-24: _"on the title, I
 * select this city, this city, this city"_) — the same operation the historian's script calls. Shown once the title
 * is saved: a city attaches to a title that exists.
 * @returns the block, or the sentence that asks to save first
 */
export function TitleCities() {
  const { id } = useDocumentInfo()
  if (id === undefined) {
    return (
      <div className="field-type">
        <p className="field-description">
          Enregistrez d’abord le titre : ses villes se rattachent à un titre existant.
        </p>
      </div>
    )
  }
  return <SavedTitleCities title={id} />
}
