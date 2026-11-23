"""Lot V: compare the base (read-only) with the entry files of a wave: one sheet per place at the year, one 'importance'
line citing the page with the exact quotation, the place's name and region — and the holder, which must be the one the
entry file carries from the region's note, with a 'holder' line whose source is a work (primary, scholarly,
historian-atlas) and whose quotation is the file's. A holder the file does not carry, or one that stands on an
encyclopaedia, is refused (the dev, 2026-11-23). What is checked is that the base holds what was read — never an
agreement with the map. Usage: python3 -I verifyv.py <wave folder> <year>"""
import glob
import json
import sqlite3
import sys

D = sys.argv[1]
YEAR = int(sys.argv[2])
db = sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True)
BOOKS = ('primary', 'scholarly', 'historian-atlas')
ok, bad, missing, bad_list = 0, 0, 0, []
for f in sorted(glob.glob(D + '/enter-v*.json')):
    for r in json.load(open(f)):
        rows = db.execute('select p.id, p.name, p.region_name, '
                          'pp.id, pp.holder_title_id, pp.importance from places p left join place_periods pp on pp.place_id=p.id '
                          'and pp.date_start_year=' + str(YEAR) + ' where p.wikidata=?', (r['q'],)).fetchall()
        if not rows or rows[0][3] is None:
            missing += 1; continue
        errs = []
        if len(rows) > 1: errs.append('%d sheets in 1100' % len(rows))
        pid, name, region, ppid, ht, imp = rows[0]
        every = db.execute('select t.subject, t.importance, t.quotation, s.url, s.kind from place_periods_testimonies t join sources s on '
                           's.id=t.source_id where t._parent_id=?', (ppid,)).fetchall()
        held = [l for l in every if l[0] == 'holder']
        lines = [l[:4] for l in every if l[0] != 'holder']
        want = r.get('holder')
        if not want and (ht is not None or held): errs.append('HOLDER NOT FROM THE NOTE')
        if any(l[4] not in BOOKS for l in held) and not any(l[4] in BOOKS for l in held): errs.append('HOLDER ON AN ENCYCLOPAEDIA ALONE')
        if want and not any(l[2] == want.get('quote') and l[4] in BOOKS for l in held): errs.append('HOLDER LINE MISSING')
        if name != r['name']: errs.append('name %r' % name)
        if (region or None) != (r['region'][1] or None): errs.append('region %r' % region)
        if ht != r.get('holderTitle'): errs.append('holder %s' % ht)
        if imp != 'city': errs.append('importance %s' % imp)
        if len(lines) != 1: errs.append('%d lines' % len(lines))
        else:
            subj, limp, quo, url = lines[0]
            if quo != r['quote']: errs.append('QUOTE')
            if subj != 'importance' or limp != 'city': errs.append('line %s %s' % (subj, limp))
            if url != r['sourceUrl']: errs.append('url %s' % url)
        if errs:
            bad += 1; bad_list.append({'q': r['q'], 'period': ppid, 'errs': errs, 'file': f.rsplit('/', 1)[1]})
        else:
            ok += 1
json.dump(bad_list, open(D + '/bad.json', 'w'), ensure_ascii=False, indent=1)
print('ok', ok, 'bad', bad, 'not entered', missing)
for b in bad_list[:15]: print(' ', b)
