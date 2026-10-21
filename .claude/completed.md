## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

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

### 2026-10-19 — la gestion de l'incertitude, le README, la licence

Une plage au journal, **19/10 16:10 → 19:34 (3 h 24, 121 actions)** ; le chantier ouvert le 05/10 totalise **93 h 14 sur
16 plages**. **5 commits** `be2abdf`..`3c93e05`, **tous poussés** à la demande du dev, plus celui de cet état. Aucun code
de production touché ; la gate a tourné à chaque commit (hooks), verte.

- **Le sujet de départ, CORE-217 (la date historique), est devenu accessoire — assumé par le dev** : *« c'est très très
  bien, c'est assumé […] j'ai pas perdu le fil »*. Il devient le premier palier d'autre chose.
- **Mesuré** : Wikidata ne donne pas d'arbre de vassalité (France 1400 : 9 vassaux, moitié faux ; Anjou, Champagne, Blois
  sans lien) ; les infobox de Wikipédia en anglais, 3 fiefs sur 6. Le dev : *« on n'a que dalle […] à part Euratlas »*.
- **DESIGN-262, la gestion de l'incertitude** — une **initiative**, au-dessus des épiques : *« un système pour choisir »*,
  *« une réflexion très lourde derrière pour un résultat simple et attractif devant »*. Plan `files/plans/evidence-system.md`
  (concepts, principes, décisions du dev, paliers, lectures graduées) ; 15 termes au glossaire. Le tableau gagne une
  colonne **Chantiers**, le périmètre `[DESIGN]`, l'étiquette « chantier · incertitude » ; REPO-261 (les vassaux directs
  d'un territoire à une date) en Idées.
- **Le dépôt prêt à passer en public** : audit propre (ni Euratlas, ni GPL, ni `.env`, historique compris) ; le README
  réécrit comme la présentation de l'œuvre, sur la convention de ses autres dépôts ; **licence PolyForm Strict** pour le
  code, le corpus et les années réservés — *« je ne veux pas qu'il y ait de produit commercial à partir de mon travail »*.
- **Mes fautes** : « les plans sont gitignorés » affirmé sur la foi d'un CLAUDE.md périmé (corrigé) ; l'AGPL présentée comme
  protectrice alors qu'elle n'empêche pas la vente ; un commit refusé par commitlint dont les fichiers sont partis sous le
  message suivant (refait par `reset --soft`) ; deux `cd` (un sous-shell, un égaré) ; une requête SPARQL fausse donnée
  d'abord sans l'exécuter ; *« comme un livre »* lu de travers (*« reviens sur ce que je t'ai écrit avant »*) ; une
  question sur l'IA perdue en fin de message.

> Older sessions (2026-09-12 → 2026-10-18) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
