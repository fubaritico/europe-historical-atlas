# The source manager — enter a resource, check it, ask to use it, without writing a mail by hand

> Opened 2026-11-01, late evening, at the dev's request, after the case of the Rus' maps (SeikoEn's map of 2011 and its two
> copies, one of which he had traced by hand into 1100). His words: *"I need a source or reference manager that is
> responsible, by automation, for sending the mails and handling the refusals or the agreements"* — *"I don't write a
> single mail"* — *"it's professional, what we're doing; it's not a children's game"*. He is alone on the project: what a
> machine can check, it checks; he assembles the maps.
>
> It extends the **source register** already designed and accepted (`payload-check.md`, « The source register », the dev:
> *"that's exactly how I saw it"*), in the CMS (`packages/cms`, collection `Sources.ts`). One base: the CMS and the
> manager are the same application, so a year's sources are picked from the same list the manager keeps.

## What it is for — three jobs

1. **Keep every resource once, related to the others** — an atlas, a plate, a map from Wikipedia, a text — with an
   identifier, and the links that matter: *derived from*, *copy of*, *concerns* (an entity: a polity, a city), *served
   for* (a year). The dev thinks of the data relationally; the manager is that relation, entered once.
2. **Check it by itself** — from an address or a file, fill what can be read (author, licence, date, declared source,
   its family of copies, its history, the dates in its title and legend) and give a verdict: **calquable**, **à lire
   seulement**, or **à vérifier une fois**. A source outside Wikimedia Commons is checked once by a person, then remembered:
   every map derived from it passes without him.
3. **Ask to use it** — for a resource whose rights are reserved, write the request to its rights holder, send it from the
   atlas's own address, receive the answer in the application, and let the agreement or the refusal change what may be
   done with the resource.

## The screens — scenarios, from the user's side

```gherkin
Background:
  Given the CMS open in the dev's browser, signed in
  And the source manager in its menu

Scenario: enter a resource from an address
  When I open « Nouvelle ressource » and paste a Commons address
  Then the form fills by itself: title, author, date, licence, declared source
  And the resource's family is shown: its parents and its copies, already in the base or not
  And a verdict is shown — calquable · à lire seulement · à vérifier une fois — with the one reason that decides it
  And I save, with nothing typed but the address

Scenario: enter a book or a PDF
  When I open « Nouvelle ressource » and choose an atlas from the library, or drop a PDF
  Then the form asks for its rights page — the copyright notice, as printed
  And the verdict is computed from it: « tous droits réservés » gives « à lire seulement »

Scenario: the list of resources
  When I open « Ressources »
  Then I see one line per resource: title, kind, licence, verdict, the years it served, the state of its request
  And I can filter by verdict, by year, by entity, by request state
  And each line has its actions: « Voir », « Relier », « Demander l'exploitation »

Scenario: ask to use a resource
  Given a resource whose verdict is « à lire seulement »
  When I click « Demander l'exploitation »
  Then a mail screen opens, already filled: the rights holder's address, the subject, the text — what we ask for, for which
    regions and years, how it will be credited — in the rights holder's language
  And I send it with one click, from the atlas's address
  And the request shows « envoyée », with its date

Scenario: an answer arrives
  Given a request « envoyée »
  When the rights holder answers
  Then the answer appears in the application's mailbox, filed under that request
  And the request is marked « accord », « refus » or « à lire » — proposed by the tool, confirmed by me
  And on « accord », the resource's verdict becomes « calquable », within what the answer allows
  And with no answer after a delay, a reminder is proposed, already written

Scenario: a year picks its sources
  When I link a year to its sources
  Then I choose them from the manager's list
  And a copy is counted with its original, as one witness
  And the year's credits are written by themselves, in French and in English
```

## How the mailbox works inside Payload

**From the dev's side:**

