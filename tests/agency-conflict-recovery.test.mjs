import {test} from 'node:test';
import assert from 'node:assert/strict';
import {store} from '../agency-visits/modules/store.js?v=1.25';
import {pendingKey,readPending,writePending,listPendingArchives} from '../agency-visits/modules/pending-sync.js?v=1.25';
import {equalJson,conflictSummary} from '../agency-visits/modules/conflict-data.js?v=1.25';
function mockDB(){
 const data=new Map();
 const request=(tx,fn)=>{const r={};queueMicrotask(()=>{try{r.result=fn();r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())}catch(error){tx.error=error;tx.onerror?.()}});return r};
 const connection={objectStoreNames:{contains:()=>true},close(){},transaction(){const tx={};tx.objectStore=()=>({
  get:key=>request(tx,()=>data.get(key)),
  put:item=>request(tx,()=>data.set(item.key,item)),
  delete:key=>request(tx,()=>data.delete(key)),
  getAll:()=>request(tx,()=>[...data.values()])
 });return tx}};
 return {open(){const r={result:connection};queueMicrotask(()=>r.onsuccess?.());return r}};
}
test('different revisions can be resolved without overwriting cloud or losing local copy',async()=>{
 const old={window:globalThis.window,document:globalThis.document,location:globalThis.location,localStorage:globalThis.localStorage,indexedDB:globalThis.indexedDB};
 const key='a'.repeat(64),elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:''});return elements.get(id)};
 const local=[{id:'a',name:'原本',status:'尚未拜訪',rating:0,logs:[{id:'log-old',date:'2026-11-09',text:'舊紀錄',status:'已拜訪'}]}];
 const cloud=[{id:'a',name:'原本',status:'已拜訪',rating:5,logs:[...local[0].logs,{id:'log-new',date:'2026-11-09',text:'發DM',status:'已拜訪'}]}];
 let writes=0;
 const snapshot={agencies:cloud,settings:{daySettlements:{'2026-11-09':{planned:49,handled:27,unvisited:22,rounds:1}}},revision:201,updated_at:new Date().toISOString()};
 const Cloud={ready:true,hydrated:true,revision:201,loading:false,busy:false,dirty:false,save:async()=>writes++,acceptRemote(data){this.revision=data.revision;this.dirty=false}};
 globalThis.window={Cloud,addEventListener(){}};
 globalThis.document={querySelector:el,addEventListener(){}};
 globalThis.location={hash:'#sync='+key};
 globalThis.localStorage={getItem(){return null}};
 globalThis.indexedDB=mockDB();
 try{
  assert.equal(pendingKey(),key);
  await writePending({key,rows:local,settings:{},baseRevision:140,savedAt:123});
  store.rows=cloud;store.settings=snapshot.settings;store.sequence=0;store.confirmed=0;store.persisted=0;store.baseRevision=null;store.conflicted=false;store.sending=false;store.persistQueue=Promise.resolve();store.listeners.clear();
  await store.recover();assert.equal(store.conflicted,true);assert.equal(store.rows[0].rating,0);assert.equal(Cloud.dirty,true);
  const differences=conflictSummary(store.rows,store.settings,cloud,snapshot.settings);
  assert.equal(differences.localOnlyLogs,0);assert.equal(differences.remoteOnlyLogs,1);
  assert.equal(el('#resolveConflict').hidden,false);
  await store.useCloudSnapshot(snapshot);
  assert.equal(store.conflicted,false);assert.equal(Cloud.dirty,false);assert.equal(el('#syncBanner').hidden,true);
  assert.equal(writes,0,'manual cloud adoption must never write to Supabase');
  assert.equal(store.rows[0].rating,5);assert.equal(store.settings.daySettlements['2026-11-09'].unvisited,22);
  assert.equal(await readPending(key),undefined);
  const archives=await listPendingArchives(key);assert.equal(archives.length,1);
  assert.equal(archives[0].rows[0].rating,0,'original local version is archived intact');
  // Same content with a different revision is not a real conflict.
  const same=[{name:'原本',id:'a',status:'已拜訪',rating:5,logs:cloud[0].logs}];
  assert(equalJson(same,cloud));
  await writePending({key,rows:same,settings:snapshot.settings,baseRevision:200,savedAt:222});
  store.rows=cloud;store.settings=snapshot.settings;store.sequence=0;store.confirmed=0;store.conflicted=false;
  await store.recover();assert.equal(store.conflicted,false);assert.equal(await readPending(key),undefined);
 }finally{Object.assign(globalThis,old);store.listeners.clear()}
});
