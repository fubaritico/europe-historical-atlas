---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/vitest.setup.ts"
---
# Known issues — testing method

Lessons on proving a test guards something. Read before writing or verifying a test. Loaded by path; indexed in `.claude/known-issues.md`.

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
- **Annuler un sabotage avec `git checkout --` sur un fichier modifié mais non commité le ramène à `HEAD`.**
  Fait le 29/09 en vérifiant une garde : la restauration a emporté `cloneYearDocument`, qui n'était pas encore
  commité. Rattrapé tout de suite, rien de perdu. **La règle** : pour défaire un sabotage de vérification,
  copier le fichier avant (`cp`) ou éditer à la main — `git checkout` ne connaît que le dernier commit.
  **Cosmétique**, mais ça coûte une réécriture à chaque fois.
- **Un test vert du premier coup ne prouve rien, et une casse arbitraire ne le vérifie pas non plus.**
  Découvert le 27/09 sur le test le plus important de l'étape 2 — celui qui garantit qu'un aller-retour
  sauvegarde/chargement **conserve le partage des ancres**. Deux sabotages plausibles ne l'ont **pas** fait
  tomber : une `Map` indexée sur l'ancien index fait converger les deux références par accident, donc le test
  passait contre une sauvegarde cassée.
  **Ce qui l'a fait tomber** : l'implémentation naïve que *quelqu'un écrirait vraiment* — chaque pays
  emportant sa propre copie de ses points, ce que fait exactement `RegionPayload`.
  **La règle qui en sort** : pour vérifier une garde, écrire le code qu'un développeur écrirait sans y penser,
  pas une mutilation choisie au hasard. Consigné en mémoire [[verify-a-test-with-the-plausible-naive-code]].
- **Un test rapide en local peut dépasser ses 5 s sous la couverture de la CI** (27/10, ATLAS-291/293). Les tests du cadre
  recuisaient le parchemin en 1 024 × 1 024 à chaque reconstruction : 0,25 à 1,3 s en local, plus de 5 s sous
  l'instrumentation du job Sonar, qui a échoué deux fois (`3447b2b`, `98d5f4a`) pendant que la gate locale passait.
  **Remède appliqué** : un test qui vérifie un branchement remplace le calcul lourd par un faux (`vi.mock` du bake, une
  image vide de la bonne taille) — le calcul a ses propres tests. **La règle** : un test qui construit une texture ou un
  maillage réels se mesure aussi sous `vitest run --coverage` avant d'être commité ; et après un push, **lire la CI
  jusqu'au bout**, Sonar compris — le déploiement passe même quand Sonar tombe. **Sévérité : à savoir.**

