## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

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

### 2026-10-21 — les règles chargées au bon moment, l'audit des instructions, Node 24, la CI verte

Une plage au journal, **21/10 17:24 → 19:48 (2 h 23, 212 actions)** ; le chantier ouvert le 05/10 totalise **95 h 43 sur
17 plages**. **4 commits** `b3313d1`..`d950e48`, **tous poussés** à la demande du dev, plus celui de cet état. Aucun code
de production touché — un délai de test dans `core`, la CI, la configuration de Claude.

- **REPO-264** — parti d'une conversation du dev avec Gemini sur les `CLAUDE.md` par dossier. Mesuré : 126 Ko chargés à chaque
  session, dont six règles que `CLAUDE.md` disait « NOT auto-loaded ». Retenu : des règles et des tranches de known-issues
  à `paths:` (52 Ko au lancement), un hook qui nomme les règles d'après ses mots — *« je veux que ça soit automatique »* —,
  `/rules` en filet, `claude-config.md` pour lire la doc de Claude Code avant de la configurer. Le dev : *« je ne comprends
  pas que tu n'aies pas le réflexe »* de signaler les bonnes pratiques ; d'où la règle. `/review` apprend désormais **en
  concertation** (étape 9), critères compris.
- **`/doctor prompt-audit`** : ~60 constats, la section A appliquée, la B point par point par le dev (quatre skills Basic
  Memory retirées, `find-skills` qui demande avant d'installer, `/commit` sur sa pratique ; l'accessibilité, l'insistance et
  les résumés de revue gardés — *« on va pas commencer à tout effacer »*). Le plus lourd : `/review` ne voyait aucun `.tsx`,
  et `draw-from-plate` disait `years/` jamais commité.
- **REPO-265** — Node 24, à sa demande ; vérifié sous la 24 sans cache, testé par lui. Le calendrier : 26 devient LTS le 28/10.
- **La CI était rouge depuis le 19/10** : un test lent sous couverture faisait échouer Sonar, et une condition `if:` du
  déploiement le sautait alors — contre la règle « Sonar ne bloque jamais ». Corrigé (`980766d`, `d950e48`), tout vert ;
  REPO-260 garde la gate locale.
- **Mes fautes** : un `cd` ; deux messages refusés par commitlint (lignes > 100) ; le hook déclenché par les rapports de
  mes agents, qui marquait cinq sujets comme demandés (corrigé, testé) ; un suivi de CI par SHA abrégé ; une question à
  deux volets que le dev n'a pas comprise — un exemple concret, un point à la fois.

> Older sessions (2026-09-12 → 2026-10-19) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
