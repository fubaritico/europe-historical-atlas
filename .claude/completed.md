## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

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

### 2026-10-22, le soir — `ui/` mergé, `?break=`, « entité politique », les sources, Payload vérifié

Plage au journal **22/10 16:53 → 19:43 (2 h 49, 151 actions)** ; le chantier ouvert le 05/10 totalise **106 h 08 sur
19 plages**. **7 commits** `403a72a`..`2e26931`, **non poussés**. La seconde moitié s'est faite **à distance** (Remote
Control) : le dev l'a jugée *« ingérable »* et a fermé la session.

- **CARTO-267** testé, commité, mergé, worktree supprimé avec sa permission → Fait. **ATLAS-159** testé en cinq gestes
  écrits pour lui (la première consigne, floue, l'a fâché : *« faut surtout pas être précis »*) → Fait.
- **`?break=<zone>`** (sa demande) : chaque boundary a une zone typée et stable ; en développement seulement, vérifié dans
  le build. Idée des feature flags → CARTO-268.
- **« entité politique »** remplace « pays » dans le Cartographe — sa décision ; le rang `country` et l'atlas gardent
  « pays », mon choix, noté comme tel au glossaire.
- **Les sources** : sa règle, *« on ne peut pas fermer la porte derrière nous »* — chaque année cite toutes ses sources ;
  liste sur ATLAS-152, skill `/create-data-mention` (sa demande), bibliothèque de ses atlas `files/plans/sources/`. La
  carte des Chaddadides (CC BY-SA) se déclare redessinée de Hewsen 2001 → référence, pas calque.
- **Planification** (sa demande, à distance) : palier 2 de DESIGN-262 conçu → CORE-270 (Backlog), barème des sources
  tranché par lui ; **CMS-218** Payload vérifié dans le code → À valider.
- **Mes fautes** : un `git add` de tout ce qui était modifié a embarqué ses données de 1100 dans un commit (défait par
  `reset --soft`) ; « litiges » pour une guerre d'édition ; un éditeur écrit de mémoire dans une mention ; des réponses
  qui renvoyaient à « un document » alors qu'il était loin de son écran.

> Older sessions (2026-09-12 → 2026-10-22, the afternoon) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
