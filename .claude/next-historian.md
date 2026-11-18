# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, _« en tant
> qu'historien »_); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/trello`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

**À faire dès qu'il a fini ses retouches de 1100** (sa demande, 13/11 : _« il ne faut pas qu'on se retrouve pollué par
plein de trucs »_) : effacer `files/resources/historien/1100/1100-retouches.md`, son document de lecture des sept retouches. Les notes
de `files/plans/sources/1100/` (kosovo, france-empire, lusatia) restent : ce sont la trace des sources.

## ▶ ON REPREND ICI — 18/11, 19 h 50 : les villages d'Allemagne de l'Ouest finis, le disque rangé, la méthode écrite

**Fait le 18/11** (détail : `completed.md`) : **1 871 villages d'Allemagne de l'Ouest en 1100** (tri et saisie par 8 agents,
son accord), tous contrôlés ; 13 562 villes en 1100, 65 alertes. Le disque rangé et vidé de ses copies (`historien/LISEZ-MOI.md`) ;
la méthode : la skill `/bulk-entry`, la règle dans `.claude/roles/historian.md`. Le travail du lot reste en exemple :
`files/resources/historien/1100/regions/germany-west-1100-research/lot-v/` (vagues 1 à 4, verdicts).

**Ce qui l'attend, lui** (une question à la fois) :

1. **La Finlande** : trois terres sans souverain avec leurs lieux, comme les Livoniens, ou sans pays comme aujourd'hui.
2. **Un export** (par lui ou le codeur) : les villages saisis après l'export de l'après-midi du 18/11 n'y sont pas.

**À supprimer par moi dès que je le peux** (sa règle du 18/11 : je défais mes erreurs, jamais lui ; le droit de supprimer
par le MCP est demandé au codeur le 18/11) : **Ohligs**, la fiche 11749, son lieu et sa source — la phrase prouve le
hameau de Barl, pas Ohligs.

**Ensuite, de mon côté** : **la Russie**, le troisième point de sa commande, pas commencée — par `/bulk-entry` (les villes de
la Rus' attestées avant 1105 ; d'abord vérifier les titres de 1100 des principautés dans la base). **Au début de la
prochaine session** : ranger avec lui l'index de la mémoire (162 lignes ; le crochet en demande moins de 140).

## ▶ 18/11, 02 h 10 (dépassé) : sa commande de la nuit, deux points faits, la Russie pas commencée

**Sa commande du 17/11 au soir, dans son ordre** : (1) la Finlande, le topo de ce qu'elle était avant les Suédois ;
(2) plus de villes en Allemagne de l'Ouest (_« un net contraste entre la densité des villes en France et celles des duchés
de Basse et Haute-Lorraine, la Souabe, la Franconie, un peu la Saxe »_), son seuil du 16/11 : au moins 200 points ;
(3) un peu de Russie. Son critère : tout lieu qu'une source atteste à la date, villages compris (mémoire
`longevity-not-population`).

