# Known Issues

Put here the know issues to avoid cluttering the context window.

> Closed entries are archived in `archive/known-issues-closed.md` (move one there the step it closes); atlas-only open issues live in `known-issues-atlas.md`.

- **Depuis le 13/10 au soir, `years/1100/` contient le tracé du test Euratlas, pas l'année du dev.** Son 1100
  (France + Bourgogne) est rangé, intact, dans `years/1100.avant-test-euratlas/`. Le Cartographe ouvre donc
  le test, et l'atlas local le montre à l'année 1100. **À la fin du test** : `years/1100` → `years/1100.test-
  euratlas`, puis `years/1100.avant-test-euratlas` → `years/1100`. Rien de tout ça n'est commité (Euratlas
  est une référence privée). **Depuis la nuit du 14/10**, `years/1100/` tient 137 pays, et les traces de la nuit
  sont `years/1100.euratlas-{16,19,30,48,76,98,137,137b}/` et `1100.before-rename/` — toutes locales, à trier avec
  le dev (aucune n'a été supprimée : `rm -rf` demande sa permission). **Sévérité : à savoir.**
- **Recreuser un vassal après coup est impossible depuis l'outil** (16/10). Le creusement ne tourne qu'à la fermeture
  d'un contour neuf (`addOutlineCarving`) ; un vassal dessiné avant, ou recouvert de nouveau par une retouche du
  suzerain, garde la couleur du suzerain par-dessus (la Champagne, la Frise : recreusées au script). Remède : un geste
  « recreuser » sur un vassal sélectionné, qui appelle `carveOutOfSuzerain` sur chacun de ses anneaux. **Sévérité : à savoir.**
- **J'écris dans `years/`, sa page ne se recharge pas, et son ‹ctrl+s› suivant réécrit l'ancien état** (16/10). Arrivé
  deux fois : la Frise et le renommage des tribus. Règle : après une écriture de ma part, il **recharge sans
  enregistrer** ; et je vérifie l'heure du fichier avant d'écrire. **Sévérité : à savoir.**
- **Un test du contrôleur qui échoue en fait tomber deux autres, les tests ‹espace›** (14/10). Il lève avant son
  `dispose()` et laisse un écouteur sur la page : la panne accuse des tests sains. Remède : un `afterEach` qui
  détache tout canevas attaché dans `controller.test.ts`. **Sévérité : cosmétique** — ne trompe qu'en cas d'échec.
- **Suivre la frontière d'un voisin le long de ses ancres prend encore le plus court sans garde** (14/10) :
  `borderSnap.ringRunTo` → `shortestRunBetween`, quand le fil d'eau, lui, prend l'autre sens s'il repasse sur le
  tracé (`freshStretch`). Le dev n'y a rien vu de faux ; le jour où le même empilement y apparaît, même remède
  (`runsBetween`, le premier qui ne repasse pas). **Sévérité : à savoir.**
- **Le contour de l'étendue coûte ~45 ms pour l'Empire, une fois par geste quand il est visé** (15/10, QUAL-002).
  `extentOutline` teste les deux côtés de chaque tronçon contre les anneaux de tous les membres ; le pré-filtre par
  boîte ne gagne presque rien, l'anneau propre de l'Empire (1 304 ancres) contenant presque tout. Mesuré à chaud :
  Empire 45 ms, France 27 ms, Angleterre 23 ms ; mis en cache par version et pays visé, et `prune` ne le demande
  plus sans sélection. Remède si ça se sent à la plume : un index spatial des tronçons. **Sévérité : à savoir.**
- **Un tronçon entre deux ancres de côte est lu comme de la côte, même s'il coupe la terre** (15/10, QUAL-001).
  Depuis que la côte est demandée avant l'inclusion (les îles dalmates de Venise), un trait droit tiré de côte à
  côte en travers d'une presqu'île — le cou d'un duché tranché d'un seul segment — perd sa frontière avec le pays
  qui l'englobe. **Mesuré sur les 137 pays de 1100 : aucun cas** ; ~200 tronçons changent, tous ≤ 5,7 km (de vraies
  côtes face à un canal étroit), sauf une corde de 17,2 km… au-dessus du golfe de Naples. Remède le jour où ça mord :
  exiger que les deux ancres soient **consécutives sur le trait de côte**, pas seulement prises dessus.
  **Sévérité : à savoir.**
