import {toast} from './core.js?v=1.26';
import {pendingKey,readPending,writePending,clearPending,archivePending} from './pending-sync.js?v=1.26';
import {equalJson} from './conflict-data.js?v=1.26';
export const store={
 rows:[],settings:{},page:'route',filtered:[],listeners:new Set(),
 sequence:0,confirmed:0,persisted:0,baseRevision:null,sending:false,conflicted:false,
 waiters:[],retryTimer:null,persistQueue:Promise.resolve(),warnBound:false,recovering:false,
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)},
 emit(){for(const fn of this.listeners)fn()},
 pending(){return this.sequence>this.confirmed},
 hydrate(rows,settings={}){if(typeof window!=='undefined'&&window.Cloud?.dirty)return;this.rows=rows;this.settings=settings;this.emit()},
 notify(message){const el=typeof document!=='undefined'?document.querySelector('#cloudState'):null;if(el)el.textContent=message},
 syncFlag(message=''){
  if(typeof window==='undefined'||!window.Cloud)return;
  window.Cloud.dirty=this.pending();
  const banner=typeof document!=='undefined'?document.querySelector('#syncBanner'):null;
  if(banner){banner.hidden=!this.pending();const resolve=document.querySelector('#resolveConflict');if(resolve)resolve.hidden=!this.conflicted;const t=document.querySelector('#syncBannerText');if(t&&this.pending())t.textContent=message||(this.conflicted?'雲端資料與本機待同步內容不同，已停止寫入。請先下載本機備份核對，切勿清除網站資料。':'本機已有待同步備份，尚未確認寫入 Supabase。請勿關閉頁面或清除網站資料。')}
  if(this.pending())this.notify(message||'本機待同步，尚未儲存至 Supabase');
 },
 init(){
  const backup=document.querySelector('#pendingBackup');if(backup)backup.onclick=()=>document.querySelector('#backup')?.click();
  if(!this.warnBound&&typeof window!=='undefined'){
   this.warnBound=true;
   window.addEventListener('beforeunload',e=>{if(this.pending()){e.preventDefault();e.returnValue=''}});
   window.addEventListener('online',()=>{window.Cloud?.load?.();this.flush()});
   document.addEventListener('cloudrevision',()=>this.flush());
  }
 },
 async recover(){
  if(this.recovering||typeof indexedDB==='undefined')return;this.recovering=true;
  try{
   let key;try{key=pendingKey()}catch{return}
   const saved=await readPending(key);
   if(!saved||!Array.isArray(saved.rows)||!saved.settings||!Number.isInteger(saved.baseRevision))return;
   if(window.Cloud.hydrated&&equalJson(saved.rows,this.rows)&&equalJson(saved.settings,this.settings)){
    await clearPending(key);this.baseRevision=window.Cloud.revision;this.syncFlag();return;
   }
   this.rows=saved.rows;this.settings=saved.settings;this.sequence=1;this.confirmed=0;this.persisted=1;this.baseRevision=saved.baseRevision;
   this.conflicted=Boolean(window.Cloud.hydrated&&window.Cloud.revision!==this.baseRevision);
   this.syncFlag(this.conflicted?'已找回本機未同步資料，但雲端版本不同。為避免覆寫，已停止同步；請下載本機備份並核對。':'已從此裝置找回上次未同步資料，正在嘗試寫入 Supabase。');
   this.emit();if(!this.conflicted)this.flush();
  }catch(e){this.notify('無法檢查本機待同步備份：'+e.message);toast('無法檢查本機備份，請勿清除網站資料')}
  finally{this.recovering=false}
 },
 async useCloudSnapshot(snapshot){
  if(!this.conflicted||this.sending||this.recovering)throw Error('目前沒有可解除的版本衝突，或仍在同步中');
  if(!snapshot||!Number.isInteger(snapshot.revision)||!Array.isArray(snapshot.agencies))throw Error('雲端資料不完整');
  const key=pendingKey();
  await this.persistQueue.catch(()=>{});
  // Archive the original pending data BEFORE clearing it. Do not overwrite the cloud with stale data.
  const active=await readPending(key);
  // Preserve the newest in-memory version even if the last IndexedDB write failed.
  if(!active||!equalJson(active.rows,this.rows)||!equalJson(active.settings,this.settings))
   await writePending({key,rows:this.rows,settings:this.settings,baseRevision:this.baseRevision,savedAt:Date.now()});
  const archived=await archivePending(key);
  if(!archived)throw Error('無法保留待同步資料的本機封存，已取消解除衝突');
  await clearPending(key);
  this.failWaiters();
  this.sequence=0;this.confirmed=0;this.persisted=0;this.baseRevision=snapshot.revision;this.conflicted=false;
  this.rows=snapshot.agencies;this.settings=snapshot.settings||{};
  this.syncFlag();
  window.Cloud.acceptRemote(snapshot);
  this.emit();
  return archived;
 },
 retry(){if(this.retryTimer)return;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.flush()},4000)},
 failWaiters(){
  const pending=this.waiters.splice(0);for(const w of pending)w.resolve(false);
 },
 flush(){
  if(this.sending||this.conflicted||!this.pending()||typeof window==='undefined'||!window.Cloud)return;
  if(this.persisted!==this.sequence||!window.Cloud.hydrated||window.Cloud.busy||window.Cloud.loading){this.retry();return}
  if(this.baseRevision!==window.Cloud.revision){
   this.conflicted=true;this.syncFlag('雲端已被其他裝置更新，已停止覆寫。請先下載本機待同步備份並核對。');this.failWaiters();return;
  }
  const version=this.sequence,rows=this.rows,settings=this.settings;this.sending=true;
  (async()=>{let failed=false;
   try{
    await window.Cloud.save(rows,settings);
    this.confirmed=version;this.baseRevision=window.Cloud.revision;this.syncFlag();
    for(const w of this.waiters.filter(w=>w.version<=this.confirmed))w.resolve(true);
    this.waiters=this.waiters.filter(w=>w.version>this.confirmed);
    if(!this.pending()){
     toast('✓ 已確認儲存至 Supabase');
     this.persistQueue=this.persistQueue.catch(()=>{}).then(async()=>{if(!this.pending())await clearPending(pendingKey())});
     await this.persistQueue;
    }else{
     const key=pendingKey();
     this.persistQueue=this.persistQueue.catch(()=>{}).then(()=>writePending({key,rows:this.rows,settings:this.settings,baseRevision:this.baseRevision,savedAt:Date.now()}));
     await this.persistQueue;this.persisted=this.sequence;
    }
   }catch(e){
    failed=true;
    if(['VERSION_CONFLICT','INVALID_LINK','INVALID_DATA','TOO_LARGE'].includes(e.code)){
     this.conflicted=true;
     this.syncFlag('雲端拒絕存檔（'+e.code+'）。為避免資料遺失已停止重試；請下載本機待同步備份。');
     this.failWaiters();
    }else{
     this.syncFlag('雲端同步失敗（可能是網路或逾時），本機已保留資料；連線恢復會重試。');
     this.retry();
    }
   }finally{this.sending=false;if(!failed&&this.pending())queueMicrotask(()=>this.flush())}
  })();
 },
 async save(rows=this.rows,settings=this.settings){
  if(typeof window==='undefined'||!window.Cloud||(!window.Cloud.ready&&!window.Cloud.hydrated)){
   toast('尚未載入 Supabase 資料，請先確認連線再操作');return false;
  }
  if(this.conflicted){toast('本機與雲端資料有衝突，請先下載備份核對，避免覆寫');return false}
  if(typeof indexedDB==='undefined'){
   // Fail safely on browsers without durable storage: only report success after cloud confirmation.
   try{await window.Cloud.save(rows,settings);this.rows=rows;this.settings=settings;this.emit();return true}
   catch(e){toast('無法完成雲端儲存，資料未更改：'+e.message);return false}
  }
  const hadPending=this.pending();
  if(!hadPending)this.baseRevision=window.Cloud.revision;
  this.rows=rows;this.settings=settings;const version=++this.sequence;
  this.syncFlag('正在建立本機備份，雲端尚未確認');this.emit();
  const entry={key:pendingKey(),rows,settings,baseRevision:this.baseRevision,savedAt:Date.now()};
  this.persistQueue=this.persistQueue.catch(()=>{}).then(()=>writePending(entry));
  try{await this.persistQueue;this.persisted=version;this.syncFlag();this.flush();return true}
  catch(e){
   this.syncFlag('本機備份寫入失敗！畫面變更尚無安全備份；請立即從設定下載完整備份：'+e.message);
   toast('本機備份寫入失敗，請立即下載完整備份並保留此頁');return false;
  }
 },
 async saveConfirmed(rows=this.rows,settings=this.settings){
  const target=this.sequence+1;
  if(!await this.save(rows,settings))return false;
  if(typeof indexedDB==='undefined'||this.confirmed>=target)return true;
  return new Promise(resolve=>{
   const w={version:target,resolve};this.waiters.push(w);
   setTimeout(()=>{const pos=this.waiters.indexOf(w);if(pos>=0){this.waiters.splice(pos,1);resolve(false)}},30000);
  });
 },
 async update(id,change){return this.save(this.rows.map(a=>a.id===id?{...a,...(typeof change==='function'?change(a):change)}:a))},
 go(page){this.page=page;this.emit()}
};
