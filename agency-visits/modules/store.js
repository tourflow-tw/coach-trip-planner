import {toast} from './core.js?v=1.22';
export const store={
 rows:[],settings:{},page:'route',filtered:[],listeners:new Set(),
 sequence:0,confirmed:0,sending:false,conflicted:false,waiters:[],retryTimer:null,warnBound:false,
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)},
 emit(){for(const fn of this.listeners)fn()},
 pending(){return this.sequence>this.confirmed},
 hydrate(rows,settings={}){if(typeof window!=='undefined'&&window.Cloud?.dirty)return;this.rows=rows;this.settings=settings;this.emit()},
 notify(message){const state=typeof document!=='undefined'?document.querySelector('#cloudState'):null;if(state)state.textContent=message},
 syncFlag(){if(typeof window!=='undefined'&&window.Cloud){window.Cloud.dirty=this.pending();if(this.pending()&&!this.conflicted)this.notify('變更已記錄，雲端同步中；請勿關閉頁面')}},
 retry(){if(this.retryTimer)return;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.flush()},4000)},
 flush(){
  if(this.sending||this.conflicted||!this.pending()||typeof window==='undefined'||!window.Cloud)return;
  if(window.Cloud.busy||window.Cloud.loading){this.retry();return}
  const version=this.sequence,rows=this.rows,settings=this.settings;
  this.sending=true;
  (async()=>{let failed=false;
   try{
    await window.Cloud.save(rows,settings);
    this.confirmed=version;
    for(const w of this.waiters.filter(w=>w.version<=this.confirmed))w.resolve(true);
    this.waiters=this.waiters.filter(w=>w.version>this.confirmed);
    this.syncFlag();
   }catch(e){
    failed=true;
    if(e.code==='VERSION_CONFLICT'){
     this.conflicted=true;
     this.notify('不同裝置資料發生衝突；請先匯出備份，勿重新整理');
     toast('其他裝置已修改雲端資料。請先從設定匯出目前內容，確認後再處理衝突。');
    }else{
     this.notify('雲端同步暫時失敗，資料仍留在本頁；請勿關閉');
     this.retry();
    }
   }finally{this.sending=false;if(!failed&&this.pending())queueMicrotask(()=>this.flush())}
  })();
 },
 async save(rows=this.rows,settings=this.settings){
  if(typeof window==='undefined'||!window.Cloud||(window.Cloud.ready!==true&&window.Cloud.hydrated!==true)){
   toast('尚未載入 Supabase 名單，請先確認連線後再操作');return false;
  }
  this.rows=rows;this.settings=settings;this.sequence++;
  this.syncFlag();this.emit();
  if(!this.warnBound&&typeof window.addEventListener==='function'){
   this.warnBound=true;
   window.addEventListener('beforeunload',e=>{if(this.pending()){e.preventDefault();e.returnValue=''}});
   window.addEventListener('online',()=>this.flush());
  }
  this.flush();return true;
 },
 async saveConfirmed(rows=this.rows,settings=this.settings){
  const target=this.sequence+1;
  if(!await this.save(rows,settings))return false;
  if(this.confirmed>=target)return true;
  return new Promise(resolve=>this.waiters.push({version:target,resolve}));
 },
 async update(id,change){return this.save(this.rows.map(a=>a.id===id?{...a,...(typeof change==='function'?change(a):change)}:a))},
 go(page){this.page=page;this.emit()}
};
