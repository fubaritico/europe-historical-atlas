# Ornament by era — Fontainebleau, Versailles, the Empire — ATLAS-329

> **Asked by the dev, 2026-11-03** (his words, translated): *"Class — I want Versailles, Napoleon, Fontainebleau. Think
> of France."* And, the same evening, his idea of **several designs that alternate with the century shown** — the atlas
> runs from the 1st to the 21st century. This file brings, for each of the three French eras, what defines it, **where
> to take it from freely**, plates to hand to Claude Design and to rework by hand, and a first translation into a flat
> interface. It follows [`ornament-17th-century.md`](ornament-17th-century.md) (the map trade's ornament: strapwork,
> the Amsterdam cartouche, Speed, Jolivet) and does not repeat it. The tone is already his
> ([`interface-scenarios.md`](interface-scenarios.md), « The tone »): camaieu, brown buttons, ornament, light gradients.
>
> Grades: **found** = fetched on 2026-11-04 and the page says what is written here — for the Met, through its own
> collection API (`isPublicDomain: true`), its web pages answering 429 to automated reads; for Commons, through its API
> (licence field and categories). **from memory** = mine, to check before relying on it. **Proposals are mine**, for him
> to judge.

## 0. The licences, once — and the traps

| library | what it says | grade |
| --- | --- | --- |
| **The Met, Open Access** | records flagged public domain; the Met's files on Commons are tagged **CC0**, « donated … as part of a project by the Metropolitan Museum » | found (API, Commons) |
| **Rijksmuseum** | « Public Domain or CC0 », the museum asks — not requires — to be credited (`data.rijksmuseum.nl/policy`); its prints on Commons are tagged **CC0** | found |
| **Cooper Hewitt** (on Commons) | files tagged **Public domain** (CC-PD-Mark) | found |
| **Bibliothèque numérique de l'INHA** | **Licence Ouverte (Etalab)**: « Toute réutilisation (y compris commerciale) est libre et gratuite sous réserve de mentionner la source » | found |
| **Gallica (BnF)** | non-commercial reuse « libre et gratuite », keeping the credit **« Source gallica.bnf.fr / BnF »**; commercial reuse « payante et fait l'objet d'une licence » | found in the terms printed on Gallica's PDFs; **its terms page and its records refuse automated reads (403)** |
| **Wikimedia Commons** | the licence is **per file**, never per category | found |

**Three traps, each with its way out:**

1. **A photograph of a 3D work is not public domain.** The Galerie François Ier's stucco is 1530s, but every photo of it
   in `Category:Galerie François Ier` that I checked is **CC BY-SA 4.0** (Zairon, Frédéric Neupont, GFreihalter) — the
   photographer's right. Share-alike would bind what we derive. **Way out**: the gallery's photos are for looking only;
   trace from the **prints** (Fantuzzi, Du Cerceau), which are flat and public domain. *Worth knowing.*
2. **Gallica's files on Commons say "Public domain", Gallica says "non-commercial, with credit".** Both hold at once
   (the work is PD; the BnF sets terms on its scan). The repo is non-profit, so we are inside Gallica's terms — **always
   keep the line « Source gallica.bnf.fr / BnF »** in the mention. Prefer the Met or Rijksmuseum copy of the same print
   when one exists. *Worth knowing.*
3. **Two Du Cerceaus.** Jacques I Androuet du Cerceau is 16th-century Fontainebleau; **Paul** Androuet du Cerceau's
   *Ornemens à la mode* (Rijksmuseum, c. 1670–85) is Louis XIV. Commons search mixes them. **Way out**: read the
   category (« Category:Paul Androuet du Cerceau ») before filing a plate under an era. *Cosmetic, but it would mislabel.*

## 1. Fontainebleau — the Renaissance of François Iᵉʳ, c. 1530–1570

