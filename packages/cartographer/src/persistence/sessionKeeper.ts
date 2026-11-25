import type { SessionOutcome, SessionPort } from './sessionClient'
import type { SessionState, SignInProblem } from '../state/sessionStore'

/**
 * The keeper of the session (CARTO-535): it asks the CMS who is signed in at the opening, signs in and out, and —
 * the dev's wish that a session never interrupts him while he draws — **prolongs the session at a fixed pace while
 * someone is signed in** (Payload's sessions last two hours, `tokenExpiration`). When the CMS no longer knows it, the
 * editor stays and a dialogue asks to sign in again: nothing drawn is lost.
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
}

/** Thirty minutes: well inside Payload's two hours, few requests. */
export const PROLONG_EVERY_MS = 30 * 60 * 1000

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
 * Build the keeper.
 * @param deps - the port, the store, the timers and the pace
 * @returns the keeper
 */
export function createSessionKeeper(deps: SessionKeeperDeps): SessionKeeper {
  const { port, store, timers, everyMs, defect } = deps
  let loop: unknown = null
  const set = (session: SessionState) => {
    store.getState().setSession(session)
  }
  const stopProlonging = () => {
    if (loop !== null) timers.stop(loop)
    loop = null
  }
  const prolong = async () => {
    const outcome = await port.refresh()
    const now = store.getState().session
    if (outcome.kind === 'signedIn' || now.kind !== 'signedIn') return
    if (outcome.kind === 'signedOut') {
      console.warn('[Cartographer] the CMS no longer knows the session: asking to sign in again')
      stopProlonging()
      set({ kind: 'expired', user: now.user, problem: null })
      return
    }
    // The CMS restarting, or a refusal of the dev server: the next beat tries again, the session as it was
    sayOutcome(outcome, 'the session could not be prolonged', defect)
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
    set(next(store.getState().session, outcome))
    if (outcome.kind === 'signedIn') loop = timers.every(() => void prolong(), everyMs)
  }
  return {
    check: () => newest('asking who is signed in', () => port.who()),
    signIn: (email, password) => newest('signing in', () => port.signIn(email, password)),
    signOut: () => {
      stopProlonging()
      return newest('signing out', () => port.signOut(), signedOutState)
    },
  }
}
