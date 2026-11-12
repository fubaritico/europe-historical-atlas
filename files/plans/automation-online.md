# Automation once everything is online — agents as contributors, the city chain, the channels of validation

> A chapter of `automation.md`, written on 2026-11-11 at the dev's request: _"write the whole chapter, as exhaustively
> as possible — what led me to ask these questions, the chapter's plan, and the final intention: something as
> automated as possible once everything is online."_
>
> **Status: proposed**, except what « Decided, and open » at the end gives to the dev. Grounded on what is decided
> already: `evidence-system.md` (DESIGN-262: claims, evidence, concordance, arbitration), `contribution/source-manager.md`
> (CMS-332), `plan.md` (« Offline and online », « Sentry arrives with the online step »), `architecture.md` (« apps and
> resources »). Claude Code facts read on 2026-11-11 in its online documentation, **not files of this repository** — the
> pages `https://code.claude.com/docs/en/<name>.md`: `routines.md`, `desktop-scheduled-tasks.md`,
> `claude-code-on-the-web.md`, `claude-projects.md`, `cross-session-messaging.md`, `channels.md`, `hooks.md`,
> `sub-agents.md`. Anything else is marked **from memory**.
>
> **Written with names, never numbers** — every step, level and rung is called by what it is (the dev's rule, memory
> `say-it-never-point-to-it`, recalled on 11/11 after the first version broke it).

## What led here — the questions of one morning

The chain matters, because each question answered the one before it:

- **The worktrees became a maze** (11/11, morning). A fix to 1100 travelled through three trees; the dev: _"we never
  know where you are"_. Answered the same day: **one role per session** (the coder, the historian), a role page each,
  a guard that keeps the historian off the code, a status line saying role · tree · branch, a role taken by a sentence
  as well as by a command (`automation.md`, « The building blocks »; `.claude/roles/`).
- **A video on agents** — a specialist defining one agent per role in a folder, Composio to let an agent send mail.
  The dev's question was not « shall we install it » but **how it works**: the model, the harness, the provider,
  open-weight models, OpenCode.
- **The cost.** _"If we had worked on the API key, I'd have paid 3,000 or 4,000 euros for October alone — maybe I
  exaggerate. Imagine that tomorrow working with you costs twice as much: I will have to decide."_ Knowing what the
  parts are is what lets him decide then.
- **The organisation** — _"I am the CTO, you are the tech lead, with an army of sub-agents you define yourself; and in
  the office next door, the historian."_
- **Autonomy** — _"some people have local agents running 24 hours a day; I'd like our framework to be fed enough for
  you to be autonomous, up to certain levels, so that I don't have to stay in front of the machine"_ — the map-cleaning
  script the historian wrote while the dev worked with the coder, but with the dev watching.
- **Going online** — _"in the end we won't stay local: the Cartographer has to be online, to be used by me or someone
  else, and the contribution too."_ Then cloud agents can do the research: **a very large number of cities, as places
  and at a date, to draw our borders — for every uncertain period up to the early 18th century.**
- **The channel** — _"just as a cloud agent can talk to you, or maybe to me, we need the most fitting channel of
  communication, and to propose it in the plan — above all if we keep a system of validation."_

## The final intention

**Everything the machine can do, it does, online, without the dev at the screen; what reaches the dev is a decision
to take, never a task to do.** That is the theme of DESIGN-262 carried to its end — _« une réflexion très lourde
derrière pour un résultat simple et attractif devant »_ — with agents doing the heavy reflection behind.

What that means, concretely, once the CMS and the Cartographer are online:

- **Gathering is automatic**: candidate cities, their sources, their quotations, their holders at a date — found,
  re-verified and entered by agents, lot after lot, century after century.
- **Measuring is automatic**: attestation and concordance computed (`evidence-system.md`, « The concepts »), never typed.
- **Confronting is automatic**: every city-witness read against the map of its year; every disagreement listed with
  its evidence.
