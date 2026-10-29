---
paths:
  - "package.json"
  - "**/package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
  - "turbo.json"
  - "**/eslint.config.js"
  - "**/tsconfig*.json"
  - "**/vitest.config.ts"
  - ".github/**"
  - ".husky/**"
  - "**/.gitignore"
  - ".npmrc"
  - ".nvmrc"
  - "scripts/**"
  - "packages/eslint-plugin-eha/**"
  - ".lintstagedrc.json"
  - "commitlint.config.*"
  - "sonar-project.properties"
  - ".prettierrc"
  - ".prettierignore"
---
# Known issues — the tooling

Open issues of the repository's tooling: install, lint, Turbo, CI, commits, ignores. Loaded by path; indexed in `.claude/known-issues.md`.

- **Le dépôt tourne sous Node 24 depuis le 21/10** (décision du dev : éviter les ennuis de compatibilité à venir).
  `.nvmrc` dit `24` — la CI et le déploiement Netlify le lisent par l'action `setup` — et `engines.node` exige `>=24`.
  En local : **24.22.1** par nvm (`nvm alias default 24`), les 22.14 et 22.23.3 restent installées. Gate entière et
  build verts sous la 24, sans cache (`turbo … --force`), le lockfile inchangé. **Le shell de Claude Code démarre sous la 22** (vu le 21/10, malgré `nvm alias default 24`) : préfixer chaque commande de
  `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`, ou la gate tourne sous une version que la CI n'a pas. **Un terminal ou WebStorm ouvert
  avant le changement garde la 22** — le relancer ; si WebStorm pointe sur un interpréteur Node explicite, le changer
  dans ses réglages. Node 24 est en maintenance depuis le 20/10, support jusqu'au 30/04/2028 ; **Node 26 devient LTS le
  28/10/2026** (support jusqu'au 30/04/2029) — à reconsidérer après quelques mois de LTS. Le seuil d'avant venait
  d'`eslint-plugin-jsdoc` 65 (`engines` ≥ 22.22.2), que la 24 couvre. **Sévérité : à savoir.**
- **Sous `turbo … --force`, des tests dépassent les 5 s de Vitest : la machine est saturée, pas le code** — REPO-260 (18/10, cause
  trouvée). Log capturé : `Error: Test timed out in 5000ms` sur un test de `core/geo/pointInRing` qui passe en **287 ms** au
  repos, pendant une charge moyenne de **71 sur 8 cœurs**. Turbo lance les cinq suites en parallèle, chaque Vitest ouvre un
  travailleur par cœur, plus les `tsc` et le build : ~40 processus pour 8 cœurs. Le même mal a fait tomber `main.test.tsx`
  (1 sur 17 passages, puis 5 tests d'un coup) — seul, il passe toujours. **Remède** : plafonner les travailleurs de Vitest
  par paquet (`maxWorkers`) ou la concurrence de Turbo, puis remesurer la durée de la gate. **Sévérité : gênant** (une
  gate rouge sur du code juste, dès que tout tourne en même temps).
  **En CI, réglé le 21/10** (`d950e48`) : le job Sonar fait sa couverture paquet par paquet
  (`turbo coverage --concurrency=1`) — deux tests y dépassaient leur délai. Reste la gate locale.
  **Revenu le 29/10 au contrôle avant commit** (`.husky/pre-commit` lance `pnpm run test`, les cinq suites ensemble) : des
  tests du Cartographe au-delà de 5 s, verts seuls ; le même commit relancé une fois est passé (Turbo rejoue de son cache les
  paquets déjà verts). Relancer **une** fois, jamais `--no-verify`.
- **Le design system vient de GitHub Packages, et GitHub exige un token même pour l'installer.**
  `@fubaritico/{tokens,styles,react,behaviors}` en `^0.8.0` (depuis le 09/10 en `0.2.0` ; la 0.7.0 du 21/10 renomme
  les jetons de couleur, CARTO-117). **Après une montée, relancer le serveur de dev** : un Vite déjà lancé garde les
  chemins `.pnpm/…@0.6.0` résolus à son démarrage et sert l'ancienne peau sous le nouveau thème — vu le 21/10. Le `.npmrc` du dépôt ne fait que **router**
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
  3. **Depuis le 19/10 le dépôt est public, et un visiteur qui le clone ne peut pas l'installer** sans un
     token GitHub à lui. La sortie est de publier le DS sur npmjs. **À décider à ce moment-là.**
  **Monter de version** : le DS sort ses cinq paquets à la même version, et un composant neuf est une
  mineure. En `0.x` le caret ne franchit pas une mineure, donc `^0.8.0` ne prendra jamais `0.9.0` seul —
  il faut bumper les quatre lignes ensemble.
  **Sévérité : à savoir.**
- **Depuis le 12/10, `lint` attend `^lint` : si le plugin `eslint-plugin-eha` échoue à son propre lint,
  Turbo n'exécute pas le lint des quatre autres paquets.** C'est le prix de la correction du cache (sans
  `^lint`, un changement de règle laissait le lint des paquets en `cache hit`, vert sur du code que la règle
  n'avait pas lu — voir `troubleshooting.md`). Conséquence : on ne voit que la première panne ; une fois le
  plugin réparé, le reste s'exécute. Remède si ça gêne : `pnpm exec turbo lint --continue`. **Sévérité : à savoir.**
- **`eha/hoist-independent-function` ne réécrit pas quand le nom est déjà pris** (au module, ou par une
  autre fonction du fichier) : il signale, et c'est l'auteur qui renomme. Voulu — un renommage automatique
  toucherait les références. **Sévérité : à savoir.**
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
- **`scripts/merge-coverage.mjs` n'est linté ni testé par rien** — REPO-125 (ARCH-005 / QUAL-003, 01/10, **laissé
  ouvert**). `turbo lint` ne fane que sur les paquets, le fichier est hors de tous les `tsconfig`, et il n'a
  pas de suite. Il porte pourtant de la logique — la réécriture des chemins `SF:` — dont la régression ne
  sortirait **nulle part** : le job Sonar est délibérément non bloquant.
  **Pourquoi ouvert plutôt que corrigé** : les deux remèdes coûtent plus que le défaut aujourd'hui. Un paquet
  `tooling` de plus est propre mais c'est une structure pour 60 lignes ; une invocation ESLint dédiée à
  `scripts/` demande un bloc de config qui désactive le lint typé, le fichier étant hors tsconfig.
  **Cosmétique**, et Prettier le couvre désormais au commit. À reprendre si `scripts/` grossit.
- **Le cache de Turbo ne sert à rien en CI.** — REPO-126 Chaque job part d'un runner neuf et `.turbo` n'est jamais
  restauré, donc les trois jobs de `validate.yml` sont toujours froids. Localement il marche (mesuré :
  8 ms, `FULL TURBO`, contre 8,4 s à froid). **Cosmétique** — le remède est un `actions/cache` sur `.turbo`
  ou le cache distant, et ça gagnerait des secondes sur une gate qui se compte en secondes. Écrit en tête
  de `validate.yml` pour que personne ne croie le contraire.
- **Toute la ligne ESLint 9 est en fin de support.** — REPO-127 `9.39.5` **est** la dernière 9.x — l'avertissement
  `deprecated` de npm ne dit pas qu'une version plus haute existe, il dit que la 9 n'est plus maintenue
  depuis la sortie de la 10. **Décision du dev, 01/10 : on reste en 9**, et le coût est qu'il n'y aura plus
  de correctif de sécurité dessus. **À savoir**, à reconsidérer quand la 10 aura quelques mois — et noter
  que la 10 change un comportement qui nous concerne : elle résout la config **par fichier** et non depuis
  le répertoire courant, ce qui rendrait les configs par paquet lisibles sans lancer `eslint` depuis chacun.
- **Un clone `opensrc` est local à la machine, jamais au dépôt.** `/opensrc/` est gitignoré, ce qui
  est voulu — three.js et Zustand (v5.0.15) y sont. Conséquence : sur une autre machine, il faut relancer
  `npx opensrc@0.6 path <pkg>`, et un agent qui suppose les sources présentes lira du vide. **Cosmétique**,
  mais c'est la raison pour laquelle une affirmation « vérifié dans la source » n'est pas reproductible
  ailleurs sans la commande.
- **`commitlint` avertit `footer-leading-blank` sur tout message long.** Il prend un paragraphe contenant un
  deux-points pour un footer. C'est un **warning**, il ne bloque pas, et il est revenu sur trois commits du
  27/09. **Cosmétique** ; le remède serait de désactiver la règle ou d'éviter les deux-points en fin de
  message, ce qui n'en vaut pas le prix. **Bloquant, lui : `body-max-line-length`** — une ligne du corps de plus de 100
  caractères refuse le commit ; deux refus le 21/10. Écrire le corps en lignes de 90 au plus.
- **Un motif `.gitignore` qui contient une barre oblique est ancré à la racine du dépôt.** C'est la cause
  du seul vrai incident du 24/09 : `public/borders/` a **cessé de matcher** le jour où le passage en
  monorepo a mis `public/` sous `packages/atlas/`, et les 21 fichiers GPL-3.0 sont partis sur GitHub au
  `git add` suivant. **Le motif ne dit rien quand il cesse de s'appliquer.**
  **Remède appliqué** : `**/public/borders/`, qui matche à n'importe quelle profondeur et survit au
  prochain déplacement. **Règle générale** : dans ce dépôt, un motif d'ignore s'écrit avec `**/` sauf
  raison explicite, parce que l'arborescence bougera encore.
  **Et la leçon de procédure, qui vaut plus que la règle** : l'audit « rien d'interdit ne part » avait
  été fait *avant* le déplacement et jamais rejoué après. Un audit d'ignore se refait **après** tout
  déplacement de dossier, pas avant.
  Résolu : historique réécrit, dépôt supprimé et recréé, et la CI **assère** désormais l'absence de
  `dist/borders`.
