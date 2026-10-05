# Known Issues

Put here the know issues to avoid cluttering the context window.

- ~~**`CLAUDE.md` dit « No React, no monorepo, no design system »**~~ — **CORRIGÉ 2026-10-01** (`7f75624`),
  au moment où React est entré dans le dépôt. `rules/architecture.md` et `rules/troubleshooting.md` ont été
  corrigés dans le même commit : le premier affirmait encore « No Turbo and no Lerna », le second disait
  « Plain three.js (no React/R3F) » **une section au-dessus** de l'édition Turbo qui venait d'y être faite.
  **La leçon de procédure** : la revue a trouvé que `CLAUDE.md` et `architecture.md` affirmaient que `core`
  est interdit de React **par ESLint** alors que la garde ne connaissait que `three`. Écrire la doc avant la
  garde produit la pire des deux situations — **une promesse qu'aucun outil ne tient.** Ne jamais décrire une
  garde au présent avant de l'avoir cassée exprès.

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
- ~~**Zustand détecte un changement par identité de référence, et notre document est muté en place.**~~ —
  **FERMÉ 2026-10-05** par `packages/cartographer/src/state/editionSlice.ts`, et l'entrée ne connaissait que
  **la moitié** du problème. La moitié écrite : le document est muté en place (`yearDocument.ts`, « Mutable on
  purpose »), donc après une édition l'objet a la même référence et un sélecteur `s => s.document` ne voit
  rien. Remède, le compteur de version — en place, incrémenté par **chaque** action.
  **La moitié qui manquait, et elle casse dans l'autre sens** : le côté lecture de `History` est fait de
  **getters sur une cellule mutable**, et `rows`/`markers` appellent `.map()` à chaque lecture — donc un
  tableau **neuf** à chaque fois. Un sélecteur dessus fait que `getSnapshot` rend une valeur neuve à chaque
  rendu, ce que React refuse ; `useShallow` ne sauve pas, les rangs étant eux aussi des objets neufs. Et
  `History` lui-même est une référence **stable**, donc un sélecteur dessus ne se déclenche jamais.
  **Les deux moitiés échouent** : d'où l'instantané plat pris à chaque action, la ligne vivant dans la
  fermeture de la fabrique et non dans l'état.
  **Le piège dans le piège, à ne pas re-découvrir** : `Object.assign` et le spread **évaluent les getters et
  en copient la valeur**. Donc mettre des getters dans l'état *marche par accident*, et le sabotage qui le
  fait ne casse **aucun test** — l'aplatissement se fait en aval de `snapshot`. Ce qui fait tomber la garde
  (9 tests) est un `publish` qui n'incrémente que le compteur sans relire la ligne.

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

- **`favicon.svg` existe maintenant en deux exemplaires, et c'est un arbitrage, pas un oubli.**
  `packages/atlas/public/favicon.svg` et `packages/cartographer/public/favicon.svg`, 819 octets, **identiques
  à l'octet** (demande du dev, 05/10 : *« le même favicon que pour l'app »*).
  **Pourquoi pas partagé** : Vite ne sert **qu'un seul `publicDir` par paquet**, et celui de l'atlas porte
  aussi le DEM de 3 Mo et le masque de terres — pointer le Cartographe dessus lui ferait servir les assets de
  l'atlas et couplerait les deux applications pour 819 octets. Les autres remèdes coûtent plus que le défaut :
  un lien symbolique ne survit pas à Windows ni proprement à git, un plugin de copie est une dépendance pour
  un fichier.
  **Ce que ça coûte, et c'est tout** : si la marque est redessinée, **les deux copies doivent bouger**. Rien
  ne le vérifie — aucun test de ce dépôt ne lit un `index.html`, et en inventer un pour un `<link>` statique
  serait un motif neuf pour peu. **Cosmétique**, même famille que la double copie du PNG de terrain plus bas.
  **Et un piège trouvé en le faisant** : **Vite ne retire pas les commentaires HTML**. Une première version de
  l'explication, écrite dans `index.html` à la densité habituelle du dépôt, faisait passer le fichier servi de
  0,35 à **1,12 ko** — 770 octets de raisonnement livrés à chaque visiteur. Le raisonnement vit ici, le HTML
  garde une ligne. À se rappeler pour tout commentaire dans un `index.html`.

