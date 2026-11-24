/**
 * The statements of a migration that can lose what the base holds (CMS-280, `files/plans/contribution/cms-tooling.md`,
 * step 6): a table dropped, a column dropped, a table or a column renamed, a table rebuilt. Read from the migration's
 * source, so `migrate:create` says them when it writes one and `migrate` refuses one that nobody read. The trap it
 * exists for: on 2026-11-15 a generated way down rebuilt `place_periods` for one column added, and the base's keys being
 * active, the rebuild erased its source lines in cascade (`rules/known-issues/cms.md`).
 *
 * **The whole source is read**, its comments left out — not only Payload's `sql\`…\``: a hand-written migration runs
 * statements through `sql.raw(…)` (`people`), a helper or a constant, and a guard that read only the templates would
 * let those through unsaid (review SEC-001 of CMS-280). Every occurrence counts, several in one string included. A
 * table named by a computed value (`${table}`) is a danger whatever it is: nothing here can tell which table it is.
 * What stands before the first way is counted with it, what stands after the last with it — only for the message:
 * `migrate` refuses an unread danger whichever way it is in (review SEC-005).
 *
 * **It is a guard, not a proof**: a keyword assembled while the migration runs (`'DROP ' + 'TABLE'`), a `/*` or a `//`
 * inside a string, and a statement that loses rows without dropping anything (`DELETE`, `UPDATE … = NULL`) are not
 * read (review SEC-006, SEC-007) — the forms the generator writes and the hand-written ones of this repository are.
 *
 * A migration whose dangers were read and kept on purpose says so in one line — `// dangers reviewed: <why>` — as the
 * hand-written ones do (`plain_french_names` drops two child tables nothing points at).
 */

/** What a statement does that can lose data. */
export type DangerKind = 'drop-table' | 'drop-column' | 'rename' | 'rebuild'

/** The way of the migration a statement is in. */
export type Direction = 'up' | 'down'

/** One statement that can lose data. */
export interface MigrationDanger {
  /** Which way: applying the migration, or going back. */
  readonly direction: Direction
  /** What it does. */
  readonly kind: DangerKind
  /** The table it touches, or `${…}` when the source computes its name. */
  readonly table: string
}

/** The line that says a migration's dangers were read and kept on purpose, with its reason on the same line. */
const REVIEWED = /\/\/[ \t]*dangers reviewed:[ \t]*\S/

