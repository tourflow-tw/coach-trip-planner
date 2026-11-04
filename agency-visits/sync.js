/* Supabase is authoritative. Only the access link is remembered locally. */
'use strict';
const Cloud=(()=>{
 const $=s=>document.querySelector(s),URL_BASE='https://oafoxkpepuldeaaraxcm.supabase.co/functions/v1/agency-visit-sync',KEY='agency-visit-sync-link-v1';
 let key='',revision=0,ready=false,busy=false,loading=false,hydrated=false;
 const api={onData:null,get ready(){return ready},get busy(){return busy}};
 const state=t=>{$('#cloudState').textContent=t};
 function problem(e){if(e.code==='VERSION_CONFLICT')return '另一個裝置已更新。請保留未儲存內容，關閉編輯視窗後會自動讀取最新資料，再重新開啟編輯。';if(e.code==='INVALID_LINK')return '存取網址無效，請使用你的完整專屬網址。';if(e.code==='INVALID_DATA'||e.code==='TOO_LARGE')return '資料格式不正確或檔案過大，請減少資料量後再試。';return '暫時無法連接 Supabase，正在自動重新連線；請保留尚未儲存的編輯內容。'}
 async function request(body){if(typeof navigator!=='undefined'&&navigator.onLine===false)throw Error('OFFLINE');const response=await fetch(URL_BASE,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:'sb_publishable_pmftI3EMAq-zFYHIpMdpjA_u9lp1jJT'},body:JSON.stringify({key,...body}),signal:AbortSignal.timeout(25000)});let data;try{data=await response.json()}catch{throw Error('INVALID_RESPONSE')}if(!response.ok){const e=new Error(data.error);e.code=data.error;throw e}return data}
 function check(rows){if(!Array.isArray(rows)||rows.some(a=>!a||typeof a.name!=='string'||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(a.id)||!Array.isArray(a.logs)))throw Error('INVALID_DATA');return rows}
 async function load({force=false}={}){
  if(!key||busy||loading||(!force&&document.querySelector('dialog[open]')))return;
  loading=true;
  try{
   const data=await request({op:'read',...(hydrated?{knownRevision:revision}:{})});
   if(data.unchanged===true){if(!hydrated||data.revision!==revision)throw Error('INVALID_RESPONSE')}
   else{const rows=check(data.agencies);if(!hydrated||revision!==data.revision)api.onData?.(rows);revision=data.revision;hydrated=true}
   ready=true;$('#syncLinkPanel').classList.add('hidden');state('✓ 已連接 Supabase · 資料更新於 '+new Date(data.updated_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}));
  }catch(e){ready=false;state(problem(e));if(e.code==='INVALID_LINK')$('#syncLinkPanel').classList.remove('hidden')}
  finally{loading=false}
 }
 api.save=async rows=>{
  if(!ready||busy||loading)throw Error('正在連接 Supabase，請保留編輯內容並稍候再儲存。');check(rows);busy=true;$('#saveOverlay').classList.remove('hidden');state('正在儲存至 Supabase…');
  try{const data=await request({op:'save',agencies:rows,expectedRevision:revision});revision=data.revision;state('✓ 已儲存至 Supabase · '+new Date(data.updated_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}))}
  catch(e){ready=false;state(problem(e));throw Error(problem(e))}
  finally{busy=false;$('#saveOverlay').classList.add('hidden')}
 };
 function useKey(k){key=k;ready=false;hydrated=false;revision=0;api.onData?.([]);try{localStorage.setItem(KEY,key)}catch{}history.replaceState(null,'',location.pathname+location.search+'#sync='+key);return load({force:true})}
 api.start=async()=>{
  // Remove the previous offline snapshot. App-shell caching contains no agency data.
  try{if(typeof indexedDB!=='undefined')indexedDB.deleteDatabase('agency-visit-offline-v1')}catch{}
  $('#openSyncLink').onclick=()=>{let k='';try{k=new URLSearchParams(new URL($('#syncLinkInput').value).hash.slice(1)).get('sync')||''}catch{}if(!/^[0-9a-f]{64}$/.test(k)){state('請貼上完整的專屬網址，包含 #sync= 後面的內容。');return}useKey(k)};
  $('#copyLink').onclick=async()=>{if(!key)return state('請先開啟專屬網址。');try{await navigator.clipboard.writeText(location.href);state('✓ 專屬網址已複製，可在另一台裝置開啟。')}catch{state('請從網址列複製完整網址，包含 #sync= 後面的內容。')}};
  window.addEventListener('hashchange',()=>{const next=new URLSearchParams(location.hash.slice(1)).get('sync')||'';if(next===key)return;if(/^[0-9a-f]{64}$/.test(next)&&!busy&&!loading&&!document.querySelector('dialog[open]'))useKey(next);else{if(key)history.replaceState(null,'',location.pathname+location.search+'#sync='+key);state('請先完成目前編輯，再開啟完整專屬網址。')}});
  window.addEventListener('focus',()=>load());window.addEventListener('online',()=>load());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
  document.addEventListener('close',()=>load(),true);
  setInterval(()=>{if(document.visibilityState==='visible')load()},5000);
  let k=new URLSearchParams(location.hash.slice(1)).get('sync')||'';if(!k)try{k=localStorage.getItem(KEY)||''}catch{}
  if(/^[0-9a-f]{64}$/.test(k))await useKey(k);else{$('#syncLinkPanel').classList.remove('hidden');state('請使用你的專屬網址開啟。無需登入。')}
 };
 return api;
})();
