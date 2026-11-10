import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pendingKey,readPending,writePending,clearPending} from '../agency-visits/modules/pending-sync.js?v=1.26';
test('large unsynced edits survive reload in IndexedDB until explicit removal',async()=>{
 const old={indexedDB:globalThis.indexedDB,location:globalThis.location,localStorage:globalThis.localStorage};
 const values=new Map(),scope='a'.repeat(64);
 const request=(tx,op)=>{const req={};queueMicrotask(()=>{try{req.result=op();req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())}catch(err){tx.error=err;tx.onerror?.()}});return req};
 const db={objectStoreNames:{contains:()=>true},createObjectStore(){},close(){},transaction(){const tx={oncomplete:null,onerror:null,onabort:null,error:null};tx.objectStore=()=>({
  get:key=>request(tx,()=>values.get(key)),put:value=>request(tx,()=>values.set(value.key,value)),delete:key=>request(tx,()=>values.delete(key))
 });return tx}};
 globalThis.indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req}};
 globalThis.location={hash:'#sync='+scope};globalThis.localStorage={getItem(){return null}};
 try{
  const item={key:pendingKey(),baseRevision:12,rows:[{id:'one',name:'旅行社',logs:[{date:'2026-11-09',text:'測試'}]}],settings:{},savedAt:123};
  assert.equal(item.key,scope);
  await writePending(item);
  assert.deepEqual(await readPending(scope),item);
  await clearPending(scope);
  assert.equal(await readPending(scope),undefined);
 }finally{Object.assign(globalThis,old)}
});
