# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — le test du dossier `ui/` (CARTO-267), tout de suite

**Le dev a fermé la session avant de tester : *« on reprend directement »*.** Le déplacement de tout le React du
Cartographe sous `src/ui/` est fait dans le **worktree `~/Desktop/WebstormProjects/europe-map-ui`**, branche `ui-folder`,
**indexé, pas commité** ; gate verte. Dans l'ordre :
1. **Son test** — arrêter son serveur du Cartographe, `pnpm -C ~/Desktop/WebstormProjects/europe-map-ui dev:cartographer`,
   l'éditeur s'ouvre, `/workbench.html` affiche ses planches.
2. **`/commit`** dans le worktree, merge dans `main`, **sans pousser**. Le worktree n'est supprimé qu'avec sa permission.

`main` porte `bc0be07` et les états de session, **rien n'est poussé**.

**ATLAS-159 est En cours, le code est fini, le test du dev manque.** Tout texte du Cartographe vient d'un catalogue,
`i18n/fr.json` + `en.json` par portée ; la langue vient de `LocaleProvider` ; `components/shared/` n'existe plus. La
convention est dans `rules/architecture.md`, *Components*, et la mémoire `scope-everything-to-its-component`.

**Ce qui attend le dev :**
1. **Tester dans un navigateur en français** — les panneaux, le rail, le menu d'un pays au clic droit (« Premier plan »), une
   suppression (« Son anneau disparaît »), un enregistrement (« 1100 enregistré · … »). Puis `done ATLAS-159` et pousser.
2. **Deux réponses, toujours** : (a) une erreur levée pendant un geste n'est montrée nulle part — proposé : en rouge dans la
   barre d'état ; (b) le texte brut de l'erreur sous une boundary et sous l'échec du fond (SEC-001) — proposé : en
   développement seulement.
3. **Valider une décision de moi** : la raison technique d'un échec (mots d'un serveur, du navigateur, toujours anglais) ne
   s'écrit plus dans la barre d'état — elle va à la console, la phrase dit « (détail dans la console) ».
4. **`/doctor prompt-audit`** : `.claude/` a changé (architecture, skill du modèle de composant, et `ui/` le 22/10 après-midi),
   à lui faire taper — après le merge de `ui-folder`.

**Pour travailler** : quand il est dans le Cartographe, un **worktree** — et lui dire où il est. Mon shell démarre sous
Node 22 : préfixer `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. **Jamais de `cd`** (trois le 22/10). Parler avec **ses**
mots, un point à la fois.

**Le tableau** : `/trello` → `list`. Un élément du tableau est un **ticket**, jamais une « carte ».

| où | ticket | état |
| --- | --- | --- |
| **Chantiers** | DESIGN-262 La gestion de l'incertitude | l'initiative ; CORE-217 (son palier 1) est **Fait** |
| **En cours** | ATLAS-159 L'atlas et le Cartographe en français et en anglais | codé, commité `bc0be07`, **attend son test** |
| **En cours** | ATLAS-145, ATLAS-152 | inchangés depuis le 18/10 |
| **À valider par le développeur** | CARTO-267 Tout le React du Cartographe dans `ui/` | dans le worktree, **attend son test** |
| **À valider par le développeur** | CARTO-237, CARTO-116, CARTO-122 | inchangés ; CARTO-122 attend le `role="menu"` du DS |
| **À faire**, en tête | CORE-252 (le format d'un événement) | palier de DESIGN-262 ; vient après la mécanique |
| **Idées** | ATLAS-266 Choisir la langue, et s'en souvenir | prêt côté code ; les noms d'étapes de l'historique restent à rendre traduisibles (commentaire du 22/10) |

**Toujours en attente, à lui proposer un jour** : le relief niveau 6 du Cartographe (une ligne, `main.tsx` →
`/heightmaps/europe-dem-z6-1920`, `rules/known-issues/cartographer.md`) ; ce qu'il a tiré de ses lectures du §7 et de
l'introduction du PDF d'Euratlas.

## Where we are

**4 617 tests** (1 263 `core` · 2 190 Cartographe · 995 atlas · 169 plugin `eslint-plugin-eha`, 22/10), gate
verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`). Le chunk worker reste sans
three.js et le Cartographe émet le même, au même hash — vérifié par la CI.

`git log origin/main..main` lit une référence de suivi **qui peut être périmée** : pour la vraie réponse,
`git ls-remote origin main` contre `git rev-parse HEAD`.

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **public** depuis le 19/10, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app** — 1100 y est publié (16/10) |
| CI    | sept jobs — validate ×3, build, sonarqube, quality-gate, deploy — **verte depuis le 21/10, sous Node 24** |
| Sonar | `europe-historical-atlas` sous l'organisation `fubaritico`                  |

