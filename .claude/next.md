# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — ATLAS-304, la performance de l'atlas (30/10, avec Opus 5.5)

**29/10, fin à 3 h 56.** Le diagnostic est fait, **rien n'est codé**. Tout est dans **ATLAS-304** — en tête d'À faire à sa
demande, le texte complet en français, la liste des sept étapes — et dans `files/plans/atlas/performance.md`, le texte de
référence avec la recette de la sonde. **Non commité** : ces notes, le plan, le glossaire (« rendu à la demande »), le script
Trello (description et commentaires dans le corps de la requête) — `5202f7f` reste la tête, CI verte.

**Ce qu'il a dit** : le Mac souffle dès le lancement ; 43 → 13 images/s sur le grand moniteur, le zoom plus fluide ; il veut
plus de 30. **Ce que j'ai mesuré** (4,0 Mpx, chronomètre GPU du pilote) : un flou seul ≈ 1 ms, **les trois ensemble 9 à
18 ms** selon le zoom, allumés dès que le zoom quitte 0 (`closeness = zoom / 0,4`) ; la boucle dessine à chaque
rafraîchissement (8 ms de GPU au repos — la chauffe) ; ombres des icônes 10–14 ms, 13 fois/s, hors champ comprises ; base
fixe ≈ 5,5 ms (relief 3, surfaces 2,5) ; au démarrage 2,2 s de fil principal bloqué.

