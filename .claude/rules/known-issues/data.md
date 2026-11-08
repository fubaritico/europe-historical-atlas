---
paths:
  - "packages/atlas/public/**"
  - "files/spikes/**"
---
# Known issues — the data

Open issues of the data on disk: `years/`, the relief, the spikes that write them. Loaded by path; indexed in `.claude/known-issues.md`.

- **`years/1100/` est la 1100 du dev refaite depuis Cliopatria (CC BY 4.0) depuis le 06/11** (`b02ce87`, poussé) : celle
  publiée depuis le 16/10 était partie du tracé du test Euratlas (nuit du 14/10, 137 pays), interdit par la licence
  d'Euratlas — ATLAS-142, fait. **L'historique git garde l'ancienne** : pas réécrit, décision du dev du 06/11. Sa 1100
  d'avant reste dans `1100-backup-2026-11-02/`, sur sa machine, ignorée par git, **jamais à publier** ; le dossier du test
  Euratlas n'existe plus sur disque. CARTO-237 (mesurer ce qui reste d'Euratlas) est sans objet. **Sévérité : à savoir.**
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
- **`years/1200/` (Cliopatria, built by `files/spikes/cliopatria-import/`) is ignored by git; `years/index.json`
  announcing 1200 is his uncommitted « Save as »**, and his ‹ctrl+s› on 1100 shows in `git status` too. **Nothing of
  `years/` is committed without his word** — committing publishes. The `*.autosave.*` and `*.before-claude-*` folders
  beside them are the Cartographer's copies, ignored. **Severity: à savoir.**