**Quatre paquets**, orchestrés par **Turbo**, avec un **catalogue de versions** dans `pnpm-workspace.yaml` :
`core` (pure TS, ni three.js ni DOM ni React ni zustand — tenu par ESLint et `tsc`, tests sous **`node`**),
`atlas` (three.js vanille, `jsdom`), `cartographer` (React 19 + Vite, **sa propre config ESLint** qui
réimporte la racine, son `publicDir` est celui de l'atlas), `eslint-plugin-eha` (nos règles de lint).

**Trois faits de structure à ne pas re-découvrir** : *flat config n'a aucune cascade*, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

**Un seul serveur de dev** : le dev fait tourner le sien (`pnpm dev:cartographer`, souvent sur 5174). Ne pas
en lancer un second ; lui donner l'adresse du sien.

## ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : *« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »*
> L'ordre est dicté par les dépendances, pas par une préférence.

| | c'est quoi | ça livre quoi | on sait que ça marche comment |
| --- | --- | --- | --- |
| **1** ✅ | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche |
| **2** ✅ | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières** | Un document qu'on manipule dans des tests, sans écran | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** ✅ | L'**historique** : un instantané par geste, plus la ligne que `{History}` lit et les **jalons** | `ctrl+z`, et cliquer un rang | même piège : restaurer doit restaurer le **partage**, pas les coordonnées |
| **4** ✅ | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique | On dessine à l'écran | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout |
| **5** ◀ | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée | L'application | les valeurs viennent de `design/chrome.css`, jamais son markup |

Les étapes **4 et 5 créent `packages/cartographer/`** — un troisième paquet, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La vulnérabilité bloquante est fermée** (27/09, étape 2). Une seule invariante y suffit : **le tableau
d'ancres ne perd jamais rien pendant l'édition.** Donc `removePolity` retire une *revendication*, jamais un
point — les ancres de côte d'un pays sont aussi celles de son voisin. Ce qui n'est plus référencé disparaît
à l'enregistrement, par une seule renumération. Vérifié en la cassant : 3 tests tombent.

> Le design system branché, la skill à ouvrir avant de coder et les trois décisions de l'étape 4 sont dans
> `rules/cartographer.md` depuis le 21/10 — chargé dès qu'un fichier du Cartographe est touché.

## Comment répondre, dans ce projet

- **Quand le dev nomme une convention, aller voir TOUS ses dépôts voisins, pas un.** C'est la faute du
  01/10, qui a coûté la première heure de la session et une remise à zéro complète : il a dit que la
  surcharge ESLint se met dans le paquet, j'ai ouvert **un seul** de ses sept dépôts, j'y ai vu une config
  à la racine et j'ai généralisé. Un `find` sur les sept rend **9 configs par paquet**. Les dépôts sont au
  même niveau que celui-ci, dans `~/Desktop/WebstormProjects/`.
- **Avant de mesurer ce qu'un outil fait, lire comment il est appelé.** C'est le défaut sous le défaut, le
  01/10 : j'ai mesuré correctement qu'une config ESLint imbriquée est ignorée par un `eslint .` lancé depuis
  la racine — mais j'avais vérifié **la mauvaise proposition**. La question n'était pas « une config
  imbriquée peut-elle marcher si je garde la commande de la racine ? », c'était « comment lance-t-il son
  lint ? », et la réponse tenait dans une ligne de son `apps/home/package.json` : `"lint": "eslint ./src"`.
  J'avais lu sa config, jamais les **scripts** qui la chargent. **Lire les `scripts` du `package.json`
  avant de mesurer le comportement d'un outil** — de la rigueur dirigée vers la mauvaise question coûte
  autant que pas de rigueur, et donne en plus de l'assurance.
- **Quand il a tranché, exécuter — pas argumenter la mesure.** Même soir : il a redemandé deux fois, et
  j'ai répondu par le détail technique au lieu de faire. *« Elle est où ma surcharge ? »*
- **Ne pas poser une question qui n'a pas d'arbitrage.** Trois posées le 01/10, zéro nécessaire. Son test :
  *« c'est quoi la décision qu'il y a à prendre là ? »* Si la réponse est « aucune », on fait et on le dit.
- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Tout terme nouveau va dans `glossaire.md`** — mais seulement s'il relève de la **cartographie** ou du
  **logiciel lui-même**. L'outillage général (build, paquets, cache, CI) n'y entre pas.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
