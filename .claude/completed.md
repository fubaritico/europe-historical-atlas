## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-23 — le codeur : l'audit des instructions, rien de fait sur le code

Plage **23/11 13:20 → 14:30** (1 h 06 au journal, l'historien dans une autre session au début) ; le chantier totalise
**387 h 29 sur 62 plages**. Rien n'est poussé. Le rapport : `files/prompt-audit-2026-11-23.md`.

- **L'ouverture** : le MCP d'Atlassian répond ; rien en « À valider par le développeur » ; il a mis CMS-499 puis
  CARTO-498 en tête d'« À faire ».
- **L'audit (`/doctor prompt audit`), appliqué avec son accord** : six passages périmés corrigés — la règle du CMS de
  `next.md` qui laissait passer un champ ajouté sans migration (`push: false` depuis le 15/11), le chemin de l'export
  (`packages/atlas/public/content/`) dans `roles/coder.md` et `next.md`, la barre de menus « future » de
  `error-handling.md`, les liens de vassalité « pas encore dans la base » de `/enter-in-cms`, l'ordre du tableau, la
  version relue de `claude-config.md` (2.1.330).
- **Ses réglages** : le mode automatique par défaut et le plugin `frontend-design` éteint (`~/.claude/settings.json`) ;
  les six skills `memory-*` éteintes pour ce projet (`settings.local.json`), la ligne de l'arbre de décision renvoie à
  la commande `basic-memory` ; `context7` désactivé par lui. Les copies d'avant : `~/.claude/*.bak-2026-11-23`.
- **Laissé à lui ou à l'historien** : l'index de la mémoire à 22 Ko sur 25 ; la section « remplacée » de
  `/find-sources` et les deux scripts morts de `/bulk-entry` ; le modèle `opus` fixé de l'agent de recherche.
- **Pas fait** : rien sur CMS-495 ; l'audit des scénarios ; la zone de rattrapage d'erreur de la barre de menus pas
  vérifiée. Ma question « Wikidata, ou d'abord CMS-499 et CARTO-498 ? » est restée sans réponse : il relance la console.

### 2026-11-23 — l'historien : la méthode de recherche refaite, aucune recherche lancée

Plage **23/11 13:20 → 14:18** (57 min au journal) ; le chantier totalise **387 h 20 sur 62 plages**. Rien n'est poussé.
Commit `add0fb1d`. Le détail : `next-historian.md` et `/find-sources`, « The run, in order » et « The obligation ».

- **Son constat** : la carte ne ressemble pas à ce que les autres dessinent — l'Anatolie de la reconquête d'Alexis Iᵉʳ,
  Ancyre aux Danichmendides, la Castille, aucune ville dans le Caucase ni l'ancienne Arménie.
- **Mesuré** : 3 529 lectures du registre sur 3 534 étaient des pages Wikipédia ; aucun ouvrage du disque ouvert ; sur
  13 705 fiches de 1100, 11 949 ont un détenteur sans aucune ligne (le pays dessiné sous la ville), 412 sur Wikipédia
  seule ; un seul lieu en Arménie, Géorgie et Azerbaïdjan.
- **Ses règles, écrites dans les skills** (`find-sources`, `bulk-entry`, `enter-in-cms`, l'agent `source-researcher`,
  `roles/historian.md`, `rules/decision-tree.md`) : Wikipédia n'est qu'une amorce ; un détenteur exige un livre lu ;
  notre carte n'est jamais une base de vérification ; six canaux obligatoires et l'index des livres sur un à deux
  degrés ; trois phases — la mise en place par formulaires (ses axes, ses noms, ses ressources), l'exécution qui croise
  les lectures, le démontage qui vide le disque ; chaque essai compté et dit dans un journal ; CONNEXION IMPOSSIBLE ;
  J'AI BESOIN DE TOI, les cas bloqués sur une page lisible ; une ville lue dans une source est une ville à ajouter.
- **Dans les scripts de `/bulk-entry`** : `log.py`, `prepare.py`, `region_gate.py`, `cited_works.py` (nouveaux) ;
  `meta.py` ne lit plus la carte, `verifyv.py` refuse un détenteur sans livre — essayés sur un lot de deux pages et sur
  une copie d'une ancienne vague (70 fiches refusées sur 70).
- **Sept ouvrages ajoutés par lui sur le disque**, inscrits dans `bibliotheque.md` ; le Palgrave de Byzance ouvert, un
  essai au registre (son texte donne aux Danichmendides le plateau central), ses cartes pas regardées.
- **Mes fautes** : je m'arrêtais à Wikipédia depuis des semaines et la saisie en masse recopiait la carte ; des
  réponses trop longues pour une seule question ; le cas d'Ancyre repris alors qu'il parlait du déroulé ; une recherche
  lancée par formulaire qu'il n'avait pas demandée ; une suppression de 740 Mo donnée à décider.
