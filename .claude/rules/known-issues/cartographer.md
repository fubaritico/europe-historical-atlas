---
paths:
  - "packages/cartographer/**"
---
# Known issues — the Cartographer

Open issues of `packages/cartographer`, its tests and its tooling. Loaded by path; indexed in `.claude/known-issues.md`.

- **Modifier le code du serveur de dev du Cartographe (`src/devServer/`) n'est pris en compte qu'après un redémarrage
  du serveur** (18/10). `vite.config.ts` charge chaque point d'entrée à sa première requête puis le garde en mémoire
  (`mountEndpoint`) : une modification faite après ce chargement est ignorée, et le serveur répond avec l'ancien code —
  vu sur *Open snapshot* (*« "/1100/snapshots" is not a draft »*). Modifier `vite.config.ts`, lui, redémarre le serveur.
  Remède : après un changement dans `devServer/`, demander au dev de relancer `pnpm dev:cartographer` ; remède durable,
  oublier le module chargé quand un fichier de `devServer/` change (`server.watcher`). **Sévérité : à savoir.**
- **Les raccourcis d'empilement (16/10) laissent un constat de revue ouvert, par ma décision.** — CARTO-123 (1) ~~A11Y-002 :
  le même message répété n'est pas relu~~ — **fait le 18/10** (CARTO-121) : `writeResult` alterne un espace sans
  largeur sur une répétition ; pas d'essai au lecteur d'écran, par décision du dev (*« l'accessibilité pour la
  politesse »* dans un outil de dessin). (2)
  ARCH-001 : la règle « une flèche modifiée ne fait ni défiler la carte ni bouger le curseur de la liste » est écrite à
  trois endroits (`controller.panFromKeys`, `PolityList`, `stackingShortcut`) ; à mettre en commun au prochain
  raccourci du même genre. **Sévérité : cosmétique.**
- **Depuis le 18/10, l'atlas lit le relief du niveau 6 (1 920 de large) et le Cartographe celui du niveau 5 (1 280)** —
  les deux fonds de carte ne sont plus cuits du même relief, ce que la table de parité promet (`0ee299d`). **Le dev garde le
  niveau 6** (19/10 : *« ça fonctionne »*). Remède : une ligne dans `packages/cartographer/src/main.tsx`
  (`/heightmaps/europe-dem-z6-1920`), puis son test. **Sévérité : à savoir.**
- **Recreuser un vassal après coup est impossible depuis l'outil** — CARTO-189 (16/10). Le creusement ne tourne qu'à la fermeture
  d'un contour neuf (`addOutlineCarving`) ; un vassal dessiné avant, ou recouvert de nouveau par une retouche du
  suzerain, garde la couleur du suzerain par-dessus (la Champagne, la Frise : recreusées au script). Remède : un geste
  « recreuser » sur un vassal sélectionné, qui appelle `carveOutOfSuzerain` sur chacun de ses anneaux. **Sévérité : à savoir.**
- **Un test du contrôleur qui échoue en fait tomber deux autres, les tests ‹espace›** — CARTO-124 (14/10). Il lève avant son
  `dispose()` et laisse un écouteur sur la page : la panne accuse des tests sains. Remède : un `afterEach` qui
  détache tout canevas attaché dans `controller.test.ts`. **Sévérité : cosmétique** — ne trompe qu'en cas d'échec.
- **Suivre la frontière d'un voisin le long de ses ancres prend encore le plus court sans garde** (14/10) :
  `borderSnap.ringRunTo` → `shortestRunBetween`, quand le fil d'eau, lui, prend l'autre sens s'il repasse sur le
  tracé (`freshStretch`). Le dev n'y a rien vu de faux ; le jour où le même empilement y apparaît, même remède
  (`runsBetween`, le premier qui ne repasse pas). **Sévérité : à savoir.**
- **Les icônes d'outils sont légèrement floues, et c'est accepté — la barre d'actions, elle, est nette.**
  Mesuré le 12/10 dans le navigateur du dev (Retina, ×2) : le trait de 1,4 de la maquette (grille 18×18) ne
  tombe jamais sur des pixels physiques entiers — 58 à 62 % de pixels pleins à ×2, 13 à 37 % à ×1. Un trait
  de 1 px aligné sur un demi-pixel rend les traits droits nets mais pas les courbes ; un trait de 2 px aligné
  rend tout net mais alourdit. **Verdict du dev** : *« ce qui doit être net est net »* — les outils restent
  tels quels ; la barre prend **ses dessins en formes pleines**, posés sur des pixels entiers (100 % à ×1 et
  ×2). Il note que le standard serait 16/1 et 24/1,5. **À retenir** : à ×2, un demi-pixel CSS vaut un pixel
  physique entier — un décalage de 0,5 n'y floute rien, il floute à ×1 ; et un texte sans `line-height`
  entière décale tout ce qui le suit d'une fraction. **Sévérité : cosmétique.**
