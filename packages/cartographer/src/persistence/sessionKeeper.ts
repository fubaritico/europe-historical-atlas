import type { SessionOutcome, SessionPort } from './sessionClient'
import type { SessionState, SignInProblem } from '../state/sessionStore'

/**
 * The keeper of the session (CARTO-535): it asks the CMS who is signed in at the opening, signs in and out, and —
 * the dev's wish that a session never interrupts him while he draws — **prolongs the session at a fixed pace while
 * someone is signed in and has made a gesture since the last beat** (Payload's sessions last two hours,
 * `tokenExpiration`). The dev's rule of 2026-11-26 (CARTO-567): *« si une personne est inactive, elle revient, il faut
 * au moins qu'elle se reconnecte »* — two hours without a gesture, the session expires. When the CMS no longer knows
 * it, the editor stays and a dialogue asks to sign in again: nothing drawn is lost.
 *
 * Every outcome that is not a success is said on the console (`rules/error-handling.md`), and shown by the screen the
 * session's state leads to.
 */

/** The session's store, as the keeper reads and writes it — structural, so a test hands a literal. */
export interface SessionSink {
  /** @returns where the session stands, and how to change it */
  getState(): { session: SessionState; setSession: (session: SessionState) => void }
}

/** How the keeper paces the prolonging. */
export interface KeeperTimers {
  /**
   * Run something at a fixed pace.
   * @param run - what to run
   * @param everyMs - the pace, in milliseconds
   * @returns a handle to stop it
   */
  every(run: () => void, everyMs: number): unknown
  /**
   * Stop what {@link every} started.
   * @param handle - its handle
   */
  stop(handle: unknown): void
}

/** What the keeper needs — every collaborator injected, so a test hands literals. */
export interface SessionKeeperDeps {
  /** The dev server's session routes. */
  port: SessionPort
  /** The session's store. */
  store: SessionSink
  /** The pace of the prolonging. */
  timers: KeeperTimers
  /** How often the session is prolonged while someone is signed in, in milliseconds. */
  everyMs: number
  /**
   * Whether the author made a gesture since the last time it was asked — read once per beat, which starts it over.
   * @returns `true` when a gesture was made
   */
  gestured: () => boolean
  /**
   * Show a defect on screen — the dev server answering with nothing readable (the dev, CARTO-535: the user always gets
   * a feedback, the console says more). The composition root opens the error dialogue.
   * @param detail - what was received, for the console
   */
  defect: (detail: string) => void
}

/** The keeper's gestures. */
export interface SessionKeeper {
  /** Ask who is signed in — at the opening, and on « Réessayer ». */
  check: () => Promise<void>
  /**
   * Sign in.
   * @param email - the address
   * @param password - the password, never kept
   */
  signIn: (email: string, password: string) => Promise<void>
  /** Sign out. */
  signOut: () => Promise<void>
  /**
   * The CMS refused the session elsewhere — « Ajouter au CMS » (CARTO-498): as when a beat finds it gone, the editor
   * stays and the dialogue asks to sign in again. Nothing when nobody is signed in, or the dialogue is already up.
   */
  lost: () => void
}

/**
 * Ten minutes: a session left idle runs out between two hours and two hours ten after the last gesture — the beat after
 * it is the last that prolongs (CARTO-567). Six requests an hour while someone works.
 */
export const PROLONG_EVERY_MS = 10 * 60 * 1000

/**
 * The problem an outcome is, if it is one.
 * @param outcome - how a request ended
 * @returns the problem, or `null` for a success or nobody signed in
 */
function problemOf(outcome: SessionOutcome): SignInProblem | null {
  if (outcome.kind === 'offline') return { kind: 'offline' }
  if (outcome.kind === 'refused') return { kind: 'refused', reason: outcome.reason }
  if (outcome.kind === 'broken') return { kind: 'broken' }
  return null
}

/**
 * Say an outcome that is no success: a defect loudly, then on screen — the console has the detail, the screen the
 * sentence (the dev, CARTO-535) — and the CMS absent or refusing on the console, the form showing it.
 * @param outcome - how a request ended
 * @param what - what was attempted, for the console
 * @param defect - shows a defect on screen
 */
function sayOutcome(outcome: SessionOutcome, what: string, defect: (detail: string) => void): void {
  if (outcome.kind === 'broken') {
    console.error(`[Cartographer] ${what}: ${outcome.detail}`)
    defect(outcome.detail)
  } else if (outcome.kind === 'offline' || outcome.kind === 'refused')
    console.warn(`[Cartographer] ${what}: ${outcome.kind}`)
}

