## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-09-22 (soir) — Dix trous fermés, le format écrit, les écrans du Cartographe

Seconde plage du même chantier : **20:42 → 00:12 (3 h 30, 86 actions)**, après 2 h de coupure — donc
**7 h 12 sur la journée**. **Toujours aucun fichier de `src/` touché.** Livrables : `cartographer/format.md`,
`cartographer-ui-inventory.md`, le spike `terrain-bitmap`, et `files/plans/cartographer/design/`
(5 écrans + 10 curseurs).

- **Le dev a reconnu Illustrator dans les scénarios** — *« la flèche blanche qui sélectionne des points (A)
  et l'outil plume (P) »* — et le Cartographe n'a plus que **deux outils**. Pas de Bézier, pas d'outil V,
  **pas de boîte de transformation** : *« nous ne voulons juste que dessiner »*. Une ancre est **blanche à
  bord bleu, pleine en bleu quand sélectionnée** ; la marquise ne laisse **aucun cadre** au relâchement.
- **H-06 fermé par un geste, pas par un modèle.** *« On duplique un tracé et on aura des tracés
  concomitants, c'est tout. »* La condition d'implémentation est tout : **on duplique la liste, jamais les
  points**. Un tracé est une liste ordonnée de références vers des ancres ; deux tracés sur les mêmes
  indices *sont* collés. Copier les ancres ferait revenir le liseré que `extractRegionBorders` avait
  aboli au rendu.
- **Ma formulation « ça devient impossible » l'a fait tiquer, à raison** : rien n'est interdit, c'est le
  **défaut** qui devient impossible. Corrigé dans les docs.
- **Neuf autres trous tombés.** H-04 (fermeture par proximité, tolérance **en pixels écran** — 50 km à
  l'échelle continentale, et c'est juste) · H-05a (**un vassal dans son suzerain n'est pas un
  chevauchement**, le plus spécifique peint, ce qui remplace le « dernier index gagne » et répare
  `colorBySuzerain`) · H-07 (**la containment décide** : contenu = trou, disjoint = exclave, plus aucune
  question) · H-09 (supprimé : on déplace des points, pas des tracés) · H-10 (un geste = un pas ; *« les
  412 points disparaissent d'un coup »*) · H-11 (**chaque année dessinée est indépendante**) · H-14 (une
  année, un fichier) · H-22 (plus de parent, donc plus d'arbre) · H-26 (à moitié : le trou est attribué
  **au moment où il naît**).
- **H-12 écrit** — `files/plans/cartographer/format.md`. Deux fichiers : `registry.json` (identités,
  partagé) + `<year>.json` (géométrie, indépendant). **Une seule idée dedans** : un anneau est une **liste
  d'index d'ancres**, pas de coordonnées. J'avais esquissé une table de tracés, des arcs et une table de
  nœuds — **aucun des trois ne servait**.
- **Le format est petit parce que ses décisions l'ont vidé** : H-11 retire les références croisées, H-06
  le modèle topologique, le registre partagé les noms répétés dans 21 fichiers.
- **Le registre est séparé, avec des noms datés** — *regnum Francorum* → *regnum Franciae* vers 1190, une
  polity, un identifiant. Ça ne contredit pas H-11 : *« chaque année **dessinée** est indépendante »*, et
  un nom n'est pas dessiné. Retire les deux entrées `Spain` de 1700, les 9 regex de couleur et l'ordre
  Royaume-Uni-avant-Irlande.
- **Le scénario le plus banal manquait** : sélectionner un pays et rouvrir son formulaire. Trouvé par le
  dev en lisant s05.
- **« Enregistrer sous » est tout le mécanisme de déclinaison** — ferme le fichier, charge la copie,
  **demande l'année** (sinon un fichier nommé 1110 se déclare 1100). Ça a **réécrit s05 aux trois quarts**.
  Et l'écrasement d'une année existante **renomme l'ancienne** plutôt que de la détruire.