**What defines it.** Rosso Fiorentino's **Galerie François Iᵉʳ** (c. 1533–39, from memory): a fresco panel set in a
frame of **high-relief stucco** — nudes, putti, garlands of fruit — over a carved walnut wainscot. Its frames are the
**cuirs découpés** (strapwork): the frame cut like leather, its ends rolled into scrolls, pierced, threaded through
itself. Read in the prints: Fantuzzi's *Frame of Ignorance Defeated* (1543, seen) is a framed central picture flanked
by two towers of caryatids, satyrs and hanging fruit, a pediment with the royal monogram **FRF** above, an **empty
tablet** below — the cartouche *is* the composition. Du Cerceau's *Grands Cartouches de Fontainebleau* (c. 1550, Commons
date) reduce it to the empty frame of « cuirs et de guirlandes de fruits » (BnF's title).

- **Motifs**: strapwork scrolls; garlands of fruit; satyrs, terms and caryatids; mascarons; the **salamander** and the
  **F** of François Iᵉʳ; grotesques after the Roman ones; oval and rectangular empty cartouches.
- **Structure of a frame**: symmetrical; a central field, thick sides that carry the weight, a tablet below, a crown
  above. The ornament **surrounds** an empty space meant for something else — exactly a panel's job.
- **Typography** (from memory): Claude Garamont's romans (Paris, c. 1530–40s), Geoffroy Tory's *Champ fleury* (1529) on
  the proportions of Roman capitals; title pages of the period put the title in roman capitals **inside an engraved
  architectural or strapwork frame**.
- **Palette** (my proposal, not measured): gilt on walnut, white stucco, fresco earths — `#6B4A2B` walnut, `#B08D57`
  old gilt, `#E9E1D0` stucco, `#8C3B2A` fresco red. The prints are **brown ink on cream**, which is our camaieu already.
- **Do not confuse with**: the **Northern strapwork** of Vredeman de Vries and the map cartouches (Flemish, later,
  flatter — the 17th-century file); Italian grotesques of Raphael's Loggia (no strapwork); Henri II's later sobriety.

**Libraries to draw from**

| library | where | rights | grade |
| --- | --- | --- | --- |
| Antonio Fantuzzi's etchings after Rosso and Primaticcio, 1540–45 (65 records) | The Met — https://www.metmuseum.org/art/collection/search/336739 and siblings; Commons `Category:Antonio Fantuzzi` — https://commons.wikimedia.org/wiki/Category:Antonio_Fantuzzi | Met: public domain (OA); Commons per file | found |
| Copies after Fantuzzi, *Plafonds en cartouches … rolwerk met grotesken* (Rijksmuseum RP-P-1953-228 → 257) | https://commons.wikimedia.org/wiki/Category:Works_after_Antonio_Fantuzzi | CC0 | found |
| Jacques I Androuet du Cerceau, *Grands Cartouches de Fontainebleau* (two suites) | Gallica scans on Commons — https://commons.wikimedia.org/wiki/Category:Jacques_I_Androuet_du_Cerceau | PD on Commons; Gallica non-commercial + credit | found |
| René Boyvin, Fontainebleau engraver (masks, vases, the *Nymph of Fontainebleau*) | The Met — https://www.metmuseum.org/art/collection/search/358361 | public domain (OA) | found |
| Drawings for the gallery's walls (Rosso; School of Fontainebleau) | The Met — 347609, 344909 | public domain (OA) | found |
| Galerie François Ier, photographs | https://commons.wikimedia.org/wiki/Category:Galerie_Fran%C3%A7ois_Ier | **CC BY-SA** for the photos checked — look, don't trace | found |

**Plates for interface pieces**

| interface piece | plate | URL | grade |
| --- | --- | --- | --- |
| a panel frame, the loading screen | Fantuzzi, *Frame of Ignorance Defeated*, 1543 — towers of figures round a framed field, tablet below | https://www.metmuseum.org/art/collection/search/336739 | found (seen) |
| a panel frame, landscape | Fantuzzi, *Landscape with Ornamental Frame*, c. 1543 | https://www.metmuseum.org/art/collection/search/336741 | found |
| an empty cartouche (title, tooltip) | Fantuzzi, *Grand cartouche ovale vide* (Gallica) | https://commons.wikimedia.org/wiki/File:Grand_cartouche_ovale_vide_-_estampe_-_FA_%28Antonio_Fantuzzi%29_-_btv1b532461299.jpg | found |
| a rectangular cartouche | Fantuzzi (after Primaticcio?), *Cartouche rectangulaire vide* (Gallica) | https://commons.wikimedia.org/wiki/File:Cartouche_rectangulaire_vide_-_estampe_-_.AF._%28Antonio_Fantuzzi%29_%28monogramme%29_;_%28d'apr%C3%A8s_Le_Primatice_%3F%29_-_btv1b53246173p.jpg | found |
| a square frame, strapwork + fruit | Du Cerceau, *Grands Cartouches de Fontainebleau*, 1st suite (7) | https://commons.wikimedia.org/wiki/File:Premi%C3%A8re_suite_de_dix_pi%C3%A8ces,_dite_des_Grands_Cartouches_de_Fontainebleau._%287%29_%28Cadre_carr%C3%A9_vide,_au_milieu_d'un_montant_d'ornements,_form%C3%A9s_de_cuirs_et_de_guirlandes_de_fruits%29_-_estampe_-_btv1b53240420b.jpg | found |
| a small frame, icon frame | Du Cerceau, 2nd suite (2), small square frame | https://commons.wikimedia.org/wiki/File:Deuxi%C3%A8me_suite_de_Grands_Cartouches_de_Fontainebleau._%282%29_%28Petit_cadre_carr%C3%A9_;_en_bas,_squelette_de_cr%C3%A2ne_d'animal_;_plus_bas,_enfants-lions_ail%C3%A9s_s'embrassant%29_-_estampe_-_%28Jacques_Androuet_Du_Cerceau%292_-_btv1b53240412t.jpg | found |
| a square cartouche in a scroll frame (CC0) | after Fantuzzi, Rijksmuseum RP-P-1953-234 | https://commons.wikimedia.org/wiki/File:Vierkante_cartouche_Plafonds_en_cartouches_in_een_omlijsting_van_rolwerk_met_grotesken,_guirlandes_en_mascarons_%28serietitel%29,_RP-P-1953-234.jpg | found |
| a vertical border, a divider | Fantuzzi, *Ornament Panel with Terms and Spiral Bases* | https://www.metmuseum.org/art/collection/search/336750 | found |
| a mascaron (the one figure) | Boyvin, *Mask from Libro di Variate mascare*, 1560 | https://www.metmuseum.org/art/collection/search/396265 | found |

**Into a flat interface** (my proposal): keep the **composition** — a heavy symmetrical frame round an empty field, a
tablet below for the label, a crown above for the century; keep the **strapwork scroll** as one SVG corner, drawn once
and mirrored. Drop the figures (nudes, satyrs) entirely: at button size they read as noise, and we would have to draw
them. A button is a small tablet; a panel is Fantuzzi's frame with its towers reduced to two rolled straps.

## 2. Versailles — Louis XIV, c. 1660–1715

**What defines it.** Order and symmetry at the scale of a palace: **Charles Le Brun** directs (the Galerie des Glaces,
from memory), **Jean Le Pautre** (1618–1682, from memory) engraves the repertory — friezes of acanthus, tritons, medallions,
cartouches, chimneypieces, ceilings — and **Jean Bérain** gives the late reign its **grotesque**: light, airy
symmetrical arabesques of bands, canopies, terms, monkeys and figures on a void (from memory; his *Ornament Designs*
at the Met show the denser furniture side). **Daniel Marot**, a Huguenot, carries the style to the Netherlands and
England after 1685 (from memory).

- **Motifs**: acanthus scroll; the **sun mask** (Apollo); the crowned **L L**; fleur-de-lis; trophies of arms; the
  **shell** (still symmetrical); lambrequins (scalloped drapery, Bérain); trellis (*treillage*); garlands, festoons.
- **Structure of a frame**: an oval or rectangular field in a **moulded frame**, cartouche ends turned in acanthus, a
  shell or mask at the head and foot, **strict axial symmetry** — the strapwork has become sculpture.
- **Typography**: the **Romain du Roi** — Philippe Grandjean's types for the Imprimerie royale, commissioned 1692, first
  used for the *Médailles sur les principaux événements du règne de Louis le Grand* (1702) (Commons sample, found; dates
  from memory): vertical stress, flat serifs, the first « rational » roman. Titles in **spaced capitals**, often
  **engraved** inside a cartouche rather than set in type.
- **Palette** (my proposal, not measured): **white and gold** (`#F4EFE4`, `#C9A45C`), the crimson of state velvet
  (`#8E1F2B`), *bleu de France* for the fleurs-de-lis (`#2B4C8C`), marble greys. For our camaieu: the gold and its
  brown shadow, the blue kept as a single accent.
- **Do not confuse with**: **Rococo** / Louis XV (asymmetrical *rocaille*, c-scrolls, 1730s on — the trap of "Versailles"
  in any image search); the Amsterdam map cartouche (the 17th-century file); Marot's Dutch variant (same vocabulary,
  heavier).

