---
name: create-data-mention
description: Create the mention of a map or a text the dev used for a year — « crée une mention pour cette carte », « crée une mention pour ce texte ». Ask for its URL first, read its page (author, licence, the source it declares), classify it CALQUE or RÉFÉRENCE, add one line to the year's « Sources de <year> » checklist on its provenance ticket (ATLAS-152 for 1100), and post its attribution text in French and English. Use when the dev says « créer une mention », « une mention pour cette carte / ce texte », gives a map URL, a Wikimedia Commons file, an atlas or a text to cite, « la mention », « à citer », or names the regions a source helped draw.
when_to_use: The dev asks to create a mention from the elements he gives — a map, a text, an atlas — or pastes a source's URL while drawing a year.
allowed-tools: WebFetch Bash(/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/.claude/skills/trello/scripts/trello:*)
metadata:
  author: europe-map
  version: "1.0"
---

# Create a data mention

The dev's call, 2026-10-22: every source used to draw a year is cited, *« même si on se retrouve avec une liste
longue comme le bras »* — taking from an open source means giving back on its terms (*« on ne peut pas fermer la
porte derrière nous »*). The list lives on the year's provenance ticket, **ATLAS-152 for 1100**, not in a file.

## What decides everything: CALQUE or RÉFÉRENCE

| | the dev… | the source's licence | the mention |
| --- | --- | --- | --- |
| **CALQUE** | traces its geometry | **passes to the year**: CC BY-SA makes the year CC BY-SA | « adapté de … — modifications : … » |
| **RÉFÉRENCE** | reads facts on it (who holds what, roughly where), draws his own geometry on the public-domain backdrop | passes nothing | « limites lues sur … » — owed in honesty, not by the licence |

**Never CALQUE**: a source that forbids redistribution (Euratlas), one in copyright (the Duby atlas), and one whose
free licence rests on a redraw of a protected work. **A licence is only as good as the rights of who gave it.**
Facts are free, an author's drawing is not.

**A text** (a book, an article, a Wikipedia page) is a RÉFÉRENCE for the facts read in it; a passage copied word
for word is a **citation**, in quotation marks with its author — never paraphrased into our text unattributed.

## Steps

1. **Ask for what is missing — always the URL first.** Nothing is written without it: no URL, no line. Then the
   year, the regions or polities it served, and whether he traced it or read it. One question, only for what he has
   not said. A guess at CALQUE is never written. A printed book with no URL: its full reference (author, title,
   publisher, year, page) stands in for it, and the line says *sans URL*.
2. **Validate the provenance chain — the dev asked for this step by name (22/10): how I knew is part of the answer.**
   1. **The source's own page** — for Wikimedia Commons, the `File:` page, not the Wikipedia article that shows it
      (`commons.wikimedia.org/wiki/File:<name>`). Note verbatim: **author**, **date**, **licence(s)** with their exact
      names, any permission ticket, and **the source it declares** (*« based on »*, *« after »*, *« original source »*).
   2. **Its history** — the file history (Commons) or the revision history: reverts over the borders mean the
      drawing itself is **contested**. That is an edit war, a fact about reliability — never call it a « litige »
      (a legal dispute) unless a legal one is found.
   3. **One hop up: the declared source** — identify the work (author, title, publisher, year, page) **by a search,
      never from memory**, and its status: in copyright (recent, author living or dead under 70 years) or public
      domain. A free licence over a close copy of a protected work does not free it.
   4. **Grade every fact you give the dev**, in the answer and in the line when it matters — **lu sur la page**
      (with the URL) · **vérifié** (with the URL that confirmed it) · **de mémoire** (not checked: check it or say
      so) · **mon raisonnement** (an inference, e.g. "the uploader could not relicense the atlas" — say that no
      ruling or complaint confirms it). The 22/10 mention carried a publisher from memory; it was right, and only
      the search made it known.
3. **Classify** —
   - the declared source is in copyright and the map copies it closely → **RÉFÉRENCE**, whatever the licence shown;
   - the licence is NC or forbids redistribution → **RÉFÉRENCE**;
   - otherwise what the dev says he did. CALQUE under CC BY-SA → tell him **in the same answer** that the year
     becomes CC BY-SA and allows commercial use of that data (his `LICENSE` reserves the drawn years) — his call.
   - **One witness, not two**: a map redrawn from an atlas counts as that atlas (`evidence-system.md`, principle 3).
     Name both in the line.
4. **Add the line** to the year's checklist (the verb extends a checklist of the same title, never doubles it):

   ```bash
   S=/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/.claude/skills/trello/scripts/trello
   $S checklist ATLAS-152 "Sources de 1100" "<regions> · <author> (<date>), d'après <declared source> · <licence> · RÉFÉRENCE|CALQUE (<why, in a few words>) · <url>"
   ```

5. **Post the mention**, French then English, as a comment on the same ticket — title, author, source, licence
   (Creative Commons' TASL), the URL, and what we changed:

   ```
   Mention — <regions> · RÉFÉRENCE|CALQUE

   fr : <régions> : limites lues sur « <title> », <author> (<date>), d'après <declared source> — <where hosted>, <licence> (<url>). Géométrie redessinée par nos soins[ ; noms revus].

   en : <regions>: limits read from “<title>”, <author> (<date>), after <declared source> — <where hosted>, <licence> (<url>). Geometry redrawn by us[; names revised].
   ```

   For a CALQUE: « Adapté de « <title> », <author> … <licence> — modifications : <what> » / « Adapted from … — changes: … ».
   Italicise a book's title with `*…*`.
6. **Answer the dev** with the mention itself, ready to paste, and the classification in one line with its reason.

## Gotchas

- **The Wikipedia article is not the source's page.** `en.wikipedia.org/wiki/X#/media/File:Y` shows the file; its
  licence and declared source are on `commons.wikimedia.org/wiki/File:Y`.
- **The first such map (Shaddadid.gif, 22/10) was CC BY-SA 3.0 and declared itself redrawn from Hewsen's 2001
  atlas** — a free licence over a copied plate. That is the case this skill exists to catch: read the declared
  source before trusting the licence.
- **A wording from memory is marked so** — a publisher, an edition, a page not read on the page itself is
  written as *de mémoire* in the line, or checked first.
- **Never ticks the line.** A ticked item means *cited where the year is published* — that is ATLAS-152's display,
  not this skill.
- Related: memory `sources-of-a-year-go-in-atlas-152`, `euratlas-data-and-licensing`,
  `duby-atlas-is-a-reference-not-a-tracing-source`; `files/plans/evidence-system.md` (sources, witnesses).
