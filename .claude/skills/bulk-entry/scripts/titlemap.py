import sqlite3,json,sys
Y=int(sys.argv[2]) if len(sys.argv)>2 else 1100
db=sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro',uri=True)
rows=db.execute("""select ti.id, ti.label, tr.id, tr.wikidata, ti.date_start_year, coalesce(ti.date_start_month,1), ti.date_end_year, coalesce(ti.date_end_month,12)
from titles ti join territories tr on tr.id=ti.territory_id
where (ti.date_start_year<=? and ti.date_end_year>=?) or (ti.date_start_year=? and ti.date_end_year is null)""",(Y,Y,Y)).fetchall()
by={}
for tid,label,terr,wd,sy,sm,ey,em in rows:
  jan = (sy<Y or sm==1)
  key_t=('t',terr); key_w=('w',wd)
  for k in (key_t,key_w):
    if k[1] is None: continue
    by.setdefault(str(k),[]).append(dict(title=tid,label=label,jan=jan,sy=sy,sm=sm))
for k in by: by[k].sort(key=lambda x:(not x['jan'],x['sy'],x['sm']))
json.dump(by,open(sys.argv[1],'w'),ensure_ascii=False,indent=0)
print(len(by))
