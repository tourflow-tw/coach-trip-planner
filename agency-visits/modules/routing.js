import {rating,intervals,today} from './core.js?v=1.07';
import {groups,origin,distance,road,groupKey,point,routeZone} from './geo.js?v=1.07';
export function dueDate(a){if(a.next)return a.next;if(a.status==='尚未拜訪'||!(a.logs||[]).length)return'';const latest=[...a.logs].sort((x,y)=>y.date.localeCompare(x.date))[0].date;const date=new Date(latest+'T12:00:00+08:00');date.setUTCDate(date.getUTCDate()+(intervals[rating(a)]||30));return date.toISOString().slice(0,10)}
export function nextMonday(date=today()){const d=new Date(date+'T12:00:00Z'),days=(8-d.getUTCDay())%7||7;d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export const isPassed=(a,date=today())=>Boolean(a.passUntil&&date<a.passUntil);
export function eligible(a,date=today()){if(a.routeExcluded||isPassed(a,date)||(a.logs||[]).some(l=>l.date===date))return false;const due=dueDate(a);return!due||due<=date}
export function orderedGroups(input,center,firstKey=''){const remaining=input.filter(g=>g.point),missing=input.filter(g=>!g.point);let cursor=center,route=[];const pinned=remaining.findIndex(g=>g.key===firstKey);if(pinned>=0){const [first]=remaining.splice(pinned,1);route.push(first);cursor=first.point}while(remaining.length){let best=0;for(let i=1;i<remaining.length;i++)if(distance(cursor,remaining[i].point)<distance(cursor,remaining[best].point))best=i;const [next]=remaining.splice(best,1);route.push(next);cursor=next.point}
 // Open-tour 2-opt: preserve the office start, remove crossed / wasteful detours.
 for(let pass=0;pass<12;pass++){let improved=false;for(let i=pinned>=0?1:0;i<route.length-1;i++)for(let j=i+1;j<route.length;j++){const before=i?route[i-1].point:center,after=j+1<route.length?route[j+1].point:null;const old=distance(before,route[i].point)+(after?distance(route[j].point,after):0),next=distance(before,route[j].point)+(after?distance(route[i].point,after):0);if(next+0.5<old){route.splice(i,j-i+1,...route.slice(i,j+1).reverse());improved=true}}if(!improved)break}
 return [...route,...missing]}
export function buildPlan(rows,settings,{selectedRoad='',limit=20,date=today(),start='',zone='main'}={}){
 if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('目標家數請填 1 至 200');
 const office=origin(settings),canStart=a=>routeZone(a)===zone&&!a.routeExcluded&&!isPassed(a,date)&&!(a.logs||[]).some(l=>l.date===date),firstBuilding=start?groups(rows.filter(canStart),office).find(g=>g.key===start&&g.point):null;
 if(start&&!firstBuilding)throw Error('這棟不在本區、已 pass 或沒有可排程的旅行社，請重新選擇');
 const startKey=firstBuilding?.key||'',center=firstBuilding?{...firstBuilding.point,address:firstBuilding.address}:office;
 const available=rows.filter(a=>canStart(a)&&(groupKey(a)===startKey||eligible(a,date))),candidates=groups(available,center).filter(g=>g.point);
 const priority=g=>Math.max(...g.rows.map(a=>rating(a)||3))*30+(g.rows.some(a=>a.next&&a.next<=date)?150:0);
 const primary=candidates.filter(g=>!selectedRoad||g.rows.some(a=>road(a)===selectedRoad));
 primary.sort((a,b)=>a.distance-priority(a)-(b.distance-priority(b)));
 const chosen=[];let count=0;
 const add=g=>{chosen.push(g);count+=g.rows.length};
 const first=candidates.find(g=>g.key===startKey);if(first)add(first);
 for(const g of primary){if(count>=limit)break;if(g!==first)add(g)}
 // Fill the target from adjacent roads in the same area, never jumping to Neihu.
 const roadAnchor=selectedRoad?groups(rows.filter(a=>routeZone(a)===zone&&road(a)===selectedRoad),office).find(g=>g.point):null;
 const anchor=chosen[0]?.point||roadAnchor?.point;
 let remaining=candidates.filter(g=>!chosen.includes(g));
 while(count<limit&&anchor&&remaining.length){const nearby=remaining.map(g=>({g,near:chosen.length?Math.min(...chosen.map(c=>distance(c.point,g.point))):distance(anchor,g.point)})).filter(x=>x.near<=1500&&distance(anchor,x.g.point)<=3000).sort((a,b)=>a.near-priority(a.g)-(b.near-priority(b.g)));if(!nearby.length)break;const g=nearby[0].g;add(g);remaining=remaining.filter(x=>x!==g)}
 const firstKey=startKey||(selectedRoad?chosen[0]?.key:'')||'',routeCenter=!startKey&&firstKey?{...chosen[0].point,address:chosen[0].address}:center;
 const route=orderedGroups(chosen,routeCenter,firstKey);return{groups:route,ids:route.flatMap(g=>g.rows.map(a=>a.id)),unknown:available.filter(a=>!point(a)).length,start:{date,zone,kind:start?'building':selectedRoad?'road':'auto',building:firstKey,address:routeCenter.address,lat:routeCenter.lat,lng:routeCenter.lng}}
}
