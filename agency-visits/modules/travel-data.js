import {distance} from './geo.js?v=1.19';
// Coordinates remain in memory. Only aggregate daily meters enter cloud settings.
export function routeDistance(route,start,end=null){let meters=0,previous=start,unknown=0;for(const g of route){if(!g.point||!previous){unknown++;previous=g.point;continue}meters+=distance(previous,g.point);previous=g.point}if(route.length&&end){if(previous)meters+=distance(previous,end);else unknown++}return{meters:unknown?null:meters,unknown}}
export function routeMileage(route,start,position,date){const total=routeDistance(route,start,start);const done=g=>g.rows.every(a=>(a.logs||[]).some(l=>l.date===date));const pending=route.filter(g=>!done(g));const first=route.findIndex(g=>!done(g));const previous=first>0?route.slice(0,first).reverse().find(g=>g.point)?.point:null;return{total:total.meters,remaining:(pending.length?routeDistance(pending,position||previous||start,start).meters:route.length?distance(position||route.at(-1).point||start,start):0),unknown:total.unknown,buildings:route.length,pending:pending.length}}
export function createMileageMeter(){let anchor=null,lastStamp=null,lastPoint=null;return{pause(){anchor=null;lastStamp=null;lastPoint=null},push(p){
 if(!p)return{meters:0,gap:false,reason:'等待新的 GPS 位置；若一直不動，請按重新定位'};if(!Number.isFinite(p.timestamp)||p.timestamp<=lastStamp)return{meters:0,gap:false};const previousStamp=lastStamp;lastStamp=p.timestamp;
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!Number.isFinite(p.accuracy)||p.accuracy>100||p.accuracy<0){anchor=null;lastPoint=null;return{meters:0,gap:true,reason:'定位誤差超過 100 m，請允許精確位置並到戶外重新定位'}}
 if(!anchor){anchor=p;lastPoint=p;return{meters:0,gap:false,reason:'已取得起點，開始移動後累計里程'}}
 const seconds=(p.timestamp-previousStamp)/1000;if(seconds<=0)return{meters:0,gap:false};if(seconds>90){anchor=p;lastPoint=p;return{meters:0,gap:true,reason:'定位曾中斷，已接回定位；中斷路段不補算'}}
 const meters=distance(anchor,p);if(distance(lastPoint,p)/seconds>8){anchor=null;lastPoint=null;return{meters:0,gap:true,reason:'定位跳動過大，等待穩定位置'}}
 lastPoint=p;if(meters<Math.max(8,(p.accuracy+anchor.accuracy)/2))return{meters:0,gap:false,reason:'位置更新中；位移尚在定位誤差內，繼續移動後累計'};anchor=p;return{meters,gap:false,reason:'正在累計移動距離'};
 }}}
export const totalMoved=day=>Object.values(day?.devices||{}).reduce((n,v)=>n+(Number.isFinite(v)&&v>=0?v:0),0);
export function recordTravel(settings,date,device,delta,planned={},now=new Date().toISOString()){
 if(!Number.isFinite(delta)||delta<0)throw Error('無效的里程');const days={...(settings.travelDays||{})},old=days[date]||{};
 days[date]={...old,devices:{...(old.devices||{}),[device]:(old.devices?.[device]||0)+delta},planned:{...(old.planned||{}),...planned},updatedAt:now};
 const retained=Object.keys(days).sort().reverse().slice(0,90);return{...settings,travelDays:Object.fromEntries(retained.map(d=>[d,days[d]]))};
}