1. On a resource's page, **« Demander l'exploitation »**.
2. A mail screen, filled from a template: the rights holder's address (from the resource), the subject
   « [Europe Historical Atlas] Demande d'autorisation — <title> — EHA-0042 », the text in the rights holder's language — the
   work, its plates or pages, the regions and years, the **non-profit** use, how it will be credited, the site's address.
   He may edit it, then **« Envoyer »** — **one click, always** (the dev, 2026-11-01: a mail to a publisher leaves the house
   and cannot be taken back; a bad template sent fifty times would cost the credit the atlas's address is meant to carry).
3. The request becomes « envoyée »; the mail is filed under it.
4. A **« Messagerie »** view in the admin: answers arrive by themselves, filed under their request by the reference
   **EHA-0042** in the subject (or the mail's `In-Reply-To` header); one that matches nothing goes to « à classer ».
5. The tool reads the answer and **proposes** « accord » · « refus » · « question » · « accord sous conditions »; the dev
   confirms with one click. An agreement makes the resource calquable, its conditions written on the resource.
6. No answer after a delay: the reminder is already written; the dev sends it with one click.

**Underneath** (checked in Payload 3.92's source, `opensrc/`, 2026-11-01):

- **Sending** — Payload's `email-nodemailer` adapter, over SMTP, through the atlas's OVH mailbox (Zimbra Starter).
- **Receiving** — Payload has nothing for it: a job of its **jobs queue**, run on a schedule (`autoRun`,
  `packages/payload/src/queues/config/types/index.ts:133`), reads the mailbox over IMAP every ten minutes and files the new
  mails in a « Messages » collection. The IMAP library is to choose when it is built.
- **The CMS runs on the dev's machine**: while it is off, the mails wait in the mailbox and nothing is lost; once the CMS
  is online (CMS-228), the job runs all the time.
- **The mailbox's password lives in `packages/cms/.env`**, never in code (`CLAUDE.md`, « Secrets »).

## What it holds — the relations

| record | holds | linked to |
| --- | --- | --- |
| **ressource** | title, author, kind, licence, rights page, address or file, verdict (computed) | derived from · copy of → ressource; concerns → entity; served for → year |
| **ayant droit** | a person or a publisher, its address, its language | holds the rights of → ressource |
| **demande d'exploitation** | what is asked, for which years and regions, its state, its dates | of → ressource; to → ayant droit |
| **message** | a mail sent or received, its text, its attachments | belongs to → demande d'exploitation |
| **source extérieure vérifiée** | a site or a book outside Commons, checked once, and the verdict given | used by → ressource |

## The atlas's mailbox

- **An address in the atlas's name** — `<subject>@europe-historical-atlas.org`, for the requests to carry credit (the dev,
  2026-11-01). The names `.org`, `.com` and `.eu` were free on 2026-11-01 (whois); a domain is paid yearly. The project
  is **non-profit**, and money will be spent to build it (the dev, 2026-11-01) — the non-profit use belongs in every request.
- The application sends through that mailbox and reads its answers (SMTP out, IMAP in); the CMS runs on the dev's machine,
  so the mailbox is read while his server runs. Which provider, and whether it costs nothing: to check when it is built.

## Decided, and by whom

| decision | by |
| --- | --- |
| a source manager inside the CMS, one base with the register | the dev, on my recommendation |
| four screens: entry, list with actions, request as a mail, a mailbox in the application | the dev |
| no mail written by hand: the tool writes, sends, files the answers | the dev |
| **every mail leaves on the dev's click** — the tool writes, the dev sends; the same for a reminder | the dev, 2026-11-01, on my recommendation |
| the mailbox carries the atlas's name | the dev |
| the verdict is computed, never typed; an agreement or a refusal is proposed by the tool, confirmed by the dev | mine — to confirm |
| a copy and its original are one witness | the glossary, `témoin` (CORE-270) |
| when sources disagree (Murom: 1054, 1127, 989/1097), they are shown side by side and the dev arbitrates — never « anachronism » on one source's word | the dev, 2026-11-01, on the case of Murom-Riazan |
| **Commons is trusted**: a map under a free licence on Wikimedia Commons is traced, its whole chain credited, whatever its remote origin. *"If Commons is wrong, it is not us who are wrong — it is not our fault. If we have to redraw, we redraw; we have the tools for it."* | the dev, 2026-11-01 |

## The order to build it in — my recommendation, the dev's to change

1. **The automatic provenance check and its verdict** — from a Commons address: the page, the family, the history, the
   dates, the verdict, the mention. The most gain for the least work: hundreds of maps, each checked by the machine.
2. **The entry and list screens** — the register in Payload, its relations, the year picking its sources.
3. **The request mail** — written by the tool, sent from the atlas's address.
4. **The inbox** — answers read, filed under their request, the verdict changed on an agreement. Last: requests are counted
   by rights holder, a few dozen in all, and answers are rare and slow.

## Open — the dev's to settle

- **The domain**: ordered (see Holes); `.org` the main address, the others pointing to it.
- **A calque under CC BY-SA passes its licence to what is traced** (share-alike): the regions traced from Commons are
  CC BY-SA, while the repository's `LICENSE` reserves the drawn years. How the year's licence reads then — per region, or
  the year as a whole.
- **The Rus' of 1100**: its outlines were reported by hand from SeikoEn's map — a calque, kept under the decision to trust
  Commons; ATLAS-152's line still says « RÉFÉRENCE · géométrie redessinée », to correct.

## Holes

- **How the tool reads an answer** — by keywords (free, fragile on free text) or by an AI model such as Claude (more
  reliable, a few cents a mail). Either way it only proposes; the dev confirms.
- The delay before a reminder is proposed.
- The domain ordered on 2026-11-01 at OVHcloud (`.org`, `.com`, `.eu`, `.net`, `.fr`, five Zimbra Starter mailboxes
  included), order « en cours de validation » that evening — the mailbox to create once it is active.
- The rights holder of a Commons map whose uploader is unreachable.
- The rights page of a downloaded PDF of a recent book: the file grants nothing (`files/resources/Atlases/`, the `epdf.pub`
  copies) — such a book is a reference until its publisher answers.
