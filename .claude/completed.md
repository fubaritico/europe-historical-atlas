## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-22 — tout le Cartographe en fr/en, des catalogues JSON par portée, la langue par un provider

Une plage au journal, **22/10 10:20 → 13:14 (2 h 53, 376 actions)** ; le chantier ouvert le 05/10 totalise **102 h 25 sur
18 plages**. **1 commit, `bc0be07`, non poussé** à la demande du dev (*« tu commites, tu ne pousses pas »*). Le dev
n'a pas lancé le Cartographe : il réorganisait le dépôt du design system en parallèle.

- **ATLAS-159, 3b et 3c d'un bloc** — après une première revue, le dev : *« il ne faut pas qu'il y ait de mélange entre
  les langues […] c'est qu'il n'y a pas eu extraction de label »*. Tout texte vient d'un catalogue : panneaux,
  dialogues, barres, rail, carte, canevas, noms d'étapes, couche disque, sélecteur de couleur du DS (ses `labels` et un
  `describeColour` porté de ses seuils, testé mot pour mot contre l'original). La raison technique d'un échec va à la
  console, la phrase le dit (ma décision, présentée). Chaque `select` fermé nomme tous ses membres : le test a trouvé
  une soudure sur une frontière juste par hasard.
- **Ses quatre remarques de structure, appliquées** : pourquoi des hooks et des `useMemo` pour traduire, *« elle est où la
  locale ? »* → un `LocaleProvider` sur un store, plus de memo (`core` garde ses traducteurs) ; les fonctions à côté des
  composants → `<Composant>/utils/` ; `components/shared/` → dissous, ce qui sert à plusieurs remonte à côté de
  `components/` ; fr et en dans un même fichier → `i18n/fr.json` + `en.json` par portée, livrés tous deux. Mémoire
  `scope-everything-to-its-component`.
- **Mes fautes** : trois `cd` ; une règle de lint inventée pour imposer sa convention (*« qu'est-ce que c'est encore que ce
  truc »*) ; des `useMemo` et des mots figés dans la langue de départ ; `errorReason.ts` supprimé sans chercher dans les
  `.tsx` ; un sabotage de vérification qui modifiait les deux langues ; un exemple de couleur calculé en HSV au lieu de HSL.

### 2026-10-21, le soir — le design system 0.7.0, la date historique, l'internationalisation maison

Même plage au journal que la session de l'après-midi, **21/10 17:24 → 23:33 (6 h 08 en tout, ce soir ~20:01 → 23:33,
environ 3 h 30)** ; le chantier ouvert le 05/10 totalise **99 h 28 sur 17 plages**. **6 commits** `aef0bf1`..`e61c84e`,
**tous poussés**, plus celui de cet état. La vérification de REPO-264 a tenu : le hook a nommé les règles du sujet.

- **CARTO-117** — fubaritico-ds 0.7.0, publié par le dev ce soir : les 22 surcharges de `theme.css` renommées, les rôles
  que le chrome atteint posés en sombre, et une garde dans les deux sens (`UNSET_ON_PURPOSE`). Testé par lui. Un serveur
  Vite lancé avant la montée servait encore la 0.6.0 : relancé.
- **CORE-217** — `core/src/time/` : instant ou intervalle, « vers », l'an zéro refusé à la lecture avec la raison, Julien ↔
  Grégorien par le jour julien. Décidé par le dev : une date mal formée est refusée en disant pourquoi.
- **ATLAS-159, deux étapes et demie sur trois** — le dev : *« pas possible de mettre des labels en dur »*, tout de suite.
  Un moteur ICU maison (`core/src/i18n/`, sans dépendance) ; l'atlas tire chaque phrase d'un catalogue fr/en, sa table
  d'accords disparaît (testé par lui dans les deux langues, en ligne) ; dans le Cartographe, la langue à la racine,
  `useTranslation` (son nom), une ErrorBoundary par zone. **Ses décisions** : le Cartographe aussi en fr/en, avec ses
  propres fichiers ; la langue du navigateur, l'anglais sinon, l'atlas compris ; plus tard `localStorage` → navigateur →
  anglais (ATLAS-266, en Idées) ; une valeur manquante lève ; des boundaries dans chaque zone, Réessayer sur la carte.
- **Mes fautes** : du jargon qu'il n'a pas compris (« liste de saisie » pour le Typeahead, « l'anglais en tête des pages ») —
  *« tout ça pour ça »*, *« de quoi tu parles ? »* ; le worktree supprimé juste après lui avoir dit de l'ouvrir ; un
  commentaire Trello disant qu'il n'avait pas testé ; la boundary de la carte d'abord oubliée ; un sabotage resté sans
  effet (`sed` de macOS) avant d'être refait ; un composant écrit de mémoire, vérifié dans la doc de React à sa demande.

> Older sessions (2026-09-12 → 2026-10-21, the afternoon) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
