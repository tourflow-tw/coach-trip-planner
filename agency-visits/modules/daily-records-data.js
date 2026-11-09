const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');
const sumValid=obj=>Object.values(obj||{}).reduce((n,v)=>n+(Number.isFinite(v)&&v>=0?v:0),0);
export const noContactStatus=log=>['找不到','沒人在'].includes(log.outcome||log.status);
export function historyDates(rows,settings={}){
 const dates=new Set();
 for(const agency of rows||[])for(const log of agency.logs||[])if(isDate(log.date))dates.add(log.date);
 for(const date of Object.keys(settings.travelDays||{}))if(isDate(date))dates.add(date);
 for(const date of Object.keys(settings.daySettlements||{}))if(isDate(date))dates.add(date);
 return [...dates].sort().reverse();
}
export function dayRecord(rows,settings={},date){
 const entries=[];
 for(const agency of rows||[]){
  const logs=(agency.logs||[]).filter(log=>log.date===date);
  if(!logs.length)continue;
  const reached=logs.some(log=>!noContactStatus(log));
  const result=reached?'已拜訪':logs.some(log=>(log.outcome||log.status)==='沒人在')?'沒人在':'找不到';
  const stamps=logs.map(log=>log.recordedAt).filter(s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))).sort();
  entries.push({agency,logs,result,recordedAt:stamps[0]||null});
 }
 entries.sort((a,b)=>{
  if(a.recordedAt&&b.recordedAt)return a.recordedAt.localeCompare(b.recordedAt);
  if(a.recordedAt)return -1;if(b.recordedAt)return 1;
  return(a.agency.address||'').localeCompare(b.agency.address||'','zh-TW',{numeric:true})||(a.agency.name||'').localeCompare(b.agency.name||'','zh-TW');
 });
 const day=settings.travelDays?.[date],settlement=settings.daySettlements?.[date]||null,planned=day?.planned||{};
 const plannedMeters=sumValid(planned);
 return{
  date,entries,visited:entries.filter(e=>e.result==='已拜訪').length,
  notFound:entries.filter(e=>e.result==='找不到').length,absent:entries.filter(e=>e.result==='沒人在').length,
  total:entries.length,moved:day?sumValid(day.devices):null,seconds:day?sumValid(day.seconds):null,
  planned:day&&Object.keys(planned).length?plannedMeters:null,
  plannedIsRoad:day&&Object.keys(planned).length?Object.keys(planned).every(zone=>day.plannedBasis?.[zone]==='foot'):false,
  settlement
 };
}
