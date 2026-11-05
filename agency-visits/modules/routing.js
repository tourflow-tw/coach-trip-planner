import {rating,intervals,today} from './core.js?v=1.08';
import {groups,origin,distance,road,groupKey,point,routeZone} from './geo.js?v=1.08';
export function dueDate(a){if(a.next)return a.next;if(a.status==='尚未拜訪'||!(a.logs||[]).length)return'';const latest=[...a.logs].sort((x,y)=>y.date.localeCompare(x.date))[0].date;const date=new Date(latest+'T12:00:00+08:00');date.setUTCDate(date.getUTCDate()+(intervals[rating(a)]||30));return date.toISOString().slice(0,10)}
export function nextMonday(date=today()){const d=new Date(date+'T12:00:00Z'),days=(8-d.getUTCDay())%7||7;d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export const isPassed=(a,date=today())=>Boolean(a.passUntil&&date<a.passUntil);
export function eligible(a,date=today()){if(a.routeExcluded||isPassed(a,date)||(a.logs||[]).some(l=>l.date===date))return false;const due=dueDate(a);return!due||due<=date}
export function orderedGroups(input,center,firstKey=''){const remaining=input.filter(g=>g.point),missing=input.filter(g=>!g.point);let cursor=center,route=[];const pinned=remaining.findIndex(g=>g.key===firstKey);if(pinned>=0){const [first]=remaining.splice(pinned,1);route.push(first);cursor=first.point}while(remaining.length){let best=0;for(let i=1;i<remaining.length;i++)if(distance(cursor,remaining[i].point)<distance(cursor,remaining[best].point))best=i;const [next]=remaining.splice(best,1);route.push(next);cursor=next.point}
 // Open-tour 2-opt: preserve the office start, remove crossed / wasteful detours.
 for(let pass=0;pass<12;pass++){let improved=false;for(let i=pinned>=0?1:0;i<route.length-1;i++)for(let j=i+1;j<route.length;j++){const before=i?route[i-1].point:center,after=j+1<route.length?route[j+1].point:null;const old=distance(before,route[i].point)+(after?distance(route[j].point,after):0),next=distance(before,route[j].point)+(after?distance(route[i].point,after):0);if(next+0.5<old){route.splice(i,j-i+1,...route.slice(i,j+1).reverse());improved=true}}if(!improved)break}
 return [...route,...missing]}
export function scheduledGroups(input,center,firstKey=''){
 // A generated route is authoritative: rendering and GPS updates must not solve it again.
 if(input.every(g=>g.rows.every(a=>Number.isInteger(a.planOrder)&&a.planOrder>0)))return [...input].sort((a,b)=>Math.min(...a.rows.map(a=>a.planOrder))-Math.min(...b.rows.map(a=>a.planOrder)));
 return orderedGroups(input,center,firstKey)
}
export function continuationScore(previous,cursor,next){const length=distance(cursor,next);if(!previous)return length;const scale=Math.cos(cursor.lat*Math.PI/180),ax=(cursor.lng-previous.lng)*scale,ay=cursor.lat-previous.lat,bx=(next.lng-cursor.lng)*scale,by=next.lat-cursor.lat,den=Math.hypot(ax,ay)*Math.hypot(bx,by);const cosine=den?(ax*bx+ay*by)/den:1;return length+Math.max(0,-cosine)*180}
export function buildPlan(rows,settings,{selectedRoad='',limit=20,date=today(),start='',zone='main'}={}){
 if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('目標家數請填 1 至 200');
 const office=origin(settings),canStart=a=>routeZone(a)===zone&&!a.routeExcluded&&!isPassed(a,date)&&!(a.logs||[]).some(l=>l.date===date),firstBuilding=start?groups(rows.filter(canStart),office).find(g=>g.key===start&&g.point):null;
 if(start&&!firstBuilding)throw Error('這棟不在本區、已 pass 或沒有可排程的旅行社，請重新選擇');
 const startKey=firstBuilding?.key||'',center=firstBuilding?{...firstBuilding.point,address:firstBuilding.address}:office;
 const available=rows.filter(a=>canStart(a)&&(groupKey(a)===startKey||eligible(a,date))),candidates=groups(available,center).filter(g=>g.point);
 const chosen=[];let count=0;const add=g=>{chosen.push(g);count+=g.rows.length};
 const first=candidates.find(g=>g.key===startKey);if(first)add(first);
 // Finish a continuous sweep of the preferred road before extending from its LAST stop.
 const primary=selectedRoad?candidates.filter(g=>g!==first&&g.rows.some(a=>road(a)===selectedRoad)):[];
 const primaryEntry=[...primary].sort((a,b)=>distance(center,a.point)-distance(center,b.point))[0];
 const primaryRoute=orderedGroups(primary,center,primaryEntry?.key||'');
 for(const g of primaryRoute){if(count>=limit)break;add(g)}
 const roadAnchor=selectedRoad?groups(rows.filter(a=>routeZone(a)===zone&&road(a)===selectedRoad),office).find(g=>g.point):null;
 const anchor=chosen[0]?.point||roadAnchor?.point||center;
 let remaining=candidates.filter(g=>!chosen.includes(g));
 while(count<limit&&remaining.length){const cursor=chosen.at(-1)?.point||anchor,previous=chosen.length>1?chosen[Math.max(0,chosen.length-3)].point:null;
 // Compare connected street corridors, not distances to ANY earlier stop.
 const nearby=remaining.filter(g=>distance(anchor,g.point)<=3000),roadNames=[...new Set(nearby.map(g=>road(g.rows[0])))];
 const corridors=roadNames.map(name=>{const local=nearby.filter(g=>road(g.rows[0])===name),entry=[...local].sort((a,b)=>distance(cursor,a.point)-distance(cursor,b.point))[0];const route=orderedGroups(local,cursor,entry.key),connected=[];let last=cursor,length=0;
 for(const g of route){const step=distance(last,g.point);if(step>1500)break;if(connected.length)length+=step;connected.push(g);last=g.point}
 return{route:connected,score:continuationScore(previous,cursor,entry.point)+length*.15}}).filter(c=>c.route.length).sort((a,b)=>a.score-b.score);
 if(!corridors.length)break;for(const g of corridors[0].route){if(count>=limit)break;add(g);remaining=remaining.filter(x=>x!==g)}}
 const firstKey=startKey||(selectedRoad?chosen[0]?.key:'')||'',routeCenter=!startKey&&firstKey?{...chosen[0].point,address:chosen[0].address}:center;
 return{groups:chosen,ids:chosen.flatMap(g=>g.rows.map(a=>a.id)),unknown:available.filter(a=>!point(a)).length,start:{date,zone,kind:start?'building':selectedRoad?'road':'auto',selectedRoad,target:limit,algorithm:2,building:firstKey,address:routeCenter.address,lat:routeCenter.lat,lng:routeCenter.lng}}
}