- ~~**Le Cartographe n'a aucune ligne dans la table des frontières ESLint.**~~ — **FERMÉ 2026-10-05** à
  l'étape 4b, et la fermeture a trouvé **une cause plus grosse que le trou**.
  **Un `files` de la config racine est résolu contre le répertoire de la config CHARGÉE, pas contre le
  fichier où il est écrit.** Donc une ligne écrite dans `eslint.config.js` pour
  `packages/cartographer/src/view` matche depuis la racine et **matche rien** depuis le paquet — qui est
  exactement d'où son `lint` tourne. Mesuré à `--print-config`, pas déduit : avec la config racine seule et
  `basePath` = le paquet, la règle est **absente**. C'est la sœur de « flat config n'a aucune cascade », un
  cran plus loin : **une ligne de frontière ne se partage pas avec un paquet qui possède sa config.**
  **Et une config morte est pire que pas de config, parce qu'elle a l'air d'une garde.** La première version
  de cette ligne a été écrite dans la table racine et n'a **rien** attrapé — trouvé en la cassant, pas en la
  relisant.
  **Remède en place** : `eslint.config.js` **exporte** `layerBoundary` et `LAYER` ; le Cartographe compose
  ses propres lignes avec des globs **relatifs au paquet**. Et chacune **recompose l'interdit `three`**,
  parce que `no-restricted-imports` est une règle unique — un bloc paquet-large posé après les lignes de
  répertoire les effacerait en silence, ce qui était **déjà le cas** avant cette correction.
  Prouvé en cassant : `view/` → `state/`, `state/` → `main`, `three` dans `main.ts`, et `three` **dans**
  `view/` — ce dernier étant la preuve que la composition tient. Le lint vert prouve l'autre moitié :
  `view/` lit toujours `core/geo`, dont `resolution.ts` a besoin.
  **Une direction a été relâchée après revue, et la faute est nommable** : ma première ligne interdisait
  aussi `state/` → `view/`, soit **une symétrie là où le principe est une direction**. `view/` est une
  **feuille** d'arithmétique pure, lue d'en haut exactement comme `geo/` et `utils/` le sont par `data/`
  dans `core` ; et `4d` met le viewport **arrêté** dans une slice, que le canevas statique relit. La ligne
  symétrique aurait bloqué le cas voulu, et l'aurait fait découvrir à `4d`. Ce qui tient le pan et le zoom
  **par frame** hors du store est une règle sur *quand* on appelle `set` (`rules/troubleshooting.md`), pas
  un interdit d'import — un interdit bloquerait aussi la valeur commitée.
  **`geometry/` a sa ligne depuis le 05/10** (étape 4c), prouvée en la cassant avant d'écrire une ligne de
  code. **Reste `canvas/`**, à ajouter dans `packages/cartographer/eslint.config.js` quand le répertoire
  naîtra.
  **Et la preuve manuelle n'est plus la seule** : `packages/cartographer/src/boundaries.test.ts` interroge
  la **résolution** de la config (`calculateConfigForFile`) sur un fichier réel de chaque couche et assère
  les options auxquelles `no-restricted-imports` aboutit. C'est le bon niveau, parce que ce qui s'est cassé
  n'était pas que la règle ne tirait pas — c'était qu'elle **ne s'appliquait pas**, résolue sans aucun
  `patterns`. Vérifié en reproduisant l'état du soir : la ligne `view/` retirée du paquet fait tomber
  **4 tests** là où la gate était verte, et le retour de `LAYER.main` à `'**/main.ts'` en fait tomber un.
  **Deux approches écartées, et pourquoi** : `lintText` sur un chemin virtuel échoue avant la règle
  (*« was not found by the project service »*, le lint typé refusant un fichier hors tsconfig) ; écrire des
  fichiers jetables dans `src/` marcherait et a été refusé, parce qu'un run interrompu les laisserait là et
  le `lint` suivant échouerait sur un fichier que personne n'a écrit.
  **À savoir pour la suite** : `calculateConfigForFile` rend **`undefined`** pour un chemin ignoré, pas un
  objet sans règles. « Aucune config » et « la règle est absente » sont deux faits différents.
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
- **Le quota Sonar de l'organisation est presque plein, et le Cartographe le fera déborder.** Le palier
  gratuit couvre **50 000 lignes de code privé par organisation**. Mesuré le 24/09 : **42 666 lignes**
  consommées par les autres projets de `fubaritico`, **~7 500** par celui-ci une fois les données
  générées exclues — soit **~50 200 au total**, sur le fil.
  **Ce que ça veut dire** : chaque millier de lignes du Cartographe rapproche du mur, et l'échec prend la
  forme d'un `403` au scan, pas d'un message clair.
  **Trois issues, aucune urgente** : délier un vieux projet privé de l'organisation (deux clics, libère
  largement) · rendre ce dépôt public, ce qui le sort entièrement du compteur (gratuit et illimité pour
  le public) · payer. **Sévérité : à savoir, pas bloquant** — la *quality gate* a été corrigée le 24/09
  pour que Sonar ne bloque plus une mise en ligne, un problème de quota n'étant pas un verdict sur le
  code.