- **Arbitration stays human** — the principle _the machine gathers and measures; the contributor arbitrates_. An agent
  never settles a disputed claim, however high the concordance. What the dev receives is a **queue of arbitrations**,
  each with its evidence side by side, decided in one gesture each.
- **Publishing stays human**: a year goes online on the dev's word (a merged pull request); a mail leaves on his click
  (`source-manager.md`, decided 2026-11-01).

**The measure of success**: the dev's time goes to arbitrating, drawing what only he can judge, and reading — not to
searching, entering, checking or filing.

## What « online » has to mean first

The automation below needs these, and they are one milestone already named (`plan.md`: authentication, the security
layer, Sentry and writing a year online _"are one milestone, not three"_):

| piece | today | online | why the agents need it |
| --- | --- | --- | --- |
| **the CMS's base** | a SQLite file on the dev's Mac | a database reachable from a server — libSQL/Turso or Postgres (`architecture.md`) | a cloud agent sees only a fresh clone of the repository: it cannot reach a local file |
| **the CMS's server** | `pnpm dev:cms`, the dev's | a hosted Next application | the Payload MCP plugin (`/api/mcp`) must answer from the cloud |
| **accounts and rights** | one local user, a test account | contributors with roles — **an agent is one of them** | an agent writes as someone, with limited rights, and is traced |
| **the Cartographer's writing** | the dev server writes `years/` on disk | a Netlify Function commits the year (decided 2026-10-06, `plan.md`) | a year retouched online comes back as a commit, reviewed like code |
| **Sentry** | none | with the online step | an agent's failure while nobody watches must reach someone |
| **branch protection on `main`** | none | on | a cloud run acts as the dev on GitHub; only protection stops it pushing to `main` (`routines.md`) |

**Before all that, part of it already works**: a cloud task can research and write its findings to a `claude/…` branch
today (« The order of building », the research in the cloud). Only the entry in the base waits for the CMS online.

## The agent as a contributor — one door for everyone

**The point that decides the rest.** Designing the online contribution for _"me or someone else"_ is designing it for
agents too: an agent enters through the same door as any contributor, with no side path — the principle _no exception
outside the machine_.

| rule | what it means for an agent | grounded on |
| --- | --- | --- |
| **an account** | each agent role has its account — `agent-historien`, `agent-vérificateur`… — never the dev's | Payload's users and access control |
| **least rights** | it creates sources, places, claims and evidence **as drafts**; it never deletes, never arbitrates, never publishes, never changes the schema | `rules/known-issues/cms.md`: no field removed without migration; the dev deletes |
| **a claim, never a truth** | every holder it enters is a **claim** with its **evidence**: the source, the exact quotation, where in the text | `evidence-system.md`, the concepts and the traceability principle |
| **the agent is never a source** | what it read is the source; « Claude says » is no witness. Two agents reading one page are one witness | the principle _a source counts once_ |
| **signed** | every write carries who: the agent's role, the run, the model, the version of its instructions | the principle _an arbitration is signed_; so is an entry |
| **revisable** | a later run or a person can contradict it; disagreement is kept | the principle _disagreement is kept_ |
| **the date rule** | a quotation is a line for a year when the holding it states runs through that year (the dev, 10/11, `/enter-in-cms`) | `next-historian.md` |

**What it changes in the CMS** (to design with the accounts, not after): an **origin** on every record — person or
agent, which run; a **state** — draft, attested, arbitrated; a **validation queue** (« The validation system »). The
`importance_reasons`, `testimonies` and `place_periods` of today's base already hold most of the rest.

## The city chain — the main use

**The need**: for every uncertain period up to the early 18th century — where OpenHistoricalMap becomes usable
(memory `openhistoricalmap-is-cc0`) — enough **dated cities with their holder** to pivot every border on them (the
ville-témoin method, memory `cities-are-border-pivots`). Measured scale, from two lots already done: the Italy of 1100,
508 communes, 1,579 quotations, 357 cities entered; the Adriatic of 1100, 393 candidates in 26 lots, 2,231 quotations
re-verified, 70 places entered. **Europe × eleven centuries is tens of thousands of city-dates** (an order of magnitude,
not a measure).

