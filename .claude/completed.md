## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-12 (soir) — enregistrer et rouvrir, les outils attendent le zoom, les fleuves de l'atlas, la barre d'actions

Une session à distance, **12/10 ~18:20 → 22:59 (~4 h 40, dans la plage 14:45 → 22:59, 712 actions)** ; le
chantier ouvert le 05/10 totalise **38 h 50 sur 8 plages**. **9 commits** `8f37372`..`9082652`, **tous
poussés**, **2633 → 2831 tests**, gate verte et revue à quatre agents à chaque pas, chaque garde prouvée par
le code naïf. Le dev, absent de l'écran, m'a laissé **conduire son Chrome** et juger à l'usage.

- **Enregistrer et rouvrir, en mode local** (`H-28` tranché local) : le serveur de dev du Cartographe écrit
  `years/<année>/` (`PUT /__years/<année>`, même machine, validé par le schéma de `core`, fichiers `.tmp` puis
  renommés, manifeste en dernier) ; ‹ctrl+s› partout ; l'année s'ouvre au démarrage. **Les années ne sont
  jamais commitées** (*« ils sont pour nous pour travailler »*), les traces gardées en copies suffixées
  (`1100.bourgogne-v1/`). Allers-retours identiques à l'octet (md5).
- **La France 1100 et la Bourgogne dessinées par moi**, enregistrées, rouvertes — d'où mon carnet de dessin
  (`files/plans/cartographer/drawing-as-claude.md`) et des scénarios *Walked for real* dans `s02`/`s15`.
- **Les outils attendent le zoom** (`H-34`, `s17`) : de trop loin (portée d'accroche > 10 km au sol) la plume,
  le crayon et les touches qui modifient des points refusent, le curseur et la barre d'état le disent.
- **Les fleuves suivis d'un morceau à l'autre** (`H-35`, `mendRivers`, 591 → 398 polylignes) et **dessinés
  comme dans l'atlas**, d'une seule définition dans `core` (`riverDisplay.ts`). `H-36` fermé : 46 ancres sur
  52 partagées au simple clic sur les fleuves.
- **La barre d'actions de `{Polities}`** : `+` et poubelle au pied, ses dessins en pixels entiers,
  confirmation `[Cancel]` en focus, ‹ctrl+z› depuis le panneau. **Deux bugs invisibles à jsdom trouvés dans
  son Chrome** (le `<dialog>` rendait le focus à la poubelle désactivée ; ‹ctrl+z› n'était entendu que par le
  canevas) — d'où sa note : **des tests Playwright**.
- **Mes fautes** : deux `cd` ; un premier ‹ctrl+z› de page qui court-circuitait le geste en cours (attrapé
  par la revue, ARCH-101) ; une phrase de boîte qui contredisait `s07` ; des clics envoyés pendant le
  chargement du fond, perdus.

### 2026-10-12 — un plugin ESLint à nous, la plume qui trouve l'eau, et la barre d'actions décidée

Une plage, **12/10 14:45 → 18:17 (3 h 31, 332 actions)** ; le chantier ouvert le 05/10 totalise **34 h 08 sur
8 plages**. **10 commits** `bd0fd45`..`3ea738c`, **tous poussés**, CI verte (sept jobs, déploiement compris),
**2523 → 2633 tests**, gate verte à chaque pas, revue à plusieurs agents à chaque pas, chaque garde prouvée
par le code naïf.

- **`eslint-plugin-eha`**, quatrième paquet (JS + JSDoc vérifié par `tsc`, Node 22.14 ne chargeant pas un
  `.ts`), adapté du plugin Fluid du dev, **trois règles en erreur** : `component-body-order` (Guards → Store →
  Store actions → … → Render, un séparateur `// …` par groupe, corrigé par `--fix` ; props déstructurées dans
  la signature sauf usage entier ; une déclaration ne remonte jamais au-dessus de ce qu'elle lit) ·
  `hoist-independent-function` (tous les paquets, tests compris ; 38 fonctions déplacées par son correctif,
  aucune chaîne modifiée — vérifié au compilateur) · `no-inline-event-handlers` (20 handlers nommés,
  `PolityArrangeMenu` scindé en `KnownPolityMenu`). **Écartées sur mesure** : déstructurer les dépendances
  (482 paramètres, et déstructurer `event.preventDefault` casse `this`), l'ordre des fabriques (constructions
  séquentielles). Plan : `files/plans/eslint-plugin-eha/plan.md`.
- **Trouvé en route** : Turbo rejouait un lint vert après un changement de règle ou de config racine —
  `globalDependencies` + `lint` → `^lint`.
- **La règle du dev, mémorisée** : *« un système, pas des exceptions »* — une règle qui n'en tient que par des
  exceptions est abandonnée, mesure à l'appui.
- **Le menu de pile** : un seul filet (`--line`), libellés centrés.
- **La plume trouve la côte et les fleuves** (`s02`) : la plume simple et le crayon s'accrochent au plus
  proche des deux, la plume bascule en mode côte ou fleuve ; le premier clic qu'aucune eau ne prend rend le
  mode de départ ; d'une eau à l'autre, bascule directe ; le crayon s'arrête sur l'eau. **‹ctrl+z› ne rend
  pas le mode** — *« pas d'annulation pour l'instant »*. `s02` écrit aussi le crayon, jamais spécifié.
- **La barre d'actions de `{Polities}`** : plan décidé (D1–D5), étape 1 écrite (`s07`, `H-17` fermé). Les
  icônes : longue enquête sur la netteté ; **verdict du dev** — le flou des outils est accepté, la barre prend
  **ses dessins en pixels** (le `+` encadré de pointillés, la poubelle à trois lamelles) posés sur des pixels
  entiers, nets à 100 %.
- **Mes fautes** : avoir affirmé que le design system avait une poubelle sans l'avoir vu ; m'être trompé
  **deux fois** sur le demi-pixel (à ×2 il vaut un pixel physique entier) ; un plan qui affirmait que Turbo
  hachait les dépendances de workspace ; un **second serveur de dev** qui a fait chercher la page au dev ;
  un `cd` ; un en-tête de commit à 101 caractères ; une fixture déclarée dans un `describe` et utilisée hors.

> Older sessions (2026-09-12 → 2026-10-12 morning) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
