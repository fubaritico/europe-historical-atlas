# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — après le 17/10 au soir

**Le tableau d'abord** : `/trello` → `list`. Tout est commité et poussé (`7f0b2be` + l'état de session ; vérifier par
`git ls-remote origin main`). Ce qui attend le dev est en **À toi**, ce qu'il a choisi en **À faire**, dans son ordre
(mémoire [[do-not-start-unasked-work]]).

**La question en vol à la clôture** : **CARTO-248** (Idées) — lire la vassalité dans Wikidata. Mesuré : aucune propriété
« vassal de » ; l'information passe par « pays » (P17) **daté** (P580/P582), par « État du Saint-Empire » (Q26830017) et
par « État vassal » (Q1371288) ; 5 vassaux sur 8 exploitables. Tout est écrit sur la carte. **J'avais demandé** : je crée
la carte Backlog et je code ? — attendre sa réponse.

| où | carte | état |
| --- | --- | --- |
| **À faire** | CARTO-238 Sauvegarde automatique | palier 1 fait et poussé (`f967d4d`) ; **suivant : palier 2, l'instantané horaire** — le dev l'avait prévu « avant d'attaquer » ; puis 3 (fichier changé sous la page), 4 (repli navigateur) |
| **À toi** | CARTO-233 Outils actifs trop tard au zoom | seuil 10 → 20 km dans `view/toolReach.ts` + note dans `s17`, **non commité** : le dev juge sur un très grand pays (Fatimides, Cordoue) ; option notée : outils toujours actifs, aimantation coupée de loin |
| **À toi** | CARTO-235 ‹P›/‹A› muets sur un pays neuf ou vide | attendre son cas exact |
| **À toi** | REPO-234 Le lot d'étiquettes | qu'il regarde le rendu |
| **Backlog** | CARTO-247 Vérifier toute l'année contre Wikidata | palier 2 de CARTO-243, prêt à tirer |

**Non commité, à ne pas embarquer** : `toolReach.ts` et `s17` (CARTO-233) ; `years/1100/{polities,registry}.json` — le dessin du
dev, à commiter seulement à sa demande (1100 est publié).

**À savoir pour coder** : Basic Memory sert de graphe **entre projets** (`main/patterns/`, CLI `basic-memory tool …` quand le
MCP n'est pas chargé). Une commande interrompue ou refusée a pu agir : relire l'état avant de relancer. Modifier `core`
ou `main.tsx` recharge la page du dev — le prévenir d'enregistrer avant.

## Where we are

**3 629 tests** (977 `core` · 1 686 Cartographe · 884 atlas · 82 plugin `eslint-plugin-eha`, 17/10), gate
verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`). Le chunk worker reste sans
three.js et le Cartographe émet le même, au même hash — vérifié par la CI.

`git log origin/main..main` lit une référence de suivi **qui peut être périmée** : pour la vraie réponse,
`git ls-remote origin main` contre `git rev-parse HEAD`.

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **privé**, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app** — 1100 y est publié (16/10) |
| CI    | sept jobs — validate ×3, build, sonarqube, quality-gate, deploy             |
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


### Le design system est branché — ce qu'il faut savoir pour s'en servir

**`@fubaritico/react` en `0.2.1`, `tokens`/`styles` en `0.2.0`**, depuis GitHub Packages (token en
local dans `~/.npmrc`, `github.token` en CI). Le ColorPicker arrive en **`0.3.0`** : alors monter les
plages et ajouter le champ couleur, avec son état « automatic » = `null`. Le plan
(`files/plans/cartographer/design-system-integration.md`) est **fait jusqu'au pas 4**.

1. **Une seule cascade, dans un seul module** : `styles/sheets.ts` — tokens → peau → thème → reset (dans
   `@layer ui.reset`) → shell → `editor-chrome.css`. L'app et l'établi l'importent ; un test refuse tout
   import de feuille ailleurs. **Une règle hors layer bat tout layer** : c'est ce qui fait gagner nos
   surcharges, et c'est ce qui aurait fait perdre le DS contre un reset hors layer.
2. **Les couleurs : la palette dans `theme.css`, une fois**, et les tokens du DS pointés dessus. Aucune
   couleur en dur ailleurs — vérifié le 09/10. **Les tailles viennent de `design/chrome.css`.**
3. **Régler le style dans l'établi** (`pnpm dev:cartographer` → `/workbench.html`), et **prouver par le
   style calculé dans un vrai navigateur** : jsdom n'a pas de cascade de layers.
4. **Pièges déjà payés** : jamais de `display` sur `Modal`/`Drawer` · `autoFocus` de React n'écrit pas
   l'attribut, un `<dialog>` ne le verrait pas · un bouton dans un `<form>` soumet par défaut —
   `type="button"` partout sauf OK · le `Card` coupe ce qui déborde, d'où `overflow: visible` sur la
   boîte du formulaire.

**Le ColorPicker est fait** (10/10) : `ColorField` du DS `0.5.0` dans la boîte de création, « automatic » = `null`.

**Décisions du dev du 09/10, à ne pas re-trancher** : le **contraste n'est pas une contrainte** dans
l'éditeur · le formulaire est une **boîte de dialogue**, pas le panneau `{Details}` de `design/03` · un
**établi** plutôt qu'un Storybook · secondaire sur le panneau avec le filet des champs, **primaire
rempli de la couleur du filet**, texte blanc, au survol le fond des champs.

> Les notes d'avant `(c)` et `(d)` (livrés) sont archivées dans `archive/next-history.md` — à relire si une décision de cible, de curseur ou de barre d'état est remise en cause.


### La skill à ouvrir avant de coder

`/scenarii-to-code` (écrite le 06/10) : charger le `s00` du jeu, le scénario qui gouverne, et `s99` ;
faire de chaque `Then` **une assertion ou un manque déclaré** ; et ne jamais écrire dans un commentaire
une promesse qu'une étape ultérieure doit tenir — elle va dans `next.md` ou `known-issues.md`, les deux
seuls fichiers relus à chaque session. Elle existe parce que `4d-1` a livré une JSDoc, écrite deux étapes
plus tôt, promettant un cache que `4d-1` n'a pas construit.


### Trois choses décidées pour l'étape 4, à ne pas re-trancher

1. **Le repère du canevas est celui du fond**, pas la zone éditoriale — voir `known-issues` (deux boîtes).
2. **Deux canevas** : un statique redessiné au commit, un overlay au `pointermove`. La barre d'état
   s'écrit **impérativement**. (`4d-1` n'en a qu'un : le second arrive avec l'élastique, à `4d-2`.)
3. **Le fond est cuit par le Cartographe** avec `bakeTerrainPixels(…, null)` — le `null` est l'année
   installée, donc le terrain nu, donc « tint politique retiré » sans rien à nettoyer.


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