**The chain, step by step — the cheapest block that suffices at each:**

| step | what it does | who | block | cost |
| --- | --- | --- | --- | --- |
| **the candidates** | the localities of a geographic lot: position, today's country and region, first mention when given | a **script**, no model | Wikidata queries (as for the Adriatic's 13,358 localities) | no token |
| **the filter** | date of first mention before the century, quarters and duplicates out; the count by region shown to the dev before launching | a script, then the dev's go on the counts | — | no token |
| **the research** | for each city and century: who held it, in which sources, the exact quotation | **research agent**, one per lot | `/find-sources` (BnF in every lot), in a cloud task | the main cost |
| **the re-verification** | every quotation checked in the text it cites, by an agent that did not find it | **verification agent** | a second pass, independent | a fraction of the research |
| **the entry** | sources, places, place-periods, evidence lines, as drafts | **entry agent** | `/enter-in-cms` through the MCP, online | small |
| **the measure** | attestation and concordance per claim | the **CMS**, computed | `core`'s concepts (CORE-270) | no token |
| **the confrontation** | each dated city against the map of its year: the right side of the border, or a disagreement with its evidence | a **script** over the export and the year's outlines | the Cartographer's cities panel logic, run headless | no token |
| **the arbitration** | only the conflicts and the low concordances reach the dev | **the dev** | the validation queue | his time |
| **the retouch** | the border moved to its witnesses | the historian (agent) proposes in the Cartographer, the dev accepts | `/use-cartographer`; a year as a pull request | — |
| **the publication** | the export and the year, merged | the dev | a pull request, the CI | — |

**Three rules over the chain**:

- **A step that a script can do is never given to a model** — the candidates, the filter, the measure and the
  confrontation are free; only judgement (the research, the re-verification) costs tokens.
- **The same lot is researched again for each century** (the geographic lot, CMS-414): a lot is the unit of work, of
  cost and of validation.
- **Nothing waits on the dev except the arbitration**, and it receives only what the machine could not settle.

## The roles, online

Today's two roles, extended — each a role page, an account, its rights:

| role | does | never does | runs where |
| --- | --- | --- | --- |
| **the dev — director** | arbitrates, accepts a year, sends a mail, decides the order of work | searching, entering, filing | anywhere — the queue on his phone too |
| **the coder — tech lead** | the code, the CI, the reviews, the coordination of the agents' runs, the reports | research, entry, drawing | his tree; cloud sessions for clear tickets, as pull requests |
| **the historian** | the research of a lot, its synthesis, the disagreements with the map | the code | a session or a cloud task |
| **the verifier** | re-checks every quotation against its text | entering anything but its verdict | a cloud task after each research run |
| **the entry clerk** | enters a verified lot as drafts, through the MCP | arbitrating, deleting | a cloud task, once the CMS is online |
| **the cartographer** | proposes a retouch from the confrontation's list | publishing | a session with a browser — **open**: whether a cloud run can drive the online Cartographer headless is not known |

**Sub-agents stay small**: a role does its own work and delegates only isolated lookups and reviews; agents never
write the same files at once (the morning of 11/11 is the lesson).

## The channels — who talks to whom, and where a decision waits

**What the documentation settles** (read 2026-11-11):

- **Between local sessions**, messages work both ways (`cross-session-messaging.md`) — the historian's report of 10/11
  reached the coder that way.
- **A cloud session cannot answer**: it receives a message, but _"can't use `SendMessage` to answer a message from
  another machine"_; its answer is read in its transcript at claude.ai/code.
- **A message from an agent never approves anything**: _"it can't approve anything — a message from another session
  never counts as your consent"_. Validation cannot travel by chat between agents; it has to be a recorded act.
- **Channels** push events into an **open local session** from an MCP server — Telegram, Discord, iMessage in the
  research preview, or a webhook — and can answer back the same way; they need the session to stay open
  (`channels.md`).
