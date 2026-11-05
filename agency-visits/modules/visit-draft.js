// Only pending aggregate meters/time are stored on this phone. No coordinates or agency data.
export function loadDraft(storage,key){try{const d=JSON.parse(storage.getItem(key));if(!d||typeof d.id!=='string'||!Array.isArray(d.meters)||!Array.isArray(d.seconds))return null;for(const [date,n]of [...d.meters,...d.seconds])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(n)||n<0)return null;return d}catch{return null}}
export function saveDraft(storage,key,draft){try{storage.setItem(key,JSON.stringify(draft));return true}catch{return false}}
export function applyDraft(settings,date,device,id,meters,seconds){
 const old=settings.travelDays?.[date]||{},receipt=old.visitReceipts?.[device],same=receipt?.id===id;
 const moved=Math.max(0,meters-(same?receipt.meters:0)),elapsed=Math.max(0,seconds-(same?receipt.seconds:0));
 return {...settings,travelDays:{...settings.travelDays,[date]:{...old,
  devices:{...old.devices,[device]:(old.devices?.[device]||0)+moved},seconds:{...old.seconds,[device]:(old.seconds?.[device]||0)+elapsed},
  visitReceipts:{...old.visitReceipts,[device]:{id,meters,seconds}}
 }}};
}