- **Les années enregistrées en local ne sont jamais commitées, et `years/index.json` est en `skip-worktree`
  sur la machine du dev.** Sa décision, 12/10 : *« ils sont pour nous pour travailler »* — retrouver ses
  tracés, déboguer les outils, maîtriser le format. Les dossiers `packages/atlas/public/years/<année>/` sont
  dans `.gitignore`. Le manifeste, lui, est **suivi** (commité avec `"years": []`, l'atlas en ligne le lit) et
  une sauvegarde y ajoute l'année : d'où `git update-index --skip-worktree packages/atlas/public/years/index.json`,
  pour que git ignore cette modification locale. **Trois conséquences** : (1) `git status` ne montre plus ce
  fichier, même modifié — `git ls-files -v` l'affiche avec un `S` ; (2) **en local, l'atlas lit l'année
  dessinée** pour 1100 au lieu du payload GPL, puisque le manifeste local la liste — voulu, c'est ce qui
  permet de vérifier le format ; (3) le jour où une année doit vraiment être publiée, il faut d'abord
  `git update-index --no-skip-worktree` sur ce fichier, sinon il ne partira pas. Réglage **par clone** :
  une autre machine ne l'a pas. **Sévérité : à savoir.**
- **Le design system vient de GitHub Packages, et GitHub exige un token même pour l'installer.**
  `@fubaritico/{tokens,styles,react}` en `^0.2.0` (09/10). Le `.npmrc` du dépôt ne fait que **router**
  le scope, sans aucun token : une ligne `${NODE_AUTH_TOKEN}` y faisait **ignorer tout le fichier** en
  local (variable absente), donc la requête partait sur npmjs et revenait en 404 — mesuré. Le token vit
  dans `~/.npmrc` en local, et `setup-node` (`registry-url` + `scope`) l'écrit en CI. Le vendoring en tarballs n'a vécu qu'une heure, jamais commité : le DS a publié le
  jour même, et a renommé son scope (`@fubaritico-ds/*` → `@fubaritico/*`, `reference` → `react`).
  **Trois choses à tenir** :
  1. **En local, sans token, `pnpm install` échoue** — pour tout le workspace, atlas compris. Le token
     est un **PAT classic avec le seul scope `read:packages`**, dans `~/.npmrc` (fichier utilisateur,
     jamais commité). **Pas `$(gh auth token)` exporté dans `.zshrc`**, que la passation du DS proposait :
     ce jeton porte `repo` et `workflow`, et il serait dans l'environnement de chaque `postinstall`.
  2. **En CI, c'est `${{ github.token }}` dans l'action composite `setup`, pas `secrets.GITHUB_TOKEN`** —
     une action composite n'a pas de contexte `secrets`. Ça marche parce que chacun des **cinq** paquets
     accorde Read à `europe-historical-atlas` (« Manage Actions access »). Un 403/404 sur un seul paquet
     à l'install veut dire que son accès n'a pas été accordé, pas que le token est faux.
  3. **Le jour où le dépôt devient public, un visiteur qui le clone ne pourra pas l'installer** sans un
     token GitHub à lui. La sortie est de publier le DS sur npmjs. **À décider à ce moment-là.**
  **Monter de version** : le DS sort ses cinq paquets à la même version, et un composant neuf est une
  mineure. En `0.x` le caret ne franchit pas une mineure, donc `^0.2.0` ne prendra jamais `0.3.0` seul —
  il faut bumper les trois lignes ensemble. **Le ColorPicker arrive en `0.3.0`.**
  **Sévérité : à savoir.**
- **Les icônes d'outils sont légèrement floues, et c'est accepté — la barre d'actions, elle, est nette.**
  Mesuré le 12/10 dans le navigateur du dev (Retina, ×2) : le trait de 1,4 de la maquette (grille 18×18) ne
  tombe jamais sur des pixels physiques entiers — 58 à 62 % de pixels pleins à ×2, 13 à 37 % à ×1. Un trait
  de 1 px aligné sur un demi-pixel rend les traits droits nets mais pas les courbes ; un trait de 2 px aligné
  rend tout net mais alourdit. **Verdict du dev** : *« ce qui doit être net est net »* — les outils restent
  tels quels ; la barre prend **ses dessins en formes pleines**, posés sur des pixels entiers (100 % à ×1 et
  ×2). Il note que le standard serait 16/1 et 24/1,5. **À retenir** : à ×2, un demi-pixel CSS vaut un pixel
  physique entier — un décalage de 0,5 n'y floute rien, il floute à ×1 ; et un texte sans `line-height`
  entière décale tout ce qui le suit d'une fraction. **Sévérité : cosmétique.**
- **Depuis le 12/10, `lint` attend `^lint` : si le plugin `eslint-plugin-eha` échoue à son propre lint,
  Turbo n'exécute pas le lint des trois autres paquets.** C'est le prix de la correction du cache (sans
  `^lint`, un changement de règle laissait le lint des paquets en `cache hit`, vert sur du code que la règle
  n'avait pas lu — voir `troubleshooting.md`). Conséquence : on ne voit que la première panne ; une fois le
  plugin réparé, le reste s'exécute. Remède si ça gêne : `pnpm exec turbo lint --continue`. **Sévérité : à savoir.**
- **`eha/hoist-independent-function` ne réécrit pas quand le nom est déjà pris** (au module, ou par une
  autre fonction du fichier) : il signale, et c'est l'auteur qui renomme. Voulu — un renommage automatique
  toucherait les références. **Sévérité : à savoir.**
- **La revue de fin de session du 11/10 a laissé ouvert, par décision de moi, ce qui suit — aucun n'est
  bloquant pour un éditeur à un seul auteur, tout est à reprendre avec l'étape 5.**
  **Accessibilité** : (1) **la hiérarchie de l'arbre `{Polities}` n'est pas annoncée** — `aria-level`
  est invalide sur `option` (ARIA 1.2), retiré ; le remède est un texte masqué *« vassal de X »* sur la
  ligne, ou un vrai `tree` (autre modèle clavier). (2) **Le changement d'outil au clavier (‹A›, ‹P›
  depuis un autre outil) et un déplacement dans la pile ne sont pas annoncés** — seul le mode de la
  plume l'est, dans la zone résultat ; le remède est le même puits `onResult` pour les deux. (3)
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
  par couche (`canvas/snapLayers.ts`), la géométrie renommée `lineSnap`. (7)
  `paintRanks` est recalculé à chaque repeinture — ~50 pays, négligeable ; à mettre en cache par
  version si le document grossit. **Sévérité : à savoir.**
- **Le menu d'empilement de `{Polities}` (11/10) a deux limites connues, laissées ouvertes.**
  (1) **Il peut déborder du bord de la fenêtre** : il s'ouvre au point du clic droit (ou sous la ligne
  au clavier), sans se replier — un clic droit sur une des dernières lignes, dans une fenêtre basse,
  coupe le bas du menu (≈ 100 px). Remède : le replier dans un effet de mise en page, une fois mesuré.
  (2) **Il est annoncé comme une liste, pas comme un menu** : c'est le `Menu` du design system, qui rend
  un `role="listbox"` d'`option`. Le remède est au design system (un `role="menu"`), à demander à son
  Claude avec un menu contextuel positionné. **Une boucle d'hommage est refusée à la saisie depuis le 12/10**
  (`updatePolity` / `vassalsOf`, et la liste des suzerains ne la propose pas) — l'entrée écrite ici le
  11/10 disait à tort que rien ne permettait de choisir un suzerain : le formulaire l'avait depuis le
  09/10. Un fichier qui en contient une est peint en dernier, et `documentFaults` le dit une fois. **Sévérité : cosmétique.**
