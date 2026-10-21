---
paths:
  - "packages/core/**"
---
# Known issues — core

Open issues of `packages/core`: the document model, the history, the derivations. Loaded by path; indexed in `.claude/known-issues.md`.

- **Un tronçon entre deux ancres de côte est lu comme de la côte, même s'il coupe la terre** (15/10, QUAL-001).
  Depuis que la côte est demandée avant l'inclusion (les îles dalmates de Venise), un trait droit tiré de côte à
  côte en travers d'une presqu'île — le cou d'un duché tranché d'un seul segment — perd sa frontière avec le pays
  qui l'englobe. **Mesuré sur les 137 pays de 1100 : aucun cas** ; ~200 tronçons changent, tous ≤ 5,7 km (de vraies
  côtes face à un canal étroit), sauf une corde de 17,2 km… au-dessus du golfe de Naples. Remède le jour où ça mord :
  exiger que les deux ancres soient **consécutives sur le trait de côte**, pas seulement prises dessus.
  **Sévérité : à savoir.**
- **Un geste modifie le document AVANT que l'historique l'enregistre : si la copie échoue entre les deux,
  `ctrl+z` ne peut plus revenir dessus.** Relevé en écrivant `createPolity` (4d-2 (c1), 08/10), et **écrit
  une fois ici plutôt qu'argumenté à chaque action** : les gestes de dessin de `(d)` — poser une ancre, en
  déplacer une, fermer un anneau — auront tous cette forme.
  **Dans l'ordre** : (1) le geste modifie le document, (2) l'historique en prend une copie pour pouvoir y
  revenir, (3) l'état est publié. Si l'étape 2 échoue, le pays est **dans le document mais pas dans
  l'historique** : rien ne sait le retirer. `canUndo` reste faux et aucun pas n'apparaît — c'est exactement
  ce que le test « propagates a failing copier » vérifie.
  **Pourquoi on ne le corrige pas** : les deux remèdes coûtent plus que le défaut. Copier *avant* de muter
  doublerait le coût de chaque geste (~265 Ko le pas) pour couvrir un cas qui n'arrive pas —
  `cloneYearDocument` sur un document valide ne lève pas, et un `RangeError` de mémoire aurait déjà tout
  emporté. Rattraper et défaire serait un `catch` qui continue, ce que `rules/error-handling.md` demande de
  discuter avant d'écrire : l'échec est **propagé bruyamment**, et c'est la branche choisie.
  **Déclencheur** : le jour où un copieur peut légitimement échouer — si un pas se met à sérialiser, ou si
  l'autosave de `s15` partage ce chemin. **Sévérité : à savoir, pas bloquant.**
- **Recharger un jalon jette ce que la ligne tenait après lui, et rien ne le décide encore.** — CARTO-198 `restoreMarker`
  remplace la ligne par ce que le jalon a gelé ; ce qui suivait le pas marqué disparaît. Le code **ne prend
  aucune politique**, délibérément : le mécanisme est dans `core`, la décision appartient au chrome, et
  `rules/error-handling.md` en fait une décision produit et non un détail d'implémentation.
  **Les trois réponses sont écrites dans `s14-history-panel.md` avec leur coût.** Proposition : poser un
  jalon automatiquement avant de recharger, donc rien n'est jamais perdu — au prix d'une liste qui grossit
  seule. **Sévérité : à savoir, décision du dev, ne bloque pas l'étape 4.**
- **Un jalon fait que le plafond de 50 pas cesse de borner la mémoire.** Il tient sa propre suite d'entrées
  par référence, donc ce que la ligne laisse tomber reste vivant sous chaque jalon qui l'a gelé. C'est
  **le but** d'un jalon, pas un défaut — mais ça veut dire qu'un éditeur laissé ouvert avec dix jalons profonds
  tient dix lignes complètes. **Cosmétique aujourd'hui** (aucune interface), et le remède existe déjà :
  `[Clear]` sur un jalon. À re-mesurer si l'usage réel montre des jalons nombreux.
- **Un override de bout survivant à la suppression d'un pays garde ses ancres en vie.** `referencedAnchors`
  compte un `RunBorder` comme une référence, délibérément : un trait posé à la main est une décision, et
  laisser tomber les points sous lui l'annulerait en silence (ce que `s13` interdit). Conséquence assumée :
  supprimer un pays dont un tronçon était stylé laisse ces ancres dans le fichier, invisibles, sans aucun
  contour qui les tienne. **Le remède est `{Overrides}`**, qui existe depuis le 13/10 (`2b9caf0`) avec son `[Clear]` —
  reste à vérifier qu'il liste ces ancres orphelines (corrigé le 17/10 : l'entrée le disait absent). **Cosmétique tant que l'éditeur n'a pas d'interface** ;
  à ne pas « corriger » en supprimant l'override, ce serait le défaut inverse et plus grave.
- **`packages/core/README.md` décrit un paquet qui va changer.** — REPO-229 Il annonce « le format, les lecteurs, le
  compositeur, les maths ». Deux choses s'y ajouteront et n'y sont pas : le **type de date historique**
  (`HistoricalDate`, plan P8) et les **tables de traduction** (ICU, même section). Cosmétique, à faire
  quand l'un des deux arrive — mais un README de paquet est la première chose qu'un lecteur ouvre dans un
  monorepo, donc il ne doit pas mentir longtemps.