/** Where a way begins: `export async function up(`, `export function up(`, `export const up =`. */
const WAY = /export\s+(?:async\s+)?(?:function\s+(up|down)\s*\(|const\s+(up|down)\s*[=:])/g

/**
 * A table's or a column's name as written — any token up to a space, a `;`, a parenthesis or a comma — so a name in
 * backticks, double or single quotes, brackets, with its schema (`main.x`) or computed (`${t}`) is read alike, and
 * {@link bare} takes the quotes off (review SEC-006 of CMS-280).
 */
const TOKEN = String.raw`([^\s;(),]+)`

/** The statements read, by kind, each found wherever it stands; the second group, when there is one, is the column. */
const PATTERNS: readonly { kind: Exclude<DangerKind, 'rebuild'>; pattern: RegExp }[] = [
  {
    kind: 'drop-table',
    pattern: new RegExp(String.raw`DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?${TOKEN}`, 'gi'),
  },
  {
    kind: 'drop-column',
    pattern: new RegExp(String.raw`ALTER\s+TABLE\s+${TOKEN}\s+DROP\s+(?:COLUMN\s+)?${TOKEN}`, 'gi'),
  },
  { kind: 'rename', pattern: new RegExp(String.raw`ALTER\s+TABLE\s+${TOKEN}\s+RENAME\b`, 'gi') },
]

/** A table created — a rebuild's copy when its name begins with `__new_`. */
const CREATED = new RegExp(String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${TOKEN}`, 'gi')

/** A column the way up adds. */
const ADDED = new RegExp(String.raw`ALTER\s+TABLE\s+${TOKEN}\s+ADD\s+(?:COLUMN\s+)?${TOKEN}`, 'gi')

/** What a rebuild's copy is named before it takes the old table's place. */
const COPY = '__new_'

/**
 * A name without its quotes, its escapes and its schema: `\`main\`.\`x\`` and `[x]` read `x`; a computed one keeps
 * its `${…}`.
 * @param token - the name as written
 * @returns the name
 */
function bare(token: string | undefined): string {
  const unquoted = String(token).replace(/[\\`"'[\]]/g, '')
  return unquoted.startsWith('${') ? unquoted : (unquoted.split('.').at(-1) ?? unquoted)
}

/** One way's text, its comments left out. */
interface Way {
  /** Which way. */
  readonly direction: Direction
  /** Its text, with what stands before it (the first way) or after it (the last). */
  readonly text: string
}

/**
 * A source without its comments, so a comment naming a statement — this module's own words — is never read as one.
 * @param source - the source
 * @returns it, each comment blanked
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1')
}

/**
 * The ways of a migration, its comments left out.
 * @param source - the migration's TypeScript source
 * @returns each way, the first with what stands before it, the last with what stands after it
 * @throws when no way up is found: an unread migration is never counted as a safe one
 */
function waysOf(source: string): Way[] {
  const text = withoutComments(source)
  const starts = [...text.matchAll(WAY)].map((match) => ({
    direction: (match[1] ?? match[2]) as Direction,
    at: match.index,
  }))
  if (!starts.some((start) => start.direction === 'up')) {
    throw new Error('[CMS] no way up found in a migration: it cannot be read, so it is not applied')
  }
  return starts.map(({ direction, at }, index) => ({
    direction,
    text: text.slice(index === 0 ? 0 : at, starts[index + 1]?.at ?? text.length),
  }))
}

/**
 * Every match of a pattern in a text.
 * @param pattern - a global pattern
 * @param text - the text
 * @returns the matches, in order
 */
function matchesOf(pattern: RegExp, text: string): RegExpExecArray[] {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags))]
}

/** What is known of a migration before its statements are judged one by one. */
interface Context {
  /** The tables and the columns its way up brings, as `table` and `table.column`. */
  readonly brought: ReadonlySet<string>
  /** The tables it rebuilds, as `<way> <table>`. */
  readonly rebuilt: ReadonlySet<string>
}

/**
 * The tables a way rebuilds: those it creates a copy of, under {@link COPY}.
 * @param text - the way's text
 * @returns each copy's place in the text and the table it replaces
 */
function rebuildsIn(text: string): { at: number; table: string }[] {
  return matchesOf(CREATED, text)
    .map((match) => ({ at: match.index, name: bare(match[1]) }))
    .filter(({ name }) => name.startsWith(COPY))
    .map(({ at, name }) => ({ at, table: name.slice(COPY.length) }))
}

/**
 * What a migration's way up brings: the tables it creates, the columns it adds.
 * @param text - the way up's text
 * @returns the names, as `table` and `table.column`
 */
function broughtBy(text: string): string[] {
  const tables = matchesOf(CREATED, text)
    .map((match) => bare(match[1]))
    .filter((table) => !table.startsWith(COPY))
  const columns = matchesOf(ADDED, text).map((match) => `${bare(match[1])}.${bare(match[2])}`)
  return [...tables, ...columns]
}

/**
 * What a migration brings and rebuilds.
 * @param ways - its ways
 * @returns the context its statements are judged in
 */
function contextOf(ways: readonly Way[]): Context {
  return {
    brought: new Set(
      ways.filter((way) => way.direction === 'up').flatMap((way) => broughtBy(way.text))
    ),
    rebuilt: new Set(
      ways.flatMap((way) => rebuildsIn(way.text).map(({ table }) => `${way.direction} ${table}`))
    ),
  }
}

/**
 * Whether a matched statement loses nothing: a step of a rebuild already said, or the way down taking back what the
 * way up brought. A computed name is never known to lose nothing.
 * @param danger - what the statement would be said as
 * @param column - the column it drops, when it drops one
 * @param context - what the migration brings and rebuilds
 * @returns `true` when it is no danger of its own
 */
function losesNothing(
  danger: MigrationDanger,
  column: string | undefined,
  context: Context
): boolean {
  if (`${danger.table} ${String(column)}`.includes('${')) return false
  // The drop of a rebuilt table and the rename of its new copy are the rebuild's own steps
  if (context.rebuilt.has(`${danger.direction} ${danger.table.replace(COPY, '')}`)) return true
  if (danger.direction !== 'down' || danger.kind === 'rename') return false
  const takenBack =
    danger.kind === 'drop-column' ? `${danger.table}.${String(column)}` : danger.table
  return context.brought.has(takenBack)
}

/**
 * The dangers of one way, in the order they stand.
 * @param way - the way
 * @param context - what the migration brings and rebuilds
 * @returns its dangers
 */
function dangersOfWay(way: Way, context: Context): MigrationDanger[] {
  const found: { at: number; danger: MigrationDanger }[] = rebuildsIn(way.text).map(
    ({ at, table }) => ({ at, danger: { direction: way.direction, kind: 'rebuild', table } })
  )
  for (const { kind, pattern } of PATTERNS) {
    for (const match of matchesOf(pattern, way.text)) {
      const danger: MigrationDanger = { direction: way.direction, kind, table: bare(match[1]) }
      const column = match[2] === undefined ? undefined : bare(match[2])
      if (!losesNothing(danger, column, context)) found.push({ at: match.index, danger })
    }
  }
  return found.sort((a, b) => a.at - b.at).map(({ danger }) => danger)
}

/**
 * Every statement of a migration that can lose data. A table rebuilt is said once, as a rebuild: its drop and the
 * rename of the new table over it are that rebuild's own steps. The way down taking away a table or a column its way
 * up brought is no danger — what it held came with the migration; a rebuild always is one.
 * @param source - the migration's TypeScript source
 * @returns the dangers, way by way, each in the order it stands
 * @throws when no way up is found in it
 */
export function dangersIn(source: string): MigrationDanger[] {
  const ways = waysOf(source)
  const context = contextOf(ways)
  return ways.flatMap((way) => dangersOfWay(way, context))
}

/**
 * The dangers of a migration nobody said were read: none when it carries `// dangers reviewed: <why>`.
 * @param source - the migration's TypeScript source
 * @returns the dangers still to read
 * @throws when no way up is found in it, marked or not
 */
export function unreviewedDangers(source: string): MigrationDanger[] {
  const dangers = dangersIn(source)
  return REVIEWED.test(source) ? [] : dangers
}

/**
 * The unread dangers of the migrations of a folder, by name — what `migrate` asks. A file that cannot be read throws
 * from `read`, and the migration with it: an unread file is never counted as a safe one.
 * @param folder - the migrations' folder
 * @param read - how a file is read
 * @returns the dangers of a migration, by its name
 */
export function dangersOnDisk(
  folder: string,
  read: (file: string) => string
): (name: string) => MigrationDanger[] {
  return (name) => unreviewedDangers(read(`${folder}/${name}.ts`))
}

/**
 * The unread dangers of the migrations a command has just written — what `migrate:create` says.
 * @param before - the migration files there were before it ran
 * @param after - the migration files there are now
 * @param read - how a file is read, by its name
 * @returns one sentence per danger, its file first
 */
export function dangersOfNewFiles(
  before: ReadonlySet<string>,
  after: readonly string[],
  read: (file: string) => string
): string[] {
  return after
    .filter((file) => !before.has(file))
    .flatMap((file) =>
      unreviewedDangers(read(file)).map((danger) => `${file}: ${dangerSentence(danger)}`)
    )
}

/** What each kind is said as, to the coder reading the terminal. */
const SAID: Readonly<Record<DangerKind, string>> = {
  'drop-table': 'drops the table',
  'drop-column': 'drops a column of',
  rename: 'renames',
  rebuild: 'rebuilds (copy, drop, rename — a cascade erases what points at it)',
}

/**
 * One danger in a sentence.
 * @param danger - the danger
 * @returns e.g. « down rebuilds (…) place_periods »
 */
export function dangerSentence(danger: MigrationDanger): string {
  return `${danger.direction} ${SAID[danger.kind]} ${danger.table}`
}
