# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, _« en tant
> qu'historien »_); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/jira`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

**À faire dès qu'il a fini ses retouches de 1100** (sa demande, 13/11 : _« il ne faut pas qu'on se retrouve pollué par
plein de trucs »_) : effacer `/Volumes/Acer/atlas-historien/1100/toutes-zones/travail/1100-retouches.md`, son document de lecture des sept retouches. Les notes
de `/Volumes/Acer/atlas-historien/1100/` (kosovo, france-empire, lusatia) restent : ce sont la trace des sources.

## ▶ ON REPREND ICI — après le redémarrage du 27/11, 17 h 35

**Au départ** : Acer vérifié (`diskutil verifyVolume`) et la base de l'oracle (`PRAGMA quick_check` sur
`oracle-data/oracle.sqlite`), puis `pnpm oracle:start` (le crochet le fait aussi) ; le serveur du CMS relancé
(`/Volumes/Acer/atlas-historien/outils/start-cms.sh`, détaché) — le prévenir au codeur. Puis **réindexer l'oracle** :
les livres rangés par CARTO-578 et 579 ne le sont pas (`catalog build`, `index build`, `embed`, Node 24).

**Avec lui, d'abord** : **CARTO-580**, la retouche de 1200 — Cracovie en premier (Leszek le Blanc, pas Mieszko III :
`1200/toutes-zones/resultats/note-de-region.md`, « À faire au matin ») ; la page
`1200/toutes-zones/resultats/vassaux-directs.md`. Puis **CARTO-581**, la retouche de 1300. **Sa règle (27/11)** : la carte
de Cliopatria est un premier jet (les tracés, les Wikidata) ; les données et les recherches complètes d'abord.

**1300, ce qui reste** (épique CARTO-572 ; sept zones Fait, 4 809 fiches) : **CARTO-582** Balkans-Byzance et
**CARTO-583** Anatolie-Caucase, tickets prêts au Backlog, **après le 2/12** (la semaine à ~51 %, sa décision : la
méthode complète, le calendrier étalé) ; puis Scandinavie, Rus', Levant, Maghreb. ~3 points de semaine par zone, mesuré.

**À savoir** : la règle `mcp__cms` est posée (toutes les écritures du CMS, la corbeille seule) ; le journal refuse une
tentative fautive à l'écriture ; une citation se poste depuis son fichier et se compare ensuite par script dans la base
(`titles_lines` en lecture seule) — jamais retapée. Les agents de saisie retapent : chaque chef répare depuis ses charges.

## AVANT — 26/11 après-midi : la veille des empreintes (REPO-540, fini)

**La session du 26/11 (01 h 41 → ~14 h 45) a eu un seul rôle, sa demande : surveiller le calcul des empreintes.** Il a
fermé le terminal à la fin (bloqué) : le crochet a arrêté l'oracle proprement — **à relancer, et la veille avec**.

- **Le calcul** : il restait **~131 000 passages** (442 665 points dans Qdrant, collection `green`) ; ~6,5 passages/s,
  donc ~5 h 30. Une session d'historien le relance d'elle-même (crochet) ; sinon `npm --prefix
  /Volumes/Acer/atlas-historien/outils/oracle run session:start` (Node 24). Vérifier : `curl -s
  127.0.0.1:6333/collections/passages` (status, points_count) et la fin de `oracle-data/embed-run.log`.
- **La veille** : une boucle de fond toutes les 5 min, qui note une ligne dans `oracle-data/veille-nuit.log` et me
  réveille sur : disque absent, image de Qdrant démontée, calcul arrêté, Qdrant muet, échange > 5 Go, compteur figé
  10 min. **Chercher le calcul par `pgrep -f 'cli.ts embe[d]'`** — sans les crochets la boucle se trouve elle-même
  (ma faute de la nuit). **Rien d'autre sans sa demande** : ni Maghreb, ni agent (la recherche Autriche-Alpes de la
  session d'avant a été arrêtée — ne pas la relancer sans lui).
