import {rating,intervals,today} from './core.js?v=1.03';
import {groups,origin,distance,road,groupKey,point} from './geo.js?v=1.03';
export function dueDate(a){if(a.next)return a.next;if(a.status==='尚未拜訪'||!(a.logs||[]).length)return'';const latest=[...a.logs].sort((x,y)=>y.date.localeCompare(x.date))[0].date;const date=new Date(latest+'T12:00:00+08:00');date.setUTCDate(date.getUTCDate()+(intervals[rating(a)]||30));return date.toISOString().slice(0,10)}
export function eligible(a,date=today()){if(a.routeExcluded||(a.logs||[]).some(l=>l.date===date))return false;const due=dueDate(a);return!due||due<=date}
export function orderedGroups(input,center,firstKey=''){const remaining=input.filter(g=>g.point),missing=input.filter(g=>!g.point);let cursor=center,route=[];const pinned=remaining.findIndex(g=>g.key===firstKey);if(pinned>=0){const [first]=remaining.splice(pinned,1);route.push(first);cursor=first.point}while(remaining.length){let best=0;for(let i=1;i<remaining.length;i++)if(distance(cursor,remaining[i].point)<distance(cursor,remaining[best].point))best=i;const [next]=remaining.splice(best,1);route.push(next);cursor=next.point}
 // Open-tour 2-opt: preserve the office start, remove crossed / wasteful detours.
 for(let pass=0;pass<12;pass++){let improved=false;for(let i=pinned>=0?1:0;i<route.length-1;i++)for(let j=i+1;j<route.length;j++){const before=i?route[i-1].point:center,after=j+1<route.length?route[j+1].point:null;const old=distance(before,route[i].point)+(after?distance(route[j].point,after):0),next=distance(before,route[j].point)+(after?distance(route[i].point,after):0);if(next+0.5<old){route.splice(i,j-i+1,...route.slice(i,j+1).reverse());improved=true}}if(!improved)break}
 return [...route,...missing]}
export function buildPlan(rows,settings,{selectedRoad='',limit=20,date=today(),start=''}={}){
 if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('目標家數請填 1 至 200');
 const office=origin(settings),canStart=a=>!a.routeExcluded&&!(a.logs||[]).some(l=>l.date===date),firstBuilding=start?groups(rows.filter(canStart),office).find(g=>g.key===start&&g.point):null;
 if(start&&!firstBuilding)throw Error('這棟沒有可排程的旅行社或可用座標，請重新選擇');
 const startKey=firstBuilding?.key||'',center=firstBuilding?{...firstBuilding.point,address:firstBuilding.address}:office;
 const available=rows.filter(a=>canStart(a)&&(groupKey(a)===startKey||eligible(a,date))&&(!selectedRoad||road(a)===selectedRoad||startKey&&groupKey(a)===startKey)),candidates=groups(available,center).filter(g=>g.point);
 candidates.sort((a,b)=>{const score=g=>Math.max(...g.rows.map(a=>a.next&&a.next<=date?100:0))+Math.max(...g.rows.map(a=>rating(a)||3))*6-Math.min(g.distance/150,40);return score(b)-score(a)||a.distance-b.distance});
 const chosen=[];let count=0;const first=candidates.findIndex(g=>g.key===startKey);if(first>=0){const [g]=candidates.splice(first,1);chosen.push(g);count=g.rows.length}for(const g of candidates){if(count>=limit)break;chosen.push(g);count+=g.rows.length}
 const route=orderedGroups(chosen,center,startKey);return{groups:route,ids:route.flatMap(g=>g.rows.map(a=>a.id)),unknown:available.filter(a=>!point(a)).length,start:{date,building:startKey,address:center.address,lat:center.lat,lng:center.lng}}
}
