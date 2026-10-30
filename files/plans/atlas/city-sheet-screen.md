# The « Ville à une date » screen — the approach (ATLAS-295, decision 8 of `cities.md`)

> **A proposal, written 2026-10-30 while the dev was away — nothing here is decided until he says so.** Every fact
> below was read in the code or in the installed packages that day (Payload 3.92.0, `@payloadcms/next` 3.92.0,
> fubaritico-ds 0.8.0, Formik 2.4.9, Zod 4); the choices are mine and marked as such.

## What he asked for, in his words

*« ça valide à la saisie […] tant que tous les champs ne sont pas valides, il n'y a pas de bouton ajouter »* — and the
behaviour of his `useFormValidation` hook (the original is in `react-and-react-native-financial-app/packages/shared/src/
hooks/`; the Desktop copy is gone): an error shows only on a field already touched; a silent validation at opening greys
the button; the form knows it has changed. In Formik: `touched`, `validateOnMount` + `isValid`, `dirty`.

## Where it plugs in — read, not guessed

- `PlacePeriods.admin.components.views.edit.default = { Component: '/components/CitySheet/CitySheetView#CitySheetView' }`.
  Payload replaces **only the form**: the document header (title, the API tab) and the `DocumentInfoProvider` (id,
  permissions) stay around it (`@payloadcms/next/dist/views/Document/index.js`, the `DocumentHeader` then
  `RenderServerComponent({ Component: View })`). The list of sheets stays Payload's, so do the reasons and the sources.
- **The server half**, `CitySheetView` (a server component), receives `doc` and `initPageResult` (`payload`, `req`,
  locale — `payload/dist/admin/views/document.d.ts`). It reads the places, the reasons and the sources through Payload's
  local API and hands them to the client half: no request from the page to fill a list.
- **The client half**, `CitySheetForm` (`'use client'`), is the Formik form. It saves through Payload's REST API —
  `POST /api/place-periods` or `PATCH /api/place-periods/:id`, with the admin's own cookie — so **the server's refusal
  (`refuseOverlap`) stays the second line**, for whatever reaches the API another way. After a creation, the page moves
  to the new sheet's address.

## The rules — one schema, in `core`

- **`core/src/data/citySheet.ts`**, in `zod/mini` like the rest of core (`time/historicalDate.ts`): a place, a date, an
  importance, the reasons, the sources' lines (a line's value by its subject: a figure for population, an importance, a
  reason). **The date's rules are not rewritten**: the schema calls `readHistoricalDate`, so the year 0 or a 30 February
  is refused by the same code as everywhere.
- **Zod's issues → Formik's errors**: a small function in the CMS, `path → message`, tested on its own (Formik expects Yup;
  nothing ready-made is needed for a dozen lines).
- **The overlap while typing**: when a place is chosen, the form fetches that place's sheets
  (`GET /api/place-periods?where[place][equals]=…&depth=0`) and the validation runs `overlappingSheet` — the very function
  the server runs (`cms/src/fields/sheetOverlap.ts`). The sentence under the year is the server's sentence.
- **The server reads the same schema** (decision 8: *the same at the form, on the server and at the export*): one
  `beforeValidate` hook beside `refuseOverlap`. Payload's own field rules stay as they are.

## The fields — what fubaritico-ds 0.8.0 has, and what it lacks

| field | component | note |
| --- | --- | --- |
| Lieu | `Typeahead`, filtered in the page over the places read by the server | `variant="dark"` |
| Date: année, mois, jour, marge | `Input type="number"` | its `message` carries the help sentence, or the error once touched |
| Vers | `Checkbox` | |
| Calendrier | `Dropdown` | shown only when a day is given — a calendar counts only for a day |
| Importance | `Dropdown`, three options | |
| Raisons | **a list of `Checkbox`** | **the design system has no multi-select** — see question 2 |
| Les lignes de sources | Formik's `FieldArray`: `Dropdown` source, `Dropdown` sur quoi, the value by subject, `Input` où; a button to add a line, one to remove it | |
| Ajouter / Enregistrer | `Button`, disabled while the form is invalid, unchanged or saving | see question 1 |