- **Deux reprises du dev, toutes deux justes.** *« Pourquoi 50 corrections, ça sort d'où ? »* — de moi, et
  le chiffre était faux (21 cartes, pas 50) et mon exemple aussi (la côte vient de Natural Earth, elle
  n'est pas dans les fichiers). *« Tes règles, c'est des contraintes »* — vrai : elles sont des **défauts
  surchargeables**, écrit en tête de `s00`. Il ne reste que **deux contraintes réelles** : les ancres
  partagées et la licence.
- **Le critère de justesse de l'atlas a changé de nature**, et c'est de lui : *« ce qui serait gênant,
  c'est qu'une ville ne soit pas du bon côté »*. Donc **les villes sont l'instrument de mesure**, pas un
  confort — ce qui rend l'absence de la Saône sans conséquence. Le remède le moins cher est gratuit :
  afficher chaque ville avec le pays qui la tient, le raster sait déjà répondre.
- **La main d'une frontière est une donnée, sa géométrie jamais** — `{ between, hand }`, zéro coordonnée,
  donc aucune seconde source de vérité. **L'explicite bat la règle dérivée.**
- **Le spike `terrain-bitmap`** cuit la texture peinte hors navigateur : 2560×2328 en 1,8 s, **479 fleuves
  rastérisés**, `extendRiversToSea` appliqué comme dans l'app. Possible parce que `composeTerrainRgba` est
  pur — ce que l'extraction dans `pipeline/` avait acheté sans qu'on l'ait prévu pour ça. Vérifié plutôt
  que supposé : `SRGBColorSpace` est posé, donc **le PNG est les pixels de l'écran**. Le supersample par
  défaut est **2, pas 4** — le ×4 est `rasterScale`, sans rapport.
- **La couverture est accumulée puis composée une fois** : composer segment par segment assombrit chaque
  jointure et transforme un fleuve en chapelet de perles.
- **Claude Design a livré 5 écrans et 10 curseurs.** Le code était meilleur que les captures : `aria-label`
  sur chaque bouton à icône, `role="toolbar"`, cibles 32×32 et 24×24, `{Details}` sur un rail de 200 px,
  et les chiffres réels des scénarios dans la barre de statut.
- **Mon diagnostic du débordement était faux** — j'avais accusé `min-height`, qu'il avait bien géré. La
  cause était `width:1440px;height:900px` **en dur** à la racine.
- **Le thème sombre appliqué à la main**, après deux refus de l'outil. Quinze valeurs et une ligne. **Les
  deux inversions comptent plus que la palette** : l'outil actif passe en clair sur sombre, et le **liseré
  des pastilles s'inverse** — sans ça le bleu ardoise `#54719b` tombe à **2,86:1** sur `#2b2926`. Même
  argument que la gaine des frontières.
- **Les curseurs ont trouvé le même remède tout seuls** : un **halo blanc sous l'encre**, pour qu'un seul
  curseur lise sur terre, mer et aplats. Quatre questions laissées ouvertes par le handoff, tranchées :
  précédence confirmée · plume sans cible → `not-allowed` · **le curseur ne change pas pendant un drag** ·
  le nom du fleuve est une étiquette canvas, pas un curseur.
- **Le canvas 2D est tranché** — `globalCompositeOperation = 'overlay'` donne nativement le mode de la
  cuisson (`politicalMode: 'overlay'`), qu'un WebGL demanderait d'écrire en shader.
- **Le trait d'édition n'est pas le trait de la carte** : fin, net, bleu, sans gaine. Sinon on ne sait plus
  si on regarde son brouillon ou le résultat.

### 2026-09-22 — Le Cartographe : du pipeline aux scénarios (conception, zéro code)

Une seule plage : **14:56 → 18:20 (3 h 24, 69 actions)**, après **4 jours d'interruption**. **Aucun
fichier de `src/` touché** — session entièrement de conception. Livrables : `cartographer-groundwork.md`,
`glossaire.md`, et **11 fichiers de scénarios** dans `files/plans/cartographer/scenarii/`.

- **Le repère temporel injecté au démarrage était faux** — le hook annonçait « chantier EN COURS,
  02:54 » alors que le rapport réel disait 4 jours de coupure. Vérifier le rapport, pas le hook.
- **Le pipeline politique relevé du code, de bout en bout** (9 étapes, `file:line`), parce que le dev
  demandait *« qu'est-ce que consomme la couche qui affiche les frontières, comment on génère ça »*. Le
  chapitre 06 conçoit les outils ; personne n'avait écrit ce que la machine mange aujourd'hui.
- **Quatre manques du format, dont un que le chapitre 06 ne nommait pas** : une polity **est** sa chaîne
  de caractères. D'où les 9 regex de `REGION_COLOR_RULES`, l'ordre porteur qui teste le Royaume-Uni avant
  l'Irlande, la garde `a === b` de `borderPatternFor`, et **deux entrées `Spain`** dans le payload 1700.
  *« Le code couleur ne peut pas être contribué tant que la clé est un nom d'affichage. »*
- **Décidé : format B, aligné sur OHM.** Une région porte son **rang**, **de qui elle dépend**, son
  **nom**, sa **couleur**. Le moment est le moins cher possible : 20 payloads sur 21 sont GPL et déjà
  condamnés, le 21e est régénérable par un spike.
- **Notre propre relevé de tags OHM avait manqué l'essentiel.** Le README du spike conclut « pas de
  rang » parce qu'il a regardé `admin_level` — qui est notre propre filtre. Mesuré : **`border_type`
  (46,8 %) porte le rang** — kingdom 423, empire 205, duchy 56 — et **`place` (52,5 %) porte le statut**,
  dont `personal_union` et `condominium`. **OHM sépare déjà rang et dépendance**, ce que ce document
  avait argumenté de son côté.
- **Rang et dépendance sont orthogonaux**, et le siècle du dev le prouve : le roi d'Angleterre est duc
  d'Aquitaine, donc vassal. Résolution gratuite : **une polity par titre**.
- **Le vassal aura sa propre main de trait**, distincte de l'union personnelle (décision du dev). Le gain
  dépasse le trait : la **relation se dérive** du registre, la **main** reste une table éditoriale de
  quatre lignes. Plus de regex, plus d'ordre porteur. Coût mesuré : `ComposedStroke.dashed` est un
  booléen et la cadence est globale à la couche → **option (c) validée**, cadence par passe.
- **1100 comme première carte contribuée**, et la mesure a retourné la prémisse. OHM y assemble
  **51 polities sur 52 à 98,1 %, zéro chaîne ouverte** — aussi propre qu'à 1700 — mais ne couvre que
  **45 % de l'Europe** (contre 55 % à 1500, 89 % à 1700, même méthode). **Et le Royaume de France n'a
  aucune géométrie** : il existe en relation *label-only*, avec son nom, son rang et son Q-id.
  **Pour le siècle et le pays au cœur du projet, OHM donne l'identité et rien de la géographie.**
- **L'édition au point est praticable** — médiane **108 sommets** par polity, 36 sur 51 sous 300. Les
  cinq au-dessus de 1000 sont Byzance, Seldjoukides, Abbassides, Norvège, Fatimides, dont **trois sont
  hors-champ**.
- **Le décalque est mort, remplacé par le report à vue** (décision du dev). Ça **retourne le chapitre
  06**, qui dit du filigrane géoréférencé *« c'est ça, le Cartographe »*, et sort le spike `fetch-atlas`
  du chemin critique après qu'il ait été flagué ultra important le 17/09. **Ce que ça débloque est plus
  grand que ce que ça supprime : Duby et Euratlas redeviennent utilisables**, puisque reporter ce qu'on
  lit est de l'extraction de faits. Et c'est mesuré : une planche 1:10M calée tombe à 3–5 km quand nos
  cellules font 1,9 km — **le filigrane est plus grossier que la grille**.
- **Le fond par défaut est la texture cuite de l'atlas** — le seul fond **géoréférencé par construction**
  (zéro calage, erreur nulle), et littéralement l'image de sortie. Trois pièges relevés : elle contient
  déjà le tint politique (`clearPolitical` d'abord) ; elle lâche à **7,6 km/px** quand la cellule fait
  1,9 ; et les épaisseurs doivent être en pixels écran.
- **Les fleuves mesurés contre le tracé de 1100** : l'Escaut est là sous `Schelde`, la Meuse sous `Maas`,
  le Rhône est là — **la Saône est absente** (coupée par `scalerank`). Et chercher un fleuve par son nom
  français ne donne rien : les noms sont en langue locale.
- **Onze fichiers de scénarios Gherkin**, au niveau du bouton : ouvrir · créer la France 1100 · améliorer
  une frontière · round-trip · **dériver 1110 de 1100** · remplacer une année GPL · registre · vassalité
  · labels · contrôle avant publication · îles · hors-champ. Leur livrable est **`s99-holes.md`, 26 trous**.
- **Ce qui sort des scénarios** : rien n'est dupliqué entre années (les tronçons sont partagés, sinon
  50 cartes = 50 corrections) ; le copy-on-write demande *« la ligne était mal tracée »* ou *« la
  frontière a bougé »*, et seul l'auteur sait ; un liseré est un **défaut**, la Bretagne non revendiquée
  un **fait** ; la taille d'un label suit le **rang** et jamais la surface, ce qui règle le Saint-Empire.
- **Zone éditoriale décidée** (lon −45…60, lat 20…76), **distincte de la bbox de rendu** : 45 polities
  dedans à 1100, 6 dehors. Fatimides, Abbassides et Zirides **dedans**, ce qui est juste pour les
  Croisades. La zone est **datée** — élargie à partir du XVIIIe. Jamais de découpe de géométrie à la
  limite : ça inventerait une frontière.
- **Deux reproches du dev, tous deux gravés.** *« Tes doutes, j'en ai rien à foutre »* → réponses en
  solutions, criticité exprimée, remède attaché — dans `CLAUDE.md` et en mémoire. Et *« fais-moi un
  glossaire »* après qu'il ait décroché sur du vocabulaire non défini → `files/plans/glossaire.md`,
  **tout mot nouveau y atterrit désormais**. La collision « chapitre 06 » / « scénario 06 » était de moi :
  les scénarios sont préfixés `s`.

### 2026-09-18 (nuit) — Le mode focus, le nom de l'atlas, le plan retourné

Reprise **01:17 → 02:49 (1 h 32)**, dans une plage continue depuis 22:10 la veille (4 h 38 au total,
372 actions). **3 commits** `2d0e663`..`69e4709`, **1005 → 1108 tests**, gate verte et build de
production vérifiés à chaque pas.

- **Le fly-to n'était pas un réglage, c'était un mode qui manquait** (`2d0e663`). Le diagnostic consigné
  dans `next.md` était **faux** : il affirmait que `flyZoomIn` était une cible fixe, alors que le code
  faisait `clamp(state.zoom + flyZoomIn, 0, 1)` — un **pas relatif**, qui saturait à 1 après trois
  double-clics et dégénérait ensuite en pan pur. Remplacé par `flyFocusZoom` (défaut 1) et `flyArcZoom`
  (défaut 0). `controls/focusMode.ts` : `focusReturn` sur l'état, entrée par double-clic, sortie par
  Échap (retour complet) ou par simple clic (le lieu désigné, au zoom d'avant). **Paner, draguer et
  molette ne quittent pas le mode** — ce qui tient en une ligne parce qu'`interrupt` ne parle que du vol.
- **Le retour est capturé depuis la destination du vol en cours, pas depuis la cible vive** — sinon
  double-cliquer pendant le vol de retour mémorise un point à mi-chemin, et l'Échap suivant échoue le
  lecteur quelque part où il n'a jamais été.
- **L'arc, puis sa moitié retirée** (`ca68081`). Le dev l'a validé d'un focus à l'autre et refusé à la
  sortie : ce trajet **porte déjà son propre dézoom** (zoom max → position d'avant), donc le courber en
  plus envoyait la caméra sous sa destination et la faisait remonter. `peakZoom` devient `number | null`
  et c'est **l'appelant** qui décide : seul `enterFocus` passe `arcPeak`.
- **La courbe est une parabole `4p(1-p)` et non une sinusoïde**, pour une raison arithmétique :
  `Math.sin(Math.PI)` vaut 1,22e-16, donc le vol se posait à 0,9999999999999999 du zoom visé. La
  parabole est exacte à 0, 0,5 et 1 en flottant.
- **QUAL-101, trouvé en revue avant de nuire** — le DOM émet un `click` dès que press et release
  partagent un élément, **sans aucun seuil de distance**. Le simple clic venant de recevoir un sens,
  chaque relâchement de drag-pan aurait déclenché un vol de 1400 ms. `pointerDragged` décide **une seule
  fois, là où vit le drag**, sur le chemin parcouru en pixels contre 4 px de tolérance. Vérifié en
  cassant la garde exprès. Corrige au passage un défaut antérieur : `mapControls` traitait *tout*
  micro-mouvement comme un drag.
- **`prefers-reduced-motion` n'effondrait pas `flyDurationMs`** alors que sa propre JSDoc l'affirmait.
- **Trois autres findings de revue** : `mapInteraction` dépendait des quinze membres de `MapControls`
  pour en appeler quatre (→ `Pick`, et le `as unknown as` du test disparaît) ; `utils/editableFocus`
  extrait sans tests ; `READ_EVERY_FRAME` exemptait **tous** les contrôles caméra par un spread, y
  compris ceux du vol qui ne sont pas lus chaque frame. Un finding **écarté à la vérification**
  (ordre d'import : `pnpm lint` est vert).
- **L'atlas s'appelle `EUROPE` / `HISTORICΛL ΛTLΛS`** (`69e4709`). Splash en trois blocs sur **une seule
  laisse**, celle de la silhouette. Pas de `letter-spacing` : il ajoute un écart **fixe**, donc deux
  lignes de longueurs différentes ne tomberaient jamais sur la même largeur — c'est **un span par lettre
  en flex `space-between`**, et l'espace entre les mots est un item **vide**, qui achète deux écarts là
  où il y en avait un. `EUROPE` à 42 px contre 15, non par emphase : à la même laisse, six lettres à
  15 px se retrouveraient séparées d'un mot entier. Sur la feuille, une ligne, canevas 1440 → 1680 px.
- **Le nom vivait en deux littéraux indépendants**, signalé par l'agent qualité *sans être filé* faute de
  sévérité attribuable — et c'était le point le plus important des trois. `ATLAS_SUBJECT` /
  `ATLAS_TITLE` / `ATLAS_FULL_NAME` dans `utils/lettering`, plus le test qui verrouille la
  concaténation. C'est la forme qui a donné à ce projet des aplats et des frontières en désaccord.
- **`aria-label` était posé sur un `<p>`**, qui n'offre aucun rôle auquel il s'applique de façon fiable.
  Avec une lettre par span, un lecteur d'écran aurait épelé. Le nom est désormais *dans* l'élément.
- **Le plan a été retourné par le dev** : les villes ne sont pas du décor, ce sont des **données**, donc
  l'outillage de contribution passe **avant** tout le reste. Et **trois modes de caméra** sont acquis —
  normal, focus, pays — les gestes d'accès non.

### 2026-09-17 → 18 — Budgets de lisibilité, fly-to, la carte comme feuille imprimée

Trois plages : **11:28 → 12:59 (1 h 30)**, **16:00 → 16:14 (14 min)**, **22:10 → 01:13 (3 h 02)**.
**31 commits** `e3cbb80`..`233adcb`, **482 → 1005 tests**, gate verte à chaque pas.

- **Budgets de lisibilité, sans exemption** (`e7fb2e7`, `a4159f1`) — `max-lines` **400** (code seul),
  `max-lines-per-function` **50**, `max-depth` 4, `complexity` 10. Déclenché par `main.ts` à 950 lignes :
  *« je voulais relire la manière dont ça fonctionnait, ben on ne peut pas »*. **La liste d'exemptions
  par fichier a été construite puis jetée** sur refus du dev — la règle s'applique partout sauf aux
  tests, et seulement pour les deux budgets de lignes. Correction due : `complexity` compte les chemins
  d'exécution, `max-depth` l'indentation ; le dev demandait la seconde en nommant la première.
- **`main.ts` : 950 → 56 lignes de code**, `bootstrap()` à 40. Neuf modules de composition extraits
  (`devState`, `mapSources`, `viewport`, `mapUi`, `mapLayers` puis re-découpé, `mapPipeline`,
  `devPanelCallbacks`, `frameLoop`, `mapInteraction`). Rendre `mapPipeline` et `viewport` injectables
  était la condition pour qu'ils soient testables du tout.
- **`devPanel.ts` était testable depuis le début** — l'affirmation contraire, consignée dans
  `known-issues`, n'avait jamais été vérifiée. lil-gui tourne sous jsdom, il manquait trois lignes de
  `matchMedia`. D'où la garde des **123 contrôles**, chacun bougé et devant déclencher un callback,
  vérifiée en cassant un câblage exprès. Deux jeux de curseurs avaient été perdus par ce trou.
- **M1.4, moitié faite** (`22cf088`) — double-clic → `flyTo`, clic → sélection. `controls/` découpé en
  quatre. `toNdc` refuse un rect de taille nulle **dans `pick`** : un rayon non fini ne rate pas, three
  répond une intersection arbitraire — démontré par un test avant de retirer la garde. **Le dev a jugé
  le fly-to mauvais en fin de session ; c'est le premier point de la reprise.**
- **Règle de traitement d'erreur** (`rules/error-handling.md`) — *« tout traitement d'erreur doit être
  sujet à une discussion »*. Distinction porteuse : mode dégradé **déclaré** / propagation bruyante /
  **substitution silencieuse**, cette dernière étant la forme dangereuse parce que plausible.
- **La carte est une feuille imprimée** (`c487144`..`565fe63`) — vélin, bordure graduée alternée sur les
  quatre côtés, filets, degrés écrits dans la marge (français, `30°O` et jamais de signe moins), grain
  SVG par `feTurbulence`, rose et titre par le même chemin SVG → texture.
  Quatre défauts trouvés à l'œil par le dev et corrigés à leur cause : cadre **face au sol**
  (triangles enroulés à l'envers, test de normale ajouté) ; marge qui **scintille** (la feuille écrivait
  la profondeur à quatre millièmes de la mer) ; grain **23× trop fin** dans la marge (échantillonnage
  en pixels, donc partager la fonction ne suffit pas — il faut partager le repère) ; **côtés en deux
  blocs au lieu de 66** (`latitudeToVertical` descend en Z, `segmentsBetween` supposait l'ordre
  croissant — **et mes tests prenaient la valeur absolue des écarts, ce qui masque exactement ça**).
- **Titre `HISTORICΛL ΛTLΛS`** (`233adcb`) — lettrage partagé avec l'écran d'attente via
  `utils/lettering`, puisque `scene/` ne peut pas importer `ui/`. Canevas **12:1 et non 8:1** (seize
  capitales tracées avancent d'environ `16 × 1,04 × corps`) et ancre reculée d'une demi-chasse.
- **Le bandeau disparaissait à `bandOpacity` 1** (`fadb389`) — vrai bug, trouvé parce que le dev l'a vu.
  Le cadre n'écrit pas la profondeur ; à 1 le matériau quitte la file transparente, three trie les
  opaques **du plus proche au plus lointain**, la tranche plus lointaine est dessinée après et l'efface.
  **La preuve était dans le screenshot : les chiffres ont survécu, le bandeau non, et la seule
  différence est leur opacité.** `FRAME_RENDER_ORDER` retire la question au curseur.
- **La tranche est au mauvais endroit, et c'est mesuré.** La *planche* (jupon uniforme sous le niveau de
  la mer, tout autour, océan compris) se projette dans la marge dès que la caméra s'incline : 0,06 de
  profondeur couvraient **23 px contre 17 px de bandeau**. Elle remplissait les blocs clairs de sa
  couleur. **Mes deux tours de « plus foncé » n'ont pas créé le problème, ils l'ont révélé** : à
  `#c9bb9c` le mur tombait sur la valeur du vélin et restait invisible. `edgeDepth` est à 0 ; la
  *section* (coupe dans la terre, là où il y a de la terre au bord) reste.
- **Bug d'espace colorimétrique identifié, non corrigé** — les couleurs par sommet sont écrites en sRGB
  dans un attribut que three lit en linéaire. Diagnostiqué en décodant le PNG du dev et en comparant :
  `#5f5342` prédit à `(164,155,139)`, mesuré `(162,155,141)`.

### 2026-09-17 (nuit) — Le calcul dans un worker, l'écran d'attente, SEC-001, le raster 4×

Une seule plage : **23:55 → 01:55, 2 h 00, 277 actions, 14 commits** `0027343`..`4f14b69`.
**351 → 482 tests**, gate verte à chaque pas, build de production vérifié à chaque étape.

- **Le pipeline politique tourne dans un worker** — le gel à 70 % traité à sa cause : la cuisson de
  texture n'était pas *découpable*, elle devait quitter le thread. **Deux ports et non un**, contre le
  plan consigné : la cuisson a cinq appelants et le politique n'en est qu'un ; un port unique aurait
  laissé une seconde cuisson pour les quatre autres. Bénéfice non prévu — **les curseurs de texture ont
  cessé de geler l'onglet**.
- **L'extraction du compositeur était nécessaire, pas cosmétique.** Une frontière de worker est aussi une
  frontière de *bundle* : `composeTerrainRgba` était pure mais sous un en-tête important `three`. Nouvelle
  couche `pipeline/`, dont la règle ESLint **refuse `three`** — vérifiée en la faisant échouer exprès.
  Chunk worker : **12,6 ko, zéro three.js**, contre 648 ko côté principal.
- **Démarrage en deux temps voulus** au lieu de trois subis. La grille marron était **ma régression** :
  `rebuildTexture` devenu asynchrone, `rebuildRelief` ne l'attendait plus et le maillage naissait sans
  carte. Les deux autres étapes étaient du travail jeté — trois cuissons de 1,5 M pixels, deux écrasées.
- **Écran d'attente** (`ui/splash`) — silhouette d'Europe **tracée depuis notre propre masque** par un
  générateur de spike, jamais dessinée à la main. Relue avant livraison en **redessinant le chemin émis**
  en ASCII. Cadrage trouvé au troisième essai (Mercator étire le nord : 300×384, puis 454, puis 299).
  `HISTORICΛL ΛTLΛS`, nom accessible en clair. +4,3 ko gzippés.
- **SEC-001 fermé, ses deux moitiés** (chapitre 07). Taxonomie porteuse — `transport | schema |
  consistency | semantic` en **champs**, pas en chaîne — gardes écrites à la main, `boundsMatch` comme
  contrôle sémantique inter-assets, politique de mode dégradé **déclarée** (le relief est la carte),
  `role="alert"` bloquant / `role="status"` dégradé.
- **Raster politique à 4× par défaut** — 1,9 km au lieu de 3,8. Écarté jusque-là pour 825 ms de blocage,
  qui ne sont plus payés par le thread principal. Coût mesuré : ~136 Mo de pic. Le piège des unités en
  cellules est **tenu par construction** — la multiplication se fait une fois, dans le calcul.
- **Chemin ring supprimé** avec son toggle, et avec lui l'aller-retour du raster : **45 Mo par changement
  d'année** que plus rien ne lisait.
- **Revue à 4 dimensions** : sécurité et accessibilité vierges ; QUAL-101 (high) réel et de moi — j'avais
  donné une garde de fraîcheur à `rebuildTexture` et **pas** à `rebuildPolitical`, que les palettes
  déclenchent en continu. Corrigé par `utils/latestOnly`, avec la subtilité qui la rendait vicieuse :
  garder la seule écriture d'état ne suffit pas.
- **Établi sur le DS voisin** : `fubaritico-ds/packages/variants` rend des **chaînes de classes BEM** et
  `packages/styles` livre le CSS — consommable en TS vanille, sans React. Le blocage est la publication.

### 2026-09-16 (midi + soirée) — Frontières dérivées du raster, types de frontières, doctrine de revue, overlay

18 commits `df3390d`..`b8eeaa8`, **245 → 351 tests**, gate verte à chaque pas. Deux plages : une à midi
(1 commit), une de **21:14 à 23:53 — 2 h 40, 17 commits**, coupure de 8 h 28 entre les deux. *Durées
tirées de git : le journal d'activité a été installé en fin de session et ne la couvre pas.*

- **Cause racine des frontières interrompues** (`df3390d`) — ni la taille des polities, ni le relief, ni
  le diagnostic consigné la veille. `separatesRegions` sondait **2 cellules** de part et d'autre d'un ring
  pendant que `snapToCoast` faisait croître chaque revendication de **5 à 12**. Le vrai défaut : **deux
  sources de vérité pour un seul objet** — aplats venant du raster, traits venant des rings.
- **`extractRegionBorders`** — arêtes partagées entre cellules d'indices différents, chaînées sur un
  **treillis d'entiers doublés** (les coins coïncident exactement, aucun epsilon), puis lissées par
  Chaikin. **Sans trou par construction.** Mesuré à 1700 : 6 960 segments bruts, 28 329 après deux tours,
  7–30 ms, contre ~42 661 sommets pour l'ancien chemin.
- **Groupées par couple de polities et rendues en chaînes** (`61fbd52`) — pas en segments : un pointillé
  doit courir *le long* d'une frontière, un décalage parallèle a besoin des voisins de chaque sommet.
- **Types de frontière** — `data/borderStyles` (`solid | dashed | double`), table éditoriale à côté des
  couleurs. Piège attrapé sur données réelles : `Poland-Lithuania` satisfait **les deux moitiés** de sa
  propre règle, donc deux fragments homonymes auraient été séparés d'un pointillé absurde.
- **`scene/composedLineLayer`** — rôles `edge`/`inlay`/`pattern`/`frontier`, poignée unique (un `Group`)
  au lieu d'une liste itérée au redimensionnement, à la frame et au teardown.
- **Coupures en montagne diagnostiquées** (`7d96cb0`) — le relief est **triangulé** alors que les points
  drapés sont posés par interpolation **bilinéaire** entre les mêmes sommets : sur une crête la surface
  passe au-dessus de la ligne et le test de profondeur la mange. D'où `depthTest` désactivé.
- **Frontière contre les terres non revendiquées** — `isLand` injecté. Éteinte à tort après une
  régression côtière, **rallumée après mesure** : 3 429 points inland contre 109 côtiers, 97 % inland.
- **Liaison au zoom** — largeur, opacité, apparition de l'inlay, et une rampe propre au trait à motif.
  **Le brun est la constante, le crème le raffinement**, ce qui résout au passage le finding de contraste
  (crème seul sur l'or espagnol ≈ 1,6:1 ; brun ≈ 4,9:1) sans toucher à la palette.
- **Résolution du raster politique réglable, défaut 2×** (`bafb315`) — marche 7,6 → 3,8 km. Le seul levier
  sans contrepartie : aplats et traits sortent de la même grille. Simplifier la ligne seule a été essayé
  **et rejeté à l'œil** — elle quitte le pays qu'elle borde. Tableau de coûts mesuré dans known-issues.
- **Doctrine de revue reconstruite depuis ses propres échecs** (`db2f304`) — rayon d'explosion, sévérités
  ancrées, constat séparé du remède avec `what_breaks_if_fixed_naively`, résultat nul crédible. Plus la
  règle qui manquait : **`bootstrap()` est le puits de modularité** de cette base (ARCH-012).
- **Overlay de progression + pipeline séquencé** (`b8eeaa8`) — nouvelle couche `src/ui` avec sa frontière
  ESLint, accessible dès la première ligne. Un drapeau levé avant un bloc synchrone est un drapeau que
  personne ne voit.
- **OpenHistoricalMap est CC0** (et non ODbL), exploitable dès ~1700 — mesuré en couverture de surface,
  pas en nombre de polities. Chapitres de roadmap **06** (outils de contribution) et **07** (robustesse)
  écrits.

### 2026-09-16 — Sense of time: activity log + work spans (ported from fubaritico-ds)

Tooling only — **no project code touched**. Ported so this repo gets the same temporal awareness.
Done from the fubaritico-ds session; the four changed `.claude/` files below are **uncommitted**.

- **Why** — sessions here are weeks apart. Without this, the agent has no idea whether you are
  continuing yesterday's work or coming back after two months, so it reopens everything from scratch.
- **Hooks** (in the gitignored `.claude/settings.local.json`, existing hooks untouched): `SessionStart`
  injects a temporal bearing straight into the agent's context **before it speaks**; `SessionEnd`,
  plus `PostToolUse` on `Edit|Write` and `Bash` (all async), feed the log.
- **Log** — `files/session-log.jsonl`, one JSON line per event (`files/` is already gitignored here).
  Local to this machine, never committed. Script is global: `~/.claude/hooks/session-log.sh`.
- **Temporal model** — the technical session (process start/end) is logged but **measures nothing**
  (a terminal left open overnight would read as 14 h of work). Real figures come from **spans**
  (actions < 90 min apart) grouped into **chantiers** (spans < 48 h apart, so a chantier can run
  across several days). Both are derived from action timestamps.
- **Skills** — `/start-session` (v1.1) situates itself in time first and opens differently for a
  continuation vs a long interruption; `/end-session` (v1.1) must write **real** durations into this
  file instead of guessing; new **`/timeline`** answers "how long / since when / how much time on X",
  and falls back to `git log` for history predating the hooks.
- **Caveat** — the log only knows what happened since tonight. Anything earlier lives in git only.

### 2026-09-12 — Genesis: fubaritico-ds → europe-map, Phase 0 + Milestone 1.1

Repurposed the repo from the old `fubaritico-ds` design system into a **3D historical atlas of Europe**
(TypeScript + three.js + Vite). Commits `9dea60e`..`1580921` on `master`. All under a full quality gate.

- **`.claude/` cleanup** — rewrote CLAUDE.md + rules for the three.js project; archived DS/React/Stencil
  skills + agents (and stale `financial-app`/micro-frontend leftovers) to `files/claude-archive/`;
  retooled `/review` to 4 dimensions. `grep fubaritico` → only intentional reminders remain.
- **Quality tooling** (`9dea60e`) — ESLint 9 flat (typed, no React) + Prettier + commitlint + husky
  (lint-staged + type-check + test) + lint-staged. Pinned ESLint 9 / TS 5.7 / tseslint 8.
- **Plans** — roadmap split into `files/plans/atlas/` chapters; spikes cataloged in `files/spikes/`.
- **DEM spike** (`files/spikes/fetch-dem`) — georeferenced heightmap from AWS Terrarium tiles (no key,
  Web Mercator); emits Int16-metres `.bin` + `.json`.
- **Phase 0.1** (`0934783`) — Vite + three.js bootstrap (renderer/scene/camera/loop/resize, Stats + lil-gui).
  Vendored three source via `opensrc`; fixed `Clock`→`Timer`.
- **Phase 0.2** (`a2d67aa`) — camera viewpoint persisted across reload/HMR (`CameraStateStore`,
  sessionStorage, restore-before-first-render, HMR self-accept + teardown). Vitest + jsdom wired.
- **Milestone 1.1** (`1580921`) — Europe relief from the DEM: `heightmap` port + `reliefMesh` (CPU
  displacement). Height **easing** (plains 1:1, peaks eased toward a target — sharp, NOT blur) → game-map
  look. lil-gui defaults: exag 1.0, ceiling 575, peak-target 1900, smoothing 0. 29 tests.

### 2026-09-13 — Euratlas data decision, import boundaries, DEM widening, Milestone 1.3 (grand-strategy camera)

Big camera session. Commits `3dea0d6`..`7d1b20f` on `master`, full gate (type-check/lint/test/husky), **63 tests**.

- **Euratlas research + decision** (memory [[euratlas-data-and-licensing]]) — the local
  `files/resources/euratlas` samples ARE real vector shapefiles (21 centuries) but geographically cropped
  to the Alps; the Simple License forbids redistributing the vectors / reconstituting an atlas → for the
  published portfolio demo, M2 geometry = free **historical-basemaps** (CC-BY), Euratlas kept as a
  **private toponymy reference** (facts, de minimis, never the geometry). No regen needed.
- **Import boundaries** (`3dea0d6`) — ESLint `no-restricted-imports` per layer (data leaf; scene→data;
  camera independent; controls→camera; main root). Modularity enforced without splitting packages.
- **DEM widened** (`be5ebf2`) — regenerated to a Total-War **hors-champ frame** (bbox W−45/S11/E78.75/N76.84,
  1280×1164, ~3 MB); no code change (data-driven mesh). See `next.md` for the regen command.
- **EU4 map camera** (`b2142ad`, `9a32fa6`) — new pluggable `controls/mapControls` replacing OrbitControls:
  arrow pan, wheel zoom, yaw locked north, zoom-linked distance + tilt. **Frustum-aware clamp**: the target
  is bounded so the frustum's ground footprint (raycast of the 4 corners onto `y=0`) stays within a world
  `extent` → pannable area grows when zoomed in, re-centres when out, **adapts to resize**. **Drag-pan +
  edge-scroll**. **Inertia** = velocity + ease-out decay (snappy start, gliding release), factored into
  exported `easeOutDecay`/`driveOrGlide`. Debug overlay `scene/debugRect` (extent + live footprint).
  Persistence `{target, zoom}` on `europe-map:map-camera`.
- **Zoom-linked exaggeration** (`7d1b20f`) — relief flattens as you zoom in (× `exaggZoomIn`, default 0.5),
  cheap `scale.y` transform (no geometry rebuild).
- Multi-agent `/review` each step. A11y deferred to the **M2 HTML-overlay backlog** (window-scoped key
  capture, canvas role/semantics) — keyboard zoom (`+/-/PageUp/Down`), `prefers-reduced-motion`, and
  ctrl+wheel passthrough are already handled.

### 2026-09-15 — Milestone 1.2 (parchment terrain + drawn coastline), dev-panel extraction, portolan decor

Long render-craft session. Commits `50485c0`..`fb50948` on `master`, full gate each step, **120 tests**.
See memory [[portolan-decor-and-line-rendering]] + [[next-render-backlog]].

- **M1.2 terrain** (`50485c0`) — `scene/terrainTexture`: pure compositor (parchment × hypsometric tint ×
  DEM hillshade × **vellum fBm grain**) baked into a `DataTexture` on an **unlit** `MeshBasicMaterial`
  (painted "old map" look, camera-independent). Scene lights removed. `data/coastlineSource`
  (marching-squares 0 m contour → normalized `(u,v)` segments). Coastline drawn as **draped 3D lines** with
  light jitter + overdraw + zoom-linked opacity. `utils/hash` shared. Dev-tuned defaults baked via a
  `⤓ log ALL settings` button.
- **Coastline reversal** (hard-won) — first baked the shoreline INTO the texture; too blurry
  (DataTexture 1280px + LinearFilter resolution ceiling) → reverted to 3D lines. Don't re-try baked lines.
- **Dev-panel extraction** (`44cf533`) — all lil-gui wiring → `src/devPanel.ts` (`createDevPanel(deps)`,
  root-level because it imports controls+scene types the `scene/` boundary forbids). Added
  **`↺ reset to defaults`** (snapshots defaults at build, one rebuild per system — not lil-gui's
  per-controller `reset()` storm).
- **Portolan decor** (`fb50948`) — generalized `coastlineLayer` → **`scene/lineLayer`** (shared uv→3D
  lines). **`scene/rhumbNetwork`**: multi-centre portolan web, each line **walked over the DEM, kept only
  over water** (stops at the coast). **Compass rose D** (`scene/compassRose` + pure `scene/compassRoseSvg`,
  hex-validated) as an SVG→texture quad on the Atlantic, **portolan colour code** (principal ink,
  half-winds green, quarter-winds red). `utils/math` (clamp/lerp) + `disposeHandle` de-dup. Multi-agent
  `/review`: fixed SEC/ARCH/QUAL; **deferred** QUAL-007 (split `createDevPanel` per-folder, extract
  `scene/portolanDecor.ts`).

### 2026-09-16 — Rivers, land mask, fat lines, declarative tunables, political overlay (WIP)

Long session, **120 → 245 tests**, commits `8783364`..`beb24fc` on `master`, full gate each step.

- **Declarative tunables** (`4b9c95a`, `81f32e7`) — `utils/controlSpec.ts` + `devParams.ts`: every option's
  range/step/label declared beside its default, mapped over `keyof T` so an undescribed option fails
  type-check (**verified**: it raises two errors). `devPanel` renders the declaration; `main.ts` seeds
  from the defaults. Tests assert defaults sit inside their own slider and groups cover the table.
  Texture folder split into 7 numbered sub-folders mirroring the compositing order.
- **Fat lines** (`8783364`) — `LineBasicMaterial.linewidth` is pinned to 1 px by WebGL, so any controlled
  width needs `LineSegments2` + `LineMaterial`. Chosen by the caller _asking_ for a width (a `> 1`
  threshold silently ignored sub-pixel values). `setOpacity`/`setColor`/`setResolution` replace callers
  reaching into `object.material`.
- **Rivers** (`f6e3921`) — Natural Earth 10m, 591 polylines / 537 KB, simplified to 500 m (just under a
  screen pixel at max zoom). One layer per `scalerank`; reveal + width interpolate across ranks, opacity
  only, never a geometry rebuild. `extendRiversToSea` bridges mouths (NE stops at the estuary head);
  only _free_ endpoints extend — a tip another polyline passes is a confluence (129 → 96 extensions).
- **Land mask** (`462bed2`, `d6dead5`) — **the session's key correction**: a DEM answers "how high", not
  "wet or dry". Measured: connectivity flood-fill does _not_ rescue the Netherlands (dikes are narrower
  than a cell) and turns the Caspian/Dead Sea into plains. Asset = `ne_10m_land` minus `ne_10m_lakes`
  (the land layer carves no lakes), baked at 4× the DEM, 2.9 MB raw / 152 KB gzipped. 16/16 spot checks.
  Killed `coastCoverage` + `gradientAt`: the mask's bilinear coverage supersedes them.
- **Draping** (`8c584f4`, `50731ac`) — `reliefWorldY` exported from `reliefMesh`; overlays sample the
  _mesh's_ vertex grid (512 segments vs a 1280 DEM), else a river read at its true elevation sits below
  the drawn valley floor. Every draped layer must track `relief.scale.y` or it floats by the
  exaggeration ratio — invisible on a plain, glaring on a crest.
- **Political overlay, WIP** (`beb24fc`) — `historical-basemaps`, 20 centuries, **GPL-3.0 so git-ignored**.
  Rings rasterised in-browser into an index grid; tint is a terrain-bake layer between ground colour and
  hillshade. Claims grow over land the schematic outlines missed; borders keep only stretches separating
  two polities. Colours pinned per power by name pattern, rest from an editable palette, no two
  neighbours alike.