- **Acer saute quand il déplace le Mac** (14 h 16, et la veille aussi) : la reprise, décrite au paragraphe « 26/11,
  14 h 16 » plus bas, a marché sans rien perdre. **Sa priorité : aucune corruption** — toujours vérifier le volume
  (`diskutil verifyVolume`) et la base (`PRAGMA quick_check`) avant de relancer. Spotlight (`mds_stores`) restait
  coincé sur le disque après le retour : la piste du terminal bloqué ; le remède, Acer hors de Spotlight, est son réglage.
- **Fait aussi** : poussé les deux commits de doc (`a255a4ea`, sur son « pousse main ») ; **ATLAS-566** créé, dans
  « À faire » pour le codeur — les frontières débordent du plan relief (Éthiopie, Mali, Asie centrale en 1300 ; les
  frontières sont des lignes 3D sans coupe au rectangle du relief, lu dans le code).

## ▶ AVANT — 26/11 : LE MAGHREB, LE RATTRAPAGE, PUIS LA CORRECTION DE LA CARTE DE 1200

**Fait le 25/11** : 11 zones de 1200 saisies (îles, Ibérie, France, Balkans, Anatolie, Empire ouest et est, Levant,
Italie, Scandinavie, Hongrie-Pologne, Rus') — **5 940 villes**, 2 283 alertes (dessin en attente, sa décision) ;
Opole et Nysa (titre 953, fiches 19690-19691) commitées, **push à faire si la CI n'était pas libre** (`gh run list
-L 1`, puis push seul). **L'oracle** : épiques REPO-538 et REPO-545 (Qdrant) — tout Fait sauf **REPO-540** (les
empreintes, en fond : `oracle-data/embed-run.log`, ~85 000 / 585 065). L'oracle suit la session (crochet REPO-544) ;
**la réindexation de fin de zone est à moi** : `session:stop`, `catalog build`, `index build`, `session:start`
(tout par `npm --prefix /Volumes/Acer/atlas-historien/outils/oracle run …`, Node 24). Tableau de bord Qdrant :
http://127.0.0.1:6333/dashboard. Tes PDF : `bibliotheque-texte/` (OCR Vision, à relire sur la page).
**À faire, dans l'ordre** : (1) CARTO Maghreb (3 agents, l'oracle, Gallica par Chrome) ; (2) le rattrapage
JSTOR/BnF/Gallica d'Anatolie, des deux Empires, de l'Italie (della Grossa, ark:/12148/bpt6k480065p) ; (3) **à
proposer** (il n'a pas répondu) : le ticket « chaînes ouvertes (549) et litiges repris par l'oracle », quand les
empreintes seront avancées, et la page des vassaux directs (52 souverains, 118 vassaux directs) pour la correction ;
(4) la correction de la carte avec lui — **je ne dessine pas** sauf sa décision. **Semaine** : 23 % à 22 h 51
(repart le 2/12, 7 h). **Doublons à lui** : 9 livres du catalogue (`catalog dupes`), 2 PDF de sa bibliothèque
(Ancient Rome ×2, Penguin medieval = Penguin 2005). `travail/` des zones (Scandinavie 168 Mo…) à vider sur son mot.

**26/11, 01 h 20** : Qdrant bloqué (le Mac à court de mémoire : 6,2 Go d'échange) — arrêté de force, relancé à 01 h 37, rien perdu ; **8 doublons exacts retirés** vers `_retires/ouvrages-doublons/` (sa décision), oracle réindexé. **26/11, 14 h 16** : Acer éjecté quelques secondes (le Mac déplacé) — l'image de Qdrant démontée, Qdrant bloqué à 650 % de CPU, le calcul arrêté à 312 128 / 443 561. **La reprise, qui a marché** : arrêter Qdrant (TERM puis KILL), `hdiutil detach` des attaches orphelines, `hdiutil attach -nomount` + `diskutil verifyVolume` (sain), `PRAGMA quick_check` sur `oracle.sqlite` (ok), `session:start` → 442 665 points, rien perdu. Ma veille (`oracle-data/veille-nuit.log`) contrôle aussi le montage de l'image. Les anciens points de reprise : `archive/next-historian-history.md`.

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
chaque session : les bibliothèques Python `shapely`, `pypdf`, `pillow` dans `/Volumes/Acer/atlas-historien/outils/python/`
(une fois, `pip install --target`, lancées par `outils/py`), et la base de Cliopatria
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
