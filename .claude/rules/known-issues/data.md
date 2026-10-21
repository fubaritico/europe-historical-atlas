---
paths:
  - "packages/atlas/public/**"
  - "files/spikes/**"
---
# Known issues — the data

Open issues of the data on disk: `years/`, the relief, the spikes that write them. Loaded by path; indexed in `.claude/known-issues.md`.

- **Depuis le 13/10 au soir, `years/1100/` contient le tracé du test Euratlas, pas l'année du dev.** — CARTO-116 Son 1100
  (France + Bourgogne) est rangé, intact, dans `years/1100.avant-test-euratlas/`. Le Cartographe ouvre donc
  le test, et l'atlas local le montre à l'année 1100. **À la fin du test** : `years/1100` → `years/1100.test-
  euratlas`, puis `years/1100.avant-test-euratlas` → `years/1100`. Les dossiers `years/1100.*` ne sont pas
  commités ; `years/1100/`, lui, l'est depuis le 16/10 (entrée suivante — la licence reste ATLAS-142). **Depuis la nuit du 14/10**, `years/1100/` tient 137 pays, et les traces de la nuit
  sont `years/1100.euratlas-{16,19,30,48,76,98,137,137b}/` et `1100.before-rename/` — toutes locales, à trier avec
  le dev (aucune n'a été supprimée : `rm -rf` demande sa permission). **Sévérité : à savoir.**
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