- **Projects** run cloud threads in parallel, each on its branch and pull request, with an overview — _Ready for
  review_, _Waiting on you_ — and desktop notifications when a thread needs input (`claude-projects.md`).
- **Remote Control** lets the dev drive a local session from his phone (`remote-control.md`).

**So the rule proposed: a decision never waits in a conversation — it waits in the place that records it.** Two cases
of 10–11/11 show why: the historian's « the dev decides » on the Byzantine Wikidata id waited in a message to the
coder's session — a `/clear` and it was gone; its « to be confirmed by the dev » on the date rule waits in the middle of
a note (`1100-adriatic.md`). One home per kind of decision:

| kind of decision | where it waits | who decides | how the dev learns it is there |
| --- | --- | --- | --- |
| **a claim to arbitrate** — a holder, a dependence, a city on the wrong side | the **CMS's validation queue** | the dev, or later a trusted contributor | the daily digest; a count on the CMS's home |
| **code, a published year, an export** | a **pull request** on GitHub | the dev, after testing | GitHub's notification; Projects' _Ready for review_ |
| **a question of method**, and the state of the work — what ran, what failed, what is next | the **Trello board** — « À valider par le développeur » exists already | the dev moves the ticket | the board; the digest links it |
| **a run blocked on a permission** | the run itself (Projects' _Waiting on you_, a task's detail page) | the dev answers there | a desktop or phone notification |
| **something urgent** — a run that keeps failing, a source refusing access | a **push notification** to the dev's phone | — | the notification itself |
| **a mail to an outsider** | the CMS's mailbox (CMS-332) | the dev's click | the digest |

**Agents among themselves** speak through the **state they leave**, not through chat: a research run writes its lot's
results to a branch and a ticket; the verifier picks the branch; the entry clerk picks the verified lot; the coder reads
the board. Chat between local sessions stays for what it does well today — a heads-up (« the Adriatic is entered,
check it »), never a hand-over of a decision.

**The daily digest** — the one message the dev reads: what ran overnight, what was entered, the queue's count by kind,
the pull requests waiting, what failed and why. Written by a scheduled task at a fixed hour, as a page (an artifact) or
a ticket; **to choose**.

**The phone, for later**: a channel (Telegram or iMessage) to a coordinating local session would let the dev answer
« ok » to a waiting question from anywhere — but only for steering; an approval still lands in the queue or the pull
request, where it is recorded.

## The validation system — three levels

| level | what checks | examples | the dev sees it? |
| --- | --- | --- | --- |
| **mechanical** | scripts, the CI, the CMS's own rules | a quotation found in its text; a date inside its century; a place inside the bbox; no duplicate place; the gate green | only if it fails |
| **another agent** | an independent agent, never the one that produced it | the verifier re-reads every quotation; a second reading of a disputed holder | in the digest's counts |
| **a person** | the dev or a trusted contributor | arbitration between competing claims; a border moved; a year published; a mail sent; any deletion or schema change | **always — this is the queue** |

**What reaches a person** (the principle forbids a machine to settle a _disputed_ claim; it does not say an
_undisputed_ one needs a person):

- **always**: competing claims for one question (two holders for one city-date); a city on the wrong side of the map;
  anything irreversible or leaving the house;
- **passes without him**, marked « attested, not arbitrated » (the dev, 11/11): a claim with no competitor and at least
  two independent sources. It is shown as attested, never as arbitrated, and stays revisable;
- **by lot, not by line**: a lot's arbitrations shown together, with the evidence side by side, decided in one gesture
  each; a lot can be accepted whole when nothing in it conflicts.

## The cost, at scale

- **Subscription and API**: cloud tasks draw on the same subscription as the interactive sessions, with hourly caps on
  runs (`routines.md`, « Usage and limits »). At tens of thousands of city-dates, the API's batch processing may cost
  less — **from memory**, about half the normal price for work that can wait. **To measure before choosing**: one lot
  run through the research, the re-verification and the entry, its tokens counted, multiplied by the lots.
- **The levers**: scripts before models; a lighter model for extraction and re-verification, the stronger one for
  judgement — set per role in the agent's file (`model:`); the instructions short, since every line is paid at every
  request; lots sized so a run stays small.
