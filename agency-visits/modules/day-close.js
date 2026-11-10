import {$,today,toast} from './core.js?v=1.26';
import {store} from './store.js?v=1.26';
export function dayCounts(rows,date){
 const selected=rows.filter(a=>a.planDate===date);
 const handled=selected.filter(a=>(a.logs||[]).some(l=>l.date===date)).length;
 return{total:selected.length,handled,unvisited:selected.length-handled};
}
export function settleDay(rows,date){return rows.map(a=>a.planDate===date?{...a,planDate:'',planOrder:0,planRound:0,today:false}:a)}
export function settleSettings(settings,date,counts=null){
 const starts=Object.fromEntries(Object.entries(settings.planStarts||{}).filter(([,p])=>p?.date!==date));
 const next={...settings,planStart:settings.planStart?.date===date?null:settings.planStart,planStarts:starts};
 if(counts){const old=settings.daySettlements?.[date]||{};const summaries={...settings.daySettlements,[date]:{planned:(old.planned||0)+counts.total,handled:(old.handled||0)+counts.handled,unvisited:(old.unvisited||0)+counts.unvisited,rounds:(old.rounds||0)+1}};const dates=Object.keys(summaries).sort().reverse().slice(0,120);next.daySettlements=Object.fromEntries(dates.map(d=>[d,summaries[d]]))}
 return next;
}
export function initDayClose(){
 $('#closeDay').onclick=async()=>{
  if($('#visitLocationToggle')?.getAttribute('aria-pressed')==='true')return toast('請先停止拜訪，等里程與時間同步後再結算今日');
  const date=today(),count=dayCounts(store.rows,date);
  if(!count.total)return toast('今天沒有需要結算的排程');
  if(!confirm('今日已處理 '+count.handled+' 家，尚未跑 '+count.unvisited+' 家。\n結算後清空今天全部 '+count.total+' 家的排程；未跑的仍保留在旅行社名單，下次可以重新安排。\n拜訪紀錄、評分、聯絡人、里程和時間均保留。確定結算？'))return;
  const settings=settleSettings(store.settings,date,count);
  if(new TextEncoder().encode(JSON.stringify(settings)).length>45000)return toast('結算統計超過雲端設定容量，請先備份並整理資料');
  if(await store.save(settleDay(store.rows,date),settings))
   toast('今日已結算：已處理 '+count.handled+' 家，未跑 '+count.unvisited+' 家退回待排；雲端同步中');
 };
}
