"""Prepare a compact OSM snapshot around public agency door points. No user/GPS data."""
import json,sys,math,datetime
from pathlib import Path
source=json.load(open(sys.argv[1]));points=list(json.load(open('agency-visits/address-points.json'))['points'].values());features=[]
for e in source['elements']:
 tags=e.get('tags',{});name=tags.get('name:zh') or tags.get('name');rings=[];holes=[]
 if e['type']=='way' and e.get('geometry'):rings=[[[p['lon'],p['lat']] for p in e['geometry']]]
 elif e['type']=='relation':
  # Retain closed rings only; do not infer shapes from incomplete multipolygons.
  rings=[[[p['lon'],p['lat']] for p in m['geometry']] for m in e.get('members',[]) if m.get('role')=='outer' and m.get('geometry') and m['geometry'][0]==m['geometry'][-1]]
  holes=[[[p['lon'],p['lat']] for p in m['geometry']] for m in e.get('members',[]) if m.get('role')=='inner' and m.get('geometry') and m['geometry'][0]==m['geometry'][-1]]
 rings=[r for r in rings if len(r)>3 and r[0]==r[-1]]
 if not name or not rings:continue
 coords=[p for r in rings for p in r];west=min(p[0] for p in coords);east=max(p[0] for p in coords);south=min(p[1] for p in coords);north=max(p[1] for p in coords)
 if not any(west-.0015<=p['lng']<=east+.0015 and south-.0015<=p['lat']<=north+.0015 for p in points):continue
 features.append({'name':name,'source':f"https://www.openstreetmap.org/{e['type']}/{e['id']}",'bounds':[west,south,east,north],'rings':rings,'holes':holes})
result={'source':'OpenStreetMap contributors','license':'ODbL 1.0','licenseUrl':'https://www.openstreetmap.org/copyright','asOf':source.get('osm3s',{}).get('timestamp_osm_base'),'features':features}


def inside(p,ring):
 x,y=p;hit=False
 for a,b in zip(ring,ring[1:]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit

def boundary_distance(p,ring):
 scale=111320;cx=math.cos(math.radians(p[1]));best=float('inf')
 for a,b in zip(ring,ring[1:]):
  ax=(a[0]-p[0])*scale*cx;ay=(a[1]-p[1])*scale;bx=(b[0]-p[0])*scale*cx;by=(b[1]-p[1])*scale;dx=bx-ax;dy=by-ay;t=max(0,min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy))) if dx*dx+dy*dy else 0;best=min(best,math.hypot(ax+t*dx,ay+t*dy))
 return best

matches={};public_points=json.load(open('agency-visits/address-points.json'))['points']
for address,coord in public_points.items():
 p=(coord['lng'],coord['lat']);contained=[];near=[]
 for f in features:
  if any(inside(p,r) for r in f['holes']):continue
  if any(inside(p,r) for r in f['rings']):contained.append(f)
  elif min(boundary_distance(p,r) for r in f['rings'])<=10:near.append(f)
 candidates=contained or near
 if len({f['name'] for f in candidates})!=1:continue
 chosen=candidates[0];matches[address]={'name':chosen['name'],'source':chosen['source'],'method':'inside' if contained else 'boundary'}
result.pop('features');result['matches']=matches
Path('agency-visits/building-names.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print({'matchedDoors':len(matches),'allDoors':len(public_points),'bytes':Path('agency-visits/building-names.json').stat().st_size,'examples':list(matches.items())[:5]})
