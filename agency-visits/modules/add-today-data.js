import {groupKey,routeZone,floor,point,origin} from './geo.js?v=1.26';
import {isPassed,buildPlan} from './routing.js?v=1.26';
export function appendToday(rows,id,mode,date){const target=rows.find(a=>a.id===id);if(!target)throw Error('請選擇旅行社');if(target.routeExcluded||isPassed(target,date))throw Error('這間已排除或本週 pass，請先取消排除／pass 再加入');const zone=routeZone(target),same=groupKey(target),today=rows.filter(a=>a.planDate===date),order=Math.max(0,...today.map(a=>Number(a.planOrder)||0)),round=Math.max(0,...today.map(a=>Number(a.planRound)||0))+1;
 const candidates=rows.filter(a=>(mode==='building'?groupKey(a)===same:a.id===id)&&!a.routeExcluded&&!isPassed(a,date)&&a.planDate!==date&&!(a.logs||[]).some(l=>l.date===date)).sort((a,b)=>(floor(b)??-Infinity)-(floor(a)??-Infinity));if(!candidates.length)throw Error('所選旅行社今日已排入或已拜訪，請選擇其他同業');const updates=new Map(candidates.map((a,i)=>[a.id,{...a,planDate:date,planOrder:order+i+1,planRound:round,today:true}]));return{rows:rows.map(a=>updates.get(a.id)||a),zone,count:candidates.length}}

// Continue after the last scheduled door; keep all original orders and completed visits.
export function appendSmartToday(rows,settings,{zone='main',limit=20,selectedRoad='',date}={}){
 if(!['main','neihu'].includes(zone))throw Error('請選擇拜訪區域');
 const available=rows.filter(a=>a.planDate!==date&&!(a.logs||[]).some(l=>l.date===date));
 const tail=rows.filter(a=>a.planDate===date&&routeZone(a)===zone&&!a.routeExcluded&&!isPassed(a,date)).sort((a,b)=>(Number(b.planOrder)||0)-(Number(a.planOrder)||0)).find(a=>point(a));
 const center=tail?{...point(tail),address:tail.address}:origin(settings);
 const plan=buildPlan(available,{...settings,origin:center},{zone,limit,selectedRoad,date});
 if(!plan.ids.length)throw Error('本區沒有可追加的到期或尚未拜訪同業，請調整區域／路名，或使用手動追加');
 const planned=rows.filter(a=>a.planDate===date),order=Math.max(0,...planned.map(a=>Number(a.planOrder)||0)),round=Math.max(0,...planned.map(a=>Number(a.planRound)||0))+1;
 const updates=new Map(plan.ids.map((id,i)=>[id,{planDate:date,planOrder:order+i+1,planRound:round,today:true}]));
 return{rows:rows.map(a=>updates.has(a.id)?{...a,...updates.get(a.id)}:a),zone,count:plan.ids.length,added:plan.groups.flatMap(g=>g.rows),requested:limit,buildings:plan.groups.length,unknown:plan.unknown};
}