- **Le texte d'erreur sous un champ n'atteint pas 4,5:1 — la palette n'a pas d'encre d'alerte assez claire.**
  Relevé au pas 3 du design system (09/10). Le DS colore le message d'erreur d'un champ avec
  `--color-destructive-hover`, et notre seule teinte d'alerte est `--warn #c86a52` : **3,89:1** sur
  `--panel`, **4,36:1** sur `--bg`. C'est du texte, donc WCAG 1.4.3 demande 4,5:1. La bordure rouge d'un
  champ invalide, elle, passe (3:1 suffit pour une bordure).
  **Le remède est une couleur, donc une décision du dev** : une encre d'alerte plus claire, réservée au
  texte. `theme.test.ts` porte ce manque en **manque déclaré** — le test tombe le jour où une teinte
  assez claire est posée, et il faut alors basculer la paire dans `TEXT_PAIRS`.
  **Déclencheur** : le premier message d'erreur affiché, au formulaire de `(c2)` — *« id déjà pris »*.
  **Déclassé le 09/10 par le dev** : le contraste n'est pas une contrainte qu'il tient pour l'éditeur
  (*« on s'en fout des contrastes »*). Le manque reste mesuré et déclaré, plus rien n'en dépend.
  **Sévérité : cosmétique.**
- **Le zoom du Cartographe est « acceptable », pas fluide — et ce qui reste n'est plus les vecteurs.**
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
- **Un glob `.ts` cesse d'être inoffensif le jour où un `.tsx` existe, et ce dépôt en avait quatre.**
  Trouvés le 01/10 en ajoutant le Cartographe, tous **corrigés** : la table des frontières ESLint
  (`files: '*.ts'`), l'exemption des budgets de lisibilité pour les tests (`**/*.test.ts`),
  `.lintstagedrc.json`, et `vitest`'s `include`. Trois ont été trouvés par la revue ou la gate, **pas** en
  les cherchant.
  **Ce que chacun coûtait** : un lint ou un test **vert sur du code que rien n'avait lu** — la forme d'échec
  la plus chère de ce dépôt, parce qu'elle ne se voit pas.
  **La règle qui en sort** : dans ce dépôt, un glob qui nomme une extension s'écrit `{ts,tsx}` sauf raison
  explicite. **Et le corollaire de procédure** : à l'arrivée d'une extension nouvelle, `grep -rn "\.ts'" `
  sur la config AVANT d'écrire le premier fichier, pas après. **Cosmétique maintenant**, bloquant si on
  ajoute un jour `.vue`, `.mts` ou des composants Stencil.
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
- **`scripts/merge-coverage.mjs` n'est linté ni testé par rien** (ARCH-005 / QUAL-003, 01/10, **laissé
  ouvert**). `turbo lint` ne fane que sur les paquets, le fichier est hors de tous les `tsconfig`, et il n'a
  pas de suite. Il porte pourtant de la logique — la réécriture des chemins `SF:` — dont la régression ne
  sortirait **nulle part** : le job Sonar est délibérément non bloquant.
  **Pourquoi ouvert plutôt que corrigé** : les deux remèdes coûtent plus que le défaut aujourd'hui. Un 4e
  paquet `tooling` est propre mais c'est une structure pour 60 lignes ; une invocation ESLint dédiée à
  `scripts/` demande un bloc de config qui désactive le lint typé, le fichier étant hors tsconfig.
  **Cosmétique**, et Prettier le couvre désormais au commit. À reprendre si `scripts/` grossit.
