# The management of uncertainty — the principles of a contribution system and of a cartographic representation system (2026-10-19) — DESIGN-262

> The dev, 2026-10-19: *« ce que je veux, c'est avoir un système pour choisir […] des outils qui renvoient
> des résultats avec une jauge de la véracité des résultats […] autant au niveau de la contribution des
> contenus qu'au niveau de la contribution des cartes »* — *« je ne vais pas me retrouver à devoir lire des
> tonnes et des tonnes de choses pour savoir qu'une personne est vassale d'une autre »*. Then: *« ce sont
> des mots qui sont des concepts — incertitude, véracité, concordance. Réécris le plan avec ses principes,
> pour que l'on trouve un système. Un système de contribution et un système de représentation
> cartographique. »*
>
> Then, having read the first version: *« on est en train de créer une machinerie […] on se heurte à un
> système qui a des exceptions. Or, il faudrait que même la gestion de ces exceptions s'inscrive dans la
> machinerie »* — and *« faut-il représenter les vassaux ? »* in the atlas' first version, the atlas being
> *« une coquille réceptrice de la contribution, mais partie intégrante de cette mécanique »*; the answer he
> points to: imprecision, doubt and ignorance shown as **blur and hatching**, which can show vassal zones whose
> belonging is doubtful (§5, §6).
>
> **Built from concepts down, not from features up**: §1 names the concepts, §2 states the principles they
> imply, §3 derives the contribution system, §4 and §5 the unit and what the atlas shows, §6 the representation system. A feature that contradicts a principle is wrong, not
> an exception ([[a-system-not-exceptions]]). Everything here is **proposed** unless the `by` column of §9
> says the dev decided it.

## Why — what the measure of 2026-10-19 showed

Asked for a year's vassals, the open sources answer little and disagree. **Wikidata**: 52 suzerain → vassal
links in 1100, 136 in 1400, about a quarter dated; France in 1400 has 9 vassals, half wrong; undated links
bring anachronisms (the British Raj in 1400); Anjou, Champagne and Blois carry no link to the Kingdom of
France at all. **English Wikipedia infoboxes**: 3 fiefs out of 6 name their lord. **Euratlas** and
**Shepherd 1911** each settle 1400, differently. And vassalage in 1400 is not even a tree: Flanders holds
of France *and* of the Empire.

So the problem is not a missing source. **No source settles the question, and nothing lets us weigh one
against another.** That is what a system has to supply.

## 1. The concepts

Ten words. Each is defined once, here and in `glossaire.md`, and used in no other sense.