**Demain, dans l'ordre** : lui poser les quatre questions du ticket — son moniteur (`devicePixelRatio`, `innerWidth ×
innerHeight`, à quel zoom les 43 et les 13) ; l'à-coup de 37 ms au premier zoom ; les icônes animées au repos (ATLAS-300) ;
l'ordre R1 → mesure → R3 → R4. Puis **R1** (un seul jeu d'images pour les trois flous, sans profondeur, sans seconde
résolution, seuil d'extinction), **mesurer avec la sonde du plan avant R2** — une seule sonde par page. Il teste sur le grand
moniteur : plus de 30 images/s, le ventilateur silencieux au repos.

**Aussi prêt pour demain, les noms des pays (ATLAS-301)** : à 4 h, à sa demande, un diagnostic de l'algorithme contre les
deux captures du ticket (CK3, 1501) — dans `files/plans/atlas/country-names.md`, section « The gap to the reference », et en
français en commentaire sur ATLAS-301. En une ligne : **cinq écarts de construction, pas de réglage** — longueur enchaînée
à la taille (espacement fixe, plafond 30 cases), l'espace = la terre et non l'enveloppe (Byzance coupée par l'Égée), la
comparaison à sept poids qui rebat les vainqueurs à chaque retouche (le mécanisme des effets de bord qu'il a vus), deux
lignes, la courbure et la pente pénalisées. Axes A → F dans le plan ; d'abord figer six formes de 1100 en jeu d'essai. Rien
n'est codé. La skill Trello a un verbe `attachments <ticket> [dossier]` pour lire ses captures.

**Ses arbitrages en attente** (une question à la fois) :
- passer **ATLAS-145** (séance des frontières) et **ATLAS-302** (flou, encore dans Idées) en Fait — testés par lui ;
- **ATLAS-301** reste ouvert pour l'étape 4 : le nom court saisi dans le Cartographe (sa leçon : des noms d'usage courts dès la
  contribution, comme Crusader Kings) ;
- **le Groenland et l'Islande** sont norvégiens dans `years/1100` (historiquement 1261–1262) — ses données ;
- **l'erreur des noms** (police, worker) n'est dite qu'en console — proposition du 28/10, pas tranchée.

**À savoir, laissé de côté** : 6 pays sans nom quand rien ne tient ; un nom sur chaque îlot ; le trait parchemin de la
frontière collé au brun à un zoom seulement (écart en distance carte — un décalage en pixels dans le shader le réglerait) ; le
flou ne suit aucune préférence système (A11Y-002) ; le filigrane à 40 % est son choix (A11Y-001).

**Pièges de ces deux soirs, à ne pas refaire** : empiler des règles visuelles (abréviations, vagues, seuil de lisibilité) —
quand il est perdu, **s'arrêter et lui donner la règle en trois lignes** ; deviner un chiffre dans un test ; une demande
répétée après un refus d'outil est **la même** demande ; « flou » = flou d'image, pas un dégradé dans le trait ; parler
franglais. **Et ceux du 29/10** : deux sondes dans un même onglet (leurs chronomètres GPU se brisent, résultats nuls) ; une
série de mesures de plus de 40 s sous un outil qui coupe à 45 ; `delete` d'une propriété de `window` ; écrire la caméra dans
`sessionStorage` sans bloquer la sauvegarde au déchargement.

**Sa copie de base** du 27/10 avant le seed : `packages/cms/cms-backup-2026-10-27-2300.db` (ignorée par git) — à lui
de la supprimer.

**Ouvert par décision, à lui de trancher un jour** : les icônes animées (épées qui se balancent, trébuchet) ignorent
« réduire les animations » du système — un constat de la revue du 27/10, ATLAS-300 dans Idées.

**L'audit des instructions** (`/doctor prompt-audit`, 27/10) : rapport et diff proposé dans
`files/prompt-audit-2026-10-27.md` (non versionné) — 36 constats, **rien d'appliqué**. Les plus lourds : le CMS absent des
instructions (« quatre paquets », « deux applications »), `/review` qui relit le dernier commit au lieu de l'arbre, pas de
portée `cms` dans les commits, la sécurité qui ignore le CMS. À passer avec lui, constat par constat, **seulement ce qu'il
accepte**. Trois questions sont à lui : la « phase de recherche » de `CLAUDE.md` tient-elle encore ; retirer ce que
ESLint et `tsc` font déjà respecter ; l'entrée `reliefWorldY` introuvable.

**Pour faire ou régler une icône** : la skill `/make-event-icon` (une image plate se dessine dans un cadre 44 × 44). **Jamais de backtick, de `$(` ni de `$` dans un `perl -e` ou un `sed`
entre guillemets doubles** : le 27/10, ça a lancé le seed sur sa base — éditer par l'éditeur.

**Trois règles du CMS, toujours** :
- **Son serveur du CMS est le sien** : je ne le lance, ne le coupe ni ne le relance jamais.
- **Aucun changement de champ qui retire ou renomme sans migration** (CMS-276) : en mode push, Payload pose une question
  dans le terminal et tout attend derrière. Un champ **ajouté** passe sans question (vérifié le 26/10, `withDefault`).
- **Un `rm -rf` ne se glisse jamais dans une commande.**

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
| **Chantiers** | DESIGN-262 La gestion de l'incertitude · **CMS-285 Le CMS** | DESIGN-262 : palier 2 conçu (CORE-270) ; CMS-285 : socle codé, outillage à faire |
| **En cours** | ATLAS-303 · ATLAS-301 · ATLAS-145 · ATLAS-156 · ATLAS-152 | ATLAS-303 : le rendu (le point performance est ATLAS-304) ; ATLAS-301 : étape 4 restante ; ATLAS-145 : fait, à passer en Fait ; ATLAS-156 : bataille et siège faits ; ATLAS-152 : sources de 1100 |
| **À valider par le développeur** | — | vide le 26/10 |
| **Backlog** | ATLAS-299 · ATLAS-297 · CORE-270 · CMS-281..283 · ATLAS-284 · CARTO-237 · CARTO-273 · CARTO-274 | CORE-270 passe après la contribution (25/10) ; 281–283 les écrans suivants |
| **À faire**, en tête | **ATLAS-304** · ATLAS-287 · ATLAS-288 · CMS-290 · CMS-276 → 280 | ATLAS-304 d'abord (sa demande du 29/10), puis dans cet ordre |
| **Idées** | ATLAS-302 flou (fait, à passer en Fait) · ATLAS-300 animations réduites · CARTO-268 feature flags · CORE-271 généalogie · CARTO-272 radar | CARTO-268 : pas encore |

**Toujours en attente, à lui proposer un jour** : le relief niveau 6 du Cartographe (une ligne, `main.tsx` →
`/heightmaps/europe-dem-z6-1920`, `rules/known-issues/cartographer.md`).

## Where we are

**5 362 tests** (1 494 `core` · 2 259 Cartographe · 1 318 atlas · 122 CMS · 169 plugin `eslint-plugin-eha`, 29/10), gate
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
