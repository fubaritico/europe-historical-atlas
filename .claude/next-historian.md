# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, _« en tant
> qu'historien »_); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/jira`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

**À faire dès qu'il a fini ses retouches de 1100** (sa demande, 13/11 : _« il ne faut pas qu'on se retrouve pollué par
plein de trucs »_) : effacer `/Volumes/Acer/atlas-historien/1100/toutes-zones/travail/1100-retouches.md`, son document de lecture des sept retouches. Les notes
de `/Volumes/Acer/atlas-historien/1100/` (kosovo, france-empire, lusatia) restent : ce sont la trace des sources.

## ▶ ON REPREND ICI — 28/11, ~02 h : l'Empire de 1200 est tracé ; la retouche avec lui

**Fait cette nuit, seul, sur son mot** (« finir les tracés des territoires sur le Saint-Empire », puis les retouches entre
voisins, les erreurs, les bandes, les trous) : **le terrain propre de l'Empire est fermé** — il ne reste que les enclaves
royales voulues (Francfort, Nuremberg, Aix, Wetzlar, Duisbourg + Kaiserswerth, Kirchheimbolanden, Oberwesel, et cette nuit
Besançon, Goslar, Herford, Haguenau, Obernai). Villes en alerte (boîte 3,43.5,19,55, même export) : **1 166 → 1 015** ;
« mal placées » **14 → 1** (Mende, côté France). Aucun chevauchement nouveau au-dessus de 1,4 km².
La carte reste **non commitée** dans l'arbre `CARTO-580`, sur son mot ; mon Cartographe `http://127.0.0.1:5180/` (onglet
du groupe de Claude) et `serve.py` 8769 tournent encore pour qu'il regarde.

**Posé** (tout en cadres, « de mémoire, à lire » dans chaque spec — la recherche corrige ensuite) :
- **Allemagne** : Brandebourg (Havelland, Zauche, Prignitz, Ruppin, Spandau, repris au Danemark), Magdebourg (Jerichow,
  Jüterbog), l'Anhalt à la Saxe de Bernhard, Basse-Lusace élargie, Haute-Lusace et Kłodzko (sous la Bohême), Moravie,
  Pleissenland, Augsbourg, Eichstätt, Strasbourg (Basse-Alsace), Salzbourg (avec Lungau et Friesach), Passau, Frisingue,
  Ratisbonne, Brixen, Trente, la Méranie des Andechs (Carniole, Andechs, Wolfratshausen, Inn, Bayreuth, Kulmbach),
  Basse-Styrie, Villach à Bamberg, Bouillon à Liège, le Barrois à l'ouest de la Meuse.
- **Pays-Bas** (le cadre « Frisia » couvrait tout) : Hainaut, Namur, Luxembourg (hors du duché de Lorraine), Utrecht avec
  l'Oversticht, Hollande (sous le Brabant, lecture de la base), Flandre impériale (Zélande, Quatre-Métiers, Waes, Alost),
  Veluwe, Nimègue et Achterhoek à la Gueldre, Breda au Brabant.
- **Sud** : Zähringen (Vaud, Fribourg, Neuchâtel, Argovie, Suisse centrale), évêché de Bâle, Souabe (Haute-Alsace,
  Thurgovie, Rhétie, Vorarlberg), comté de Bourgogne ; **royaume d'Arles** (son suzerain était la France dans le
  registre : corrigé) avec Provence, Albon, Genève, Aoste ; **royaume d'Italie** avec Toscane, Vérone, Aquilée, Spolète
  (Ancône, Fermo sous lui), Romagne, Milan, Savone, Vintimille ; Istrie, Crémone, Mantoue, Reggio directs.
- **Frontières entre souverains** : Bresse, Dombes, Lyon et la rive gauche du Rhône rendues à l'Arles (Cliopatria les
  donnait à la France) ; Barnim, Cedynia, Myślibórz, Suchań au Danemark (Poméranie) ; Lebus et l'est de la Kwisa à la
  Silésie ; Rethel-Mouzon à la Champagne et à Reims ; Kopčany à la Hongrie ; Chioggia à Venise ; Ravenne-Cervia au pape
  (lecture de la base). Hadeln (406 km² sous personne) à la Saxe ; 21 lanières et 112 bouts rattachés au plus grand voisin.

**Erreurs relevées, à reprendre avec lui** (aucune n'est grave pour l'atlas — cadres, pas encore de couleurs) :
1. Haute-Franconie : Hof, Wunsiedel, Kronach à la Thuringe, Coburg et Lichtenfels à Henneberg — le Regnitzland et Kronach
   (Bamberg) sont à refaire.
2. 129 fiches « au roi » (royaume de Germanie) tombent dans des cadres de duchés : villes royales à mettre en enclaves ou
   non — sa décision (seules 13 le sont).
3. 330 fiches « incomplètes » : surtout en Italie (60), Arles (52), Milan (24) — des maillons manquent en base (communes
   sans suzerain), pas une faute de dessin ; à saisir après la migration « hierarchy-links ».
4. La Savoie n'est pas en base : la Maurienne et le Chablais restent au cadre d'Arles / de Genève.
5. La Poméranie : en base sous le Brandebourg, sur la carte dans le Danemark (Cliopatria) — deux lectures, à trancher.
6. Spolète et Ancône : deux lectures en base (Italie ou États pontificaux, récupérations de 1198) ; posés sous l'Italie.
7. Petits chevauchements laissés (≤ 1,4 km²) : Danemark × Silésie (Oder), Ravensberg × Utrecht, Saxe × Utrecht, Münster ×
   Gueldre, Arles × Aragon, Arles × Toulouse.
8. Mende (Gévaudan) dans l'Aragon : la France et l'Espagne, après l'Empire (ordre de travail, point 6).

**Ensuite** : sa retouche ; puis la France et l'Espagne retracées de même (point 6). Les specs de la nuit sont dans
`cartes/1200/hre/x-*`, `m-*`, `f-*`, `b-*` (83 dossiers, à moi) ; les outils dans `_outils/`.

**Reste de la veille, toujours vrai** : les 5 comtés sans lien en base (Weimar-Orlamünde, Schwarzbourg, Beichlingen,
Klettenberg, Blankenburg) ; ≈ 540 fiches vidées (le tour suivant de lectures, `besoin-de-toi.md` de CARTO-585/586/587) ;
**à lui** : la corbeille de la personne 1479 et du territoire 1063 ; vider les `travail/` de `1200/duches-est` et
`duches-ouest` ; **à moi** : réindexer l'oracle, CARTO-585 « Fait » sur son mot, Neuwied. **La migration
« hierarchy-links »** (codeur, REPO-589) se fait avec lui et ma pause ; mes `count_chains.py` et `direct_vassals.py`
liront alors `hierarchy_links`.

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