- **Le cache de Turbo ne sert à rien en CI.** Chaque job part d'un runner neuf et `.turbo` n'est jamais
  restauré, donc les trois jobs de `validate.yml` sont toujours froids. Localement il marche (mesuré :
  8 ms, `FULL TURBO`, contre 8,4 s à froid). **Cosmétique** — le remède est un `actions/cache` sur `.turbo`
  ou le cache distant, et ça gagnerait des secondes sur une gate qui se compte en secondes. Écrit en tête
  de `validate.yml` pour que personne ne croie le contraire.
- **Toute la ligne ESLint 9 est en fin de support.** `9.39.5` **est** la dernière 9.x — l'avertissement
  `deprecated` de npm ne dit pas qu'une version plus haute existe, il dit que la 9 n'est plus maintenue
  depuis la sortie de la 10. **Décision du dev, 01/10 : on reste en 9**, et le coût est qu'il n'y aura plus
  de correctif de sécurité dessus. **À savoir**, à reconsidérer quand la 10 aura quelques mois — et noter
  que la 10 change un comportement qui nous concerne : elle résout la config **par fichier** et non depuis
  le répertoire courant, ce qui rendrait les configs par paquet lisibles sans lancer `eslint` depuis chacun.
- **Le canevas du Cartographe a deux boîtes géographiques et une seule image.** La **bbox de rendu** (celle
  du DEM : W −45 / S 11 / E 78,75 / N 76,84) est ce à quoi la texture cuite est géoréférencée ; la **zone
  éditoriale** déclarée par le document est lon −45…60, lat 20…76. Elles ne coïncident pas. Projeter contre
  l'une en dessinant le fond contre l'autre fait **tout glisser, sans erreur nulle part** — même famille que
  le manifeste dont la bbox n'est vérifiée par personne (entrée ci-dessous).
  **Décidé le 29/09, avant d'écrire une ligne** : le repère du canevas est celui **du fond**, seul
  géoréférencé par construction ; la zone éditoriale est un **cadre dessiné par-dessus**, ce que le glossaire
  dit déjà d'elle (« la planche, nommée au-dessus de son cadre ») et ce que `s12` sépare.
  **Sévérité : bloquant si oublié, réglé si appliqué.** À relire au début de `4b`.
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
- **Un geste modifie le document AVANT que l'historique l'enregistre : si la copie échoue entre les deux,
  `ctrl+z` ne peut plus revenir dessus.** Relevé en écrivant `createPolity` (4d-2 (c1), 08/10), et **écrit
  une fois ici plutôt qu'argumenté à chaque action** : les gestes de dessin de `(d)` — poser une ancre, en
  déplacer une, fermer un anneau — auront tous cette forme.
  **Dans l'ordre** : (1) le geste modifie le document, (2) l'historique en prend une copie pour pouvoir y
  revenir, (3) l'état est publié. Si l'étape 2 échoue, le pays est **dans le document mais pas dans
  l'historique** : rien ne sait le retirer. `canUndo` reste faux et aucun pas n'apparaît — c'est exactement
  ce que le test « propagates a failing copier » vérifie.
  **Pourquoi on ne le corrige pas** : les deux remèdes coûtent plus que le défaut. Copier *avant* de muter
  doublerait le coût de chaque geste (~265 Ko le pas) pour couvrir un cas qui n'arrive pas —
  `cloneYearDocument` sur un document valide ne lève pas, et un `RangeError` de mémoire aurait déjà tout
  emporté. Rattraper et défaire serait un `catch` qui continue, ce que `rules/error-handling.md` demande de
  discuter avant d'écrire : l'échec est **propagé bruyamment**, et c'est la branche choisie.
  **Déclencheur** : le jour où un copieur peut légitimement échouer — si un pas se met à sérialiser, ou si
  l'autosave de `s15` partage ce chemin. **Sévérité : à savoir, pas bloquant.**
