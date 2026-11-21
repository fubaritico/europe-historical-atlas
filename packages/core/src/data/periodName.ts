/**
 * A name of the time (« nom d'époque », CMS-495; the dev, 2026-11-21): the name a place bore at the date of a sheet —
 * Ankara is « Ancyre » in 1100 — written in as many languages as are contributed. The map writes it alone; the present
 * name stands beside it in the city's detail (`files/plans/contribution/names.md`).
 */

/**
 * The languages a name of the time can be written in. The list is the source of truth and {@link NameLanguage} is
 * derived from it: **a language is added by one line here and its label in the CMS's form** (`LANGUAGE_LABELS`, which
 * the type-check refuses without it), with no change to the base (the dev, 2026-11-21: French and English today,
 * Spanish, Italian, German tomorrow — never a fixed pair).
 */
export const NAME_LANGUAGES = ['fr', 'en', 'es', 'it', 'de'] as const

/** A language a name of the time can be written in — a BCP 47 tag. */
export type NameLanguage = (typeof NAME_LANGUAGES)[number]

/** One line of a name's table of correspondence: the form the name takes in one language. */
export interface NameForm {
  /** The language of the form. */
  readonly language: NameLanguage
  /** The name as that language writes it: « Ancyre », « Ancyra ». */
  readonly form: string
}

/**
 * Whether a value is one of the languages a name can be written in.
 * @param value - anything read from a file or a form
 * @returns true for a language of {@link NAME_LANGUAGES}
 */
export function isNameLanguage(value: unknown): value is NameLanguage {
  return (NAME_LANGUAGES as readonly unknown[]).includes(value)
}

/**
 * The name a record is listed by: its forms in the order of {@link NAME_LANGUAGES}, a form shared by several
 * languages said once — « Ancyre · Ancyra ».
 * @param forms - the table of correspondence
 * @returns the label, empty for a table with no form
 */
export function periodNameLabel(forms: readonly NameForm[]): string {
  const ordered = NAME_LANGUAGES.flatMap((language) =>
    forms.filter((line) => line.language === language).map((line) => line.form)
  )
  return [...new Set(ordered)].join(' · ')
}

/**
 * The first language a table of correspondence writes twice — a name has one form a language; a second spelling in
 * the same language is another name.
 * @param forms - the table of correspondence
 * @returns the language written twice, or `null` when every line has its own
 */
export function repeatedLanguage(forms: readonly NameForm[]): NameLanguage | null {
  const seen = new Set<NameLanguage>()
  for (const { language } of forms) {
    if (seen.has(language)) return language
    seen.add(language)
  }
  return null
}

/**
 * The form of a name in one language.
 * @param forms - the table of correspondence
 * @param language - the language asked
 * @returns the form, or `null` when the table has no line for that language — what is shown then is the caller's decision
 */
export function formIn(forms: readonly NameForm[], language: NameLanguage): string | null {
  return forms.find((line) => line.language === language)?.form ?? null
}