**Every field carries its help sentence from the first try** (the sentences already written in `PlacePeriods.ts` move to
the component's `i18n/fr.json` and `en.json`). Not in this screen: the line under the sources saying how many there are
and whether they agree (decision 5) — **concordance** is not defined yet; it is a declared gap, not forgotten.

## The colours — the design system in Payload's dark theme

`packages/cms/src/app/(payload)/design-system.css`, loaded after the design system's tokens: each of its 44 colour roles
set to a Payload variable (`--theme-elevation-*`, `--theme-text`, `--theme-input-bg`, `--theme-error-500`…), so a field
looks like Payload's own. Guarded as the Cartographer's theme is (`cartographer/src/ui/styles/theme.test.ts`): every role
set or left on purpose with its reason, and only Payload variables that exist in `@payloadcms/ui`'s sheet.

## Tests

The schema in `core` (the five levels), the mapping of errors, the overlap during typing. The form's behaviour (an error
only once touched, the button greyed then enabled) needs a DOM: the CMS tests run under `node`, so those files declare
`jsdom` themselves, and the CMS takes `@testing-library/react` from the catalogue. Its coverage counts only `.ts` today —
`.tsx` gets added.

## The steps — each one tested by him, then committed

1. **The screen swapped, the colours mapped**: place, date, importance; the button greyed until valid; saving works, new
   and edit. *He sees*: Rome 1100 opens in our form, dark, each field with its sentence.
2. **The overlap while typing**: choosing Rome then typing 1100 on a new sheet greys the button and writes the sentence
   under the year, before any click.
3. **The reasons and the sources' lines.**

## His questions — one at a time

1. **The button** — **decided by the dev, 2026-10-30: greyed** until the form is valid (*« Il faut le griser, oui.
   Évidemment »*), never hidden.
2. **The reasons** — **decided by the dev, 2026-10-30: checkboxes for now, a multi-select to come** (*« prévois qu'on va
   avoir une liste à choix multiple »*); he asks the design system's Claude what it can offer. So the reasons are one
   field component of their own (`ReasonsField`: the options, the chosen ids, `onChange`, its message), the checkboxes
   inside it — the multi-select replaces its inside, and nothing else in the form changes.
3. **What a refused save shows** (`rules/error-handling.md`) — **decided by the dev, 2026-10-30**: the server refuses (a
   sheet saved meanwhile from another tab) or does not answer → the sentence at the top of the form and under the field
   it names, the form kept as typed, a `console.error`, **and a toast** (*« il nous faut les messages d'avertissement […]
   maintenant on a un toast »*). The toast is **Payload's own** (`toast` from `@payloadcms/ui`, already mounted and dark),
   my proposal: the same one that says « enregistré » on every other collection of the admin, so the admin speaks with
   one voice — the design system's `Toast` would need a second toaster in the page. A successful save toasts too.
   The design system's multi-select is being built (the dev, same day).
4. **The lists** — **decided by the dev, 2026-10-30**, after asking how contribution tools handle several people at
   once: no live push. **The place and the source are searched in the base at each keystroke** (a `Typeahead` over the
   API), so one created in another tab is offered at once; **the reasons** are few and read when the page opens. Two
   contributors saving the same city-year is caught at save by the server, as MediaWiki's edit conflict or
   OpenStreetMap's version check do (both from memory). His own example — a headless CMS calling the site's
   on-demand revalidation (`revalidateTag`) after a save — fits **the CMS → atlas publication**, a lead for the day the
   CMS is online, not this screen.

## Step 1 as built (2026-10-30)

- **What runs**: `packages/cms/src/components/CitySheet/` — the server half reads the place's name, the client half is
  the Formik form (place, start and end, importance); `core/src/data/citySheet.ts` holds the schema. The colours are
  mapped on the form itself (`citySheet.css`), guarded by `citySheetTheme.test.ts` — verified by breaking it.
- **Walked in Chrome by me, the dev away** (2026-10-30, his delegation: *« c'est toi qui testes »*): Rome opens with its
  values, a year 0 is said under the year once left, the button stays greyed; a new Rome 1100 is refused by the server,
  under the year and in a toast. The walk found two defects the tests had not: Payload hands a new sheet as `null`,
  not `{}` (the create page crashed), and the importance's label sat beside its menu. Both fixed, the first with a test.
- **The test account**: `claude-test@localhost.test` in his base, its password in `packages/cms/.env.test-user`
  (git-ignored, his eyes only), created with his yes — he deletes it from « Contributeurs » when he wants.
- **Not in step 1**: the server running the same schema (a `beforeValidate` hook) — Payload's own field rules hold the
  same three fields today, so it joins with step 3, when the schema gains the reasons and the lines.
- **To know — Payload's document lock**: Payload marks a document « being edited » from its own form only
  (`@payloadcms/ui/dist/views/Edit`); our form replaces it, so a sheet open here is not shown locked to a second
  contributor. Harmless while the CMS is local and his alone; the day it is online, the last save wins on the same
  sheet — the overlap rule still refuses a second sheet for the same year. Remedy then: call Payload's lock from our
  form.