- **Le test-vedette d'un module peut être celui qui n'attrape rien, et `4b` en donne le cas le plus net.**
  `s01` spécifie le zoom par une seule invariante — *« le point sous le pointeur y reste »* — donc c'est le
  test qu'on écrit en premier. **L'implémentation naïve passe 88 tests sur 90, dont celui-là.** Elle fait
  glisser l'origine du facteur *demandé* au lieu du facteur réellement appliqué, ce qui est juste tant que
  le zoom ne bute pas sur ses limites et faux dès qu'il bute : la carte continue de glisser en refusant de
  grossir, et se détache du pointeur.
  **Ce qui l'attrape, ce sont les deux tests de butée**, écrits parce que `clampScale` existe. Même famille
  que l'étape 2, où le test le plus important passait contre une sauvegarde cassée.
  **La règle qui en sort** : quand une spécification tient en une invariante, le test de cette invariante
  n'est **pas** la garde — la garde est le test du cas où l'implémentation plausible cesse d'y satisfaire.
  Chercher ce cas explicitement.
  **Troisième occurrence le 05/10, à `4c`, et celle-ci est la plus instructive parce que le test fautif
  était écrit *exprès* pour le piège.** « Chaque polyligne pesée contre les autres » : avec le pointeur là
  où je l'avais mis, la première ligne n'avait **aucun** sommet en portée, donc la version naïve — rendre
  la première ligne qui a une touche — enchaînait sur la seconde et répondait juste. Le sabotage était
  attrapé par un *autre* test, celui du cas dense, **par accident**. Réécrit pour que les deux lignes aient
  un sommet en portée, et le sabotage rejoué le fait tomber.
  **Donc la règle se double d'une procédure** : après avoir écrit le test d'un piège, vérifier qu'il tombe
  contre l'implémentation naïve — pas que la suite tombe, **que ce test-là tombe**. Un sabotage attrapé par
  la suite entière ne dit pas lequel des tests garde quoi.
