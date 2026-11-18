"""Write files/resources/historien/LISEZ-MOI.md: what each folder holds, what is kept, what is waste (downloaded copies,
re-downloadable from the register), with sizes measured on disk. Changes nothing else. Usage: python3 -I inventory.py"""
import os
from datetime import date

H = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/historien'
WASTE_DIRS = {'wiki', 'rend', 'venv', '.venv', 'texts'}
WASTE_EXT_IN_SOURCES = ('.txt', '.pdf', '.html', '.htm', '.wiki', '.djvu')


def classify(path):
    parts = set(os.path.relpath(path, H).split(os.sep))
    if parts & {'extraits', 'registre', 'outils'}:
        return 'keep'
    if parts & WASTE_DIRS:
        return 'waste'
    if 'sources' in parts and path.endswith(WASTE_EXT_IN_SOURCES):
        return 'waste'
    return 'keep'


rows, tot = [], {'keep': 0, 'waste': 0}
for top in ('outils', 'extraits', 'registre'):
    p = os.path.join(H, top)
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(p) for f in fs) if os.path.isdir(p) else 0
    tot['keep'] += size
    rows.append((top + '/', size, 0))
for year in sorted(d for d in os.listdir(H) if d.isdigit()):
    for group in sorted(os.listdir(os.path.join(H, year))):
        gp = os.path.join(H, year, group)
        if not os.path.isdir(gp):
            continue
        for lot in sorted(os.listdir(gp)):
            lp = os.path.join(gp, lot)
            if not os.path.isdir(lp):
                continue
            k = w = 0
            for r, _, fs in os.walk(lp):
                for f in fs:
                    fp = os.path.join(r, f); s = os.path.getsize(fp)
                    if classify(fp) == 'waste': w += s
                    else: k += s
            tot['keep'] += k; tot['waste'] += w
            rows.append(('%s/%s/%s/' % (year, group, lot), k, w))

mb = lambda b: '%.0f Mo' % (b / 1e6) if b >= 1e6 else '%.0f Ko' % (b / 1e3)
out = ['# historien/ — ce qui est gardé, ce qui est déchet', '',
       '> Écrit par `.claude/skills/bulk-entry/scripts/inventory.py` le %s, mesuré sur le disque. Le disque est prêté : '
       'il reste rangé (`.claude/roles/historian.md`).' % date.today().isoformat(), '',
       '**Gardé** — ce qui resservira : `extraits/` (les phrases datées lues sur chaque lieu, toutes années), `registre/` '
       '(chaque page lue : adresse, lieu, date), et dans chaque recherche ses listes, verdicts, fichiers de saisie, résultats, '
       'rapports et scripts.', '',
       '**Déchet** — copies téléchargées, retéléchargeables depuis le registre ou les listes : les dossiers `wiki/`, '
       '`rend/`, `texts/`, `venv/`, et dans `sources/` les fichiers `.txt .pdf .html .wiki`. Supprimés à la fin de chaque '
       'recherche, sur l\'accord du dev.', '',
       '| dossier | gardé | déchet |', '| --- | --- | --- |']
out += ['| `%s` | %s | %s |' % (n, mb(k), mb(w) if w else '—') for n, k, w in rows]
out += ['| **total** | **%s** | **%s** |' % (mb(tot['keep']), mb(tot['waste'])), '']
open(H + '/LISEZ-MOI.md', 'w').write('\n'.join(out))
print('kept', mb(tot['keep']), '; waste', mb(tot['waste']))
