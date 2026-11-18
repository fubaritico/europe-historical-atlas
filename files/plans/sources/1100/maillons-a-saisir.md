# 1100 — les maillons à saisir (liste du codeur, 16/11 02:30)

> Demandée par le dev, 16/11 : **tout passer en revue**. Sa règle : une chaîne de vassalité est faite de liens **directs**
> jusqu'au souverain — ville → comté → duché → royaume (→ empire). Le souverain se **coche** sur son titre (« souverain »,
> la case arrive dans « Titres ») — **plus jamais de maillon « ne relève de personne »** (refusé par lui).
> Une ville est bien placée dans le Cartographe quand le pays dessiné sous elle est **dans sa chaîne** : le dev ne dessine
> pas les comtés, donc la chaîne doit monter jusqu'au duché, au royaume ou à l'empire dessiné.

## 1. Les titres qui tiennent des villes et n'ont aucun suzerain — 146 titres, 888 villes

Pour chacun : un maillon « Vassal de » vers son suzerain **direct**, sourcé — ou, s'il est souverain, la case « souverain ».

| villes | titre | Wikidata du territoire | villes tenues (extrait) |
|---:|---|---|---|
| 212 | Coloman de Hongrie — royaume de Hongrie, 1100 (n° 18) | Q171150 | Abasár, Abaújvár, Abbaye de Kaposszentjakab, Alba Iulia, Almásfüzitő, Alsóbogát |
| 51 | Youssef ibn Tachfine — Almoravid dynasty, 1100 (n° 241) | Q75613 | Aghmat, Algésiras, Alicante, Almería, Alzira, Assilah |
| 37 | Alexis Ier Comnène — Empire byzantin, 1100 (n° 2) | Q12544 | Andrinople, Ballsh, Bela Palanka, Belgrade, Binač, Braničevo |
| 35 | Henri IV du Saint-Empire — Saint-Empire romain germanique, 1100 (n° 47) | Q12548 | Arzignano, Bassano del Grappa, Bologne, Casalecchio di Reno, Castel San Pietro Terme, Crölpa |
| 30 | Pierre Ier d’Aragon — Royaume d'Aragon, 1100 (n° 33) | Q199442 | Abizanda, Almenar, Alquézar, Ayerbe, Aínsa, Barbastro |
| 29 | Roger Ier de Sicile — comté de Sicile, 1100 (n° 3) | Q1917014 | Adrano, Agrigente, Caltagirone, Caltanissetta, Carini, Catane |
| 27 | Al-Musta'in II — taïfa de Saragosse, 1100 (n° 11) | Q33061 | Alcañiz, Almudévar, Atienza, Azaila, Belchite, Bolea |
| 27 | Alphonse VI — royaume de Castille, 1100 (n° 6) | Q179293 | Alcalá de Henares, Arnedo, Calahorra, Coria, Cuenca, Durango (Duranguesado) |
| 26 | Pascal II — États pontificaux, 1100 (n° 1) | Q170174 | Alatri, Albano Laziale, Anagni, Ardea, Bénévent, Ceccano |
| 24 | Mathilde de Toscane — diocèse de Crémone, 1100 (n° 137) | Q868212 | Arezzo, Camaiore, Campi Bisenzio, Capannori, Carpi, Correggio |
| 19 | Serge VI de Naples — duché de Naples, 1100 (n° 101) | Q1051600 | Arzano, Casalnuovo di Napoli, Casoria, Ercolano, Frattamaggiore, Marano di Napoli |
| 16 | Ladislas Ier Herman — Duchy of Poland, 1100 (n° 102) | Q108084610 | Bytom, Cracovie, Czersk (Mazovie), Gniezno, Krosno Odrzańskie, Lubusz |
| 11 | Constantin Bodin — Dioclée, 1100 (n° 42) | Q1252942 | Antivari (Bar), Aranđelovo, Bijela, Budva, Cattaro (Kotor), Donje Čičevo |
| 11 | Inge Ier de Suède — Suède, 1100 (n° 134) | Q34 | Gamla Uppsala, Kalmar, Linköping, Lödöse, Nyköping, Sigtuna |
| 10 | Godefroi de Conversano — County of Conversano, 1100–1100 (n° 56) | Q3688105 | Brindisi, Conversano, Copertino, Fasano, Matera, Mesagne |
| 10 | Pierre Ier d’Aragon — royaume de Pampelune, 1100 (n° 39) | Q3446210 | Arguedas, Caparroso, Estella, Falces, Lumbier, Marcilla |
| 9 | Barkyaruq — Empire seldjoukide, 1100 (n° 105) | Q3708094 | Bagdad, Bassora, Damas, Derbent, Koufa, Nakhitchevan |
| 9 | Sulayman Sayyid al-Dawla — taïfa de Lérida, 1100 (n° 34) | Q2166417 | Balaguer, Corbins, Escarp (La Granja d'Escarp), Fraga, Lérida, Mequinenza |
| 9 | Éric Ier — royaume de Danemark, 1100 (n° 109) | Q756617 | Aalborg, Aarhus, Børglum, Lund, Odense, Ribe |
| 8 | Magnus III de Norvège — royaume de Norvège, 1100 (n° 340) | Q2196956 | Bergen, Hamar, Kungälv, Nidaros, Oslo, Sarpsborg |
| 8 | Richard II de Capoue — Principauté de Capoue, 1100 (n° 66) | Q1280122 | Maddaloni, Minturno, Nocera Inferiore, Nocera Superiore, Pagani, Santa Maria Capua Vetere |
| 8 | Wiprecht de Groitzsch — Land Budissin, 1100 (n° 245) | — | Bautzen, Briesnitz, Groitzsch, Heinersdorf, Ostro, Roitzsch |
| 7 | Tamim ibn al-Mu'izz — Zirid emirate of Ifriqiya, 1100 (n° 330) | Q205718 | Djerba, Kairouan, Mahdia, Monastir, Sfax, Sousse |
| 7 | Zbigniew — Greater Poland with Kuyavia and Łęczyca-Sieradz, 1100 (n° 247) | Q1515009 | Giecz, Kalisz, Kruszwica, Ląd, Santok, Włocławek |
| 6 | Al-Musta'li — Califat fatimide, 1100 (n° 117) | Q160307 | Aydhab, Damiette, Faïoum, Le Caire, Qulzum, Tinnis |
| 6 | Hugues Geoffroi I — Viscounty of Marseille, 1100 (n° 248) | Q11954528 | Allauch, Aubagne, Hyères, Les Pennes-Mirabeau, Marseille, Toulon |
| 6 | Robert de Loritello — Loritello, 1100 (n° 114) | Q3688354 | Chieti, Lanciano, Montesilvano, Ortona, Pescara, Vasto |
| 6 | Sviatopolk II — Rus' de Kiev, 1100 (n° 116) | Q1108445 | Mourom, Novgorod, Pskov, Riazan, Sarkel, Vladimir |
| 6 | Vseslav de Kiev — Principauté de Polotsk, 1100 (n° 211) | Q517333 | Braslaw, Droutsk, Minsk, Orcha, Polotsk, Vitebsk |
| 6 | Wibert, évêque de Turin — archidiocèse de Turin, 1100 (n° 43) | Q1365785 | Chieri, Collegno, Grugliasco, Orbassano, Rivalta di Torino, Turin |
| 6 | Świętobor, Duke of Pomerania — Poméraniens, 1100 (n° 119) | Q1937043 | Gdańsk, Kamień Pomorski, Kołobrzeg, Nakło nad Notecią, Szczecin, Wolin |
| 5 | Boleslas III Bouche-Torse — Silesia, 1100 (n° 253) | Q568638 | Głogów, Legnica, Międzyrzecz, Niemcza, Opole |
| 5 | Guillaume II de Cerdagne — comté de Cerdagne, 1100 (n° 30) | Q652275 | Berga, Château d'Usson (So, Donezan), Formiguères, Llívia, Villefranche-de-Conflent |
| 5 | Günther Ier de Käfernburg — Längwitzgau, 1100 (n° 250) | Q1879253 | Eichfeld, Griesheim, Gösselborn, Teichel, Traßdorf |
| 5 | Roger Borsa — duché d'Apulie et de Calabre, 1100 (n° 55) | Q3715874 | Barletta, Canosa di Puglia, Corato, Gragnano, Trani |
| 4 | Alberto di Sambonifacio — County of Verona, 1100 (n° 256) | — | Bussolengo, Legnago, San Bonifacio, Vérone |
| 4 | Armengol V d'Urgell — comté d'Urgell, 1100 (n° 31) | Q1514510 | La Seu d'Urgell, Linyola, Pilzán, Solsona |
| 4 | Boniface del Vasto — Marca di Savona, 1100 (n° 255) | Q3845405 | Alba, Albenga, Savigliano, Savone |
| 4 | Daibert (Dagobert) — République de Pise, 1100 (n° 120) | Q1365493 | Cascina, Pise, Rosignano Marittimo, San Giuliano Terme |
| 4 | Ellenhard — diocèse de Pula, 1100 (n° 240) | Q12640752 | Galižana, Kastav, Muntić, Rijeka |
| 4 | Guillaume II le Jeune de Forez — comté de Forez, 1100 (n° 23) | Q16543131 | Montbrison, Roanne, Saint-Chamond, Saint-Étienne |
| 4 | Muirchertach Ua Briain — royaume de Munster, 1100 (n° 129) | Q20973653 | Cork, Dublin, Limerick, Waterford |
| 4 | Otton le Riche — Schwabengau, 1100 (n° 257) | Q2252572 | Etgersleben, Greifenhagen, Ritzgerode, Sandersleben |
| 4 | Petrus Cizarella — diocèse de Padoue, 1100 (n° 58) | Q873741 | Abano Terme, Padoue, Piove di Sacco, Vigonza |
| 4 | Sulayman — taïfa de Tortosa, 1100 (n° 35) | Q605930 | Horta de Sant Joan, Morella, Siurana, Tortosa |
| 4 | Vukan de Rascie — Rascie, 1100 (n° 41) | Q1311990 | Novi Pazar, Ras (Stari Ras), Tuzla, Zvečan |
| 3 | Adalbero, prince-évêque de Trente — principauté épiscopale de Trente, 1100 (n° 59) | Q1231403 | Merano, Pergine Valsugana, Trente |
| 3 | Adélaïde de Forcalquier — comté de Provence, 1100 (n° 254) | Q2991382 | Avignon, Forcalquier, Manosque |
| 3 | Calixte II — Archbishopric and county of Vienne, 1100 (n° 258) | Q366189 | Bourgoin-Jallieu, Romans-sur-Isère, Vienne |
| 3 | Constantin Ier de Cagliari — Judicat de Cagliari, 1100 (n° 133) | Q2297073 | Assemini, Cagliari, Quartu Sant'Elena |
| 3 | Grégoire II de Verruca — archidiocèse de Verceil, 1100 (n° 233) | Q1365835 | Biella, Casale Monferrato, Verceil |
| 3 | Gumuchtegin — Danishmendids, 1100 (n° 262) | Q846670 | Ancyre, Césarée de Cappadoce, Sébaste |
| 3 | Henri de Monte Sant'Angelo — Comté de Monte Sant'Angelo, 1100 (n° 264) | — | Foggia, Lucera, San Giovanni Rotondo |
| 3 | Hoyer I. von Mansfeld — Hassegau, 1100 (n° 265) | Q1588613 | Hedersleben, Hermerode, Neehausen |
| 3 | Hugh II, Count of Empúries — comté d'Empúries, 1100 (n° 26) | Q1541699 | Castelló d'Empúries, Empúries (Sant Martí d'Empúries), Peralada |
| 2 | Abd al-Malik ibn Hudayl — taïfa d'Albarracín, 1100 (n° 189) | Q2060937 | Albarracín, Cella |
| 2 | Anselme, évêque de Novare — diocèse de Novare, 1100 (n° 44) | Q873259 | Novare, Trecate |
| 2 | Arnolfo, évêque de Bergame — diocèse de Bergame, 1100 (n° 50) | Q867133 | Bergame, Seriate |
| 2 | Bernardo, évêque de Bologne — archidiocèse de Bologne, 1100 (n° 80) | Q1364193 | Cento, San Giovanni in Persiceto |
| 2 | Chimène (Jimena Díaz) — Lordship of Valencia, 1100 (n° 10) | Q15714699 | Sagonte (Murviedro), Valence |
| 2 | Costantino Ier de Torres — Judicat de Logudoro, 1100 (n° 143) | Q1761381 | Porto Torres, Sassari |
| 2 | Cuno de Beichlingen — County of Beichlingen, 1100 (n° 280) | Q55522390 | Beichlingen, Schloss Beichlingen |
| 2 | Dodo, évêque de Modène — archidiocèse de Modène-Nonantola, 6 juillet 1100 (n° 75) | Q1365040 | Modène, Vignola |
| 2 | Edgar Ier d'Écosse — royaume d'Écosse, 1100 (n° 145) | Q230791 | Saint Andrews, Édimbourg |
| 2 | Geoffroi II de Lecce — comté de Lecce, 1100 (n° 54) | Q2991299 | Lecce, Ostuni |
| 2 | Giacomo I, évêque d'Adria — diocèse d'Adria, 1100 (n° 60) | Q135646230 | Adria, Rovigo |
| 2 | Guislabert II de Roussillon — comté de Roussillon, 1100 (n° 25) | Q1541813 | Elne, Perpignan |
| 2 | Gumpold, évêque de Trévise — diocèse de Trévise, 1100 (n° 64) | Q877483 | Montebelluna, Spinea |
| 2 | Hugues Ier de Molise — County of Bojano, 1100 (n° 81) | Q85861952 | Campobasso, Isernia |
| 2 | Hugues Ier de Rethel — County of Rethel, 1100 (n° 277) | — | Mézières, Sainte-Menehould |
| 2 | Landolf de Gaète — duché de Gaeta, 1100 (n° 82) | Q2457072 | Fondi, Formia |
| 2 | Lothair Udo III — Northern March, 1100 (n° 279) | Q701627 | Seehausen (Altmark), Tangermünde |
| 2 | Otton II de Vintimille — comté de Vintimille, 1100 (n° 46) | Q60836735 | Sanremo, Vintimille |
| 2 | Pere Ramon I de Pallars Jussà — comté de Pallars Jussà, 1100 (n° 97) | Q2068891 | Talarn, Tremp |
| 2 | Philippe de Luni — diocèse de Luni, 1100 (n° 234) | Q1150766 | Carrara, Sarzana |
| 2 | Raimbaud de Grasse — Seigneurie d'Antibes, 1100 (n° 273) | — | Grasse, Vallauris |
| 2 | Richard II de Capoue — comté d'Aversa, 1100 (n° 61) | Q17176539 | Giugliano in Campania, Trentola Ducenta |
| 2 | Thierry d'Avesnes — Lordship of Avesnes, 1100 (n° 278) | — | Condé-sur-l'Escaut, Leuze-en-Hainaut |
| 2 | Wido, évêque de Tortone — diocèse de Tortone, 1100 (n° 49) | Q877442 | Tortone, Voghera |
| 1 | 'Abd al-'Aziz ibn 'Abd al-Haqq ibn Khurasan — Tunis, the Khurasanid principality, 1100 (n° 329) | Q3572 | Tunis |
| 1 | Adalberto, évêque d'Albenga — diocèse d'Albenga, 1100 (n° 48) | Q866791 | Imperia |
| 1 | Adelheid von Stade — the Goseck inheritance at Zscheiplitz, 1100 (n° 318) | — | Zscheiplitz |
| 1 | Aimone, évêque-comte de Ceneda — diocèse de Vittorio Veneto, 1100 (n° 65) | Q877951 | Vittorio Veneto |
| 1 | Alberto II degli Alberti — county of the Alberti at Prato, 1100 (n° 309) | — | Prato |
| 1 | Albéric, évêque d'Ascoli — diocèse d'Ascoli Piceno, 1100 (n° 78) | Q9207132 | Ascoli Piceno |
| 1 | Aldo, évêque de Plaisance — diocèse de Plaisance-Bobbio, 1100 (n° 77) | Q874204 | Plaisance |
| 1 | Alfanus — Roman Catholic Diocese of Pesto, 1100 (n° 237) | Q25226731 | Agropoli |
| 1 | Alphonse VI — royaume de León, 1100 (n° 183) | Q175276 | León |
| 1 | Arnau Guillem, vicomte de Fenouillèdes — Vicomté de Fenouillèdes, 1100 (n° 38) | Q3556991 | Fenouillet |
| 1 | Artaud II de Pallars Sobirà — comté de Pallars Sobirà, 1100 (n° 32) | Q2069303 | Sort |
| 1 | Aymeri Ier de Narbonne — vicomté de Narbonne, 1100 (n° 8) | Q58701851 | Narbonne |
| 1 | Azzon, évêque de Fermo — archidiocèse de Fermo, 1100 (n° 79) | Q166341 | Macerata |
| 1 | Bohémond de Tarente — Principauté d'Antioche, 1100 (n° 191) | Q235030 | Antioche |
| 1 | Bohémond de Tarente — Principauté de Tarente, 1100 (n° 160) | Q1078062 | Presicce |
| 1 | Bonseniore, évêque de Reggio — diocèse de Reggio d'Émilie-Guastalla, 1100 (n° 76) | Q1435945 | Reggio d'Émilie |
| 1 | Conrad II de Basse-Lotharingie — Royaume d'Italie, 1100 (n° 99) | Q838931 | Fidenza |
| 1 | Domnall MacLochlainn — Ailech, 1100 (n° 174) | Q15104874 | Armagh |
| 1 | Fakhr al-Mulk ibn-Ammar — Tripoli, 1100 (n° 302) | Q168954 | Tripoli |
| 1 | Friedrich de Bozen — county of Bolzano, 1100 (n° 306) | — | Bolzano |
| 1 | Frédéric IV de Goseck — County Palatine of Saxony, 1100 (n° 320) | Q102585753 | Bergsulza |
| 1 | Gontard — diocèse de Valence, 1100–1100 (n° 281) | Q822731 | Valence |
| 1 | Gualfredo, évêque de Sienne — archidiocèse de Sienne-Colle di Val d'Elsa-Montalcino, 1100 (n° 70) | Q1232549 | Sienne |
| 1 | Guido IV Guidi — county of the Guidi, 1100 (n° 311) | — | Empoli |
| 1 | Guigues III d'Albon — comté d'Albon, 1100 (n° 283) | Q2991081 | Grenoble |
| 1 | Guy Ier de Ponthieu — comté de Ponthieu, 1100–1100 (n° 327) | Q131703375 | Abbeville |
| 1 | Henri Ier de Grandpré — comté de Grandpré, 1100 (n° 303) | — | Grandpré |
| 1 | Henri de Nordheim — Bursfelde Abbey, 1100 (n° 184) | Q1775099 | Bergen |
| 1 | Herbert d'Ariano — comté d'Ariano, 1100 (n° 69) | Q3687942 | Ariano Irpino |
| 1 | Hermann von Spanheim — burgraviate of Magdeburg, 1100 (n° 326) | — | Lüttgen-Salbke |
| 1 | Hugues Ier de Vermandois — Vermandois, 1100 (n° 193) | Q26385 | Saint-Quentin |
| 1 | Hugues de Die — Archdiocese of Lyon, 1100 (n° 276) | Q1364921 | Lyon |
| 1 | Ibn Galbun — taïfa de Molina, 1100 (n° 40) | Q2232777 | Molina de Aragón |
| 1 | Ibrahim ibn Inal — Inalids, 1100 (n° 188) | Q2060041 | Amid |
| 1 | Iran-Shah — sultanat seldjoukide de Kerman, 1100 (n° 209) | Q491790 | Kerman |
| 1 | Kılıç Arslan Ier — sultanat de Roum, 1100 (n° 227) | Q975405 | Iconium |
| 1 | Mansur ibn Umara — Sharifate of Medina, 1100 (n° 166) | Q122206321 | Médine |
| 1 | Mubashshir — taïfa de Majorque, 1100 (n° 7) | Q3315525 | Palma |
| 1 | Oddon III, évêque d'Asti — diocèse d'Asti, 1100 (n° 45) | Q527185 | Asti |
| 1 | Otto II de Dießen — Grafschaft Dießen, 1100 (n° 316) | Q1541667 | Kulmbach |
| 1 | Philippe Ier — royaume de France, 1100 (n° 108) | Q70972 | Paris |
| 1 | Pierre II de Césières — abbaye Saint-Géraud d'Aurillac, 1100 (n° 197) | Q2820515 | Aurillac |
| 1 | Pierre Ier, abbé de Tournus — abbaye Saint-Philibert de Tournus, 1100 (n° 21) | Q456181 | Tournus |
| 1 | Pierre V, évêque de Volterra — diocèse de Volterra, 1100 (n° 73) | Q540365 | Colle di Val d'Elsa |
| 1 | Rainaldo, évêque de Lodi — diocèse de Lodi, 1100 (n° 53) | Q661010 | Lodi |
| 1 | Ranieri III del Monte Santa Maria — Seigneurie de Monte Santa Maria, 1100 (n° 313) | — | Montevarchi |
| 1 | Ranieri Malabranca — county of the Aldobrandeschi, 1100 (n° 310) | — | Grosseto |
| 1 | Renaud III de Bourgogne — comté de Bourgogne, 1100 (n° 24) | Q642314 | Dole |
| 1 | Richard de Hauteville — Comté de Mottola, 1100 (n° 305) | — | Massafra |
| 1 | Richer, Bishop of Verdun — Principauté épiscopale de Verdun, 1100 (n° 182) | Q17015016 | Verdun |
| 1 | Robert II de Bellême — seigneurie de Bellême, 1100 (n° 291) | Q3477821 | Alençon |
| 1 | Roger II de Foix — comté de Foix, 1100 (n° 36) | Q1481436 | Saint-Lizier |
| 1 | Roger III de Comminges — comté de Comminges, 1100 (n° 37) | Q13406636 | Saint-Bertrand-de-Comminges |
| 1 | Ruggero I Sanseverino — county of Rota, 1100 (n° 308) | — | Mercato San Severino |
| 1 | Rusticus, évêque de Gubbio — diocèse de Gubbio, 1100 (n° 72) | Q869321 | Gubbio |
| 1 | Sigefroi d'Arezzo — diocèse d'Arezzo-Cortone-Sansepolcro, 1100 (n° 238) | Q645542 | Cortone |
| 1 | Svatopluk Ier de Bohême — Olomoucký úděl, 1100 (n° 321) | Q4333975 | Olomouc |
| 1 | Sviatopolk II — principauté de Kiev, 1100 (n° 172) | Q1483430 | Kiev |
| 1 | Tebald, évêque de Città di Castello — diocèse de Città di Castello, 1100 – février 1100 (n° 71) | Q729485 | Città di Castello |
| 1 | Thimo Ier de Wettin — county of Wettin, 1100 (n° 323) | — | Schrenz |
| 1 | Ugo des Cadolingi — county of the Cadolingi at Fucecchio, 1100 (n° 314) | — | Fucecchio |
| 1 | Ugo di Sabbioneta — county of Sabbioneta, 1100 (n° 304) | — | Desenzano del Garda |
| 1 | Ulric II — County of Weimar-Orlamünde, 1100 (n° 226) | Q883382 | Orlamünde |
| 1 | Volodar de Zvenyhorod — Principality of Peremyshl, 1100 (n° 315) | Q4350658 | Przemyśl |
| 1 | Wido, évêque de Parme — diocèse de Parme, 1100 (n° 74) | Q1818861 | Parme |
| 1 | al-Mansur ibn al-Nasir — Hammadides, 1100 (n° 301) | Q588672 | Bougie |
| 1 | Étienne de Bosnie — Bosnia (early medieval), 1100 (n° 192) | Q25340956 | Gornji Kotorac |

## 2. Le sommet des chaînes plus longues qui s'arrêtent sans souverain — 11 titres

Chacun : un maillon vers son suzerain direct, ou la case « souverain ».

| villes | titre au sommet |
|---:|---|
| 218 | Henri IV du Saint-Empire — Saint-Empire romain germanique, 1100 |
| 112 | Philippe Ier — royaume de France, 1100 |
| 31 | Conrad II de Basse-Lotharingie — Royaume d'Italie, 1100 |
| 24 | Alexis Ier Comnène — Empire byzantin, 1100 |
| 20 | Sviatopolk II — Rus' de Kiev, 1100 |
| 9 | Alphonse VI — royaume de Castille, 1100 |
| 2 | Richard II de Capoue — Principauté de Capoue, 1100 |
| 1 | Vseslav de Kiev — Principauté de Polotsk, 1100 |
| 1 | Adélaïde de Forcalquier — comté de Provence, 1100 |
| 1 | Pascal II — États pontificaux, 1100 |
| 1 | Baudouin Ier de Jérusalem — Royaume de Jérusalem, novembre 1100 |

## 3. Les doublons connus

- **Ponthieu** : deux territoires pour la même terre — n° 308 « comté de Ponthieu » (Q131703375) et n° 339
  « County of Ponthieu » (Q60930, saisi comme nom **français**) ; leurs titres en double 327/350, 328/351. **Fusionner** :
  un seul territoire, ses noms fr et en dans la même fiche, un seul identifiant (celui du comté).
- Après chaque passe : la requête des doublons en lecture seule (titres, maillons, et territoires de même nom).

## 4. Les fiches de 1100 sans titre dans « Tenue par » — 330 fiches (ajout du 16/11 05:20)

Sans titre, une ville n'a pas de chaîne : le Cartographe la juge encore par le texte libre « Pays », et la met en rouge
quand aucun pays de ce nom n'est dessiné (Mulhouse, « Principauté épiscopale de Strasbourg »). Pour chacune : choisir le
titre du détenteur à la date de la fiche (créer le titre s'il manque), puis ses maillons jusqu'au souverain.

| fiches | détenteur en texte libre | villes (extrait) |
|---:|---|---|
| 31 | Royaume de Croatie | Biskupija, Brela, Bribir, Cetina, Hvar, Imotski |
| 18 | Ulrich II de Weimar-Orlamünde, margrave d'Istrie | Barban, Buje, Buzet, Dane, Draguć, Koper |
| 17 | Abbaye bénédictine de Saalfeld | Bucha (Neustadt an der Orla), Cordobang, Eliasbrunn, Friedebach, Hütten (Krölpa), Jüdewein |
| 16 | Robert II, comte de Flandre | Armentières, Arras, Bruay-en-Artois, Bruay-la-Buissière, Coudekerque-Branche, Croix |
| 15 | Duché de Bohême | Bardo, Bílina, Chrudim, Dřevíč, Görlitz, Hradec Králové |
| 11 | Thème de Cherson | Alouchta, Aloupka, Ayu-Dag, Basman, Chersonèse, Demerdji Isar |
| 11 | Philippe Ier de France | Brunoy, Brétigny-sur-Orge, Dreux, Fleury-les-Aubrais, Longjumeau, Palaiseau |
| 9 | Ulrich II, comte de Weimar-Orlamünde | Dorndorf, Geunitz, Pritschroda, Röbschütz, Röttelmisch, Schmieden |
| 9 | Sviatopolk II | Hrodna, Kaniv, Korosten, Ovroutch, Pinsk, Tourov |
| 8 | Werner (Guarnerio), margrave de la marca Guarnerii | Ancône, Civitanova Marche, Fabriano, Falconara Marittima, Fermo, Jesi |
| 8 | Guillaume IX, duc d'Aquitaine et comte de Gascogne | Bordeaux, Bègles, Châtelaillon-Plage, La Rochelle, Niort, Rochefort |
| 7 | Vladimir Monomaque | Belozersk, Iaroslavl, Kremlin de Iaroslavl, Moscou, Rybinsk, Toropets |
| 7 | Roger Borsa, duc de Pouille et de Calabre | Avellino, Battipaglia, Cava de' Tirreni, Eboli, Reggio de Calabre, Rende |
| 7 | Italie normande | Bitonto, Capaccio Paestum, Catanzaro, Gravina in Puglia, Molfetta, Sulmona |
| 7 | Bohémond Ier, prince de Tarente | Ginosa, Gioia del Colle, Grottaglie, Manduria, Modugno, Tarente |
| 6 | Roger Borsa, duc des Pouilles et de Calabre | Castrovillari, Corigliano-Rossano, Cosenza, Crotone, Lamezia Terme, Potenza |
| 5 | Royaume d'Angleterre | Chester, Hereford, Londres, Shrewsbury, York |
| 5 | Al-Mansour ibn al-Nacer | Alger, Annaba, Biskra, Constantine, Sétif |
| 4 | Évêque de Poreč | Pazin, Poreč, Rovinj, Tar |
| 4 | Werner (Guarnieri), duc de Spolète (concession d'Henri IV, 1094) et marquis de la « marca Guarnerii » | Assise, Bastia Umbra, Foligno, Terni |
| 4 | Califat fatimide | Alexandrie, Fostat, La mecque, Tyr |
| 3 | Évêque de Belluno | Belluno, Conegliano, Oderzo |
| 3 | Évêché de Brixen | Götzens, Pfons, Sistrans |
| 3 | comtes de Plötzkau (héritiers du comté de Walbeck) | Groß Santersleben, Nordgermersleben, Walbeck |
| 3 | Zachlumie | Babino Polje, Blagaj, Ston |
| 3 | Comté de Besalú | Besalú, Château de Peyrepertuse, Ripoll |
| 3 | Comtes de Trévise (Collalto) | Mestre, Mogliano Veneto, Trévise |
| 2 | Évêque de Poreč (Parenzo) | Dvigrad, Fuškulin |
| 2 | Évêché de Naumbourg | Flurstedt, Gröba |
| 2 | Évêché de Mersebourg | Geusa, Hamersleben |
| 2 | Évêché de Halberstadt | Emmeringen, Peseckendorf |
| 2 | al-Mu'tazz ibn al-Rand | Gafsa, Tozeur |
| 2 | Vladimir Monomaque (principauté de Rostov) | Rostov, Souzdal |
| 2 | Vicomtes de Nice (famille de Nice-Orange) | Cagnes-sur-Mer, Nice |
| 2 | Royaume d'Alanie | Tatartup, Églises de Zelentchouk |
| 2 | Roger Borsa, duc des Pouilles | Andria, Bisceglie |
| 2 | Richard II, prince de Capoue et comte d'Aversa | Aversa, Caserta |
| 2 | Principauté épiscopale de Strasbourg | Mulhouse, Strasbourg |
| 2 | Principauté épiscopale de Cambrai | Cambrai, Le Cateau-Cambrésis |
| 2 | Groenland norrois | Herjólfsnes, Sandnæs |
| 2 | Comté de Toulouse | Saint-Gilles, Toulouse |
| 2 | Comté de Conversano | Ruvo di Puglia, Tuturano |
| 2 | Comté de Chalon | Chalon-sur-Saône, Louhans |
| 2 | Comtes palatins de Lomello | Pavie, Vigevano |
| 2 | Comtes de Plötzkau | Brumby, Irxleben |
| 2 | Bulgarie de la Volga | Bolgar, Kazan |
| 2 | Banu Sulaym | Ajdabiya, Barqa |
| 2 | Alphonse VI, roi de León et de Castille | Simancas, Talamanca de Jarama |
| 2 | Alphonse VI | Burgos, Oviedo |
| 2 | Abbaye Saint-Pierre de Mersebourg | Passendorf, Wallendorf |
| 1 | évêque de Novigrad | Umag |
| 1 | évêché de Mersebourg | Beuna |
| 1 | Évêque et chapitre de Tournai | Tournai |
| 1 | Évêque de Trieste | Trieste |
| 1 | Évêque de Novigrad (Cittanova), seigneur de la baronnie de S. Lorenzo in Daila | Dajla |
| 1 | Évêque de Novigrad | Novigrad |
| 1 | Évêque de Gênes | Rapallo |
| 1 | Évêque de Florence | Sesto Fiorentino |
| 1 | Évêque de Feltre | Feltre |
| 1 | Évêque de Côme (diocèse de Côme) | Côme |
| 1 | Évêque de Concordia | Portogruaro |
| 1 | Évêché de Châlons | Châlons-en-Champagne |
| 1 | comtes des Marses (Berardi) | Avezzano |
| 1 | al-Mansur ibn al-Nasir | Médéa |
| 1 | abbaye de Göllingen | Günserode |
| 1 | Zachlumie (Hum) | Korčula |
| 1 | Werner (Guarnieri), duc de Spolète (concession d'Henri IV, 1094) | Spolète |
| 1 | Werner (Guarnerio), marquis de la « marca Guarnerii » (future marche d'Ancône) | Recanati |
| 1 | Vicomté de Labourd | Bayonne |
| 1 | Vicomtes Trencavel | Nîmes |
| 1 | Ulrich II de Weimar-Orlamünde | Šterna |
| 1 | Ubertini | Figline e Incisa Valdarno |
| 1 | Taïfa d'Alpuente | Alpuente |
| 1 | Sires de Bâgé | Bâgé-le-Châtel |
| 1 | Seigneurs de Domersleben (alleu) | Domersleben |
| 1 | Seigneurie de Termonde | Termonde |
| 1 | Seigneurie de Joinville | Vaucouleurs |
| 1 | République de Gênes | Gênes |
| 1 | Royaume de Jérusalem | Jérusalem |
| 1 | Richard II, prince de Capoue | Nola |
| 1 | Prince-évêque de Brixen | Bressanone |
| 1 | Obertenghi | Massa |
| 1 | Monastère de San Simpliciano de Milan | Treviglio |
| 1 | Monastère de San Salvatore de Pavie | Novi Ligure |
| 1 | Marquis de Romagnano | Carmagnola |
| 1 | Marche d'Istrie (le margrave Ulrich II de Weimar-Orlamünde) | Ankaran |
| 1 | Makkan ibn Kamil ibn Jami' | Gabès |
| 1 | Judicat de Gallura | Olbia |
| 1 | Judicat d'Arborée | Oristano |
| 1 | Duché de Sorrente | Castellammare di Stabia |
| 1 | Diocèse de Lugo | Lugo |
| 1 | Coumans | Azov |
| 1 | Comté de Sarno | Sarno |
| 1 | Comté d'Acerra | Acerra |
| 1 | Comtes de Pombia | Verbania |
| 1 | Coloman, roi de Hongrie | Neudorf bei Parndorf |
| 1 | Capitanei de Sondrio | Sondrio |
| 1 | Boton, vassal du roi | Rehehausen |
| 1 | Bohémond Ier, seigneur de Bari | Bari |
| 1 | Banu al-Ward | Bizerte |
| 1 | Aucun — ville abandonnée, entre chrétiens et musulmans | Tarragone |
| 1 | Archidiocèse de Saint-Jacques-de-Compostelle | Saint-Jacques-de-Compostelle |
| 1 | Al-Mansur ibn al-Nasir | Ouargla |
| 1 | Akhdar | Béja |
| 1 | Abbaye de Sahagún | Sahagún |
| 1 | Abbaye de Hersfeld | Kirchheim |
| 1 | Abbaye Saint-Georges de Naumbourg | Zorbau |
