// Comparison is read-only: it never writes or silently discards either copy.
export function equalJson(a,b){
 if(a===b)return true;
 if(a===null||b===null||typeof a!==typeof b||typeof a!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b)){
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equalJson(v,b[i]));
 }
 const left=Object.keys(a).filter(k=>a[k]!==undefined).sort(),right=Object.keys(b).filter(k=>b[k]!==undefined).sort();
 return left.length===right.length&&left.every((k,i)=>k===right[i]&&equalJson(a[k],b[k]));
}
const signature=log=>JSON.stringify([log?.date||'',log?.text||'',log?.status||'',log?.outcome||'']);
function logDifference(left,right){
 const counts=new Map();
 for(const log of right||[]){const k=signature(log);counts.set(k,(counts.get(k)||0)+1)}
 let missing=0;
 for(const log of left||[]){const k=signature(log),have=counts.get(k)||0;if(have)counts.set(k,have-1);else missing++}
 return missing;
}
export function conflictSummary(localRows,localSettings,remoteRows,remoteSettings){
 const current=new Map((remoteRows||[]).map(a=>[a.id,a]));
 const previous=new Map((localRows||[]).map(a=>[a.id,a]));
 let localOnlyAgencies=0,remoteOnlyAgencies=0,localOnlyLogs=0,remoteOnlyLogs=0,changedAgencies=0;
 for(const a of localRows||[]){
  const r=current.get(a.id);if(!r)localOnlyAgencies++;
  if(!r||!equalJson(a,r))changedAgencies++;
  localOnlyLogs+=logDifference(a.logs,r?.logs);
 }
 for(const r of remoteRows||[]){if(!previous.has(r.id))remoteOnlyAgencies++;remoteOnlyLogs+=logDifference(r.logs,previous.get(r.id)?.logs)}
 return {
  localAgencies:localRows?.length||0,remoteAgencies:remoteRows?.length||0,
  localOnlyAgencies,remoteOnlyAgencies,localOnlyLogs,remoteOnlyLogs,
  changedAgencies,settingsDifferent:!equalJson(localSettings||{},remoteSettings||{}),
  identical:equalJson(localRows||[],remoteRows||[])&&equalJson(localSettings||{},remoteSettings||{})
 };
}