| concept | what it is | measurable? |
| --- | --- | --- |
| **véracité** (truth) | whether a claim matches what happened | **no** — the horizon we aim at, never a number on screen |
| **affirmation** (claim) | one statement about the world at a date: *Flanders is a vassal of France in 1400*; *this border runs here* | — the unit everything hangs on |
| **source** | where something is read: a charter, a Shepherd plate, Euratlas read by hand, a Wikidata statement | — |
| **fiabilité** (reliability) | how much a source deserves trust: its **kind** (primary document, historian's atlas, encyclopaedia, crowd database), its distance from the events, its **independence** from the others | weighted, by a rule the dev sets |
| **témoignage** (evidence) | what **one** source says of **one** claim — supports or contradicts — and exactly where | yes, a fact |
| **attestation** | how many **independent** sources support a claim | yes, a count |
| **concordance** | how far a claim's evidence agrees, weighted by reliability | yes, computed |
| **incertitude** (uncertainty) | the distance between what we show and the truth — in **three kinds**, below | named per kind |
| **arbitrage** (the choice) | a contributor keeps one claim among competing ones, **signed and justified** by the evidence that decided it | — an act, recorded |
| **traçabilité** (traceability) | from anything shown, a path back to its sources | yes or no |

**How they hang together**: sources, each with its reliability, give evidence on claims; the evidence
yields an attestation and a concordance; low concordance is one kind of uncertainty; a contributor
arbitrates; traceability keeps the whole chain readable afterwards. **Truth sits outside the chain**:
everything in it is an *indication* of truth, never truth itself.

### The three kinds of uncertainty

The distinction everything else depends on. Each is a different fact about the world, or about us.

| kind | what it says | example | who asserts it |
| --- | --- | --- | --- |
| **imprécision** (vagueness) | the thing itself had no sharp edge | where the Prussians end | the contributor, as a fact of the thing |
| **litige** (dispute) | **history** had several claimants on one ground, or a claim that was not control | a march claimed by two kingdoms; a condominium; a frontier held *de facto* | the contributor, as a historical fact |
| **incertitude de savoir** (epistemic) | **we** do not know: the sources disagree, or are too few | Euratlas says Burgundy, Shepherd says France | **computed** from the evidence |

The first two are claims like any other — and so they can themselves be well or badly attested. A zone can
be disputed *and* well attested; a crisp border can rest on one doubtful source. The third is never typed
in: it is read off the evidence.

Within **litige**, Berman's distinction holds and the format already has it: a claimed jurisdiction is not
an exercised control — `BorderFact`'s `de-facto` beside `agreed` and `contested`.

## 2. The principles

0. **No exception outside the machine** — every case the sources throw at us is a *value* of the model,
   never a special path beside it. A fief with no attested lord is a belonging with low concordance; a
   house holding two fiefs is two bonds; a fief reunited to the crown is a dated change of holder; an
   atlas' grouping is one claim among others. When a case does not fit, the model is wrong, and it is the
   model that changes (the dev, 19/10; [[a-system-not-exceptions]]).
1. **Traceability** — nothing is shown without a path to its sources. A fact with no source is not
   displayed as known; it is displayed as *unsourced*.
2. **Truth is never displayed, only its indications** — the screen says *concordance*, *attestation*, the
   sources; never *vrai*, never a percentage of truth. Three sources copying one mistake agree.
3. **A source counts once** — dependent sources are one witness: a Wikidata statement copied from
   Wikipedia, two atlases drawn from the same plate. Independence is part of reliability, not an afterthought.
4. **Uncertainty is information, not a defect** — it is shown, never smoothed away to make a cleaner map.
5. **A mark says *what* is uncertain; the panel says *why*** — revised 19/10 from the dev's blur-and-hatching
   answer. The reader asks two questions of a map, *where does it end?* and *whose is it?*, so there are two
   marks: **blur** for an uncertain limit, **hatching** for an uncertain belonging. The cause — the thing
   was vague, history was divided, or we do not know — is read in the click panel and the legend. No other
   meaning borrows either mark. (The first version gave each *cause* its own mark: three marks for a
   distinction the reader cannot use at a glance.)
6. **The machine gathers and measures; the contributor arbitrates** — no tool settles a disputed claim on
   its own, however high the concordance.
7. **Disagreement is kept** — the claims not chosen stay stored with their evidence; a reader can see the
   alternatives, a later contributor can reverse the choice.
8. **An arbitration is signed and revisable** — who chose, when, on what evidence. That is what makes a
   contributor's work usable by someone else.
9. **One system for maps and content** — a suzerain, a border's course, an event's date and place are all
   claims, under the same rules.
10. **Geometry is a claim too** — several sources drawing one border can be compared as several witnesses:
    where they agree the line is crisp, where they part it blurs (Angelov's majority map, §7).

## 3. The contribution system — derived

**One cycle, the same for every claim**:

1. **Question** — the contributor asks: *France, 1400 — its direct vassals?*; *Hastings — when?*;
   *this border — where?*
2. **Gathering** — connectors query the sources and return **evidence**, each piece with its source and its
   place in it. REPO-261 is the first connector. The contributor does not search; the tool brings.
3. **Measure** — per claim: its attestation, its concordance, its dependent sources merged (principle 3).
4. **Arbitration** — the contributor sees competing claims side by side, with the measure and the detail
   (*« Euratlas dit ceci, Shepherd dit cela »*), and chooses — or records a **litige** when history itself
   was divided.
5. **Record** — the choice, signed, with the evidence ids; the others kept (principle 7).

**What is stored**: sources (with kind and licence — `YearProvenance` is the start of it); claims; evidence
linking the two; arbitrations. The year format already carries one source per border and per anchor
(`BorderDress.source`, `anchorSource`): that is traceability at one source each, and it stays.

**Where it lives**: the concepts and the measure in `core`, pure and tested with literals — maps and content
share them (principle 9); the connectors in a tool package (REPO-261's question); the surfaces in the
Cartographer (maps) and the contribution tool (content).

## 4. The unit of the map — territory, holder, bond

**The exception that exposed the model** (the dev, 19/10). In France around 1100 some great fiefs are
certain — Aquitaine, Normandy, Toulouse. Champagne and the Orléanais do not fit the polity we defined,
because that polity was zoned after Euratlas, which groups lands by **house** — Blois-Champagne. What
matters is the fief and its bond to the crown — and that Champagne, Berry or the Bourbonnais are reunited
to the royal domain later.

**The cause: our polity merges three things.** Separated, the case stops being an exception (principle 0):

| notion | what it is | example | changes when |
| --- | --- | --- | --- |
| **territoire** (fief) | a land held as one unit | Champagne; Blois; Berry | rarely — the stable unit across years |
| **titulaire** (holder) | the person or house holding it | the house of Blois-Champagne | at an inheritance, a marriage, a confiscation, a reunion to the domain |
| **lien d'hommage** (bond) | the holder, *for this land*, is the man of that lord, at that date | the count of Champagne, for Champagne, of the King of France | dated, and a claim like any other |

Then: Euratlas's grouping is **one claim** (*these two lands share a holder*), not the shape of the file; a
holder with lands under two lords (Flanders: of France and of the Empire) is two bonds, not a contradiction;
a reunion to the royal domain is a dated change of holder. Vassalage is personal — a bond between people
about a land — and the model says so.

**Decided by the dev, 19/10 (§8, point 2): split, territory first, the bond last.** Not small: today's
`YearPolity` is the merged unit, and 137 polities of 1100 are drawn in it — the split is a format change,
to be designed as such, with the migration of 1100. **Severity: worth knowing** — it blocks nothing drawn,
it decides how the next years are drawn.

## 5. Should the atlas show vassals?

The dev's question, 19/10, for the atlas' first version. The atlas is the receiving shell of the
contribution, and part of the machine: it shows what the system knows, **and how well it knows it**.

| | what the reader sees | cost |
| --- | --- | --- |
| **a — sovereigns only** | the kingdoms, crisp; nothing inside | simple and true, but France in 1100 shows a king who held little as if he held it all |
| **b — vassals as today** | every vassal crisp in its colour (ATLAS-253, by zoom) | shows the doubtful as certain — contradicts principle 4 |
| **c — vassals through the machine** | each vassal zone drawn **as well as it is known**: crisp where its bond is attested (Aquitaine, Normandy, Toulouse), **hatched** where its belonging is doubtful, **blurred** where its limit is | needs concordance per bond — the contribution side has to exist first |

**Decided by the dev, 19/10 (§8, point 3): c, reached through a.** The first version shows sovereigns crisp — their existence is the
best-attested fact of the map. Vassal zones enter as their bonds are attested, each with the mark its
concordance earns. Nothing is shown more certain than it is, and the atlas fills in as the contribution
does — which is the machine working, not a degraded mode. ATLAS-253's reveal by zoom stays: it is *when*
a vassal shows, this decides *how*.

## 6. The cartographic representation system — derived

**Two marks, for the two questions a reader asks** (principle 5). What the literature reads as uncertainty —
fuzziness, location, value, arrangement; colour saturation poorly (MacEachren et al. 2012, §7) — fits them:

| what is uncertain | mark | visual variable | used for | state |
| --- | --- | --- | --- | --- |
| **the limit** — where it ends | **blur** | fuzziness | a people's vague edge (ATLAS-258); a border whose sources disagree, the blur as wide as the disagreement (Angelov's confidence band; Euratlas draws its uncertain borders of 1500 the same way) | the tribes **done**; borders proposed |
| **the belonging** — whose it is | **hatching** in the colours of each candidate | arrangement (texture) | a zone two powers claimed (Shepherd's hatching, the dev 19/10); a vassal zone whose bond is doubtful — hatched between its candidate lords, or with the sovereign's colour alone when no lord is attested | proposed — drawn by hand for a dispute, computed from concordance for a doubtful bond |
| **why** — vague, divided, or unknown | the click panel, the legend | — | *« Euratlas dit ceci, Shepherd dit cela »*; a dispute in history; *sans source* | proposed |

Kept beside them: `BorderFact`'s *agreed · de facto · contested* as the border's hand, for the claim/control
distinction. The dev dropped the dashed outline for vague entities, 19/10 — *« inutiles, le flou c'est le
flou »*: a dash was a second mark for the limit. **The legend (ATLAS-136) carries both marks and what
the panel can answer**, or the map is unreadable.

**A disputed zone does not break *two own domains never overlap***: it is a third kind of ring, outside
every own domain, naming two or more claimants — the "second claims layer" `cartographer/06-contribution-
tooling.md` deferred on purpose.

## 7. Reading list — the literature of map representation

> The dev reads; I bring (§8, point 5). **Two grades**: *found* = located and its claim checked this
> session; *from memory* = a standard reference I know of, not yet re-checked — verify the edition before
> citing it. Ordered from the foundations to the case studies.

### The foundations — how a map signifies

- **Jacques Bertin, *Sémiologie graphique*** (1967) — *from memory*. The visual variables (position, size,
  value, texture, colour, orientation, shape) and what each can say. Every table of §6 is in his terms;
  hatching is his *texture*. The book to read first.
- **Alan MacEachren, *How Maps Work: Representation, Visualization, and Design*** (1995) — *from memory*.
  Bertin extended with semiotics and cognition; adds the variables *crispness*, *resolution*, *transparency*
  — the ones uncertainty uses.
- **Mark Monmonier, *How to Lie with Maps*** (1991) — *from memory*. How a map asserts more than it knows:
  principle 4 seen from the other side.

### Representing uncertainty

- **Kinkeldey, MacEachren & Schiewe 2014**, *How to Assess Visual Communication of Uncertainty? A Systematic
  Review of Geospatial Uncertainty Visualisation User Studies*, The Cartographic Journal — *found*. What
  has been tested with readers, and how little: most work proposes techniques, few evaluate them.
  https://repos.hcu-hamburg.de/bitstream/hcu/758/1/How%20to%20Assess%20Visual%20Communication%20of%20Uncertainty%20A%20Systematic%20Review%20of%20Geospatial%20Uncertainty%20Visualisation%20User%20Studies.pdf
- **MacEachren et al. 2012**, *Visual Semiotics & Uncertainty Visualization: An Empirical Study*, IEEE TVCG
  18(12) — a typology of uncertainty and which visual variables read as uncertainty.
  https://geography.wisc.edu/cartography/projects/publications/MacEachrenEtAl_2012_TVCG.pdf — **the ranking
  above is read second-hand** (arXiv 2302.11575), the PDF could not be read here; check it before relying on
  a rank. *Found.*

### Historical GIS — uncertain and disputed territories

- **Ian Gregory, *A Place in History: A Guide to Using GIS in Historical Research*** (2003) — *from memory*.
  The field's introduction: sources, their errors, and what a historical map may claim.
- **Anne Kelly Knowles (ed.), *Past Time, Past Place: GIS for History*** (2002) — *from memory*. Case
  studies; the habit of mapping an argument rather than a fact.
- **Angelov et al. 2015**, *The Professional Geographer* — thirty historical maps of Bulgaria c. 800
  superposed into a **majority map** with bootstrapped confidence boundaries: concordance applied to
  geometry. https://wm.academia.edu/AlexanderAngelov — *found*.
- **Berman**, China Historical GIS — claimed jurisdiction is not exercised control; a historical GIS must
  show competing claims over one ground. https://chgis.fairbank.fas.harvard.edu/work/docs/papers/HG33berman.pdf
  — *found*.
- **Breier**, Austrian Academy of Sciences — some medieval spaces were fuzzy in their own time; an
  uncertainty that cannot be quantified is the hardest to draw. https://dpp.oeaw.ac.at/conference/abstract
  — *found*.

### The feudal bond — what §4 models

- **Georges Duby, *La Société aux XIe et XIIe siècles dans la région mâconnaise*** (1953) — *from memory*.
  The bond between persons about a land, seen in the charters of one region: territory, holder, bond.
- **François-Louis Ganshof, *Qu'est-ce que la féodalité ?*** (1944) — *from memory*. The classical
  definition of homage and fief.
- **Susan Reynolds, *Fiefs and Vassals*** (1994) — *from memory*. The challenge to that definition: the
  feudal pyramid is largely a later construction. **Read it beside Ganshof** — it is the strongest case
  that a clean vassal tree is itself a claim, which is §4's premise.

### Data models

- **Wikidata's data model** — a statement with references, qualifiers and a rank (preferred, normal,
  deprecated): prior art for claim + evidence + arbitration. *From memory*, and visible on any item page.

## 8. The dev's answers, 2026-10-19

1. **The theme is the management of uncertainty** — *« ce n'est pas une question, c'est un thème »*: the
   management of uncertainty, **in the contribution and in the representation of the map projected in the
   atlas shell**. The ten concepts, the three causes and the two marks are its vocabulary, not a choice
   left open.
2. **The nature of the system: territory first, the bond last** (§4, §5). The first tier represents the
   **direct vassals**, and it is modelled as *« territoire — dépendant de quel territoire — le lien en dernier
   lieu : celui à qui appartient un territoire »*:
   1. the **territory** (the fief: Champagne, Blois, Berry);
   2. **which territory it depends on** (Champagne depends on the Kingdom of France) — the direct vassals
      of the first tier;
   3. **the bond, last** — the holder, the one to whom the territory belongs, and his homage.
   This answers the split of the polity: yes, in that order.
3. **Vassals in the atlas: *c* reached through *a*** — the three answers of §5, for the record:
   - **a — sovereigns only**: the kingdoms drawn crisp, nothing inside them. Simple and true, but France in
     1100 shows a king who held little as if he held it all.
   - **b — vassals as today**: every vassal crisp in its own colour, revealed by zoom (ATLAS-253). Shows the
     doubtful as certain.
   - **c — vassals through the machine**: each vassal zone drawn as well as it is known — crisp where its
     bond is attested (Aquitaine, Normandy, Toulouse), **hatched** where its belonging is doubtful,
     **blurred** where its limit is.
   The first version starts at *a*; direct vassals enter as their dependence is attested (point 2), each
   with the mark its concordance earns, until the map is *c*.
4. **Reliability: answer uncertainty, systematically, with sources** — *« pouvoir de manière systématique
   répondre à l'incertitude en donnant des sources »*, and inside the machine, not beside it. The contribution
   has **a place that lists the sources** — the **source register** — where uncertainty is dealt with: every
   source once, with its kind, its licence, its independence; every claim's evidence points into it. The
   order of weight between kinds of source is set there, by the contributor, and stays visible.
5. **Order of work: the machine and the system first** — before CORE-217 and CORE-252. **Grounded on the
   literature of map representation**, which the dev reads: what is *seen* is the shell — the atlas; it is
   built on what is *not* seen — the system, the machine. I bring the references (§7), he reads them; the
   reading list grows with each one brought.

## 9. Decided

| what | by | when |
| --- | --- | --- |
| a system to choose between sources, for maps and content alike, with a gauge | the dev | 2026-10-19 |
| disputed zones hatched in the colours of each claimant, drawn by hand | the dev | 2026-10-19 |
| no dashed outline for vague entities — vague is vague | the dev | 2026-10-19 |
| vague entities drawn with a vanishing edge | the dev | 2026-10-18 |
| no exception outside the machine — even the exceptions are handled by the system | the dev | 2026-10-19 |
| imprecision, doubt and ignorance shown as blur and hatching, able to show doubtful vassal zones | the dev | 2026-10-19 |
| the theme: the management of uncertainty, in the contribution and in the map the atlas shows | the dev | 2026-10-19 |
| the polity split: territory → the territory it depends on → the bond (the holder) last; first tier, direct vassals | the dev | 2026-10-19 |
| vassals in the atlas: *c* reached through *a* | the dev | 2026-10-19 |
| uncertainty answered systematically with sources; a source register in the contribution | the dev | 2026-10-19 |
| the machine and the system before CORE-217 and CORE-252, grounded on the literature of map representation | the dev | 2026-10-19 |
| the gauge named *concordance*, never *truth* | **me — proposed** | 2026-10-19 |
| two marks by *what* is uncertain (blur: the limit; hatching: the belonging), the cause in the panel | **me — proposed**, from the dev's blur-and-hatching | 2026-10-19 |

## 10. Steps — proposed, in dependency order

Each rung is verified and committed alone; each becomes a checklist item on DESIGN-262.

0. **Reading, all along** — the dev reads §7; I bring the references a rung needs before it starts, and the
   representation tables of §6 are revised from what the reading says.
1. **The historical date** (CORE-217) — every claim is dated: a bond *1125–1284*, a dependence *circa 1100*.
   The machine cannot be written before its dates.
2. **The concepts in `core`** — territory, dependence, bond; source, claim, evidence; attestation and
   concordance computed. Pure, tested with literals. — CORE-270; design proposed in `evidence/step-2-concepts-in-core.md` (22/10).
3. **The source register** — the place in the contribution that lists the sources (§8, point 4), first in
   the Cartographer, which is where maps are contributed.
4. **The first connector** (REPO-261) — *a territory, a date → the territories that depend on it*, each
   answer as evidence in the register's terms.
5. **Arbitration in the Cartographer** — a territory's dependence shown with its evidence and its
   concordance; the choice saved, signed, the alternatives kept.
6. **The year format split** — territory → dependence → bond, and the migration of 1100's 137 polities.
7. **The atlas at *a*** — sovereigns crisp; then the direct vassals as their dependence is attested, with
   hatching for a doubtful belonging and blur for an uncertain limit (§5, §6).
8. **The disputed zone** — drawn by hand, a third kind of ring, hatched in each claimant's colours.

Events (CORE-252) follow the machine: an event is one more dated claim with its evidence.
