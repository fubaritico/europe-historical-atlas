## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-19 — la gestion de l'incertitude, le README, la licence

Une plage au journal, **19/10 16:10 → 19:34 (3 h 24, 121 actions)** ; le chantier ouvert le 05/10 totalise **93 h 14 sur
16 plages**. **5 commits** `be2abdf`..`3c93e05`, **tous poussés** à la demande du dev, plus celui de cet état. Aucun code
de production touché ; la gate a tourné à chaque commit (hooks), verte.

- **Le sujet de départ, CORE-217 (la date historique), est devenu accessoire — assumé par le dev** : *« c'est très très
  bien, c'est assumé […] j'ai pas perdu le fil »*. Il devient le premier palier d'autre chose.
- **Mesuré** : Wikidata ne donne pas d'arbre de vassalité (France 1400 : 9 vassaux, moitié faux ; Anjou, Champagne, Blois
  sans lien) ; les infobox de Wikipédia en anglais, 3 fiefs sur 6. Le dev : *« on n'a que dalle […] à part Euratlas »*.
- **DESIGN-262, la gestion de l'incertitude** — une **initiative**, au-dessus des épiques : *« un système pour choisir »*,
  *« une réflexion très lourde derrière pour un résultat simple et attractif devant »*. Plan `files/plans/evidence-system.md`
  (concepts, principes, décisions du dev, paliers, lectures graduées) ; 15 termes au glossaire. Le tableau gagne une
  colonne **Chantiers**, le périmètre `[DESIGN]`, l'étiquette « chantier · incertitude » ; REPO-261 (les vassaux directs
  d'un territoire à une date) en Idées.
- **Le dépôt prêt à passer en public** : audit propre (ni Euratlas, ni GPL, ni `.env`, historique compris) ; le README
  réécrit comme la présentation de l'œuvre, sur la convention de ses autres dépôts ; **licence PolyForm Strict** pour le
  code, le corpus et les années réservés — *« je ne veux pas qu'il y ait de produit commercial à partir de mon travail »*.
- **Mes fautes** : « les plans sont gitignorés » affirmé sur la foi d'un CLAUDE.md périmé (corrigé) ; l'AGPL présentée comme
  protectrice alors qu'elle n'empêche pas la vente ; un commit refusé par commitlint dont les fichiers sont partis sous le
  message suivant (refait par `reset --soft`) ; deux `cd` (un sous-shell, un égaré) ; une requête SPARQL fausse donnée
  d'abord sans l'exécuter ; *« comme un livre »* lu de travers (*« reviens sur ce que je t'ai écrit avant »*) ; une
  question sur l'IA perdue en fin de message.

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

> Older sessions (2026-09-12 → 2026-10-17) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
