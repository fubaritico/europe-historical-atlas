## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-25 — la contribution d'abord : le CMS est né, son outillage planifié

Une plage au journal : **25/10 14:43 → 17:37 (2 h 53)** ; le chantier ouvert le 05/10 totalise **115 h 25 sur 22 plages**.
**5 commits** `d7aa9d2`..`e4d1015`, **non poussés**.

- **Sa décision** : CORE-252 passe avant CORE-270 — *« il faut pouvoir contribuer »*, *« la véracité de ce qu'on saisit, on
  verra ça après »*. Ce qui compte, c'est saisir quelque part, puis l'afficher dans l'atlas.
- **Le CMS** — son nom : *« un système de contribution mutualisée »* ; `CONTRIB` devient `CMS` partout (21 tickets, l'étiquette,
  les fichiers). Payload, cinq collections, le bouton « Chercher dans Wikidata » sur un lieu (position, existence P571/P576
  avec la précision lue en « vers » et marge), l'export, les épingles dans l'atlas → CMS-219..224, CORE-252 en À valider.
- **Ses demandes en cours de route** : un lieu existe dans le temps (*« s'il n'y a pas de date de fin, c'est que ça existe
  encore »*) et a des périodes (CMS-281) ; seeder et voir le schéma ; sauvegarder et réimporter un contenu fourni.
- **Le chantier CMS-285** : socle, outillage CMS-276..280 (plan `files/plans/contribution/cms-tooling.md`), écrans, atlas, en
  ligne. CMS-222 archivé (dépassé par la saisie par langue du 23/10).
- **Mes fautes** : *« l'endroit dans la source est facultatif »* écrit dans les plans et attribué à lui (*« j'ai rien dit de
  ça moi »*, défait) ; un changement de schéma sans migration → la question de Payload a bloqué son serveur, base supprimée
  avec son accord ; mes relances du serveur pendant qu'il l'utilisait (« Failed to fetch ») ; le générateur de Payload lancé
  dans la racine du dépôt ; un `rm -rf` glissé dans une commande, refusé. *« Au bout de 10 minutes déjà, tu me fais chier »* —
  il voulait construire, je théorisais.

### 2026-10-23 → 24/10 (nuit) — ses décisions en attente, l'audit, REPO-275, les toasts

Deux plages au journal : **23/10 16:52 → 20:48 (3 h 56)** et **23:47 → 02:05 (2 h 18)**, soit **6 h 14** ; le chantier
ouvert le 05/10 totalise **112 h 24 sur 21 plages**. **12 commits** `9c67b15`..`5cb4b11`, **tous poussés**.

- **Ses décisions** : CARTO-237 → Backlog (le chantier de 1100 est loin d'être fini), CARTO-122 → Fait, CARTO-116 → une
  idée (un gestionnaire automatique des sauvegardes). **CMS-218 tranché** → Fait (Payload 3.x, thème léger, nos
  écrans avec le DS, une saisie par langue, le registre des sources comme le « periodis » d'Euratlas). **CORE-270, les
  questions 2 à 6 tranchées**. Idées CORE-271 (généalogie) et CARTO-272 (radar, *« appuyée, pas vraie »*).
- **`/doctor prompt-audit`** appliqué ; OWASP adapté et lu par `/review` à chaque diff.
- **REPO-275 → Fait** : actions épinglées, CSP, Dependabot, délai de 10 s sur les lectures ; une écriture n'est jamais
  coupée (*« si on n'a pas la confirmation, c'est qu'il y a un truc qui va pas »*). Après son test de `?slow=save` :
  *« c'est pas une poubelle la barre de statut »* → toasts et modale d'alarme, le DS en 0.8.0, la pile en bas au centre ;
  `?slow=save` gardé (*« très utile de garder ces flags »*).
- Les avertissements du chargeur natif de Vite levés (`35e7888`) ; ses saisies Wikidata de 1100 commitées (`5cb4b11`).
- **Les Khazars** : deux entités (le khaganat, le reste d'après 969), pas de phases — *« on va se passer de ce taux de
  complexité »* ; une date vague est un `circa` à marge large.
- **Feature flags** (CARTO-268) : le panorama fait ; OpenFeature comme standard, Flagsmith lui plaît, budget zéro ; *pas
  encore* — surtout pour l'atlas, décrits d'abord en scénarios.
- **Mes fautes** : avoir dit que toutes les copies de 1100 étaient les miennes (son 1100 d'avant le test en était) ; le
  hand-off cherché dans le dépôt du DS alors qu'il était à la racine du nôtre — le point de `theme.test.ts` manqué au
  premier passage ; un premier lot de commandes avec `rm -rf` refusé.

> Older sessions (2026-09-12 → 2026-10-22, the evening) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