- **Recharger un jalon jette ce que la ligne tenait après lui, et rien ne le décide encore.** `restoreMarker`
  remplace la ligne par ce que le jalon a gelé ; ce qui suivait le pas marqué disparaît. Le code **ne prend
  aucune politique**, délibérément : le mécanisme est dans `core`, la décision appartient au chrome, et
  `rules/error-handling.md` en fait une décision produit et non un détail d'implémentation.
  **Les trois réponses sont écrites dans `s14-history-panel.md` avec leur coût.** Proposition : poser un
  jalon automatiquement avant de recharger, donc rien n'est jamais perdu — au prix d'une liste qui grossit
  seule. **Sévérité : à savoir, décision du dev, ne bloque pas l'étape 4.**
- **Un jalon fait que le plafond de 50 pas cesse de borner la mémoire.** Il tient sa propre suite d'entrées
  par référence, donc ce que la ligne laisse tomber reste vivant sous chaque jalon qui l'a gelé. C'est
  **le but** d'un jalon, pas un défaut — mais ça veut dire qu'un éditeur laissé ouvert avec dix jalons profonds
  tient dix lignes complètes. **Cosmétique aujourd'hui** (aucune interface), et le remède existe déjà :
  `[Clear]` sur un jalon. À re-mesurer si l'usage réel montre des jalons nombreux.
