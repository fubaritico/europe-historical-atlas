---
paths:
  - "packages/atlas/public/**"
  - "files/spikes/**"
---
# Known issues — the data

Open issues of the data on disk: `years/`, the relief, the spikes that write them. Loaded by path; indexed in `.claude/known-issues.md`.

- **`years/1100/` est parti du tracé du test Euratlas (nuit du 14/10, 137 pays) et c'est désormais l'année du dev**,
  qu'il renomme, redessine et complète d'identifiants Wikidata. Décidé le 23/10 : *« c'est la dernière version qui
  prime »* ; son 1100 d'avant le test n'est plus gardé, et seule reste la référence `years/1100.euratlas-137b/`
  (avec `1100.euratlas-137`), qui sert à CARTO-237. La part d'Euratlas qui y reste est mesurée par CARTO-237 ; la
  licence de ce qui est publié reste ATLAS-142. **Sévérité : à savoir.**
- **`files/spikes/fetch-dem/fetch-dem.mjs` écrit dans `public/heightmaps` à la racine**, un chemin d'avant le monorepo :
  le 18/10, il a fallu déplacer le résultat à la main dans `packages/atlas/public/heightmaps/` et retirer les dossiers vides.
  Remède : pointer `publicDir` sur `packages/atlas/public/heightmaps`. **Sévérité : cosmétique.**
- **J'écris dans `years/`, sa page ne se recharge pas, et son ‹ctrl+s› suivant réécrit l'ancien état** (16/10). Arrivé
  deux fois : la Frise et le renommage des tribus. Règle : après une écriture de ma part, il **recharge sans
  enregistrer** ; et je vérifie l'heure du fichier avant d'écrire. **Sévérité : à savoir.**
- **Depuis le 16/10 au soir, `years/1100/` est publié** (décision du dev : *« vas-y, tu peux la mettre en ligne »*,
  à montrer à quelques personnes, la carte va encore changer). `.gitignore` l'excepte, `.prettierignore` exclut
  `years/`, et `years/index.json` **n'est plus en `skip-worktree`** : chaque ‹ctrl+s› du dev sur 1100 apparaît
  désormais dans `git status`, à commiter comme du code.