/**
 * Where the session stands once a sign-in or a check answered: someone signed in; or nobody, with what went wrong — an
 * expired session keeps its dialogue over the map, with the problem in it.
 * @param now - where it stood
 * @param outcome - how the request ended
 * @returns where it stands
 */
export function settledState(now: SessionState, outcome: SessionOutcome): SessionState {
  if (outcome.kind === 'signedIn') return { kind: 'signedIn', user: outcome.user }
  const problem = problemOf(outcome)
  return now.kind === 'expired' ? { ...now, problem } : { kind: 'signedOut', problem }
}

/**
 * Where the session stands once signing out answered: nobody, whatever it stood at — with what went wrong, so the form
 * says a session the CMS could not close (review SEC-001 of 2026-11-25).
 * @param _now - where it stood, unread
 * @param outcome - how the request ended
 * @returns nobody signed in
 */
function signedOutState(_now: SessionState, outcome: SessionOutcome): SessionState {
  return { kind: 'signedOut', problem: problemOf(outcome) }
}

/**
 * Turn a session someone holds into an expired one — the editor stays, the dialogue asks to sign in again.
 * @param store - the session's store
 * @param why - what found it gone, for the console
 * @returns `true` when it expired now; `false` when nobody was signed in, or it already had
 */
function expireIn(store: SessionSink, why: string): boolean {
  const now = store.getState().session
  if (now.kind !== 'signedIn') return false
  console.warn(`[Cartographer] ${why}: asking to sign in again`)
  store.getState().setSession({ kind: 'expired', user: now.user, problem: null })
  return true
}

/**
 * Prolong the session once, at a beat: kept as it was when the CMS says so; expired when the CMS no longer knows it;
 * said and left for the next beat when the CMS could not answer.
 * @param port - the dev server's session routes
 * @param store - the session's store
 * @param expire - turns the session into an expired one, its loop stopped
 * @param defect - shows a defect on screen
 * @returns `true` when the prolonging did not happen and is still owed — the CMS restarting, a refusal, an answer that
 * cannot be read
 */
async function prolongOnce(
  port: SessionPort,
  store: SessionSink,
  expire: (why: string) => void,
  defect: (detail: string) => void
): Promise<boolean> {
  const outcome = await port.refresh()
  if (outcome.kind === 'signedIn' || store.getState().session.kind !== 'signedIn') return false
  if (outcome.kind === 'signedOut') {
    expire('the CMS no longer knows the session')
    return false
  }
  // The CMS restarting, or a refusal of the dev server: the next beat tries again, the session as it was
  sayOutcome(outcome, 'the session could not be prolonged', defect)
  return true
}

/**
 * Build the keeper.
 * @param deps - the port, the store, the timers and the pace
 * @returns the keeper
 */
export function createSessionKeeper(deps: SessionKeeperDeps): SessionKeeper {
  const { port, store, timers, everyMs, gestured, defect } = deps
  let loop: unknown = null
  const stopProlonging = () => {
    if (loop !== null) timers.stop(loop)
    loop = null
  }
  const expire = (why: string) => {
    if (expireIn(store, why)) stopProlonging()
  }
  // A gesture is owed until a prolonging succeeds: a refresh the CMS could not answer leaves it for the next beat
  // (review QUAL-001 of 2026-11-26), so an author working while the CMS restarts is not cut short
  let owed = false
  const prolong = async () => {
    owed = await prolongOnce(port, store, expire, defect)
  }
  // The newest gesture wins (review QUAL-001 of 2026-11-25): a « Réessayer » answered after a newer sign-in, or a
  // second click, never writes over what a later request settled. The beats are not counted: they re-read the state.
  let latest = 0
  const newest = async (
    what: string,
    ask: () => Promise<SessionOutcome>,
    next: typeof settledState = settledState
  ) => {
    const mine = ++latest
    const outcome = await ask()
    if (mine !== latest) {
      console.warn(
        `[Cartographer] ${what}: its answer came after a newer request, which answers instead`
      )
      return
    }
    sayOutcome(outcome, what, defect)
    stopProlonging()
    store.getState().setSession(next(store.getState().session, outcome))
    // A beat with no gesture since the last lets the session run out: two hours idle, the CMS forgets it (CARTO-567)
    if (outcome.kind === 'signedIn')
      loop = timers.every(() => {
        if (gestured() || owed) void prolong()
      }, everyMs)
  }
  return {
    check: () => newest('asking who is signed in', () => port.who()),
    signIn: (email, password) => newest('signing in', () => port.signIn(email, password)),
    signOut: () => {
      stopProlonging()
      return newest('signing out', () => port.signOut(), signedOutState)
    },
    lost: () => {
      expire('the CMS refused the session to « Ajouter au CMS »')
    },
  }
}
