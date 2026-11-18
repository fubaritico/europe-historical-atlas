"""Lot V: compare the base (read-only) with the entry files of a wave: one 1100 sheet per place, its holder title, one
'importance' line citing the page with the exact quotation, the place's name and region. Usage: python3 -I verifyv.py <wave folder>"""
import glob
import json
import sqlite3
import sys

D = sys.argv[1]
YEAR = int(sys.argv[2])
db = sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True)
ok, bad, missing, bad_list = 0, 0, 0, []
for f in sorted(glob.glob(D + '/enter-v*.json')):
    for r in json.load(open(f)):
        rows = db.execute('select p.id, (select name from places_locales l where l._parent_id=p.id and l._locale="fr"), p.region_name, '
                          'pp.id, pp.holder_title_id, pp.importance from places p left join place_periods pp on pp.place_id=p.id '
                          'and pp.date_start_year=' + str(YEAR) + ' where p.wikidata=?', (r['q'],)).fetchall()
        if not rows or rows[0][3] is None:
            missing += 1; continue
        errs = []
        if len(rows) > 1: errs.append('%d sheets in 1100' % len(rows))
        pid, name, region, ppid, ht, imp = rows[0]
        lines = db.execute('select t.subject, t.importance, t.quotation, s.url from place_periods_testimonies t join sources s on '
                           's.id=t.source_id where t._parent_id=?', (ppid,)).fetchall()
        if name != r['name']: errs.append('name %r' % name)
        if (region or None) != (r['region'][1] or None): errs.append('region %r' % region)
        if ht != r['holderTitle']: errs.append('holder %s' % ht)
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