- **Le plugin `pmndrs` est activé dans un fichier gitignoré, donc il ne suit pas le dépôt.** Installé le
  29/09 **au niveau du projet** (choix du dev, et c'est le bon : ailleurs, R3F et drei seraient du bruit),
  il vit dans `.claude/settings.local.json`, que le `.gitignore_global` ignore. Conséquence : sur une autre
  machine ou après un clone, les skills `pmndrs:docs` / `pmndrs:examples` et le MCP `docs.pmnd.rs`
  **ne sont pas là**, et je répondrais de mémoire sur les API Zustand sans le signaler.
  **Remède, deux lignes** : `/plugin marketplace add pmndrs/claude-code-plugin` puis
  `/plugin install pmndrs@pmndrs`. **Cosmétique**, même famille que l'entrée `opensrc` juste en dessous —
  et comme elle, c'est la raison pour laquelle « vérifié dans la doc officielle » n'est pas reproductible
  ailleurs sans la commande.
- **Un clone `opensrc` est local à la machine, jamais au dépôt.** `opensrc/` est gitignoré (ligne 22), ce qui
  est voulu — three.js et Zustand (v5.0.15) y sont. Conséquence : sur une autre machine, il faut relancer
  `npx opensrc@0.6 path <pkg>`, et un agent qui suppose les sources présentes lira du vide. **Cosmétique**,
  mais c'est la raison pour laquelle une affirmation « vérifié dans la source » n'est pas reproductible
  ailleurs sans la commande.
- **Annuler un sabotage avec `git checkout --` sur un fichier modifié mais non commité le ramène à `HEAD`.**
  Fait le 29/09 en vérifiant une garde : la restauration a emporté `cloneYearDocument`, qui n'était pas encore
  commité. Rattrapé tout de suite, rien de perdu. **La règle** : pour défaire un sabotage de vérification,
  copier le fichier avant (`cp`) ou éditer à la main — `git checkout` ne connaît que le dernier commit.
  **Cosmétique**, mais ça coûte une réécriture à chaque fois.
- **Le manifeste des années déclare la bbox du rendu, et personne ne vérifie qu'elle correspond au DEM.**
  `years/index.json` porte la boîte géographique contre laquelle les années dessinées se projettent, et elle
  **doit** être celle du DEM : si elle diffère, chaque frontière glisse hors du terrain qu'elle borde, sans
  erreur nulle part. Le choix de la déclarer plutôt que de la lire du relief était volontaire — la prendre du
  relief chargé rendrait la source dépendante de l'ordre de chargement, ce dont `mapSources` met en garde.
  **Le remède existe déjà et n'est pas branché** : `boundsMatch` dans `assetError.ts`, appelé là où les deux
  boîtes sont en main, c'est-à-dire dans le pipeline. C'est le contrôle `semantic` de la taxonomie.
  **Sévérité : à savoir, pas bloquant** — aucune année n'est encore dessinée (`years: []`), donc la boîte
  n'est lue par rien. À brancher avant de publier 1100.
- **Un override de bout survivant à la suppression d'un pays garde ses ancres en vie.** `referencedAnchors`
  compte un `RunBorder` comme une référence, délibérément : un trait posé à la main est une décision, et
  laisser tomber les points sous lui l'annulerait en silence (ce que `s13` interdit). Conséquence assumée :
  supprimer un pays dont un tronçon était stylé laisse ces ancres dans le fichier, invisibles, sans aucun
  contour qui les tienne. **Le remède est `{Overrides}`**, qui les liste comme orphelines avec son
  `[Clear]` — mais ce panneau n'existe pas encore. **Cosmétique tant que l'éditeur n'a pas d'interface** ;
  à ne pas « corriger » en supprimant l'override, ce serait le défaut inverse et plus grave.
- **Un test vert du premier coup ne prouve rien, et une casse arbitraire ne le vérifie pas non plus.**
  Découvert le 27/09 sur le test le plus important de l'étape 2 — celui qui garantit qu'un aller-retour
  sauvegarde/chargement **conserve le partage des ancres**. Deux sabotages plausibles ne l'ont **pas** fait
  tomber : une `Map` indexée sur l'ancien index fait converger les deux références par accident, donc le test
  passait contre une sauvegarde cassée.
  **Ce qui l'a fait tomber** : l'implémentation naïve que *quelqu'un écrirait vraiment* — chaque pays
  emportant sa propre copie de ses points, ce que fait exactement `RegionPayload`.
  **La règle qui en sort** : pour vérifier une garde, écrire le code qu'un développeur écrirait sans y penser,
  pas une mutilation choisie au hasard. Consigné en mémoire [[verify-a-test-with-the-plausible-naive-code]].
- **`commitlint` avertit `footer-leading-blank` sur tout message long.** Il prend un paragraphe contenant un
  deux-points pour un footer. C'est un **warning**, il ne bloque pas, et il est revenu sur trois commits du
  27/09. **Cosmétique** ; le remède serait de désactiver la règle ou d'éviter les deux-points en fin de
  message, ce qui n'en vaut pas le prix.
- **Un motif `.gitignore` qui contient une barre oblique est ancré à la racine du dépôt.** C'est la cause
  du seul vrai incident du 24/09 : `public/borders/` a **cessé de matcher** le jour où le passage en
  monorepo a mis `public/` sous `packages/atlas/`, et les 21 fichiers GPL-3.0 sont partis sur GitHub au
  `git add` suivant. **Le motif ne dit rien quand il cesse de s'appliquer.**
  **Remède appliqué** : `**/public/borders/`, qui matche à n'importe quelle profondeur et survit au
  prochain déplacement. **Règle générale** : dans ce dépôt, un motif d'ignore s'écrit avec `**/` sauf
  raison explicite, parce que l'arborescence bougera encore (le Cartographe et Payload arrivent).
  **Et la leçon de procédure, qui vaut plus que la règle** : l'audit « rien d'interdit ne part » avait
  été fait *avant* le déplacement et jamais rejoué après. Un audit d'ignore se refait **après** tout
  déplacement de dossier, pas avant.
  Résolu : historique réécrit, dépôt supprimé et recréé, et la CI **assère** désormais l'absence de
  `dist/borders`.
- **`packages/core/README.md` décrit un paquet qui va changer.** Il annonce « le format, les lecteurs, le
  compositeur, les maths ». Deux choses s'y ajouteront et n'y sont pas : le **type de date historique**
  (`HistoricalDate`, plan P8) et les **tables de traduction** (ICU, même section). Cosmétique, à faire
  quand l'un des deux arrive — mais un README de paquet est la première chose qu'un lecteur ouvre dans un
  monorepo, donc il ne doit pas mentir longtemps.
