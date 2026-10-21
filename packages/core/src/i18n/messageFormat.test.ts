import { describe, expect, it } from 'vitest'

import { MessageFormatError, formatMessage, messageArguments, parseMessage } from './messageFormat'

/** The frontier count, the plan's own example (P8). */
const FRONTIERS = '{count, plural, =0 {aucune frontière} one {# frontière} other {# frontières}}'

describe('messageFormat', () => {
  describe('happy path', () => {
    it('writes plain text as is', () => {
      expect(formatMessage('Chargement du relief', {}, 'fr')).toBe('Chargement du relief')
    })

    it('puts a text value in its place', () => {
      expect(formatMessage('{layer} a échoué', { layer: 'Le relief' }, 'fr')).toBe(
        'Le relief a échoué'
      )
    })

    it('writes a number the French way, with a narrow no-break space', () => {
      expect(formatMessage('{area} km²', { area: 31200 }, 'fr')).toBe('31 200 km²')
    })

    it('writes a number the English way, with a comma', () => {
      expect(formatMessage('{area} km²', { area: 31200 }, 'en')).toBe('31,200 km²')
    })
  })

  describe('variants', () => {
    it.each([
      [1, '1 frontière'],
      [2, '2 frontières'],
      [1500, '1 500 frontières'],
    ])('writes %i frontiers as “%s”', (count, text) => {
      expect(formatMessage(FRONTIERS, { count }, 'fr')).toBe(text)
    })

    it('takes an exact case before the category', () => {
      expect(formatMessage(FRONTIERS, { count: 0 }, 'fr')).toBe('aucune frontière')
    })

    // French puts 0 with 1 ("0 frontière"); English puts it with the many. A rule that says
    // "one is 1" gets the French wrong.
    it('follows each language’s plural rule for 0', () => {
      const pattern = '{n, plural, one {# frontière} other {# frontières}}'
      expect(formatMessage(pattern, { n: 0 }, 'fr')).toBe('0 frontière')
      const english = '{n, plural, one {# border} other {# borders}}'
      expect(formatMessage(english, { n: 0 }, 'en')).toBe('0 borders')
    })

    it('chooses a select case by value, and other otherwise', () => {
      const pattern = '{gender, select, feminine {chargée} other {chargé}}'
      expect(formatMessage(pattern, { gender: 'feminine' }, 'fr')).toBe('chargée')
      expect(formatMessage(pattern, { gender: 'masculine' }, 'fr')).toBe('chargé')
    })

    it('chooses a select case by a number written as text', () => {
      const pattern = '{day, select, 1 {1er} other {{day}}}'
      expect(formatMessage(pattern, { day: 1 }, 'fr')).toBe('1er')
      expect(formatMessage(pattern, { day: 14 }, 'fr')).toBe('14')
    })

    it('gives # its count inside a select nested in a plural', () => {
      const pattern =
        '{n, plural, one {# pays {g, select, f {chargée} other {chargé}}} other {# pays}}'
      expect(formatMessage(pattern, { n: 1, g: 'f' }, 'fr')).toBe('1 pays chargée')
    })

    it('keeps an apostrophe before a letter as an apostrophe', () => {
      expect(formatMessage("l'atlas de {name}", { name: 'Duby' }, 'fr')).toBe("l'atlas de Duby")
    })

    it('quotes braces after an apostrophe', () => {
      expect(formatMessage("'{name}' reste écrit", {}, 'fr')).toBe('{name} reste écrit')
    })

    it('reads two apostrophes as one', () => {
      expect(formatMessage("aujourd''hui", {}, 'fr')).toBe("aujourd'hui")
    })

    it('quotes # inside a plural', () => {
      const pattern = "{n, plural, other {'#'{n}}}"
      expect(formatMessage(pattern, { n: 3 }, 'fr')).toBe('#3')
    })
  })

  describe('managed errors', () => {
    it('throws naming a value the caller did not pass', () => {
      expect(() => formatMessage('{layer} a échoué', {}, 'fr')).toThrow(
        new MessageFormatError('the value "layer" is missing')
      )
    })

    it.each([
      ['an unclosed argument', '{layer'],
      ['a closing brace that closes nothing', 'relief}'],
      ['an argument with no name', '{}'],
      ['a type the engine does not know', '{n, number}'],
      ['a plural without other', '{n, plural, one {#}}'],
      ['a select without other', '{g, select, f {elle}}'],
      ['a word that is not a plural category', '{n, plural, several {#} other {#}}'],
      ['a case written twice', '{g, select, f {a} f {b} other {c}}'],
      ['a quote never closed', "'{ouvert"],
    ])('refuses %s', (_, pattern) => {
      expect(() => parseMessage(pattern)).toThrow(MessageFormatError)
    })

    // A plain object inherits `constructor`: read naively, the message prints a function.
    it('throws for a value named like an inherited property, rather than print it', () => {
      expect(() => formatMessage('{constructor}', {}, 'fr')).toThrow(
        'the value "constructor" is missing'
      )
    })

    it('says where a pattern is malformed', () => {
      expect(() => parseMessage('relief}')).toThrow('a "}" closes nothing, at 6 in "relief}"')
    })
  })

  describe('unmanaged errors', () => {
    it('throws when a plural is given text instead of a number', () => {
      expect(() => formatMessage(FRONTIERS, { count: 'deux' }, 'fr')).toThrow(
        'the plural "count" needs a number, not "deux"'
      )
    })
  })

  describe('edge cases', () => {
    it('writes an empty pattern as an empty text', () => {
      expect(formatMessage('', {}, 'fr')).toBe('')
    })

    it('reads # outside a plural as a plain character', () => {
      expect(formatMessage('n° #1', {}, 'fr')).toBe('n° #1')
    })

    it('names every value a message takes, nested ones included, each once', () => {
      const nodes = parseMessage('{a} {n, plural, one {{b}} other {{a} {c}}}')
      expect(messageArguments(nodes)).toEqual(['a', 'b', 'c', 'n'])
    })

    it('reads spaces and line breaks between cases', () => {
      const pattern = '{n, plural,\n  one {un}\n  other {plusieurs}\n}'
      expect(formatMessage(pattern, { n: 2 }, 'fr')).toBe('plusieurs')
    })
  })
})
