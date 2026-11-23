"""The research journal the dev follows in his terminal (the dev, 2026-11-23: "I want logs — I am checking, I found
this, I do that, the date"). One line per thing done, in French, dated to the second, printed and appended to
/Volumes/Acer/atlas-historien/journal.log. He follows it with:  tail -f /Volumes/Acer/atlas-historien/journal.log

  python3 -I log.py say "<what I am doing or what I found>"
  python3 -I log.py attempt '<one attempt as JSON — the fields are region_gate.py's>'

`attempt` is the only way an attempt is recorded: it appends the line to registre/attempts.jsonl (its date added) and
says it in the journal, so nothing is tried without being shown. A script of this skill that reads or fetches copies
`say` (python3 -I cannot import a neighbour) and calls it before and after each source.
"""
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
JOURNAL = pathlib.Path('/Volumes/Acer/atlas-historien/journal.log')
ATTEMPTS = pathlib.Path('/Volumes/Acer/atlas-historien/registre/attempts.jsonl')
WORDS = {'found': 'TROUVÉ', 'nothing': 'RIEN', 'refused': 'REFUSÉ', 'not available': 'INACCESSIBLE',
         'not relevant': 'HORS SUJET'}
NEEDED = ('year', 'region', 'kind', 'where', 'words', 'result')


def say(message):
    """Print one dated line and append it to the journal; stop when the archive's disk is absent."""
    if not JOURNAL.parent.is_dir():
        sys.exit('DISQUE ABSENT — %s introuvable : branche le disque Acer, la recherche reprend ensuite.' % JOURNAL.parent)
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def attempt(raw):
    """Record one attempt in the register and say it in the journal."""
    row = json.loads(raw)
    lacking = [k for k in NEEDED if row.get(k) in (None, '')]
    if row.get('result') not in WORDS:
        lacking.append('result (one of: %s)' % ', '.join(WORDS))
    if row.get('result') == 'not relevant' and not str(row.get('reason') or '').strip():
        lacking.append('reason')
    if lacking:
        sys.exit('attempt refused, missing: ' + ', '.join(lacking))
    row = {'date': datetime.date.today().isoformat(), **row}
    with ATTEMPTS.open('a', encoding='utf-8') as out:
        out.write(json.dumps(row, ensure_ascii=False) + '\n')
    say('[%s %s] %s — %s — cherché « %s »%s → %s%s' % (
        row['region'], row['year'], row['kind'], row['where'], row['words'],
        ' pour ' + row['place'] if row.get('place') else '', WORDS[row['result']],
        ' : ' + str(row.get('reason') or row.get('note')) if row.get('reason') or row.get('note') else ''))


if len(sys.argv) != 3 or sys.argv[1] not in ('say', 'attempt'):
    sys.exit(__doc__)
(say if sys.argv[1] == 'say' else attempt)(sys.argv[2])