- **La revue de fin de session du 11/10 a laissé ouvert, par décision de moi, ce qui suit — aucun n'est
  bloquant pour un éditeur à un seul auteur, tout est à reprendre avec l'étape 5.** — CARTO-121, CARTO-207
  **Accessibilité** : (1) ~~la hiérarchie de l'arbre `{Polities}` n'est pas annoncée~~ — **fait** (`1d2429c`) :
  un texte masqué *« vassal of X »* sur la ligne (`PolityList.tsx`). (2) ~~le changement d'outil au clavier et
  un déplacement dans la pile ne sont pas annoncés~~ — **fait** (`1d2429c`, `toolKeys.ts`, `arrange.ts`). (3)
  **Tracer au clavier est impossible** (plume et crayon), déjà connu pour l'étape 5 (*« the anchor
  list »*) ; le rail annonce pourtant ces outils. (4) Le groupe de la plume s'ouvre à ‹→›, sans
  `aria-keyshortcuts`. (5) Cibles de 24–30 px, densité Illustrator assumée. (6) **La poubelle désactivée ne dit pas pourquoi au clavier** (12/10,
  A11Y-001) : un bouton `disabled` ne prend pas le focus et son `title` *« Select a polity to delete »* ne
  s'entend qu'au survol. Laissé tel quel : D3 veut la poubelle grisée sans cible, et la barre d'état dit déjà
  *« Sélectionnez un pays »*. Remède si besoin : `aria-disabled` + une description masquée.
  (7) **⟨retracer⟩ ne se trace pas au clavier non plus** (14/10, A11Y-002) — même manque que (3) : le rail l'annonce
  avec ‹R›, rien ne permet de choisir une ancre sans pointeur. Et **‹espace› est la seule touche simple entendue sur
  toute la page** (quand le pointeur est sur la carte et que le focus est arrivé par un clic) : voulu par le dev
  (*« quel que soit l'outil, espace donne la main »*), et un focus arrivé par ‹Tab› la laisse au contrôle
  (A11Y-001, corrigé). Ni réglable ni désactivable, ce que WCAG 2.1.4 demanderait pour une touche simple globale ;
  remède si besoin : une préférence. **‹alt› n'est entendu que par le canevas** (14/10, ARCH-002) : focus ailleurs,
  l'aperçu de l'autre côté ne bascule qu'au prochain mouvement du pointeur — le clic, lui, lit `altKey` et décide
  juste. Remède le jour où une troisième touche tenue arrive : un seul objet pour les touches tenues, nourri par les
  deux écoutes.
  **Architecture** : (6) ~~« côte ou fleuve » sur cinq aiguillages~~ — **fait le 12/10** : une table
  par couche (`canvas/tools/snapLayers.ts`), la géométrie renommée `lineSnap`. (7)
  `paintRanks` est recalculé à chaque repeinture — ~50 pays, négligeable ; à mettre en cache par
  version si le document grossit. **Sévérité : à savoir.**
- **Le menu d'empilement de `{Polities}` (11/10) a une limite connue, laissée ouverte.** — CARTO-122
  (1) ~~Il peut déborder du bord de la fenêtre~~ — **fait** (`2c3acf8`, `components/shared/menuPlacement.ts`) : il se replie.
  (2) **Il est annoncé comme une liste, pas comme un menu** : c'est le `Menu` du design system, qui rend
  un `role="listbox"` d'`option`. Le remède est au design system (un `role="menu"`) : **demande rédigée le 18/10**,
  `files/plans/cartographer/ds-request-menu-role.md`, à transmettre par le dev à son Claude. **Une boucle d'hommage est refusée à la saisie depuis le 12/10**
  (`updatePolity` / `vassalsOf`, et la liste des suzerains ne la propose pas) — l'entrée écrite ici le
  11/10 disait à tort que rien ne permettait de choisir un suzerain : le formulaire l'avait depuis le
  09/10. Un fichier qui en contient une est peint en dernier, et `documentFaults` le dit une fois. **Sévérité : cosmétique.**
- **Le texte d'erreur sous un champ n'atteint pas 4,5:1 — la palette n'a pas d'encre d'alerte assez claire.**
  Relevé au pas 3 du design system (09/10). Le DS colore le message d'erreur d'un champ avec
  `--color-text-destructive` (`--color-destructive-hover` avant la 0.7.0), et notre seule teinte d'alerte est `--warn #c86a52` : **3,89:1** sur
  `--panel`, **4,36:1** sur `--bg`. C'est du texte, donc WCAG 1.4.3 demande 4,5:1. La bordure rouge d'un
  champ invalide, elle, passe (3:1 suffit pour une bordure).
  **Le remède est une couleur, donc une décision du dev** : une encre d'alerte plus claire, réservée au
  texte. `theme.test.ts` porte ce manque en **manque déclaré** — le test tombe le jour où une teinte
  assez claire est posée, et il faut alors basculer la paire dans `TEXT_PAIRS`.
  **Déclencheur** : le premier message d'erreur affiché, au formulaire de `(c2)` — *« id déjà pris »*.
  **Déclassé le 09/10 par le dev** : le contraste n'est pas une contrainte qu'il tient pour l'éditeur
  (*« on s'en fout des contrastes »*). Le manque reste mesuré et déclaré, plus rien n'en dépend.
  **Sévérité : cosmétique.**
- **Le zoom du Cartographe est « acceptable », pas fluide — et ce qui reste n'est plus les vecteurs.** — CARTO-120
  Jugé par le dev le 07/10 après deux corrections : la coalescence des repeintures sur
  `requestAnimationFrame` (on peignait **dans** le gestionnaire, donc 60 à 120 fois par seconde) puis
  l'élagage au viewport et la décimation au pixel écran. Mesuré : de **95 233 points** de côte, une
  repeinture en trace **26 619** à la vue d'ouverture (28 %) et **45 574** au pire cas, l'échelle 2
  (48 %) — assez zoomé pour que la décimation ne morde plus, pas assez pour que l'élagage écarte grand
  chose. Donc **2 à 3,6×**, pas un ordre de grandeur.
  **Ce qui reste, et c'est là qu'il faudra regarder** : chaque repeinture redimensionne aussi l'**image
  du relief**, 2560×2328, vers la taille de la fenêtre. Une seule opération, mais sur 6 millions de
  pixels, et elle ne dépend d'aucun des deux leviers déjà tirés. Remèdes possibles, non évalués :
  pré-redimensionner le fond par palier de zoom (un `ImageBitmap` par octave), ou passer la couche de
  fond à WebGL — ce qui rouvrirait la décision « le canevas est 2D », prise le 22/09 parce que le mode
  `overlay` de la cuisson est natif en 2D et demanderait un shader.
  **Un reste qui n'est pas de moi** : le zoom continue après la fin du geste, parce que macOS envoie des
  événements `wheel` d'inertie pendant une seconde. Aucune API standard ne distingue l'inertie d'un vrai
  geste ; ce que font les cartes en ligne est de **viser une échelle et s'y rendre en douceur**, ce qui
  l'absorbe. Non fait.
  **Sévérité : à savoir, accepté en l'état par le dev.**
- **`@testing-library/jest-dom@7` ne type pas sous Vitest 5**, et c'est amont, pas une erreur de config.
  Vérifié dans les deux sources : jest-dom déclare `interface Assertion<T>`, Vitest 5.0.3 déclare
  `interface Assertion<R extends void | Promise<void> = void, T = unknown>`. La fusion de déclarations exige
  des **listes de paramètres identiques**, donc l'augmentation échoue en silence — les matchers fonctionnent
  à l'exécution et `tsc` refuse chaque appel. **Les deux moitiés de la gate se contredisent.**
  **Décision du 01/10 : jest-dom retiré**, assertions écrites contre le DOM (`getAttribute`, `textContent`).
  `@testing-library/react` et `user-event` restent — ce sont eux qui portent le travail.
  **Sévérité : à savoir.** Ne pas le réinstaller sans vérifier que l'arité a bougé d'un côté ou de l'autre ;
  l'autre issue est une augmentation écrite à la main, donc une rustine sur un type tiers.
- **Le nettoyage de `@testing-library/react` ne s'installe pas dans ce dépôt, et il faut le déclarer.**
  Lu en source : il n'enregistre son `afterEach` que `if (typeof afterEach === 'function')`, donc **seulement
  si les hooks du runner sont globaux**. Toutes nos configs les importent explicitement.
  **Ce que ça coûte sans le remède** : les rendus s'empilent dans le même document et une requête par rôle
  trouve l'élément du test précédent — l'erreur se lit *« Found multiple elements »*, ce qui **accuse le
  sélecteur et pas la fuite**. Trouvé par un test écrit exprès pour ça.
  **Remède en place** : `packages/cartographer/vitest.setup.ts`. **Tout nouveau paquet React devra avoir le
  sien** — c'est la chose qu'on oubliera.
- **Un garde « une seule fois » sous `StrictMode` doit retenir la promesse, jamais un booléen — et le
  test qui compte les appels ne voit pas la différence.** Trouvé en revue le 07/10, sur du code livré le
  même soir, et c'est un **vrai bug qui aurait mordu en dev uniquement**, donc exactement là où le dev
  travaille.
  **Le mécanisme, à ne pas re-déduire** : `StrictMode` exécute *setup → cleanup → setup* **synchronement**
  au premier montage, avant qu'aucune microtâche ne tourne. Avec un garde booléen (`if (started.current)
  return`), le second setup sort immédiatement : il n'enregistre **aucun** nouvel écouteur. Or le cleanup
  du **premier** setup a déjà basculé son drapeau `settled`. Le seul `.then` qui existe est donc lié à une
  fermeture annulée. Les deux assets se chargent, le terrain se cuit, **et la réponse part à la poubelle** —
  l'éditeur reste sur « Préparation du fond de carte… » pour toujours.
  **La forme juste** : la **promesse** vit dans le ref (créée par l'invocation qui trouve le ref vide), et
  **chaque** invocation attache son propre `.then` avec son propre drapeau. La première annule alors son
  seul écouteur redondant, la survivante tire.
  **Et le même défaut existe un cran plus bas, sur la progression** : un sink passé à `load` l'est **une
  fois**, donc un sink capturé par la première invocation est muet. Il passe par un ref réinstallé à chaque
  invocation. Celui-là est pire à trouver, parce qu'**une barre qui ne bouge pas se lit comme un
  chargement rapide**, pas comme une panne.
  **Ce que le test ratait, et c'est la leçon** : il assérait `load` appelé **une** fois — vrai, et
  insuffisant. Charger une fois ne vaut rien si la réponse est jetée. Il faut **assérer le résultat**, pas
  le compte d'appels. Les deux moitiés ont désormais leur test, chacun vérifié en rejouant son défaut.
  **Sévérité : corrigé** ; à relire au premier composant de l'étape 5 qui charge quoi que ce soit.
- **Le plugin `pmndrs` est activé dans un fichier gitignoré, donc il ne suit pas le dépôt.** Installé le
  29/09 **au niveau du projet** (choix du dev, et c'est le bon : ailleurs, R3F et drei seraient du bruit),
  il vit dans `.claude/settings.local.json`, que le `.gitignore_global` ignore. Conséquence : sur une autre
  machine ou après un clone, les skills `pmndrs:docs` / `pmndrs:examples` et le MCP `docs.pmnd.rs`
  **ne sont pas là**, et je répondrais de mémoire sur les API Zustand sans le signaler.
  **Remède, deux lignes** : `/plugin marketplace add pmndrs/claude-code-plugin` puis
  `/plugin install pmndrs@pmndrs`. **Cosmétique**, même famille que l'entrée `opensrc` de `tooling.md` —
  et comme elle, c'est la raison pour laquelle « vérifié dans la doc officielle » n'est pas reproductible
  ailleurs sans la commande.
- **Les boundaries du 21/10 (ATLAS-159, étape 3a) laissent trois points ouverts.** (1) **Après « Réessayer », le focus clavier
  retombe en haut de la page** (A11Y-001) : le bouton part avec le message, et le corriger demande d'envelopper chaque zone dans
  un élément focalisable, ce qui touche la mise en page de toutes les zones — ouvert par ma décision, chemin rare. (2) **Une zone
  en panne le reste jusqu'au rechargement**, sauf la carte (« Réessayer ») et les menus (« Fermer ») — conforme à la décision du
  dev. (3) **Le message montre le texte brut de l'erreur** (SEC-001), qui peut nommer un chemin ou un détail interne : sans risque
  tant que le Cartographe tourne chez le dev ; proposé au dev, **pas encore tranché** : ne l'afficher qu'en développement
  (`import.meta.env.DEV`), à décider avant la démonstration en ligne (CARTO-200). **Et ce qu'aucune boundary ne voit** : une
  erreur levée pendant un geste (gestionnaire d'événement, `requestAnimationFrame`) n'est montrée nulle part — le Cartographe n'a
  pas de filet de page ; proposé au dev : en rouge dans la barre d'état. **Sévérité : à savoir.**
