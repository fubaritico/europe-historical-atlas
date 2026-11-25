## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-25, soir — le codeur : le Cartographe derrière le compte du CMS, l'essai sur une copie sans le dev

Session **25/11 18:10 → 20:43** (2 h 33 ; la plage du jour au journal, 12:26 → 20:42, est partagée avec la session de
l'après-midi) ; le chantier totalise **419 h 39 sur 64 plages**. Rien n'est poussé (le dev : à la fin de tout).

- **CARTO-535 Fait**, fusionné (`9a6965d0`, `aeb83af1`) : la connexion, le chrome grisé, la session prolongée, expirée,
  le CMS éteint, la réponse illisible (ses deux décisions du soir) ; puis, le ticket rouvert, le relief préparé derrière
  l'écran de connexion, la sauvegarde automatique qui suit la session, « Enregistrer d'abord ? » avant de se
  déconnecter. Deux revues ; essayé à la main sur une copie de la base ; scénario `s23` (`a983f0d5`).
- **REPO-542 À valider** : `pnpm trial:start` / `trial:stop`, un CMS sur une copie avec un compte jetable ; commité sur
  sa branche (`9a3ef960`), pas fusionné ; attend ses deux règles de permission.
- **Mes fautes** : CARTO-535 fermé sans avoir relu son tableau des états (rouvert, complété le soir même) ; l'essai sur
  `localhost` a remplacé puis effacé sa session de l'admin du CMS (d'où la règle `127.0.0.1`) ; un `cd` ; un titre de
  commit trop long.

### 2026-11-25 — le codeur : le point sur les tickets, l'interface React mesurée, la connexion du Cartographe commencée

Session **25/11 12:26 → 18:08** (5 h 42 au journal) ; le chantier totalise **417 h 05 sur 64 plages**. Rien de poussé par moi.

- **ATLAS-519 Fait** : avant/après React mesurés dans un même onglet, aucune différence (0,1 s l'écran de chargement,
  7,6 s la carte) ; React et le thème, +67 Ko compressés. Les temps absolus de mon onglet ne valent rien (mémoire
  `automation-tab-times-are-not-his`).
- **Le point sur les tickets « En cours »** avec le dev : ATLAS-156, CMS-495, CARTO-372 (doublon de CARTO-485) Fait ;
  CARTO-363 et REPO-346 en À faire ; ATLAS-152 devenu la page Sources du site, ATLAS-448 bloqué par CARTO-498, ATLAS-295
  en Idées, CMS-225 réécrit (les candidats d'événements tirés de Wikidata, à ±30 ans) — tous datés.
- **Règles et mots** : chaque ticket porte sa date de début et de fin (`/jira`, `a1daf54e`) ; « candidats d'événements »
  et « prosopographie » au glossaire (`4af88123`, `b0bbfcd8`).
- **Créés** : REPO-533 (le flux en ligne : CMS-228, CMS-530 à 532), ATLAS-527 (le crédit Cliopatria, le site n'est pas
  en règle), CARTO-535 (la connexion avec le compte du CMS), CARTO-536 (l'écran de départ), CARTO-537 (plus de `?map=`).
- **CARTO-498** écrit dans son arbre, **bloqué par CARTO-535** : une clé MCP n'ouvre pas l'API de Payload. **CARTO-535**
  commencé : le serveur de session fait et testé, la page écrite, pas encore verte.
- **Mes fautes** : des temps absolus de mon onglet rapportés comme ceux de l'atlas ; une surchauffe affirmée sur un seul
  indice ; Payload dit « vérifié » sans avoir lu `index.ts` ; deux `cd` ; CMS-225 attaqué à la place de CARTO-498.

