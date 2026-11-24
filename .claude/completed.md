## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-23/24 — l'historien : le nord-ouest de la Péninsule saisi et dessiné, les taïfas réglées

Session **23/11 22:46 → 24/11 00:56** (2 h 10, au journal ; la plage du jour, 13:20 → 00:55, est partagée) ; le
chantier totalise **397 h 57 sur 62 plages**. Rien n'est poussé ; les exports sont commités par le codeur. Le détail :
`next-historian.md` et `/Volumes/Acer/atlas-historien/1100/iberie-nord-ouest/resultats/note-de-region.md`.

- **La base** : Ferrol et Pontevedra recréées (ma faute du soir d'avant, avec son accord) ; les 26 fiches du nord-ouest
  puis 6 de la frontière León-Castille saisies d'après Reilly, Flórez, López Ferreiro (Coria, Salamanque, Ávila, Toro,
  Tordesillas, Becerril, Nogal, Liébana, Palencia → León) ; 63 fiches au nom de pays repassé en français ; le Ponthieu
  en double fusionné ; Saragosse → Almoravides (Kennedy p. 173) ; Agde, Birecik, Tui reliés par un titre et un lien.
- **Son atlas** (García de Cortázar, Planeta 2005) lu en entier : la Pisuerga entre León et Castille (p. 185) ; aucune
  planche ne sépare Galice et Portugal ; référence, jamais décalqué. **Les sources de Kings and Generals** : rien d'utile.
- **Le dessin, à sa demande, dans son Cartographe** : la Castille ramenée à la Pisuerga, León sur le nord-ouest, la
  Galice et le Portugal créés en vassaux, Lisbonne aux Almoravides, Saragosse et Albarracín vassales, Majorque nommée.
  **82 → 39 alertes.**
- **Mes fautes** : 2 pages sur 30 de son atlas lues avant de lui répondre ; l'identifiant d'une personne donné pour
  celui d'un pays (Carcassonne) ; trop de réglages laissés à lui. Sa colère du soir : le système est trop compliqué.

### 2026-11-23 — l'historien : l'Anatolie de 1100 cherchée en trois tours et saisie, les agents devenus chercheurs

Session **23/11 16:42 → 20:25** (la plage du journal, 13:20 → 20:22, 7 h 01, est partagée avec les sessions du jour) ;
le chantier totalise **393 h 24 sur 62 plages**. Rien n'est poussé. Le détail : `next-historian.md`.

- **La méthode, à sa demande** : l'agent `source-researcher` réécrit en chercheur (`skills: [find-sources]`, il suit les
  liens et les cartes, range les livres qu'il trouve, écrit à l'historien) ; l'agent `book-reader`, nouveau ; dans
  `/bulk-entry`, `preflight.py` (tout vérifié avant une nuit, le MCP compris), `follow_links.py`, `build_saisie.py`,
  `loop_state.py` ; dans `/find-sources`, dix agents par défaut, une seule question, l'échelle quand un livre n'a pas la
  réponse, la boucle. Ses PDF rangés dans `bibliotheque/` sur Acer. **Non commité** : à commiter sur son mot.
- **L'Anatolie de 1100** : trois tours de recherche (29 lots, Opus), 50 ouvrages environ rangés dans `ouvrages/` ;
  138 fiches confrontées et saisies, vérifiées par script contre une copie de la base ; Chonai, Palu, Çemişgezek créées ;
  Ridwan et Thoros Iᵉʳ ; trois fiches fausses de moi supprimées, trois doublons fusionnés. `cities:alerts` : 57 alertes.
- **Le tour 3 n'est pas saisi** : son résultat est dans `resultats/saisie.json`, le point de reprise dit l'ordre.
- **Mes fautes** : des citations déformées en les recopiant, par les agents de saisie et par moi — réparées, et la règle
  tient désormais : le contenu est imprimé par script et collé tel quel ; des lots trop gros, arrêtés à leur limite sans
  rapport ; ma « erreur » sur le prince de Sassoun, qui n'en était pas une.
