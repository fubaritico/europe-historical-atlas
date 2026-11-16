import { describe, expect, it, vi } from 'vitest'

import { PlacePeriods } from '../../collections/PlacePeriods'

import { CitySheetView } from './CitySheetView'

import type { CitySheetFormProps } from './CitySheetForm'
import type { DocumentViewServerProps } from 'payload'
import type { ReactElement } from 'react'

vi.mock('./CitySheetForm', () => ({ CitySheetForm: () => null }))

/**
 * The view's props, as much as it reads: the sheet, the request's Payload and languages.
 * @param doc - the sheet
 * @param locale - the content locale, `undefined` for none
 * @returns the props, and the place lookup to read its calls
 */
function viewProps(doc: Record<string, unknown> | null, locale: { code: string } | undefined) {
  const findByID = vi.fn(() => Promise.resolve({ id: 5, name: 'Rome' }))
  const find = vi.fn(({ collection }: { collection: string }) =>
    Promise.resolve({
      docs:
        collection === 'sources'
          ? [{ id: 4, title: 'Buringh 2021' }]
          : collection === 'confessions'
            ? [{ id: 9, name: 'Juive' }]
            : [{ id: 1, name: 'Pouvoir' }],
    })
  )
  const props = {
    doc,
    initPageResult: {
      locale,
      req: {
        i18n: { language: 'en' },
        payload: { findByID, find, config: { routes: { api: '/api', admin: '/admin' } } },
      },
    },
  } as unknown as DocumentViewServerProps
  return { props, findByID, find }
}

/**
 * What the view hands its form.
 * @param props - the view's props
 * @returns the form's element
 */
async function formOf(props: DocumentViewServerProps): Promise<ReactElement<CitySheetFormProps>> {
  return (await CitySheetView(props)) as ReactElement<CitySheetFormProps>
}

describe('CitySheetView', () => {
  describe('happy path', () => {
    it('hands the form a saved sheet: its id, its place named, the admin’s language and the routes', async () => {
      const { props, findByID } = viewProps(
        { id: 1, place: 5, importance: 'capital' },
        { code: 'fr' }
      )
      const form = await formOf(props)
      expect(form.props).toMatchObject({
        id: 1,
        locale: 'en',
        contentLocale: 'fr',
        api: '/api',
        admin: '/admin',
        initialValues: { place: { id: 5, name: 'Rome' }, importance: 'capital' },
      })
      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'places', id: 5, fallbackLocale: 'fr' })
      )
      expect(form.key).toBe('1')
    })

    // 2026-11-16: a line's source is Payload's own field, which reads its title — the view reads none
    it('hands the form the reasons’ and the confessions’ lists, and each line’s source by its id', async () => {
      const line = { id: 'r1', source: 4, subject: 'population', population: 35000 }
      const { props, find } = viewProps({ id: 1, place: 5, testimonies: [line] }, { code: 'fr' })
      const form = await formOf(props)
      expect(form.props.lists).toEqual({
        reasons: [{ id: 1, name: 'Pouvoir' }],
        confessions: [{ id: 9, name: 'Juive' }],
      })
      expect(form.props.initialValues.testimonies[0]?.source).toBe(4)
      expect(find).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'sources' }))
    })
  })

  describe('variants', () => {
    // Payload hands a new sheet as `null`, not `{}` — found in the browser, 2026-10-30.
    it('hands a new sheet no id, no place, and its own key', async () => {
      const { props, findByID } = viewProps(null, { code: 'fr' })
      const form = await formOf(props)
      expect('id' in form.props).toBe(false)
      expect(form.props.initialValues.place).toBeNull()
      expect(findByID).not.toHaveBeenCalled()
      expect(form.key).toBe('new')
    })

    it('reads a populated place by its id', async () => {
      const { props, findByID } = viewProps(
        { id: 1, place: { id: 5, name: 'Rome' } },
        { code: 'fr' }
      )
      await formOf(props)
      expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }))
    })

    // CMS-422: Payload's own field reads the title's name, so the view reads none
    it('hands the form the holder’s title by its id alone', async () => {
      const { props, findByID } = viewProps({ id: 1, place: 5, holderTitle: 7 }, { code: 'fr' })
      const form = await formOf(props)
      expect(form.props.initialValues.holderTitle).toBe(7)
      expect(findByID).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'titles' }))
    })
  })

  describe('managed errors', () => {
    it('is the collection’s edit view, by the path the import map knows', () => {
      expect(PlacePeriods.admin?.components?.views?.edit?.default).toEqual({
        Component: '/components/CitySheet/CitySheetView#CitySheetView',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('throws when Payload hands no content locale — a config without localization', async () => {
      const { props } = viewProps({}, undefined)
      await expect(formOf(props)).rejects.toThrow('no content locale')
    })
  })

  // L5: N/A — the view reads one document; the bounds of the values are the form's (validateSheet).
})
