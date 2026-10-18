## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-18 — le code d'équerre, les vassaux par le zoom, les tribus au bord évanoui, un relief plus fin

Une plage au journal, **18/10 14:22 → 23:59 (9 h 37, 1 619 actions)** ; le chantier ouvert le 05/10 totalise **89 h 43 sur
15 plages**. **39 commits** `b9d3cc6`..`6d3903f`, **tous poussés** à la demande du dev, plus celui de cet état.
**4 207 tests** (1 126 `core` · 1 931 Cartographe · 983 atlas · 167 plugin). Le détail de chaque livraison est sur son ticket.

- **Le tableau** : l'audit d'Idées/Backlog (aucun fait, 9 en partie, passés en cours par le dev) ; la comparaison avec
  Euratlas, ~33–37 % retracé (CARTO-237).
- **Le Cartographe** : CARTO-121, CARTO-122 (la demande au design system rédigée), CARTO-195 (**la zone éditoriale
  supprimée** — je l'avais inventée : *« n'en invente pas. Par pitié »*), CARTO-238 (la garde contre l'écrasement, les
  snapshots), CARTO-257 (l'aimant au bord de la carte), CARTO-233 commité à 20 km, le fond gris de la page.
- **Le code remis d'équerre, à la demande du dev** : un dossier par composant (`hooks/`, `internal/`, barrel) et quatre
  règles de lint ; **zéro import circulaire**, types compris — son principe, *l'enfant déclare son type, celui du parent en
  hérite* — tenu par `eha/no-import-cycle` ; le JSDoc imposé par `eslint-plugin-jsdoc` (286 manques documentés) ; Node
  22.14 → 22.23 ; `viewport/`, `canvas/{tools,paint,history}`, `persistence/draft/`, `loaders/` ; plus aucun fichier non suivi
  hors le sien. *« pas de dette, rien »*.
- **L'atlas** : ATLAS-253 (de loin un vassal porte la couleur de son suzerain ; hommage limité à 8 niveaux) — *« ça réagit
  bien »* ; ATLAS-258 (les tribus au bord évanoui, pareil dans les deux applis ; à travers une tribu un État montre sa
  frontière) — *« les frontières sont respectées »* ; ses réglages (fleuves toujours visibles, frontières plus visibles) ;
  le relief au niveau 6 sur 1 920, en ligne pour mesurer le chargement (2 560 : *« c'est trop »*).
- **Idée notée** : ATLAS-259 (deux tribus voisines mêlant leurs couleurs).
- **Mes fautes** : deux remplacements Perl ratés — le nom nu `vectorLayers` réécrit dans le code, puis quatre lignes collées
  en tête d'`atlasBorders.ts` — rattrapés avant commit ; une consigne trop large qui a donné à une tribu une frontière
  d'État ; un test cassé masqué par le cache de Turbo ; sa page rechargée sans fin par mes agents (*« c'est lourd »*,
  règle du worktree notée) ; *« le fond de la page »* lu d'abord comme le canevas ; trop de délégation à son goût
  (*« dis-moi pas que t'as encore délégué »*) ; « 13 cycles » annoncés pour 12 paires.

### 2026-10-17 — Trello, la sauvegarde automatique, la Norvège rapide, le suzerain tapé, Wikidata, le double-clic

Une plage au journal, **17/10 14:43 → 22:03 (7 h 19, 486 actions)** ; le chantier ouvert le 05/10 totalise **76 h 38 sur
14 plages**. **8 commits** `218910a`..`7f0b2be`, **tous poussés** à la demande du dev, plus celui de cet état.
**3 629 tests** (977 `core`, 1 686 Cartographe, 884 atlas, 82 plugin). Le détail de chaque livraison est sur sa carte.

- **Le suivi passe sur Trello** (REPO-236) : compte dédié, skill `/trello`, 6 colonnes par maturité, tickets `[CARTO-41]`
  à compteur unique, étiquettes, modèles, DoD ; « Fait » rempli de 113 cartes, **exhaustivité prouvée** (284 des 315
  commits cités) ; Backlog tiré des plans (92) ; `next.md` allégé. Règle « un seul endroit par fait ».
- **Livré et testé par le dev** : CARTO-240 (Norvège : 4,6 s → 55 ms, index par bandes de latitude, sortie identique à
  l'octet), CARTO-238 palier 1 (brouillon sur disque, reprise à l'ouverture), CARTO-241 (suzerain par saisie),
  CARTO-242 (créer au-dessus du pays sélectionné, dans son groupe), CARTO-243 palier 1 (Wikidata dans la fiche :
  dates, suzerain, anachronisme — Tripoli n'existe pas en 1100 ; Mossoul était une catégorie), CARTO-246 (double-clic
  sur la carte ouvre la fiche).
- **Basic Memory** reçoit son rôle (décision du dev) : le graphe entre projets ; 13 notes dans `main/patterns/`.
- **Échanges sur les sources** : lire et reporter à la main = permis ; décalquer un trait récent = non ; Shepherd 1911
  (domaine public) = oui. Idées notées : ATLAS-244 (Wikipédia au clic), ATLAS-245 (drapeaux en 3D), CARTO-248.
- **Mes fautes** : la page du dev rechargée plusieurs fois (sabotages et comparaisons dans `core`, `main.tsx`) ;
  trois commandes interrompues avaient agi en partie (14 doublons dans Fait, archivés) ; un premier `.gitignore` qui
  n'ignorait pas `.env.local` (corrigé avant toute fuite) ; mon e-mail dans un en-tête Wikidata sans accord ; le
  « Gravité » puis « Basic Memory » mal présentés d'abord. Revues : une dizaine de vrais défauts attrapés avant commit.

**Suite de la même plage, 17/10 22:39 → 18/10 01:19 (2 h 40)** — la plage entière fait **10 h 35, 560 actions** ; le chantier
**79 h 54**. **4 commits** `d85bdb4`..`f10ac04`, tous poussés à sa demande. **3 642 tests** (977 · 1 699 · 884 · 82).

- **CARTO-248** livré et testé (*« ça fonctionne. Aucun problème. »*) : le suzerain daté de Wikidata pour l'année éditée.
  Sa 1100 commitée trois fois dans la soirée (`133dbfc`, `b53912d`, `f10ac04`) : *« ce sera tout pour ce soir »*.
- **Fermés sur son verdict** : CARTO-235 (‹P›/‹A› répondent, sans code), REPO-234, CARTO-114 (*« là, j'arrive vraiment à
  être rapide »*).
- **Le point sur le tableau, et deux objectifs** : la **contribution des événements** et l'**interface de l'atlas** — à plat
  (son zonage, puis Claude Design sur une capture où des événements sont déjà posés) et en 3D dans la carte (des essais
  jetables). Le Cartographe est en pause. « À faire » ordonné par dépendance, de CORE-217 à CONTRIB-225 ; le Backlog en
  cinq groupes. Le tableau gagne des couvertures de priorité, « Fait » se lit du plus récent au plus ancien, et la colonne
  « À toi » devient **« À valider par le développeur »**. Vocabulaire : **ticket**, jamais « carte ».
- **Mes fautes** : sa page a pu se recharger quand j'ai modifié `wikidataFacts.ts` (importé par `main.tsx`) ; le
  doublon CONTRIB-250, créé sans voir CONTRIB-218 à 228 (ma lecture du tableau coupée à 80 lignes), archivé ; 8 tickets
  posés en haut du Backlog au lieu du bas, redescendus ; un `perl` sans `use utf8` qui n'avait rien remplacé.

> Older sessions (2026-09-12 → 2026-10-16) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
