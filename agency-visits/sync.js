/* No account or sign-in. A private capability in the URL fragment authorizes sync. */
'use strict';
const Cloud=(()=>{
 const $=s=>document.querySelector(s),URL_BASE='https://oafoxkpepuldeaaraxcm.supabase.co/functions/v1/agency-visit-sync',KEY='agency-visit-sync-link-v1';
 let key='',revision=0,ready=false,busy=false,loading=false;
 const api={onData:null,get ready(){return ready},get busy(){return busy}};
 const state=t=>{$('#cloudState').textContent=t};
 function problem(e){if(e.code==='VERSION_CONFLICT')return '另一個裝置已更新。請保留未儲存內容，關閉編輯視窗後按「重新同步」再修改。';if(e.code==='INVALID_LINK')return '同步網址無效，請使用你的完整專屬網址。';if(e.code==='INVALID_DATA'||e.code==='TOO_LARGE')return '資料格式不正確或檔案過大，請減少資料量後再試。';return '暫時無法連接雲端，尚未確認儲存結果。請保留編輯內容，網路恢復後重新同步確認。'}
 async function request(body){const response=await fetch(URL_BASE,{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_pmftI3EMAq-zFYHIpMdpjA_u9lp1jJT'},body:JSON.stringify({key,...body}),signal:AbortSignal.timeout(25000)});let data;try{data=await response.json()}catch{throw Error('INVALID_RESPONSE')}if(!response.ok){const e=new Error(data.error);e.code=data.error;throw e}return data}
 function check(rows){if(!Array.isArray(rows)||rows.some(a=>!a||typeof a.name!=='string'||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(a.id)||!Array.isArray(a.logs)))throw Error('INVALID_DATA');return rows}
 async function load({force=false}={}){if(!key||busy||loading||(!force&&document.querySelector('dialog[open]')))return;loading=true;try{const data=await request({op:'read'});const rows=check(data.agencies);revision=data.revision;api.onData?.(rows);ready=true;$('#syncLinkPanel').classList.add('hidden');state('✓ Supabase 已同步 · '+new Date(data.updated_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}));}catch(e){ready=false;state(problem(e)+'　請按重新同步。');if(e.code==='INVALID_LINK')$('#syncLinkPanel').classList.remove('hidden')}finally{loading=false}}
 api.save=async rows=>{if(!ready||busy||loading)throw Error('尚未完成同步，請稍候或按「重新同步」。');check(rows);busy=true;$('#saveOverlay').classList.remove('hidden');state('正在儲存至 Supabase…');try{const data=await request({op:'save',agencies:rows,expectedRevision:revision});revision=data.revision;state('✓ 已儲存至 Supabase · '+new Date(data.updated_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}));}catch(e){ready=false;state(problem(e));throw Error(problem(e))}finally{busy=false;$('#saveOverlay').classList.add('hidden')}};
 function useKey(k){key=k;ready=false;revision=0;api.onData?.([]);try{localStorage.setItem(KEY,key)}catch{}history.replaceState(null,'',location.pathname+location.search+'#sync='+key);return load({force:true})}
 api.start=async()=>{
 $('#sync').onclick=()=>load({force:true});$('#openSyncLink').onclick=()=>{let k='';try{k=new URLSearchParams(new URL($('#syncLinkInput').value).hash.slice(1)).get('sync')||''}catch{}if(!/^[0-9a-f]{64}$/.test(k)){state('請貼上完整的專屬同步網址，包含 #sync= 後面的內容。');return}useKey(k)};
 $('#copyLink').onclick=async()=>{if(!key)return state('請先開啟專屬同步網址。');try{await navigator.clipboard.writeText(location.href);state('✓ 專屬同步網址已複製，可在你的另一台裝置開啟。')}catch{state('請從網址列複製完整網址，包含 #sync= 後面的內容。')}};
 window.addEventListener('focus',()=>load());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});setInterval(()=>{if(document.visibilityState==='visible')load()},15000);
 let k=new URLSearchParams(location.hash.slice(1)).get('sync')||'';if(!k)try{k=localStorage.getItem(KEY)||''}catch{}
 if(/^[0-9a-f]{64}$/.test(k))await useKey(k);else{$('#syncLinkPanel').classList.remove('hidden');state('請使用你的專屬同步網址開啟。無需登入。')}
 };
 return api;
})();