- **`packages/core/README.md` décrit un paquet qui va changer.** Il annonce « le format, les lecteurs, le
  compositeur, les maths ». Deux choses s'y ajouteront et n'y sont pas : le **type de date historique**
  (`HistoricalDate`, plan P8) et les **tables de traduction** (ICU, même section). Cosmétique, à faire
  quand l'un des deux arrive — mais un README de paquet est la première chose qu'un lecteur ouvre dans un
  monorepo, donc il ne doit pas mentir longtemps.

- ~~**The activity-log hook writes to a _relative_ path, so a `cd` splits the journal in two.**~~ —
  **FIXED 2026-09-24**, and it had cost more than the one stranded line this entry knew about.
  `~/.claude/hooks/session-log.sh` built its path from the payload's `cwd`, so any session working in a
  subdirectory started a second journal there. **Five** had accumulated, holding **68 actions** between
  them — `files/plans/files/` alone held 62.
  **What it actually cost, measured**: the evening of 2026-09-22 was logged as **99 actions** and is in
  truth **166**. Durations were right (the span's endpoints had been captured either way), the volume of
  work was not. `/timeline` and `/start-session` read these figures, so the project's own record of
  itself was wrong by a third on that span.
  **The fix** walks up from `cwd` to the nearest directory holding `.git` and logs there; outside a git
  repository the old behaviour is kept. The report's title was reading the same wrong variable, so it
  announced `cartographer-design` as the project. Both verified by running the report from the offending
  subdirectory. The strays were merged back, deduplicated (exactly **one** duplicate — the line this
  entry says was merged by hand), and removed; a backup sits at `/tmp/session-log.backup.jsonl`.
  **Residue, cosmetic**: the recovered lines carry paths relative to the _old_ working directory, so the
  "most touched files" list shows `scenarii/s99-holes.md` and `files/plans/cartographer/scenarii/s99-holes.md` as two
  entries for one file. Counts and durations are unaffected. Rewriting those paths would mean editing
  history for a ranking nobody decides anything on — left alone deliberately.
- **`terrainOptions.ts`'s comment on `politicalMode` contradicts its value.** The comment argues for
  `'normal'` _"rather than multiply"_, and the value is `'overlay'` — a tuning pass moved the value and
  left the reasoning behind. Cosmetic, but it is the kind of comment someone trusts instead of reading the
  code. Fix it when that file is next opened. (Confirmed 2026-09-22 while checking that the Cartographer's
  fills must composite in `overlay` to match the bake — they must.)
- **The terrain PNG now exists in two places**, `files/spikes/terrain-bitmap/out/europe-terrain.png` and
  `files/plans/cartographer/design/assets/europe-terrain.png`, 6.6 MB each. The second is what makes
  the design screens open standalone, so the duplication is deliberate — but it is a copy that can drift
  from its generator. Regenerate both from the spike if the texture defaults ever change.

- **`buildTitle` in `mapLayerBuilders.ts` is reached by no test** (QUAL-021, found 2026-09-18, **left
  open**). It is the only code turning the `frame.title*` tunables and `MAP_TITLE` into the mesh laid on
  the sheet, and it is reachable only through `rebuildFrame`, which `mapLayers.test.ts` never calls.
  `mapTitle.test.ts` covers `buildMapTitleSvg` and `createMapTitle` in isolation, so what is untested is
  the **wiring** — the outer edge, the offset, the lift. Open rather than fixed because the file is in
  the blast radius of the rename, not in its diff; it was already untested before. The atlas's name
  growing from 16 to 23 characters passed through it with no test exercising the path.
- **The focus mode has no keyboard way in** (A11Y-301, found 2026-09-18, **left open by decision**).
  Escape _leaves_ the focus, so half the feature is keyboard-operable; nothing enters it. A
  keyboard-only reader can pan and zoom but can never reach the close-up the feature exists for, and
  `MapControls.focused` is reflected nowhere in the DOM, so no screen reader learns the camera changed
  mode.
  **Why it was not fixed on the spot**, and the disagreement worth recording: the review's own remedy
  says to wait for M2's keyboard-reachable region list, on the grounds that binding a key to "the
  screen centre" would focus a point the reader cannot choose. **That argument does not hold here** —
  the arrow keys already move the camera's ground target, so the centre of the view _is_ the keyboard
  cursor, and it is exactly the point the reader just chose. A key bound to `focusOn(target.x,
target.z)` would be coherent with the navigation that already exists.
  It is open because it is **the dev's call, not an oversight**: the dev has already said the trigger
  is provisional and that the real entry will be a 3D button driven by event importance
  (`files/plans/atlas/focus-mode.md`). Deciding the keyboard gesture now would be deciding it twice. The
  announcement half (`aria-live` on entering/leaving focus) genuinely does wait for the HTML overlay.
- **A `click` fires at the end of every drag, and a map has to say so itself.** The DOM sends `click`
  whenever press and release share an element, _however far the pointer travelled between them_ —
  there is no built-in movement threshold, which is why Leaflet and Mapbox suppress the post-drag
  click explicitly. Caught in review on 2026-09-18, before it shipped: the single click had just been
  given a meaning (`panTo`), so every release of a drag-pan would have been answered by a 1400 ms
  flight with a full pull-out and dive.
  The fix is `MapControls.pointerDragged`, decided **once, where the drag lives**, from the pixel path
  walked during the press against a 4 px tolerance. **Do not let a second module decide it again**: a
  threshold in the gestures and a threshold in the controls would disagree about a slightly imprecise
  click, and no test could see the disagreement because it would live in two places. Note the
  tolerance also fixes something that predated it — `mapControls` treated _any_ movement during a
  press as a drag, so a click that wobbled panned the map.
  Guarded by two tests that were verified by breaking the guard on purpose, one against a stand-in and
  one composing the real controls with the real gestures.

- **Vertex colours are written in sRGB into an attribute three reads as linear.** `scene/graticuleFrame`
  and `scene/mapEdge` are the only two users of `vertexColors`, and both do `tone.r / 255`. three
  composites in a _linear_ working space and converts to sRGB on output, so the value is brightened a
  second time and every one of those surfaces renders far lighter than its hex.
  **Measured on screen 2026-09-18, by decoding the dev's own screenshot**: `edgeBase` `#5f5342` predicted
  at `(164, 155, 139)` treating sRGB as linear, observed `(162, 155, 141)`. The band's near-black ink
  `#1a120b` is lightened the same way.
  **Why it matters beyond the look**: it silently eats any darkening. Two rounds of "plus foncé" on the
  cut edge moved the hex a long way and barely moved the screen — while brightening, in the same stroke,
  a wall the dev could not see. Anything tuned by eye on those two modules was tuned against the bug.
  **The fix** is a `srgbChannelToLinear` at the point the attribute is filled (written and reverted on
  2026-09-18 — it was landing in the middle of a visual regression and made the change unreadable).
  Mixing may stay in sRGB; only the last step converts. **Retuning the frame and the edge is part of the
  fix, not a follow-up.**
- **The map's thickness is cut at the wrong edge.** `createMapEdge` builds two walls and only one of them
  belongs where it is:
  - the **section** — sea level up to the land's surface — exists only where there is land at the map's
    boundary. That is the "épaisseur de l'Afrique" the dev asked for, and it is correctly placed.
  - the **board** — a uniform skirt below sea level, the whole way round, open ocean included. On screen
    _downward_ and _outward_ are the same direction as soon as the camera tilts, so it projects across
    the margin and fills the graduated band's transparent blocks with its own flat colour. **Measured:
    0.06 of depth covered 23 px against a 17 px band; at 0.165 it swallowed the band and part of the
    label lane.** Any positive depth intrudes — it is geometry, not tuning.
    `edgeDepth` is therefore **0**. The board can only come back once the thickness is carried by the
    **sheet's outer edge** instead of the map's — which is what the dev's own drawing showed: the _paper_
    has a thickness, not the inner rectangle. Not built.
- **The frame writes no depth, so anything drawn after it paints over it** — fixed 2026-09-18 by
  `FRAME_RENDER_ORDER`, and worth keeping because the failure mode is invisible. It cannot write depth
  (it would z-fight with the sheet four thousandths below it), so its visibility depended on landing in
  the transparent queue, which depended on `bandOpacity < 1`. At exactly 1 the band disappeared
  entirely with no error. The tell: the degree labels survived and the band did not, and the only
  difference between them was opacity. **Any new layer printed on the sheet needs an explicit order.**
- **The frame's three rules have no matter in them** (raised by the dev, 2026-09-18). They are geometry
  — perfect rectangles — while everything beside them has been given a broken edge: the degrees are
  displaced by the browser's own turbulence, the band reads through to the fibre beneath it. Two ways
  out, and they are not equivalent: rasterise the rules as SVG with the same turbulence (coherent with
  the numbers, but they lose their crispness at maximum zoom, which is the one thing geometry buys), or
  irregularise their edges in geometry (crisp, and a different piece of work — a rule is four vertices
  today and would become a strip). Not decided.
- **The sheet is baked on the main thread** and costs ~278 ms at 1024 and ~988 ms at 2048, which is why
  it is not baked at the terrain's density. The honest fix is to bake it in the worker, like the terrain.
- **A test that takes `Math.abs` of a gap cannot see a reversed order.** How the side borders shipped as
  two giant blocks instead of 66: `latitudeToVertical` descends in Z, `segmentsBetween` assumed
  ascending, and every assertion about graduation spacing was written on absolute differences. The
  graduations are now sorted, and two assertions check the ordering itself.

- **`historical-basemaps` is GPL-3.0, with no separate data licence** (checked at the source: its
  `LICENSE` is the GPL and the README carves out nothing). A strict reading means redistributing those
  files puts the whole distributed work under GPL-3.0. `public/borders/` is therefore **git-ignored** —
  a spike to look at, not an asset to ship. Publishing needs one of: accepting GPL-3.0 for the project,
  fetching from upstream at runtime rather than redistributing, or a permissive source. The earlier
  session note claiming "historical-basemaps (CC-BY)" was **wrong**.
- ~~**Political borders are interrupted where states are small**~~ — **FIXED**, and the recorded cause was
  wrong. It was never about polity size: `separatesRegions` probes **2** DEM cells either side of a ring,
  while `snapToCoast` lets `expandRegionsOverLand` grow every claim by up to **its own value** (5–12).
  Wherever the expansion moved the frontier further than the probe reaches, both samples land in the same
  polity and the stretch is discarded — structural, and guaranteed, not a tuning matter. The real defect
  was having **two sources of truth for one object**: fills from the raster, borders from the rings.
  `extractRegionBorders` derives the line from the raster itself, so it _is_ the boundary of the
  fills — gapless by construction. **The ring path and its `border source` toggle were deleted on
  2026-09-17**, the comparison having been settled on screen. With them went `separatesRegions` and, more
  usefully, the political grid's trip back to the main thread: nothing on this side read it any more, and
  at the 4× raster that copy cost **45 MB a year**.
- **The border staircase is a _resolution_ problem — do not try to fix it on the line alone.** A
  grid-derived border runs along cell edges, so a diagonal comes out as a staircase one cell high
  (~7.6 km at the DEM's own resolution, 45°N). Smoothing cannot remove it: corner-cutting shrinks the
  wiggle, but the amplitude belongs to the shape being smoothed. **Simplifying the line was tried on
  2026-09-16 and rejected on sight**: it moves the _line_ and not the coloured area, so the two visibly
  come apart — the same two-sources-of-truth failure the raster derivation was built to abolish.
  Softening the colour boundary to compensate was tried alongside it and rejected too: it dissolves any
  territory narrower than the softening, which on a fragmented year (the Lorraine mosaic under Louis XIV)
  is exactly what must survive. Both knobs were removed rather than left off.
  **The fix with no trade-off is a finer political raster**: the fill and the line both come out of that
  grid, so they stay together by construction. It also answers the Cartographer's grid-resolution
  question in roadmap chapter 06 — one grid, asked about in two places. Measured on 1700 (rasterise +
  expand + derive borders), which is what a change of year costs:
  | scale                                                                                                    | grid                    | step   | time   | segments |
  | -------------------------------------------------------------------------------------------------------- | ----------------------- | ------ | ------ | -------- |
  | 1×                                                                                                       | 1280×1164, 1.5 M cells  | 7.6 km | 95 ms  | 29 418   |
  | 2×                                                                                                       | 2560×2328, 6.0 M cells  | 3.8 km | 215 ms | 62 459   |
  | 4×                                                                                                       | 5120×4656, 23.8 M cells | 1.9 km | 825 ms | 130 877  |
  | The expansion dominates, not the rasterising — it is a breadth-first walk over every land cell, so it    |
  | grows with the area while the rasterising grows with the perimeter.                                      |
  | **Gotcha when changing it**: everything measured in _cells_ must scale with it, `snapToCoast` above      |
  | all, or its reach in kilometres silently halves and the colours stop short of the coastline again.       |
  | **Now held by construction** — the multiplication happens once, inside `inlineCompute.computePolitical`, |
  | rather than at each call site.                                                                           |
  | **Default raised to 4× on 2026-09-17**, once the compute moved off the main thread: the 825 ms it costs  |
  | is nobody's freeze any more. Cells go from 3.8 km to **1.9 km**. What it buys is the only fix to the     |
  | staircase with no trade-off, since fills and lines come out of the same grid.                            |
  | **What it costs, measured**: a 5120×4656 grid is 23.8 M cells, so **45.5 MB** for the `Int16Array` in    |
  | the worker, another 45.5 MB for the copy sent back to the main thread, and 45.5 MB more transiently      |
  | while `expandRegionsOverLand` copies to grow the claims — a peak around **136 MB** during a change of    |
  | year. Workable, but no longer negligible; watch it if a finer grid is ever considered.                   |
- **4× is a desktop default, and the resolution should eventually adapt — to the _machine_, not the
  network.** Raised by the dev on 2026-09-17 as "different resolutions depending on network speed", which
  is the wrong axis and worth stating plainly: the political raster is computed in the browser from a DEM
  and a mask that are downloaded at the same size whatever the setting. Changing `rasterScale` costs CPU
  and memory and **not one byte on the wire**. Two genuinely separate questions hide behind the one idea:
  - **Machine capability → `rasterScale`.** 825 ms and a 136 MB peak is a different proposition on a
    phone than on a laptop. Do not guess it from `navigator.deviceMemory` / `navigator.connection` —
    both are Chromium-only as far as is known here, and unverified. **Time the first political compute
    and step the scale down if it is slow**: a measurement works everywhere and tells the truth.
  - **Bandwidth → asset size.** The real network cost is the DEM (3 MB) and the mask (3 MB), both fixed
    today. Adapting that means generating tiers of each asset, which does not exist — `fetch-dem` takes a
    zoom, so it is possible, but it is a data-pipeline job, not a runtime toggle.
- **The political grid no longer leaves the worker, and picking should keep it that way.** A
  `PoliticalResult` carries the colours and the border lines, nothing else. When **M1.4 picking** lands,
  the reflex will be to ask for the grid back so a click can be answered here — resist it: a click is one
  query, a query is a message, and a round trip costs a millisecond against 45 MB held for the session.
  The port should grow a `regionAt(u, v)` rather than a getter for the cells, which also fits the design
  constraint already recorded — a click must return a **list** from a spatial query, not a single hit.
- **Islands no polygon claims stay uncoloured** (Balearics, Aegean): `expandRegionsOverLand` walks over
  land only, and BFS cannot cross the sea to reach them.
- ~~**The texture bake is one indivisible synchronous block, and it is where the tab still freezes**~~ —
  **FIXED 2026-09-17** by moving the whole compute into a worker (`src/pipeline/`). The bake was never
  splittable; it had to leave the thread. Two ports rather than one, because **the bake is not political**
  — it is what the relief load, the mask load and the texture tunables trigger, and folding it into a
  political port would have left a second bake behind for the other four callers. Consequence worth
  keeping: **the texture sliders stopped freezing the tab too.**
  The enabling fact was that `composeTerrainRgba` is pure — extracting it out of `scene/` into a
  three-free `pipeline/` layer is what keeps the worker chunk at **12.6 kB with no three.js in it**
  (measured on `pnpm build`; without the split, three ships twice).
  **Still true**: scrubbing centuries _smoothly_ is a separate problem, needing a second transparent
  surface above the relief at the cost of `overlay` and `softLight`, which only exist in the CPU
  compositor. And **4× is no longer ruled out** — it was rejected for blocking 825 ms, which is no longer
  this thread's problem. Not yet tried.
- **Only the newest call may write back, and it must be checked after _every_ `await`.** Once the compute
  went async, two overlapping rebuilds could resolve out of order and settle the map on a position the
  reader had already left — silently, with no error. `utils/latestOnly` gates both rebuilds. The subtlety
  that cost a review finding: guarding only the final state write is not enough, because a stale call
  goes on to rebuild the texture and the border layer afterwards. **One gate per result** — sharing one
  would have a bake needlessly cancel a year.
- **A worker that dies mid-session falls back to the main thread**, but recovering means redoing the
  setup: the inline compute starts holding neither the sources nor the year. `failoverToInline` re-pushes
  the sources and recomputes the year. Untested against a real worker crash — only against a simulated
  `onerror`.
- **`colorBySuzerain` does not merge two vassals unless the suzerain is pinned.** `assignRegionColors`
  colours by _index_ against adjacency and never reads a name; the option only changes which name is
  offered to the editorial pinning rules. So two princes under an unpinned crown still come out in
  different colours. Found while testing the compute port, 2026-09-17 — the option half-works, and the
  panel label promises more than it delivers.
- **`sea level (m)` no longer moves the coastline.** The land mask decides it now; the slider only sets
  the hypsometric ramp's origin. Rename or retire it before it wastes someone's afternoon.
- **The Elbe is not bridged to its mouth** — cause unidentified (confluence wrongly detected, or the sea
  out of range). Loire, Seine, Garonne and Thames are.
- **GPU max texture size is not checked.** The bake is 2560 px wide at supersample 2 and 3840 at 3, while
  WebGL2 only guarantees 2048. Fine on desktop, not guaranteed everywhere; clamp from
  `renderer.capabilities.maxTextureSize` if it ever bites.
- ~~**`devPanel.ts` has no tests** (it imports lil-gui and would need a DOM)~~ — **WRONG, and fixed
  2026-09-17.** The claim was never checked. lil-gui runs under jsdom; the only thing missing is
  `window.matchMedia`, which is three lines to stub. Two sets of sliders were lost to a file that was
  testable all along.
  What now guards it: **every one of the 117 controls is moved and must trigger at least one callback**,
  against an allow-list of the ones that are deliberately inert because the render loop reads them every
  frame. Verified by breaking a wiring on purpose — the test named `revealStart`, the exact shape of
  both past failures. The subtlety it cost: most controls bind `onFinishChange`, not `onChange`, since a
  rebuild must not run on every drag frame — a test that fires only the first finds the panel inert and
  is itself the thing that is wrong.
  The dispatches are covered too: a border paint redraws, border smoothing re-traces, a change of year
  rebuilds in full, and the sea level rebuilds the coastline and the rhumbs that share it.
  **Still true**: the widths and reveal thresholds are captured when a layer is built, so every river
  tunable needs a rebuild and only the colour has a live setter.
- **The dismiss button's two accessibility defects are fixed** (A11Y-201, A11Y-202, found 2026-09-17).
  The glyph was drawn at `opacity:0.65`, compositing to **3.71:1** against the panel — under the 4.5:1
  floor of WCAG 1.4.3 for 19px non-bold text. Fixed by dropping the alpha entirely rather than picking a
  better number: the ink is caller-supplied, so full ink means the control reads exactly as well as the
  notice title above it, whatever ink is passed. The hit area was sized to the glyph, about 19×23 px; it
  is now 32×32 with the glyph centred. **Note the criterion**: the familiar 44×44 is WCAG 2.5.5, which is
  **AAA**. The AA bar is 2.5.8 (WCAG 2.2) at **24×24** — the old box failed that too. Both are guarded by
  tests, so a restyle cannot quietly undo them.
- **The ESLint boundary glob `**/controls` is too broad** — it matched `utils/controls` as if it were the
  camera-controls layer. Worked around by renaming to `utils/controlSpec`; the config flaw remains and
  will catch the next `something/controls`.
- ~~**`composeTerrainRgba` is long**~~ — **FIXED 2026-09-17**. Split into a row compositor over
  `snowLineDropByRow`, `createShadeSampler`, `seaColorInto` and `writeTerrainPixel`; the declaration half
  of the file moved to `pipeline/terrainOptions.ts`, re-exported so no call site changed.
  **A real defect surfaced in the split**: `createShadeSampler` clamped the indices it read but not the
  interpolation weight, so a position outside the field extrapolated away from it instead of stopping at
  the edge. It looked like a guard and was not. No caller ever passes one, and the fix is bit-identical
  inside the field — `meshSurfaceY` already got this right, which is how the contrast showed.
- **Border contrast: why the line is a casing, and what is left** (A11Y-101). The original single brown
  ink `#5c3a2e` at 0.7 opacity gave ~1.6:1 against `palette1` `#b8554a` (blend computed in _linear_ space,
  as three composites with colour management on; naive sRGB gives 1.7:1 — neither rescues it), against a
  WCAG 1.4.11 floor of 3:1. **The structural point: no single ink can clear 3:1 against this palette**,
  because it spans a wide lightness range — an ink dark enough to read on gold Spain `#d4b24a` (L≈0.46)
  is too light-starved to read on the blue slot `#54719b` (L≈0.16), and the converse for a light ink.
  A **casing** answers it: whichever fill the line crosses, one of its two strokes separates from it —
  but only if the two sit at opposite ends of the lightness scale. Hence cream core `#f3e7cd` inside dark
  brown `#5c3a2e` at 0.9 opacity. _(An intermediate gold core `#d8b24a` was wrong on both counts: same
  lightness band as the casing, and four units from pinned Spain — a gold border on a gold country.)_
  **Still open**: `assignRegionColors` knows nothing about either stroke, so it cannot avoid a fill that
  sits between them; and a guard test asserting every palette slot and pinned colour clears 3:1 against at
  least one stroke would stop a future palette edit reintroducing the problem silently.
- **The frontier line is deliberately faint** (`frontierOpacity` 0.45 over parchment ≈ 1.6:1). It marks
  where the mapped world ends, which is illustrative rather than load-bearing — the coastline and the
  borders carry the functional information. Revisit if it ever becomes the only cue for something.
- ~~**No asset payload is validated, and no failure reaches the user**~~ (SEC-001) — **DONE 2026-09-17**,
  following `files/plans/atlas/07-robustness.md`. All four payloads now go through hand-written readers
  (`data/assetError.ts`) behind one shared helper, as the chapter recommended over a schema library. The
  taxonomy it asked for is real and load-bearing: `transport | schema | consistency | semantic`, carried
  on the error as fields rather than only in a string.
  **What the chapter left open, and how it was settled**: a missing relief is **blocking** — its own
  degraded-mode policy already said "relief missing → there is no map", so the splash stays up and the
  message lands on it. Validation runs **always**, not only in dev, on the chapter's own argument that
  production is when a corrupt asset most deserves a message.
  **Still open from chapter 07**: nothing validates the compass SVG; the contribution tooling (chapter 06) will need the same readers pointed at hand-imported files, which is the case the chapter says
  justifies revisiting the schema-library question.
- **Two error-surface details worth knowing.** A `role="alert"` on a degraded failure would shout about a
  missing river; a `role="status"` on a blocking one would stay silent about a missing map — the severity
  is declared per asset in `assetMessages.ts`, never inferred from how it failed. And a blocking notice
  deliberately has **no dismiss button**: there is nothing behind it to go back to, and a close button
  would promise otherwise.
- **The political tint's black point sits at 0 m** (A11Y-005): with the heightmap layer at default
  strength the coastal contrast against the coastline ink drops from ~6:1 to ~2.7:1. An aesthetic call
  now that the render has been approved.
- **SVG-as-texture needs explicit `width`/`height`** (not just `viewBox`): loaded as an `<img>` for a
  three texture, a viewBox-only SVG rasterises to 0×0 → blank/invisible. `compassRoseSvg` sets both.
- **Compass rose loads async** (SVG → Image → texture via `TextureLoader`): it appears a frame or two after
  the relief. No `onError` wired yet; if it silently fails to show, check the data-URL / SVG validity.
- **Texture regen is a full pixel pass** (~1.5M px): heavy dev-panel tweaks (`terrainTexture`) fire on
  release. Kept snappy by a trig-free integer hash (`utils/hash`); a supersample option was considered
  and declined (memory [[portolan-decor-and-line-rendering]] — baked lines hit the same resolution ceiling).
- **DEM asset committed** (`public/heightmaps/europe-dem-z5.bin`, 2.98 MB) so the app runs after a clone;
  its generator (`files/spikes/fetch-dem`) lives in gitignored `files/` — regenerating needs it.
- **Camera reframing after the DEM widening**: the extent changed (bbox now W−45…E78.75), so a persisted
  camera pose can be off-frame → `sessionStorage.clear()` (map camera key `europe-map:map-camera`) for the framed default.
- **Bundle > 500 KB** (three.js) — Vite warns at build; not optimized yet (code-split later if needed).
- **Camera persistence is scene-agnostic**: after a big scene change the restored pose can be off-frame →
  `sessionStorage.clear()` (map camera key `europe-map:map-camera`) for the framed default.
- **Relief orientation** assumed north = −Z, east = +X; verified visually as correct. If a future DEM looks
  mirrored/upside-down, flip `u`/`v` in `reliefMesh` sampling.
- **A11y backlog (M2 HTML-overlay milestone)**: the map is a bare WebGL canvas with no DOM-accessible
  equivalent. Deferred to when the HTML UI overlay lands (roadmap 03): (a) `mapControls` binds arrow/zoom
  keys on `window` and `preventDefault`s them app-wide (only exempting form fields via `isEditableFocused`)
  → scope to a focusable canvas with `role`/`tabindex` and gate on focus; (b) `<canvas>` needs an
  accessible name/role + a keyboard-reachable region list for picking (M1.4/M2); (c) Stats overlay is
  mouse-only. Keyboard zoom (`+`/`-`/PageUp/Down), `prefers-reduced-motion`, and ctrl+wheel passthrough are
  already handled.
