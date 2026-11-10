// IndexedDB stores only unsynced edits, isolated by this device's capability link.
const DB='agency-visit-unsynced-v1',TABLE='outbox';
export function pendingKey(){
 let key='';try{key=new URLSearchParams(location.hash.slice(1)).get('sync')||localStorage.getItem('agency-visit-sync-link-v1')||''}catch{}
 if(!/^[0-9a-f]{64}$/.test(key))throw Error('找不到有效的資料簿識別，無法建立本機備份');
 return key;
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('這個瀏覽器不支援本機備份'));
  let req;try{req=indexedDB.open(DB,1)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE,{keyPath:'key'})};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('無法開啟本機備份'));
  req.onblocked=()=>reject(Error('本機備份被其他分頁佔用'));
 });
}
async function transact(mode,action){
 const db=await openDB();return new Promise((resolve,reject)=>{
  let outcome;let tx;try{tx=db.transaction(TABLE,mode);const req=action(tx.objectStore(TABLE));req.onsuccess=()=>{outcome=req.result};req.onerror=()=>{}}catch(e){db.close();reject(e);return}
  tx.oncomplete=()=>{db.close();resolve(outcome)};
  tx.onerror=()=>{db.close();reject(tx.error||Error('本機備份讀寫失敗'))};
  tx.onabort=()=>{db.close();reject(tx.error||Error('本機備份中斷'))};
 });
}
export const readPending=key=>transact('readonly',table=>table.get(key));
export const writePending=record=>transact('readwrite',table=>table.put(record));
export const clearPending=key=>transact('readwrite',table=>table.delete(key));

const archivePrefix=key=>'archive:'+key+':';
export async function archivePending(key){
 const saved=await readPending(key);
 if(!saved)return null;
 const archiveKey=archivePrefix(key)+Date.now()+'-'+crypto.randomUUID();
 await writePending({...saved,key:archiveKey,originalKey:key,archivedAt:new Date().toISOString()});
 return archiveKey;
}
export async function listPendingArchives(key){
 const entries=await transact('readonly',table=>table.getAll());
 return (entries||[]).filter(item=>typeof item.key==='string'&&item.key.startsWith(archivePrefix(key))).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));
}
