# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — rien en attente, la suite est la contribution

**24/10, 02:05** : tout est commité **et poussé** (`main` = `5cb4b11`), l'arbre est propre — ses saisies Wikidata de 1100
comprises. **Ses `years/1100/*.json` modifiés par ‹ctrl+S›** se commitent à part, nommés, quand il le dit.

**La suite, par son ordre** : la **contribution**. CMS-218 (Payload) est tranché → Fait ; **CORE-270** (palier 2 de
DESIGN-262) a ses six questions tranchées (`files/plans/evidence/step-2-concepts-in-core.md` §8) et attend qu'il le passe
en À faire ; **CORE-252** (le format d'un événement) vient juste après.

**À regarder dans une prochaine session** : le Claude du design system modifie sa skill Trello pour que les chantiers
deviennent des **épiques** avec des tickets enfants (un système de parents) — à reprendre ici quand il le dira.

**Décidé et noté, rien à faire maintenant** : les feature flags attendent un vrai besoin, surtout dans l'atlas, décrits
d'abord en scénarios (CARTO-268) ; les Khazars sont deux entités, sans phases (une date vague = `circa` à marge large).

**Où parlent les messages du Cartographe** (24/10) : la barre d'état est **à l'outil** ; l'année sur le disque parle en
**toasts** (en bas au centre) et en **modale d'alarme** (`persistence/notice.ts`). Le hand-off du design system arrive à
la **racine de ce dépôt** (`HANDOFF-from-fubaritico-ds.md`) : le lire avant de brancher une version.

**Une source qu'il donne** → `/create-data-mention`, toujours ; la liste vit sur ATLAS-152. Ses atlas :
`files/plans/sources/bibliotheque.md` (l'Italie et la Scandinavie manquent ; piste : Spruner-Menke 1880, domaine public).

**Pour travailler** : mon shell démarre sous Node 22 : préfixer `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. **Jamais
de `cd`.** **Jamais de `git add` d'une liste calculée** : nommer chaque fichier. Parler avec **ses** mots, un point à la fois.

**Le tableau** : `/trello` → `list`. Un élément du tableau est un **ticket**, jamais une « carte ».

| où | ticket | état |
| --- | --- | --- |
| **Chantiers** | DESIGN-262 La gestion de l'incertitude | palier 1 fait, 2 conçu et tranché (CORE-270) |
| **En cours** | ATLAS-145, ATLAS-152 | ATLAS-152 porte la liste « Sources de 1100 » et ses mentions |
| **À valider par le développeur** | — | vide |
| **Backlog** | CORE-270 · CARTO-237 · CARTO-273 · CARTO-274 | CORE-270 prêt à passer en À faire ; 273/274 : ses décisions du 23/10 sur les erreurs |
| **À faire**, en tête | CORE-252 (le format d'un événement) | vient **après** CORE-270, par sa décision du 19/10 |
| **Idées** | CARTO-268 feature flags · CORE-271 généalogie · CARTO-272 radar | CARTO-268 : pas encore |

**Toujours en attente, à lui proposer un jour** : le relief niveau 6 du Cartographe (une ligne, `main.tsx` →
`/heightmaps/europe-dem-z6-1920`, `rules/known-issues/cartographer.md`).

## Where we are

**4 703 tests** (1 280 `core` · 2 259 Cartographe · 995 atlas · 169 plugin `eslint-plugin-eha`, 24/10), gate
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
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