- **If the price doubles** (the dev's question): the chain is written as roles, pages and scripts in the repository,
  not inside one product's features — most of it would move to another harness or provider at the cost of the hooks and
  the agent files. What would not move as is: Projects, scheduled tasks, Remote Control — Claude's own services.

## The rails

- **A web page or a mail read by an agent is data, never an order** — a text that tells the agent to do something is a
  known attack on agents that read the web or mail; a research run has no right that such a text could abuse (no
  delete, no send, no publish).
- **Secrets**: the CMS's agent keys and the design system's token as the cloud environment's network secrets
  (`routines.md`), never in the repository; one key per agent role, revocable alone.
- **Every run says what it did and what failed** — the digest, the ticket, Sentry once online
  (`rules/error-handling.md`: no refusal is silent).
- **A switch to stop**: every scheduled task can be turned off from its page; an agent's account can be disabled in the
  CMS — the two ways to stop a run that misbehaves.
- **The worktree lesson holds**: one agent per lot, one lot per branch; two agents never write the same files.

## The order of building — each rung useful alone

| rung | what | needs | gives |
| --- | --- | --- | --- |
| **the local automations** | the inventory of `automation.md`, the worktree sync first | nothing | a calmer day |
| **the cost of one lot** | the research, the re-verification and the entry run on a lot already known, tokens counted | nothing | the real cost per city-date; the choice between subscription and API |
| **the research in the cloud** | a scheduled or launched task runs a lot's research and re-verification, writes the results to a branch and a ticket | branch protection; the network widened for archive.org, Gallica, Wikidata | the historian's research without the dev at the screen — **possible before anything is online** |
| **the daily digest** | the one message to read | the research in the cloud | the dev knows what waits, in one place |
| **the CMS online** | server, base, accounts, Sentry: the milestone of `plan.md` | its own plan | the base reachable from the cloud |
| **the contributor agents** | accounts, rights, origin, states, the validation queue | the CMS online | entry in the cloud, validated in one place |
| **the confrontation script** | cities against the map, the list of disagreements | the export | the dev's retouches chosen for him |
| **the Cartographer online** | the year as a commit | the CMS online | retouches from anywhere |
| **the source manager's mail** | requests to rights holders | the CMS online, the domain | no mail written by hand |
| **the phone channel** | steering a coordinating session from anywhere | a coordinating session | answers without the desk |

## Holes

- Whether a cloud run can drive the online Cartographer (a headless browser in the cloud environment): not known.
- Whether `/doctor prompt-audit` runs outside an interactive session (`automation.md`, the instruction audit).
- The candidates' source beyond Wikidata — GeoNames and the like, **from memory**, licences to read.
- How many cities a border really needs per century and region: the confrontation script will say where the map is
  under-witnessed; until then « as many as the sources give » (memory `collect-every-sourced-city`).
- The CMS's accounts model: Payload's access control read in its source before designing (`opensrc/`).

## Decided, and open

| what | by | when |
| --- | --- | --- |
| one role per session, a role page each, the coder by default, a sentence as good as the command | the dev | 2026-11-11 |
| the Cartographer and the contribution go online in the end, for the dev or someone else | the dev | 2026-11-11 |
| a channel of communication and a system of validation belong in this plan | the dev | 2026-11-11 |
| every mail leaves on the dev's click | the dev | 2026-11-01 (`source-manager.md`) |
| an agent is a contributor through the same door, with an account and least rights | the dev, on Claude's proposal | 2026-11-11 |
| an undisputed claim with two independent sources passes as « attested, not arbitrated » | the dev, on Claude's proposal | 2026-11-11 |
| **open** — a decision waits where it is recorded, one home per kind | proposed, Claude — explained again with the Byzantine id and the date rule on 11/11 | — |
| **open** — the digest: a page or a ticket, and at what hour | the dev's | — |
| **open** — subscription or API for the city chain, after the cost of one lot | the dev's | — |