**Libraries to draw from**

| library | where | rights | grade |
| --- | --- | --- | --- |
| **Jean Le Pautre at the Rijksmuseum** — 607 prints: *Nouueau Liure de Cartouches et Ornemens*, *Grote cartouches*, *Frises, Feüillages ou Tritons Marins*, *Differents Morceaux d'Ornements pour … Frises* | https://commons.wikimedia.org/wiki/Category:Prints_by_Jean_Le_Pautre_in_the_Rijksmuseum_Amsterdam | **CC0** | found |
| Le Pautre's *Frises, feuillages ou tritons marins* at the Met | https://commons.wikimedia.org/wiki/File:Two_Designs_for_Friezes_with_Medallions,_from-_Frises,_feuillages_ou_tritons_marins_antiques_et_modernes_MET_DP834192.jpg | CC0 | found |
| Le Pautre, everything on Commons (Gallica albums included: *Nouveaux desseins de plafons*, *Oeuvres d'architecture*) | https://commons.wikimedia.org/wiki/Category:Jean_Le_Pautre | per file; Gallica's terms for the btv1b files | found |
| Jean Bérain, *Ornament Designs Invented by J. Berain* (after 1711) | https://www.metmuseum.org/art/collection/search/345898 | public domain (OA) | found |
| Daniel Marot, *Oeuvres du Sr. D. Marot* (1703 or 1712) | https://www.metmuseum.org/art/collection/search/353702 | public domain (OA) | found |
| Paul Androuet du Cerceau, *Ornemens à la mode* (c. 1670–85) | https://commons.wikimedia.org/wiki/File:Drie_friezen_met_cartouches_Ornemens_%C3%A0_la_mode_%28serietitel%29,_RP-P-1964-2334.jpg | CC0 | found |

**Plates for interface pieces**

| interface piece | plate | URL | grade |
| --- | --- | --- | --- |
| a title cartouche | Le Pautre, *Grote cartouche* (RP-P-1964-4466) | https://commons.wikimedia.org/wiki/File:Grote_cartouche_Grote_cartouches_%28serietitel%29,_RP-P-1964-4466.jpg | found |
| a round frame (century, medallion) | Le Pautre, *Cartouche op rond schild*, *Nouueau Liure de Cartouches* (RP-P-1964-4410) | https://commons.wikimedia.org/wiki/File:Cartouche_op_rond_schild_Nouueau_Liure_de_Cartouches_et_Ornemens_%28serietitel%29,_RP-P-1964-4410.jpg | found |
| two half panels — a panel's sides | Le Pautre, *Twee halve panelen met cartouche* (RP-P-1964-4411) | https://commons.wikimedia.org/wiki/File:Twee_halve_panelen_met_cartouche_Nouueau_Liure_de_Cartouches_et_Ornemens_%28serietitel%29,_RP-P-1964-4411.jpg | found |
| a title page for the set (lettering in a cartouche) | Le Pautre, *Titelblad Nouueau Liure de Cartouches* (RP-P-1964-4406) | https://commons.wikimedia.org/wiki/File:Titelblad_Nouueau_Liure_de_Cartouches_et_Ornemens_Nouueau_Liure_de_Cartouches_et_Ornemens_%28serietitel_op_object%29_Nouueau_Liure_de_Cartouches_et_Ornemens_%28serietitel%29,_RP-P-1964-4406.jpg | found |
| a divider, a header band | Le Pautre, four rows of friezes (RP-P-1964-2787) | https://commons.wikimedia.org/wiki/File:Vier_rijen_friezen_Differents_Morceaux_d'Ornements_Pour_Seruir_aux_Frises_Corniches_et_Architraues_%28serietitel%29,_RP-P-1964-2787.jpg | found |
| a long frieze with a medallion | Le Pautre at the Met, *Two Designs for Friezes with Medallions* | https://commons.wikimedia.org/wiki/File:Two_Designs_for_Friezes_with_Medallions,_from-_Frises,_feuillages_ou_tritons_marins_antiques_et_modernes_MET_DP834192.jpg | found |
| acanthus scroll, a footer | Le Pautre at the Met, *Two Designs for Friezes with Acanthus Scrolls* | https://commons.wikimedia.org/wiki/File:Two_Designs_for_Friezes_with_Acanthus_Scrolls_from-_Frises,_Feuillages_ou_Tritons_Marins_%C3%A0_la_romaine_MET_DP834295.jpg | found |
| grotesque panel (the background of a large panel) | Bérain, *Design for a Ceiling* | https://www.metmuseum.org/art/collection/search/334910 | found |
| a corner piece | Bérain, plate p. 71 of the *Ornament Designs* (scrolled cartouche ends, masks) | https://www.metmuseum.org/art/collection/search/704827 | found (seen) |
| the typeface, as printed | *Romain du roi sample (1702)* | https://commons.wikimedia.org/wiki/File:Romain_du_roi_sample_%281702%29.png | found |

**Into a flat interface** (my proposal): keep **symmetry on the axis**, the **moulded double frame** (a thick and a thin
line, rounded inner corners), the **shell or sun at the head** of a panel, a **frieze band** as the header of a
panel. Bérain's grotesque, thinned to a hairline, can sit at 10–15 % in a large panel's ground — the one place where
detail does not compete with text. Drop figures, trophies and drapery. Of the three, it is the most likely to look
like a luxury brand: **the restraint is the classy part**.

## 3. The Empire — Napoleon, c. 1800–1815

**What defines it.** Charles **Percier** and Pierre-François-Léonard **Fontaine**'s *Recueil de décorations
intérieures* (1801 in parts, 1812 as a book, 72 plates; printed by P. Didot l'aîné per NYPL's record seen in search) is
the style's manual. Its plates (seen: the *Cabinet de travail*, a bedroom in perspective) are **line engravings, no
shading of note**: walls cut into **rectangular panels by thin pilasters**, a **frieze of identical laurel-wreath
medallions** along the top, a figure or trophy centred in each panel. Roman imperial ornament, rationalised.

- **Motifs** (from memory, partly seen): **laurel wreath**, palmette and anthemion, the **eagle**, the **bee**, the
  crowned **N**, winged Victories, swans, lyres, torches, the Greek key; stars.
- **Structure of a frame**: **orthogonal**. A rectangle with a thin fillet, a frieze band, a centred emblem; repetition
  of one small motif at an even pitch; no scrolls, no curls. The plain field matters as much as the ornament.
- **Typography**: the **Didot** romans — extreme thick–thin contrast, vertical stress, hairline serifs (from memory);
  titles in widely spaced capitals, often with **one line in light, one in bold**.
- **Palette** (my proposal, not measured): **vert Empire** (`#2F4F3A`), *rouge Empire* / crimson (`#8B1E22`), **gilt
  bronze** (`#B8913B`), mahogany (`#5A2A1B`), the white of the engraving. For our camaieu: mahogany and bronze, green
  as the accent.
- **Do not confuse with**: **Louis XVI** neoclassicism (1770s–80s: lighter, ribbons, garlands, still curved);
  the **Directoire** (1795–99, transition); **Regency** in Britain; the **Second Empire** (1850s–60s, eclectic, heavy).

**Libraries to draw from**

| library | where | rights | grade |
| --- | --- | --- | --- |
| *Recueil de décorations intérieures*, 1812, the Met (7 images on Commons) | https://www.metmuseum.org/art/collection/search/349854 | public domain (OA); CC0 on Commons | found |
| The whole 1812 book as a DjVu (Google Books scan) | https://commons.wikimedia.org/wiki/File:Percier,_Fontaine_-_Recueil_de_d%C3%A9corations_int%C3%A9rieures,_1812.djvu | Public domain (PD-old-70) | found |
| Getty Research Institute copy via the Internet Archive (PDF on Commons) | https://commons.wikimedia.org/wiki/File:Recueil_de_d%C3%A9corations_int%C3%A9rieures_-_comprenant_tout_ce_qui_a_rapport_%C3%A0_l%27ameublement_comme_vases,_tr%C3%A9pieds,_cand%C3%A9labres,_cassolettes_..._miroirs,_ecrans,_etc.etc.etc._%28IA_gri_33125008463776%29.pdf | Public domain | found |
| Percier's drawings and objects (156 files) | https://commons.wikimedia.org/wiki/Category:Charles_Percier | per file | found |
| Heidelberg University Library's digitised copy | https://digi.ub.uni-heidelberg.de/diglit/percier1812 | listed as public domain in search | from memory — **the site refused my fetch (bot wall)** |
| Empire wallpapers and dados, Cooper Hewitt | https://commons.wikimedia.org/wiki/Category:Empire_style_ornaments | Public domain (CH files) | found |

**Plates for interface pieces**

| interface piece | plate | URL | grade |
| --- | --- | --- | --- |
| a header band of repeated medallions | *Recueil*, elevation of a study — frieze of laurel wreaths over panels | https://commons.wikimedia.org/wiki/File:Recueil_de_Decorations_Int%C3%A9rieures_MET_DP247795.jpg | found (seen) |
| a panel's layout (pilasters, field, centred emblem) | *Recueil*, a bedroom in perspective | https://commons.wikimedia.org/wiki/File:Recueil_de_Decorations_Int%C3%A9rieures_MET_DP-280-001.jpg | found (seen) |
| a title page | *Recueil*, Met DP250567 (the record's lead image) | https://commons.wikimedia.org/wiki/File:Recueil_de_Decorations_Int%C3%A9rieures_MET_DP250567.jpg | found (content not seen) |
| an oval medallion (actors, century) | Percier, *Design for Neptune with an Oval Medallion* | https://www.metmuseum.org/art/collection/search/335967 | found |
| an emblem (Victories round a portrait) | Percier, *Fan with Napoleon flanked by Peace and Victory*, c. 1797–99 | https://www.metmuseum.org/art/collection/search/209538 | found |
| a vignette (tooltip, loading tip) | Percier, *Design for a Vignette: Harbor Scene* | https://www.metmuseum.org/art/collection/search/335965 | found |
| a dado, a footer band | Cooper Hewitt, *Dado (France), 1800–1825* | https://commons.wikimedia.org/wiki/File:Dado_%28France%29,_1800%E2%80%931825_%28CH_18476511%29.jpg | found |

**Into a flat interface** (my proposal): of the three, **the one that translates almost unchanged** — it is already
line, grid and repetition. A panel = a rectangle with a thin fillet; its header = a band of small wreaths at an even
pitch (one SVG, repeated by CSS `background`); a button = a plain rectangle in mahogany with a bronze hairline; the
century in a laurel wreath. Drop the eagles, bees and N: they are Napoleon's, not Europe's, and the atlas is not
partisan. **Risk to name**: the Empire's flatness is close to today's « luxury minimal » — classy, but the least
historical-looking of the three.

## 4. Which centuries each could dress — a suggestion only

| era | dresses | why |
| --- | --- | --- |
| Fontainebleau | **15th–16th** | its own time; its grotesques are the rediscovered Roman ones |
| Versailles | **17th–18th** | its own time and its long echo |
| Empire | **19th–21st**, and **1st–5th** | its own time; and it is a Roman imperial revival, so it reads as « Antiquity » |

**The gap: the 6th to the 14th century** — none of the three is medieval. *Worth knowing, his call.* Two ways out: let
Fontainebleau stretch back over the Middle Ages (anachronistic, but French and coherent), or add a **fourth**,
manuscript/Gothic design (illuminated borders, Gothic tracery) — which leaves « think of France » but fits the centuries.

## 5. Open-licensed typefaces close to each era

| era | historical letter | free typeface | licence / URL | grade |
| --- | --- | --- | --- | --- |
| Fontainebleau | Garamont's roman | **EB Garamond** | OFL-1.1 — https://fontsource.org/fonts/eb-garamond | found |
| Fontainebleau | Garamont, display sizes | **Cormorant Garamond** (and **Cormorant SC**) | OFL-1.1 — https://fontsource.org/fonts/cormorant-garamond | found |
| Fontainebleau | Roman inscriptional capitals | **Cinzel** (titles only, capitals only) | OFL-1.1 — https://fontsource.org/fonts/cinzel | found |
| Versailles | Romain du Roi | **no free revival found** — commercial: Royal Romain (Wiescher), Romain BP (Ian Party) | search, 2026-11-04 | found (absence) |
| Versailles | 17th-c. French-cut romans | **IM Fell French Canon** — check its attribution clause (17th-c. file) | OFL-1.1 — https://fontsource.org/fonts/im-fell-french-canon | found |
| Versailles | the « transitional » that followed | **Baskervville** (ANRT) | OFL-1.1 — https://fontsource.org/fonts/baskervville | found (licence); ANRT origin from memory |
| Empire | Didot | **Theano Didot** (Alexey Kryukov) | OFL, from memory — https://fontlibrary.org/en/font/theano-didot (page answers, licence not readable) | from memory |
| Empire | Didot, by name | **GFS Didot** — **its Latin is reportedly based on Palatino**, not on Didot: a trap | OFL-1.1 — https://fontsource.org/fonts/gfs-didot | licence found; the trap from memory |
| Empire | Bodoni, Didot's Italian sibling | **Bodoni Moda**, **Libre Bodoni** | OFL-1.1 — https://fontsource.org/fonts/bodoni-moda , https://fontsource.org/fonts/libre-bodoni | found |
| Empire | high-contrast display | **Playfair Display** | OFL-1.1 — https://fontsource.org/fonts/playfair-display | found |

**My proposal**: one text face for the whole atlas (**EB Garamond** — legible, French, in period for two eras out of
three) and a **display face per era** for titles only: Cormorant SC / Cinzel, IM Fell French Canon, Bodoni Moda. The
reader's text never changes; the era is said by the titles and the frames.

## 5b. The logo by era — the dev's prompts to Claude Design (2026-11-05)

The dev asked Claude Design for **one declension of the Λ logo per period** — the logo first, the rest of the dress
after — though the mock-up's mood stays 17th-century and neoclassical. His six prompts:
`files/resources/claude-design/prompts_claude_design.md` (ignored, copied from his Desktop): **Antiquity** (a Roman
pediment, Greek key or laurel) · **Middle Ages** (a gothic arch, a shield, knotwork) · **Early modern** (neoclassical:
double fillet, bead-and-reel, oval medallion, rosettes) · **19th century** (Empire: double frame, laurel wreath, bees)
· and two **20th-century** bonuses (Art Nouveau, Constructivism).

What I read against what is decided (not his decision until he says so):
- **The two 20th-century bonuses fall outside the atlas**, which stops at 1900 with no contemporary dress (the dev,
  2026-11-05). Four declensions, then — and the four match the French manuals' periods, which answers § 4's gap: the
  Middle Ages gets its own (the fourth design § 4 proposed).
- **« Fontainebleau » names the 19th-century prompt**; in § 1 Fontainebleau is the Renaissance of François Iᵉʳ (16th).
  The Empire's model is Percier and Fontaine (§ 3). A word to change if the prompt is sent again.
- **« Early modern » is written 18th-century neoclassical**, where the mock-up's mood and § 2 are Versailles, the 17th.
  Either is in period for 1492–1789; the choice is his.

**Who draws the ornaments — the dev, 2026-11-05**: Claude Design is *"catastrophic at ornament"*; he draws the
vectors himself in Illustrator (or Adobe Animate), from the plates of § 1–3. Claude Design keeps the layout and the
mood; I turn his vectors into the interface (SVG on the camaieu's tokens).

## 6. What comes next

1. The dev chooses: three designs by century, or one; and whether the gap (6th–14th) gets a fourth.
2. These plates go to Claude Design as **mood**, in `files/resources/` (ignored), never committed; a plate we trace or
   ship goes through `/create-data-mention`, with its credit line (Rijksmuseum, the Met, « Source gallica.bnf.fr / BnF »).
3. I rework Claude Design's screens with § 1–3's translations; every ornament redrawn as SVG, on the camaieu's tokens.
