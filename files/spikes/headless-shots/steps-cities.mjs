// The steps of CARTO-485: the Cartographer's « Cities » panel over thirteen thousand cities, in English.
// A step is { name, run, profile?, top?, rest? }: `run` is the text of a function evaluated in the page.
const box = (word) => `[...document.querySelectorAll('input[type=checkbox]')].find((e) => (e.closest('label')?.textContent ?? '').toLowerCase().startsWith('${word}'))`
export const waitSeconds = 25
export const steps = [
  { name: 'rows in the page', run: `() => document.querySelectorAll('.city-row').length` },
  { name: 'tick « all the cities »', profile: true, top: 10, rest: 3000, run: `() => { ${box('show all')}.click() }` },
  { name: 'untick « all the cities »', profile: true, top: 6, rest: 3000, run: `() => { ${box('show all')}.click() }` },
  { name: 'tick « all » again', rest: 3000, run: `() => { ${box('show all')}.click() }` },
  { name: 'tick « as points »', profile: true, top: 8, rest: 3000, run: `() => { ${box('show as points')}.click() }` },
  { name: 'one eye, all shown as points', profile: true, top: 6, rest: 2000, run: `() => { document.querySelector('.city-row .layer-row__eye').click() }` },
  { name: 'scroll the list far down', rest: 1000, run: `() => { const l = document.querySelector('.city-list'); l.scrollTop = 200000; return new Promise((r) => setTimeout(() => r({ rows: document.querySelectorAll('.city-row').length, firstName: document.querySelector('.city-row .city-row__name')?.textContent, scrollHeight: l.scrollHeight }), 300)) }` },
]
