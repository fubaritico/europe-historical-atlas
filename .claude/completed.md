## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-08 soir → 09 nuit — 1200 nettoyée, l'arête effacée, la bande des vassaux

La même plage que l'entrée suivante, prolongée : **08/11 14:03 → 09/11 02:54** (12 h 50, dont ~7 h 40 depuis 19 h 13) ; le
chantier ouvert le 05/10 totalise **239 h 37 sur 40 plages**. **Sur `main`, non poussé** (sa réponse : *« non »*) :
`0bef68c`, `4cb9cdf`, `58e3575`, `ce9a8d3` ; poussés plus tôt : `0e2aec6`, `a8aa3b4`. Worktree `historian` et ses branches supprimés à sa demande.

- **1200 nettoyée à sa date** : les trois chevauchements de l'import à la main (`0e2aec6`) ; puis côtes, îles et lacs, en
  grande partie par le pilote, **finis par lui à la main** (*« on est en train de bouffer du token pour rien »*) ; 1100
  retouchée par lui (`0bef68c`). Sa méthode de la jonction, apprise : un point décalé de la côte, le point du voisin aimanté.
- **CARTO-397, effacer une arête** (`a8aa3b4`, Fait) : *« C'est magnifique, c'est exactement de ça dont on avait besoin »* ;
  une arête partagée part des deux pays — sa décision, pour les lacs.
- **La skill `/use-cartographer`** (`4cb9cdf`) : îles, côtes, lacs mesurés ; le pilote les dessine.
- **ATLAS-398, la bande des vassaux** (`58e3575`, revue `ce9a8d3`, Fait) : *« beaucoup plus clair comme ça, beaucoup plus
  sobre »* ; un seul niveau de vassalité, *« en camaïeu … pas gérable »*. Sa règle : **plus aucun réglage dans le panneau**
  (mémoire `no-more-dev-panel-tunables`).
- **ATLAS-399 ouvert** à son constat (la Baltique de 1200 : les chevauchements se mélangent dans l'atlas) : mesuré, approche
  proposée sur le ticket, pas encore validée.
- **Mes fautes** : un recul par `goTo` faussé par le plafond de 50 pas de l'historique (Mann resté ouvert, réparé) ; un chemin
  de 478 775 km² autour de la mer Noire pour Halych (défait depuis la copie) ; « sans frontière dedans » écrit sur ATLAS-399
  comme sa décision alors que c'était ma lecture (corrigé sur le ticket).

### 2026-11-08 — l'historien au laboratoire : la Catalogne de 1100 finie et publiée, le retracé libéré, 1200 en ligne

Une plage, **08/11 14:03 → 19:13** (5 h 09) ; le chantier ouvert le 05/10 totalise **231 h 56 sur 40 plages**. Instance
historien, worktree `historian` (branche `historian-1108`, synchronisée sur `main`). **Sur `main`, poussé, CI verte, site
vérifié** (`196eed5`).

- **La Catalogne de 1100, finie** : Lérida creusée autour d'Almenar, la lame de Pilzán soudée, Balaguer à Lérida ; **lui** a
  passé Sidamon, Torregrossa, L'Espluga et Barberà à Barcelone, puis Camarasa en enclave (son arbitrage, `sources/1100.md`).
  Restent Tamarit (dans la mer, une source) et Tarragone (vide) : rien dessiné, par la règle. Publiée (`3a33012`).
- **Sa méthode, après une heure à se battre avec l'outil** : *le pays qui subit d'abord, puis le pays visé, sur les mêmes
  points* — un seul pays par geste (skill `gestures.md`, mémoire `collateral-polity-first`).
- **Le retracé libéré** (`5b8c0c0`), à sa demande (*« faut rien interdire »*, *« tu bascules de mode au clic sur un point »*) :
  plus de refus « repasse par une ancre que garde… » (les boucles parasites coupées, `core/editor/strayLoops.ts`) ; le point
  sous le pointeur prime sur la côte ; un clic sur la frontière du pays visé fait avancer le départ. Revue : 10 constats, 8
  corrigés, 2 ouverts (`known-issues/cartographer.md`).
- **`/use-cartographer` 2.0** (`11f7267`) : mesurer → décider → dessiner, sept scripts `.mjs` (74 tests), la table des
  décisions ; glossaire, plan des frontières.
- **1200 publiée** (`196eed5`, sa décision : *« rien de bloquant dans le fait d'ajouter des années »*) ; les règles qui
  l'interdisaient réécrites, `.gitignore` dit comment publier une année.
- **Le pilote par script** (à sa question *« qu'est-ce qui t'empêche d'aller vite ? »*) : les clics envoyés au canevas depuis
  la page, la barre lue après chacun — l'Islande (1 170 points) et Bornholm redessinées en secondes. **Puis ma série
  automatique a abîmé 1200** (Skye : toute la Grande-Bretagne donnée à Mann ; restes de contours aux Lofoten ; Samsø effacée) —
  stoppée par moi, puis par lui ; rien de commité, la copie d'avant intacte.
- **Ce qu'il a vu en arrêtant** : 1200 superpose des pays de plusieurs années (Mann, Alba, Norvège) — à nettoyer d'abord.
- **Mes fautes** : neuf corrections au coup par coup qui déplaçaient le piège au lieu de l'ôter ; la barre de statut
  proposée comme signal alors qu'il ne la lit jamais ; une série lancée sans vérifier « closed » ni l'emprise de l'île.

> Older sessions (2026-09-12 → 2026-11-07) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