**Ses deux réponses attendues** (une question à la fois, la première d'abord) :

1. **Combien d'agents de saisie** pour les ~2 300 villages d'Allemagne de l'Ouest à date nette ≤ 1105
   (`files/resources/historien/1100/regions/germany-west-1100-research/sel1.json`) — sans son nombre, aucun agent.
2. **La Finlande** : dessiner trois terres sans souverain (Tavastiens, Finnois proprement dits, Caréliens) avec leurs lieux,
   comme les Livoniens, ou la laisser sans pays comme aujourd'hui.

**Fait cette nuit** (rien de commité) :

- **La Finlande, le topo** : `files/plans/sources/1100/finland-topo.md` — lus : la Chronique de Novgorod (trad. 1914,
  texte numérisé, les années à vérifier sur l'image), Ohthere, Gs 13 (Rundata), Lind 2004 (_Fennia_). Rien à saisir : aucun
  lieu attesté avant 1105 par une source lue, aucun souverain. **À lire** : Korpela 2008 (`elibrary.petrsu.ru/books/show/23587`),
  Adam de Brême (dMGH), la datation des forteresses tavastiennes (Rapola, Hakoinen, Tenhola), la BnF, Gallica, JSTOR. **Pour
  sa carte** : l'isthme de Carélie est dessiné sous Novgorod ; Lind dit « vaguement lié, plutôt indépendant » en 1143.
- **Allemagne de l'Ouest, 101 → 192** : 48 forteresses (raison 7) et 43 abbayes et stifts (raison 9), lieux 11614–11704,
  fiches 11632–11722, sources 3415–3505 ; la citation est la phrase de la page allemande qui date le lieu avant 1106 ; le
  détenteur, le titre de 1100 du duché dessiné dessous. Contrôlés par `verify.py` et par le codeur (lecture seule) ;
  `cities:alerts` : 65 alertes sur 11 691, aucune nouvelle. Ehrenbreitstein écarté (1,4 km de Coblence) ; Zwiefalten sans
  région (Wikidata n'en donne pas).

**Reste, dans l'ordre** : 8 lieux pour les 200 — Maria Laach, Comburg, Hirsau et d'autres sièges dont la page ne donne pas
de phrase de fondation (une passe `/find-sources`) ; puis **la Russie**, pas commencée (les villes de la Rus' attestées
avant 1105 : la Chronique des temps passés, les titres de 1100 des principautés à vérifier dans la base d'abord).

**Les outils des lots** (`files/resources/historien/1100/regions/germany-west-1100-research/`) : `lot-gN/build.py` (les phrases par un repère
choisi à la main, les noms et le pays par QLever, le pays dessiné par `cities-1100-night-1117/under.mts`) → `mk.py lot-gN`
(le titre détenteur, `enter-gN.json`) → la saisie par paquets de dix → **`verify.py lot-gN <raison>` après chaque paquet** (il
a rattrapé deux citations que j'avais mal recopiées). Un candidat à moins de 1,5 km d'un lieu déjà saisi est écarté (un seul
signe par lieu). Wikipédia répond 429 : attendre et réessayer, ne jamais réutiliser la réponse précédente.

**Le CMS** : lancé par moi le 17/11 à 21 h 21 sur son ordre explicite, détaché de ma session
(`files/resources/historien/outils/start-cms.sh`, journal `/private/tmp/claude-501/cms-dev.log`) ; il tourne tant que personne ne l'arrête.
Le lancer exige son ordre en toutes lettres (détail : `rules/known-issues/cms.md`). **Agents** : son nombre, à chaque
nouvelle région.

**Mes règles apprises le 17/11** : (a) les listes et scripts d'une longue saisie vivent dans `files/resources/<lot>/`,
jamais dans le dossier temporaire, et le point de reprise s'écrit **avant** une vague d'agents ; (b) toute valeur recopiée
à la main (par un agent ou par moi) passe le contrôle par script contre le lot ; (c) une mise à jour groupée du MCP
(`where` par tranche d'identifiants, 450 lieux) passe sur `places` ; `select: {"id": true}` pour une réponse courte ;
(d) le dossier temporaire se vide à la fin de chaque essai (mémoire `clean-up-after-every-trial`).

**Les sections du 16/11 au 10/11** (les chaînes de 1100, les alertes, la Pologne, l'est de l'Allemagne, les détenteurs
faux, les villes sans titre) sont dans `archive/next-history.md`, « Archivé de next-historian.md le 18/11 » — à relire
pour leurs restes ouverts.

## ▶ 17/11, 17 h : l'Angleterre du Domesday est entrée (11 579 villes en 1100, 44 en alerte)

**Fini le 17/11 à 17 h** : les 2 609 villages saisis par huit agents (~340 000 jetons chacun, une demi-heure), contrôlés
par `mklots.py verify` (2 609 exacts, une citation corrigée, Downinney) ; `cities:alerts` : 44 alertes sur 11 579,
aucune anglaise ; codeur prévenu. **Puis les 21 villages de la frontière galloise** (fiches 11611–11631) : sous le comte
de Chester (titre 394, Lloyd 1912, source 3413) et, pour Forden, de Shrewsbury (titre 395), tous deux → le roi (maillons
280, 281) ; **11 600 villes, 65 alertes** — ces 21 en alerte parce que la carte les dessine sous le Gwynedd et le Powys :
à lui (détail : `files/plans/sources/1100/villes-et-sites-nuit-2026-11-17.md`). **Le pays et la région d'aujourd'hui
des lieux anglais : faits** (sa demande, 17/11 au soir, _« faut finir le travail qui a été commencé »_) — lus sur
Wikidata par QLever avec la règle du CMS (`lots.py`), écrits par `updatePlaces` groupé (`where` par tranches
d'identifiants, 450 à la fois, une tranche après l'autre : aucune erreur) ; 8 309 Angleterre, 37 pays de Galles, 11 sans
région, 2 laissés vides (9457 : deux pays ; 10254 : rien). **Reste** : ~1 550 autres lieux sans pays (la nuit du 16/11,
~1 400 plus anciens) — pas demandé ; puis ses autres régions. **Export fait par le codeur le 17/11 à 19 h 30**
(`79de18d5`, poussé) : 11 600 fiches, 116 affichées dans l'atlas. Ce soir-là le CMS tourne comme processus de la session
du codeur (relancé à sa demande) : s'il ne répond plus à la reprise, c'est à lui de le relancer. Second témoin de la
frontière galloise trouvé et saisi (cartulaire de Sainte-Werburge, source 3414, sur le titre 394). CMS-468 fait par le
codeur le 17/11 au soir (Next 16.4.6, kit MCP 1.32.0) : le MCP `cms` répond, vérifié.

## ▶ 17/11, après-midi : le déroulé de la saisie du Domesday

**Le matin du 17/11** (une session coupée à 12 h 41 par un disque plein, son dossier temporaire effacé, rien d'écrit
ici) : sa règle _« la durée dans le temps, pas la population »_ (mémoire `longevity-not-population`) — tous les lieux
du Domesday Book, villages compris. 5 729 lieux anglais saisis (fiches 3121 → 9001) : source 3260 (Open Domesday),
une ligne « importance » dont la citation est la première phrase de la page du lieu, `where` = l'adresse de la page,
détenteur = titre 122 (Guillaume le Roux, royaume d'Angleterre). Plus ~150 lieux grecs (sources 3261 et suivantes).
**L'après-midi** : la liste refaite dans `files/resources/historien/1100/passes/domesday-1100/` (ignoré par git) — `q-dom.rq` (Wikidata par
QLever, propriété P3118), `domfetch.py` (la phrase de chaque page), `under.json` (le pays dessiné sous chaque point),
`mklots.py build 8` puis **`mklots.py verify`** (la base contre les lots, en lecture seule). Huit agents de saisie
(Sonnet, son accord : « continue comme ça ») sur `enter-d5a…h.json`, 2 609 villages. **À faire quand ils ont fini** :
`verify`, corriger par `update` les citations mal recopiées (une sur 500 le matin — renvoyer la ligne entière), puis
`pnpm cities:alerts --map 1100`, puis prévenir le codeur (les lieux anglais n'ont ni pays ni région d'aujourd'hui).
**Mis de côté** (`aside.json`) : 21 villages dessinés sous le Gwynedd (Rhuddlan, Bodfari, Prestatyn, Dyserth…) et le
Powys (Hawarden, Hope, Gresford, Pulford…) — aucun titre de 1100 pour ces deux royaumes dans la base : à rechercher
(qui tenait le Tegeingl en 1100), puis saisir. ~1 400 éléments Wikidata « … Manor » sans coordonnées, laissés.

## ▶ 17/11, nuit : ~1 370 lieux de plus en 1100 (villes, forteresses, abbayes)

**Fait** (détail, méthode, ce qui reste : `files/plans/sources/1100/villes-et-sites-nuit-2026-11-17.md`, non commité) :
villes de Bosker-Buringh (France, Espagne, Est), forteresses et abbayes de France et d'Espagne, villes et monastères de
l'Est (Turquie, Pologne, Grèce, Rus'), communes notables de France et d'Espagne — chacune attestée avant 1105 par une
phrase de sa page, détenteur = titre 1100 du pays dessiné. Raison « abbaye ou monastère » créée (n° 9). Codeur prévenu.
**Reste** : ~400 lieux « non tranchés » (la page ne date rien) pour une seconde passe `/find-sources` ; les Baléares
dessinées « Taifa of Dénia » (Mahón en alerte) — à lui ; le pipeline de la nuit (QLever, wikitext par 50, texte rendu
par l'API REST, agents de tri puis de saisie, contrôle par script) est copié dans
`files/resources/historien/1100/passes/cities-1100-night-1117/` (scripts, verdicts, lots ; les pages téléchargées non gardées).

## Les cartes — l'épique CARTO-400 (les vingt cartes de base)

| année      | où                                                                      | état                          | ce qui lui reste (le détail sur son ticket)                                              |
| ---------- | ----------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1000       | worktree `years/1000` (+ une copie non commitée dans l'arbre de `main`) | générée, build OK — CARTO-403 | Grande-Bretagne, Irlande, Sardaigne ; Bouyides et Danemark (grosses reprises) ; 6 côtes  |
| 1100, 1200 | `main`, publiées                                                        | les siennes                   | —                                                                                        |
| 1300       | `main`, publiée (`3c9e335`)                                             | retouchée par lui             | provenance ATLAS-408 : version Cliopatria v0.2.1 et article (Bennett et al. 2025) donnés |
| 1400       | worktree `years/1400`                                                   | générée, build OK — CARTO-404 | 6 îles partagées ; 5 grosses reprises ; 7 côtes                                          |
| 1500       | worktree `years/1500`                                                   | générée, build OK — CARTO-405 | Grande-Bretagne ; khanat de Crimée ; Naples, Raguse                                      |
| 1600       | worktree `years/1600`                                                   | générée, build OK — CARTO-406 | Grande-Bretagne et Irlande ; Danemark-Norvège, Crimée ; 53 pays seulement avec Wikidata  |

**Sa décision (09/11)** : 1000, 1400, 1500, 1600 (et 1700) **ne se commitent pas** tant que lui et moi ne les avons pas
finies de nettoyer ; aucune ne se copie dans `main` avant son mot. L'index du worktree liste les sept (pour le build),
jamais commité.

**La course d'une carte** (≈ 25–40 min de gestes) : l'import (`files/spikes/cliopatria-import/` : `resolve.py` puis
`convert.ts`), puis les six passes de `/use-cartographer` (« The order of work »). **Le chef d'orchestre des passes**
est `files/maps/pipeline/plan.mjs` + `plan.sh` dans le worktree (git-ignorés) — **une dette** : à faire entrer dans la
skill, avec ses tests. Les plans et registres de chaque année : `files/maps/<année>/` du worktree. Il faut recréer à
chaque session : un venv Python avec `shapely`, `pypdf`, `pillow` dans le scratchpad, et la base de Cliopatria
dézippée depuis `opensrc/repos/github.com/Seshat-Global-History-Databank/cliopatria/cliopatria.geojson.zip`.

**1700 et après** : OpenHistoricalMap (CC0), `files/spikes/fetch-ohm/fetch-ohm.mjs` — pas encore au format d'une année
du Cartographe.

## Les sources

- **La méthode** : `/use-cartographer` `references/layers.md` (la couche de base, les calques de vérification, les
  villes, la mention) ; `/find-sources` (neutre — toutes les hypothèses suivies ; l'index des livres, récursif, sur
  archive.org, JSTOR, la BnF).
- **Les scans d'atlas** : la recette est `find-sources/references/scanning.md` (VueScan, 300 dpi, feuille noire). Il
  scanne sur un disque externe en **exFAT** (nom à me donner) ; le premier atlas, _Les Balkans, atlas historique_
  (Hupchick, Cox), a 12 pages dans `/Volumes/mùùùmù/ATLAS-BOOKS/2026-11-10-0001.pdf`. Plusieurs séances = plusieurs
  PDF, que j'assemble avec `pypdf` (les originaux gardés).
- **Shepherd** (1911/1923) est un calque comme Cliopatria (sa décision, ATLAS-153).

## Ouvert, à sa décision

- **La règle d'arrêt de la recherche récursive** (ma proposition, « à confirmer » dans `/find-sources`).
- **Le registre des couleurs** tiré de sa 1100 (un pays garde sa couleur ; un vassal prend celle de son suzerain ; un
  successeur hérite) — proposé, pas lancé.
- **Les lacs partagés entre un pays et une terre sans maître** : le geste des lacs coupés, pas celui de l'île.
- **ATLAS-410** (dans Idées) : les frontières de chaque année publiées en traits, sous CC BY-SA.
