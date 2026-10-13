/* TourFlow client app. Static-only + optional Supabase, no service-role/secret keys. */
(()=>{'use strict';
const $=id=>document.getElementById(id),P=window.TourFlowPlanner,A=window.TourFlowAccess;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='tourflow-trips-v1',configKey='tourflow-sb-config-v1',draftKey='tourflow-draft-v1',googleKeyStorage='tourflow-google-browser-key-v1';
let draftTimer=null, googleLoader=null, googleMap=null, googleRoutesLib=null, googleRenderedPolylines=[], googleRenderedMarkers=[];
// Public project configuration; never put service_role / secret keys in frontend.
const DEFAULT_SUPABASE={url:'https://oafoxkpepuldeaaraxcm.supabase.co',key:'sb_publishable_pmftI3EMAq-zFYHIpMdpjA_u9lp1jJT'};
const PRESETS={'45':[3.8,2.5,12,18],'30':[3.3,2.45,9,12],'20':[2.9,2.2,7,7]};
let locationAudits=new Map(),stops=[],risks=[],map,routeLayer,markerLayer,riskLayer,latestRoute=null,latestMatrix=null,pendingOptimization=null,previousOrder=null,cloudClient=null,cloudUser=null,selectedCloudId=null,working=false;let coordinatesCache=new Map();
const uid=()=>Math.random().toString(36).slice(2,11);
const example=()=>[
 {id:uid(),name:'桃園市龜山區公所',stay:0,locked:true,earliest:'',latest:''},
 {id:uid(),name:'南投縣鹿谷鄉溪頭自然教育園區',stay:150,locked:false,earliest:'',latest:''},
 {id:uid(),name:'南投縣鹿谷鄉溪頭妖怪村',stay:60,locked:false,earliest:'',latest:''},
 {id:uid(),name:'桃園市龜山區公所',stay:0,locked:true,earliest:'',latest:''}
];
function setStatus(text,type='neutral'){$('status').textContent=text;$('status').className='status '+type}
function cloudStatus(text){$('cloud-message').textContent=text}
function setWorking(value){working=value;for(let id of ['plan-btn','opt-btn','apply-opt'])$(id).disabled=value;if(!value)$('scan-risk').disabled=!latestRoute}
function clearResult(){latestRoute=null;latestMatrix=null;pendingOptimization=null;$('compare-panel').classList.add('is-hidden');$('scan-risk').disabled=true;$('metric-km').textContent='—';$('metric-drive').textContent='—';$('metric-total').textContent='—';$('metric-end').textContent='—';$('timeline-body').innerHTML='<tr><td colspan="5" class="placeholder">站點已更動，請重新計算路線。</td></tr>';$('timeline-caption').textContent='需要重新計算';$('warnings').innerHTML='';$('location-audit').innerHTML='';$('risk-summary').textContent='站點已更動，尚未查詢當前路線限制。';$('risk-list').innerHTML='';if(routeLayer)routeLayer.clearLayers();if(markerLayer)markerLayer.clearLayers();if(riskLayer)riskLayer.clearLayers();if(googleMap)clearGoogleMap();$('map-mode').textContent='等待重新規劃'}
function invalidate(){clearResult();$('restore-btn').disabled=!previousOrder;scheduleDraft()}
function makeStop(name='',stay=40){return {id:uid(),name,stay,locked:false,earliest:'',latest:''}}
function renderStops(){stops[0].locked=true;stops[stops.length-1].locked=true;$('stop-count').textContent=stops.length+' 站';$('stop-list').innerHTML=stops.map((s,i)=>{let boundary=i===0||i===stops.length-1;return `<div class="stop-card" data-stop="${esc(s.id)}"><div class="stop-top"><span class="stop-number">${i+1}</span><strong>${i===0?'出發地':i===stops.length-1?'終點':'停靠點 '+i}</strong><div class="stop-tools"><button class="icon-btn" data-act="up" title="上移" ${boundary||i===1?'disabled':''}>↑</button><button class="icon-btn" data-act="down" title="下移" ${boundary||i===stops.length-2?'disabled':''}>↓</button><button class="icon-btn" data-act="del" title="刪除" ${boundary?'disabled':''}>✕</button></div></div><div class="stop-fields"><label>景點／完整地名<input data-field="name" value="${esc(s.name)}" maxlength="150" placeholder="輸入縣市與景點名稱" /></label><label>停留分鐘<input data-field="stay" type="number" min="0" max="1440" value="${Number(s.stay)||0}" /></label></div><div class="stop-bottom"><label>最早抵達<input data-field="earliest" type="time" value="${esc(s.earliest||'')}" /></label><label>最晚抵達<input data-field="latest" type="time" value="${esc(s.latest||'')}" /></label></div><div style="display:flex;justify-content:flex-end;margin-top:9px"><label class="stop-lock"><input data-field="locked" type="checkbox" ${s.locked?'checked':''} ${boundary?'disabled':''}/>固定在第 ${i+1} 站${boundary?'（起終點固定）':''}</label></div></div>`}).join('')}
function readForm(){let data={title:$('trip-name').value.trim()||'未命名行程',departure:$('departure').value||'07:30',tripDate:$('trip-date').value||'',provider:$('provider').value,vehicle:$('vehicle').value,buffer:Number($('buffer').value),limit:Number($('day-limit').value),height:Number($('v-height').value),width:Number($('v-width').value),length:Number($('v-length').value),weight:Number($('v-weight').value),stops:stops.map(({id,name,stay,locked,earliest,latest})=>({id,name,stay,locked,earliest,latest})),risks:[...risks]};return data}
function loadForm(data){if(!data||!Array.isArray(data.stops)||data.stops.length<2||data.stops.length>10)throw Error('行程資料格式不正確');for(let [id,val] of [['trip-name',data.title],['departure',data.departure],['trip-date',data.tripDate],['provider',data.provider],['vehicle',data.vehicle],['buffer',data.buffer],['day-limit',data.limit],['v-height',data.height],['v-width',data.width],['v-length',data.length],['v-weight',data.weight]])if(val!==undefined&&val!==null)$(id).value=val;stops=data.stops.map(s=>({id:s.id||uid(),name:String(s.name||''),stay:Math.max(0,Number(s.stay)||0),locked:!!s.locked,earliest:s.earliest||'',latest:s.latest||''}));risks=(data.risks||[]).filter(s=>typeof s==='string').slice(0,100);renderStops();renderManualRisks();showProviderSettings();previousOrder=null;invalidate()}
function vehicle(){const v={height:Number($('v-height').value),width:Number($('v-width').value),length:Number($('v-length').value),weight:Number($('v-weight').value)};for(let [key,value] of Object.entries(v))if(!Number.isFinite(value)||value<=0)throw Error('車輛規格無效：'+key);return v}
function validate(){if(stops.length<2||stops.length>10)throw Error('請使用 2～10 個站點');for(const s of stops){if(!s.name.trim())throw Error('有站點尚未填寫名稱');if(A.isVagueRegion(s.name))throw Error('「'+s.name+'」只是行政區，不是實際上下車點。請改成餐廳、景點或詳細地址，否則地圖會定位到鄉鎮中心。');if(!Number.isFinite(Number(s.stay))||Number(s.stay)<0||Number(s.stay)>1440)throw Error('停留時間需在 0～1440 分鐘');if(s.earliest&&!Number.isFinite(P.parseTime(s.earliest)))throw Error('最早抵達時間格式錯誤');if(s.latest&&!Number.isFinite(P.parseTime(s.latest)))throw Error('最晚抵達時間格式錯誤');if(s.earliest&&s.latest&&P.parseTime(s.earliest)>P.parseTime(s.latest))throw Error('站點「'+s.name+'」的最早時間晚於最晚時間')}vehicle();if(!Number.isFinite(P.parseTime($('departure').value)))throw Error('出發時間無效')}
function showTime(min){return Math.round(min)+' 分'}
function snapStopNames(){return stops.map(s=>s.name).join(' → ')}
function processTimeline(segments,source){const departure=P.parseTime($('departure').value),factor=Number($('buffer').value);const result=P.scheduleFromSegments(stops,segments,departure,factor);if(!result.valid)throw Error('時間表建立失敗');$('metric-km').textContent=P.routeKm(segments).toFixed(1);$('metric-drive').textContent=showTime(result.driving);$('metric-total').textContent=(result.total/60).toFixed(1)+' h';$('metric-end').textContent=P.hhmm(result.end);$('timeline-caption').textContent=source;$('timeline-body').innerHTML=result.rows.map((r,i)=>`<tr><td><strong>${i+1}. ${esc(r.name)}</strong></td><td>${i?(r.mode==='walk'?'步行約 '+Math.round(r.leg)+' 分':showTime(r.leg)):'—'}</td><td>${P.hhmm(r.arrive)}</td><td>${r.stay} 分${r.wait?' (+等待 '+Math.round(r.wait)+')':''}</td><td>${P.hhmm(r.leave)}</td></tr>`).join('');const messages=[...result.violations];if(result.walking>0)messages.push('鄰近景點使用同一上下車參考區域，之間安排步行約 '+Math.round(result.walking)+' 分；這段不是遊覽車開車時間。');const lim=Number($('day-limit').value)*60;if(result.total>lim)messages.push('行程總時數 '+(result.total/60).toFixed(1)+' 小時，超過自訂提醒值 '+$('day-limit').value+' 小時。');$('warnings').innerHTML=messages.map(x=>`<div class="timing-warning">⚠ ${esc(x)}</div>`).join('');return result}
// Local-first: no email, login or Supabase request is required to plan trips.
function saveDraft(){try{localStorage.setItem(draftKey,JSON.stringify(readForm()))}catch(e){setStatus('草稿儲存失敗；請下載 JSON 備份。','warn')}}
function scheduleDraft(){if(draftTimer)clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,250)}
function restoreDraft(){try{const data=JSON.parse(localStorage.getItem(draftKey)||'null');if(data){loadForm(data);return true}}catch(e){console.warn('Cannot restore local draft',e)}return false}
function downloadBackup(){
 try{
  const payload={format:'tourflow-local-backup',version:1,exportedAt:new Date().toISOString(),trips:localRecords(),draft:readForm()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='TourFlow-行程備份-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);cloudStatus('已匯出 '+payload.trips.length+' 筆本機行程及目前草稿。請妥善保管備份檔。');
 }catch(e){cloudStatus('備份失敗：'+e.message)}
}
function validateBackupTrip(value){
 if(!value||typeof value!=='object'||typeof value.title!=='string'||value.title.length>100||!Array.isArray(value.stops)||value.stops.length<2||value.stops.length>10)throw Error('備份內有無效行程');
 const time=x=>typeof x==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x)?x:'';
 const n=(v,floor,ceiling,fallback)=>Number.isFinite(Number(v))?Math.max(floor,Math.min(ceiling,Number(v))):fallback;
 return {title:value.title.slice(0,100)||'未命名行程',departure:time(value.departure)||'07:30',tripDate:typeof value.tripDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.tripDate)?value.tripDate:'',provider:['ors','osrm','google'].includes(value.provider)?value.provider:'osrm',vehicle:['20','30','45','custom'].includes(value.vehicle)?value.vehicle:'45',buffer:n(value.buffer,1,2,1.15),limit:n(value.limit,1,24,11),height:n(value.height,1,5,3.8),width:n(value.width,1,3,2.5),length:n(value.length,2,20,12),weight:n(value.weight,1,40,18),stops:value.stops.map(s=>({id:String(s.id||uid()).slice(0,40),name:String(s.name||'').slice(0,150),stay:n(s.stay,0,1440,0),locked:!!s.locked,earliest:time(s.earliest),latest:time(s.latest)})),risks:Array.isArray(value.risks)?value.risks.filter(s=>typeof s==='string').slice(0,100).map(s=>s.slice(0,120)):[]};
}
async function importBackup(file){
 if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('備份超過 2 MB 上限');
  const payload=JSON.parse(await file.text());
  if(payload?.format!=='tourflow-local-backup'||payload.version!==1||!Array.isArray(payload.trips)||payload.trips.length>60)throw Error('不支援的備份格式或版本');
  const restored=payload.trips.map(validateBackupTrip),draft=payload.draft?validateBackupTrip(payload.draft):null;
  const existing=localRecords(),same=new Set(existing.map(r=>r.title));const overwrites=restored.filter(r=>same.has(r.title)).length;
  if(!window.confirm('匯入 '+restored.length+' 筆行程'+(overwrites?'，其中 '+overwrites+' 筆同名行程會覆蓋本機紀錄':'')+'。要繼續嗎？'))return;
  const map=new Map(existing.map(r=>[r.title,r]));for(const trip of restored)map.set(trip.title,trip);
  localStorage.setItem(storageKey,JSON.stringify([...map.values()].slice(-60)));
  if(draft){loadForm(draft);saveDraft()}
  renderLocalRecords();cloudStatus('已匯入 '+restored.length+' 筆行程'+(draft?'及備份草稿':'')+'，資料已存到此瀏覽器。');
 }catch(e){cloudStatus('無法匯入備份：'+e.message)}finally{$('backup-file').value=''}
}
function localRecords(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []}}
function persistLocal(){const data=readForm(),records=localRecords(),idx=records.findIndex(r=>r.title===data.title);if(idx>=0)records[idx]=data;else records.push(data);localStorage.setItem(storageKey,JSON.stringify(records.slice(-60)));saveDraft();renderLocalRecords();setStatus('已儲存到此裝置。可從「行程管理」下載備份；免登入不會跨裝置同步。','ok')}
function renderLocalRecords(){const records=localRecords();$('local-trip-list').innerHTML='<option value="">選擇本機行程（'+records.length+' 筆）</option>'+records.map((r,i)=>`<option value="${i}">${esc(r.title||'未命名行程')}</option>`).join('')}
function localLoad(){const index=$('local-trip-list').value;if(index==='')return cloudStatus('請先選擇本機行程。');try{loadForm(localRecords()[Number(index)]);$('cloud-dialog').close();setStatus('已讀取本機行程，請重新計算路線。','ok')}catch(e){cloudStatus('讀取失敗：'+e.message)}}
function localDelete(){const index=$('local-trip-list').value;if(index==='')return cloudStatus('請先選擇本機行程。');if(!window.confirm('確定刪除本機這筆行程？'))return;const records=localRecords();records.splice(Number(index),1);localStorage.setItem(storageKey,JSON.stringify(records));renderLocalRecords();cloudStatus('已刪除本機行程。')}
function renderManualRisks(){$('manual-risks').innerHTML=risks.map((r,i)=>`<div class="manual-item"><span>${esc(r)}</span><button data-remove-risk="${i}" class="icon-btn" title="刪除備註">✕</button></div>`).join('')}
function initMap(){if(typeof L==='undefined'){setStatus('地圖套件無法載入，請確認網路連線。','error');return}map=L.map('map',{zoomControl:true}).setView([23.8,120.98],7);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);routeLayer=L.layerGroup().addTo(map);markerLayer=L.layerGroup().addTo(map);riskLayer=L.layerGroup().addTo(map);requestAnimationFrame(()=>map.invalidateSize({pan:false}));window.addEventListener('load',()=>map&&map.invalidateSize({pan:false}),{once:true});if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{if(map)requestAnimationFrame(()=>map.invalidateSize({pan:false}))});observer.observe($('map'))}}
const sleep=t=>new Promise(r=>setTimeout(r,t));
function audit(name,coord,label,note=''){
 locationAudits.set(name.trim().toLowerCase(),{coordinates:coord,label,note});
}
function locationAuditMarkup(data,coords){
 const lines=stops.map((stop,i)=>{
   const ref=locationAudits.get(stop.name.trim().toLowerCase());
   const known=A.known(stop.name);
   const snap=data.snapOffsets?.[i];
   let label=ref?.label|| (data.provider==='google'?'Google 路線的道路起訖點':'尚無入口資料');
   let note=ref?.note||'';
   if(known){label=known.label;note=known.source+'；景點入口：'+known.entranceLabel+'（'+known.entrance[1].toFixed(5)+', '+known.entrance[0].toFixed(5)+'）。遊覽車是否可停靠另行確認';}
   if(snap!=null&&snap>250)note+='；道路吸附偏移約 '+Math.round(snap)+' 公尺，請確認真正入口';
   const actual=data.accessCoords?.[i]||coords?.[i]||ref?.coordinates;const coordText=Array.isArray(actual)&&actual.length===2&&actual.every(Number.isFinite)?' · '+actual[1].toFixed(5)+', '+actual[0].toFixed(5):'';
   return '<div class="audit-item"><strong>'+esc(i+1+'. '+stop.name)+'</strong><span>'+esc(label+coordText)+'</span>'+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
 });
 $('location-audit').innerHTML='<h3>各站實際路由定位點（不是景點中心）</h3>'+lines.join('');
}
async function geocode(name){
 const key=name.trim().toLowerCase(),known=A.known(name);
 if(known){const coords=[known.lon,known.lat];audit(name,coords,known.label,known.source);return coords;}
 if(coordinatesCache.has(key))return coordinatesCache.get(key);
 let cache={};try{cache=JSON.parse(sessionStorage.getItem('tf-geocode-v2')||'{}')}catch{}
 if(cache[key]?.coordinates){const item=cache[key];coordinatesCache.set(key,item.coordinates);audit(name,item.coordinates,item.label,item.note);return item.coordinates}
 const url='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:name,format:'jsonv2',countrycodes:'tw',limit:'3',entrances:'1',addressdetails:'1','accept-language':'zh-TW'});
 const response=await fetch(url,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('地點查詢失敗 HTTP '+response.status+'，請稍後再試');
 const arr=await response.json();if(!arr.length)throw Error('查不到地點「'+name+'」；請輸入縣市與景點入口／完整地址');
 const place=arr.find(x=>!['administrative','county','state','municipality'].includes(x.type))||arr[0];
 const entrance=A.chooseEntrance(place),coords=entrance||[Number(place.lon),Number(place.lat)];
 if(coords.some(x=>!Number.isFinite(x)))throw Error('「'+name+'」座標資料不完整。');
 let note=entrance?'已優先採用 OpenStreetMap 註記的建物／園區入口':'地圖未提供可辨識的入口，採用候選位置；必須核對上下車點';
 if(!entrance&&Array.isArray(place.boundingbox)&&place.boundingbox.length===4){
  const box=place.boundingbox.map(Number);
  if(box.every(Number.isFinite)){
   const diagonal=A.haversineMeters([box[2],box[0]],[box[3],box[1]]);
   if(diagonal>1200&&/park|forest|nature_reserve|wood|protected_area|boundary|natural/.test(String(place.type)+' '+String(place.class)))
    throw Error('「'+name+'」是大型區域（約 '+Math.round(diagonal)+' 公尺範圍），但沒有找到已標記的入口。請改輸入「售票處／停車場／主要入口」名稱，避免誤定位到山中央。');
  }
 }
 const item={coordinates:coords,label:entrance?'OSM 園區入口':'OSM 搜尋結果（非入口確認）',note};
 cache[key]=item;coordinatesCache.set(key,coords);audit(name,coords,item.label,item.note);
 try{sessionStorage.setItem('tf-geocode-v2',JSON.stringify(cache))}catch{}
 return coords;
}
async function locateAll(){let coords=[];for(let i=0;i<stops.length;i++){setStatus('正在搜尋地點 '+(i+1)+' / '+stops.length+'：'+stops[i].name);let key=stops[i].name.trim().toLowerCase();const exists=coordinatesCache.has(key);coords.push(await geocode(stops[i].name));if(!exists&&i!==stops.length-1)await sleep(1100)}return coords}
function urlCoords(coords){return coords.map(c=>c.join(',')).join(';')}
async function getMatrix(coords){
 const plan=A.plan(stops.map(s=>s.name),coords);
 const url='https://router.project-osrm.org/table/v1/driving/'+urlCoords(plan.coordinates)+'?annotations=duration';
 // Distinct places can share a parking/transfer district, but walking is not a vehicle route.
 if(plan.coordinates.length===1)return stops.map((s,i)=>stops.map((t,j)=>i===j?0:A.isTransfer(s.name,t.name)?A.WALK_MINUTES:0));
 const response=await fetch(url);if(!response.ok)throw Error('距離矩陣服務暫時無法使用 HTTP '+response.status);
 const json=await response.json();if(json.code!=='Ok'||!Array.isArray(json.durations))throw Error('路網矩陣無回應，請稍後再試');
 const full=stops.map((src,i)=>stops.map((dst,j)=>{
   if(i===j)return 0;
   if(A.isTransfer(src.name,dst.name))return A.WALK_MINUTES;
   const pi=plan.indices.findIndex(idx=>idx<=i&& (plan.indices[plan.indices.indexOf(idx)+1]??Infinity)>i);
   const pj=plan.indices.findIndex(idx=>idx<=j&& (plan.indices[plan.indices.indexOf(idx)+1]??Infinity)>j);
   const result=json.durations[pi]?.[pj];return result==null?Infinity:result/60;
 }));
 return full;
}
// Google Maps JavaScript Routes API; a browser-restricted key is entered once, never hardcoded in a public repository.
function showProviderSettings(){
 const provider=$('provider').value;
 $('ors-settings').classList.toggle('is-hidden',provider!=='ors');
 $('google-settings').classList.toggle('is-hidden',provider!=='google');
 if(provider!=='google')showBaseMap();
}
function googleStoredKey(){try{return localStorage.getItem(googleKeyStorage)||''}catch{return ''}}
function saveGoogleKey(){
 const key=$('google-key').value.trim();
 if(!/^[A-Za-z0-9_-]{20,}$/.test(key)){setStatus('請輸入有效的 Google Maps Platform API Key。不是 Google 登入密碼。','warn');return}
 try{localStorage.setItem(googleKeyStorage,key)}catch{setStatus('此瀏覽器無法儲存金鑰，請檢查無痕模式或儲存空間。','warn');return}
 setStatus('Google 瀏覽器金鑰已保存在這台裝置；請按「計算目前路線」自動查車程。請先於 Google Cloud 設定 HTTP 來源網域及 API 配額。','ok');
}
function googleDepartureTime(){
 const date=$('trip-date').value,time=$('departure').value;
 if(!date||!time)return null;
 // TourFlow currently focuses on Taiwan itineraries, explicitly interpret 07:30 in GMT+08:00.
 const dt=new Date(`${date}T${time}:00+08:00`);
 return Number.isFinite(dt.getTime())&&dt.getTime()>Date.now()+60000?dt:null;
}
async function loadGoogleMaps(){
 if(window.google?.maps?.importLibrary)return window.google.maps;
 if(googleLoader)return googleLoader;
 const key=$('google-key').value.trim()||googleStoredKey();
 if(!key)throw Error('Google 自動估時需先設定一次 Google Maps API Key，之後無須手動填寫車程。');
 googleLoader=new Promise((resolve,reject)=>{
  const previousAuthFailure=window.gm_authFailure;
  const script=document.createElement('script');
  let done=false;
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);delete window.__tourflowGoogleReady;
   if(error){googleLoader=null;reject(error)}else resolve(window.google.maps);
  };
  const timer=setTimeout(()=>finish(Error('Google 地圖載入逾時，請檢查 API Key、網域權限及網路。')),18000);
  window.__tourflowGoogleReady=()=>finish();
  window.gm_authFailure=()=>{if(typeof previousAuthFailure==='function')previousAuthFailure();finish(Error('Google Maps API Key 授權失敗，請確認帳單、網域限制與 Maps JavaScript API。'))};
  script.onerror=()=>finish(Error('Google 地圖載入失敗，請確認網路及 API 授權。'));
  script.async=true;
  script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,v:'weekly',language:'zh-TW',region:'TW',loading:'async',callback:'__tourflowGoogleReady'});
  document.head.appendChild(script);
 });
 return googleLoader;
}
function showBaseMap(){
 $('google-map').classList.add('is-hidden');$('map').classList.remove('is-hidden');
 if(map)requestAnimationFrame(()=>map.invalidateSize({pan:false}));
}
function showGoogleBaseMap(){
 $('map').classList.add('is-hidden');$('google-map').classList.remove('is-hidden');
}
async function ensureGoogleMap(){
 await loadGoogleMaps();
 const [{Map},routesLib]=await Promise.all([google.maps.importLibrary('maps'),google.maps.importLibrary('routes')]);
 googleRoutesLib=routesLib;
 if(!googleMap){showGoogleBaseMap();googleMap=new Map($('google-map'),{center:{lat:23.8,lng:120.98},zoom:7,mapTypeControl:false,streetViewControl:false})}
 return googleMap;
}
function clearGoogleMap(){
 for(const layer of googleRenderedPolylines)layer.setMap(null);
 for(const marker of googleRenderedMarkers)marker.setMap(null);
 googleRenderedPolylines=[];googleRenderedMarkers=[];
}
function pointLiteral(loc){
 if(!loc)return null;
 const lat=typeof loc.lat==='function'?loc.lat():loc.lat;
 const lng=typeof loc.lng==='function'?loc.lng():loc.lng;
 return Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))?{lat:Number(lat),lng:Number(lng)}:null;
}
function drawGoogleMapRoute(route,coordinates){
 clearGoogleMap();showGoogleBaseMap();
 googleRenderedPolylines=route.createPolylines();
 for(const line of googleRenderedPolylines){line.setOptions({strokeColor:'#127b74',strokeWeight:5,strokeOpacity:.9});line.setMap(googleMap)}
 const bounds=new google.maps.LatLngBounds();
 for(const p of route.path){bounds.extend(p)}
 const indices=A.plan(stops.map(s=>s.name)).indices;
 const ends=[route.legs?.[0]?.startLocation,...(route.legs||[]).map(leg=>leg.endLocation)];
 if(!route.legs?.length&&route.path?.length)ends[0]=route.path[0];
 ends.forEach((loc,i)=>{
  const point=pointLiteral(loc);if(!point)return;
  const begin=indices[i]??i,end=(indices[i+1]??stops.length);
  const labels=stops.slice(begin,end).map((stop,j)=>(begin+j+1)+'. '+stop.name);
  googleRenderedMarkers.push(new google.maps.Marker({map:googleMap,position:point,title:labels.join('、'),label:labels.length>1?String(begin+1)+'/'+String(end):String(begin+1)}));
 });
 for(let i=0;i<stops.length;i++){const known=A.known(stops[i].name);if(!known?.entrance)continue;const position={lat:known.entrance[1],lng:known.entrance[0]};bounds.extend(position);googleRenderedMarkers.push(new google.maps.Marker({map:googleMap,position,title:(i+1)+'. '+known.entranceLabel,label:String(i+1)+'門'}));}
 googleMap.fitBounds(bounds,35);
}
function googleStopLocation(name){const loc=A.known(name);return loc?{lat:loc.lat,lng:loc.lon}:name;}
async function computeGoogleRoute(){
 await ensureGoogleMap();
 const names=stops.map(s=>s.name),routePlan=A.plan(names);
 const indices=routePlan.indices;
 const departure=googleDepartureTime();
 if(indices.length===1){
  const loc=A.known(names[0]);if(!loc)throw Error('沒有可計算的車輛移動路線');
  const point={lat:loc.lat,lng:loc.lon};
  const route={path:[point],legs:[],createPolylines:()=>[]};
  return {route,data:{segments:A.expand(names,[]),coordinates:[[loc.lon,loc.lat]],source:'同一入口附近：旅客步行銜接，不需安排移車',provider:'google',accessCoords:stops.map(()=>[loc.lon,loc.lat])},stopsCoords:stops.map(()=>[loc.lon,loc.lat])};
 }
 const points=indices.map(i=>googleStopLocation(names[i]));
 const request={origin:points[0],destination:points[points.length-1],
  intermediates:points.slice(1,-1).map(location=>({location})),
  travelMode:'DRIVING',region:'tw',language:'zh-TW',fields:['path','legs','durationMillis','distanceMeters'],
  routingPreference:departure?'TRAFFIC_AWARE':'TRAFFIC_UNAWARE'};
 if(departure)request.departureTime=departure;
 const response=await googleRoutesLib.Route.computeRoutes(request);
 const route=response?.routes?.[0];
 if(!route||!Array.isArray(route.legs)||route.legs.length!==indices.length-1||!route.path?.length)throw Error('Google 找不到完整路線，請確認所有站點名稱。');
 const driving=route.legs.map(leg=>({km:leg.distanceMeters/1000,minutes:leg.durationMillis/60000}));
 if(driving.some(v=>!Number.isFinite(v.km)||!Number.isFinite(v.minutes)))throw Error('Google 路線缺少距離或時間資訊。');
 const segments=A.expand(names,driving);
 const coordinates=route.path.map(p=>[typeof p.lng==='function'?p.lng():p.lng,typeof p.lat==='function'?p.lat():p.lat]);
 const places=[route.legs[0]?.startLocation,...route.legs.map(leg=>leg.endLocation)].map(pointLiteral);
 const coords=stops.map((stop,i)=>{
  const index=indices.findIndex((v,j)=>v<=i&&(indices[j+1]??Infinity)>i);
  const point=places[index]||pointLiteral(A.known(stop.name));
  return point?[point.lng,point.lat]:null;
 });
 return {route,data:{segments,coordinates,accessCoords:coords,source:departure?'Google Maps 預測路況車程（非遊覽車通行保證）':'Google Maps 一般車路網車程（不含即時路況）',provider:'google'},stopsCoords:coords};
}
async function computeGoogleMatrix(){
 await ensureGoogleMap();
 const names=stops.map(s=>s.name),departure=googleDepartureTime();
 const unique=[],keys=[],index=[];
 for(const name of names){const loc=A.known(name),key=loc?loc.key:'name:'+name.trim().toLowerCase();let at=keys.indexOf(key);if(at<0){at=keys.push(key)-1;unique.push(googleStopLocation(name));}index.push(at)}
 if(unique.length===1)return names.map((n,i)=>names.map((m,j)=>i===j?0:A.isTransfer(n,m)?A.WALK_MINUTES:0));
 const request={origins:unique,destinations:unique,travelMode:'DRIVING',region:'tw',language:'zh-TW',
   routingPreference:departure?'TRAFFIC_AWARE':'TRAFFIC_UNAWARE',fields:['durationMillis','condition']};
 if(departure)request.departureTime=departure;
 const response=await googleRoutesLib.RouteMatrix.computeRouteMatrix(request);
 const rows=response?.matrix?.rows;
 if(!Array.isArray(rows)||rows.length!==unique.length)throw Error('Google 時間矩陣未回傳完整資料。');
 return names.map((n,i)=>names.map((m,j)=>{
  if(i===j)return 0;
  if(A.isTransfer(n,m))return A.WALK_MINUTES;
  if(index[i]===index[j])return 0;
  const item=rows[index[i]]?.items?.[index[j]];
  return item?.condition==='ROUTE_EXISTS'&&Number.isFinite(item.durationMillis)?item.durationMillis/60000:Infinity;
 }));
}
async function getCarRoute(coords){
 const names=stops.map(s=>s.name),routing=A.plan(names,coords);
 if(routing.coordinates.length===1)return {segments:A.expand(names,[]),coordinates:[routing.coordinates[0]],accessCoords:coords,source:'同區步行銜接（沒有重複駕車）'};
 const url='https://router.project-osrm.org/route/v1/driving/'+urlCoords(routing.coordinates)+'?overview=full&geometries=geojson&steps=false';
 const r=await fetch(url);if(!r.ok)throw Error('免費路線服務 HTTP '+r.status);
 const j=await r.json();if(j.code!=='Ok'||!j.routes?.length)throw Error('路線無法完成，請確認地點是否可由道路到達');
 const route=j.routes[0],segments=A.expand(names,route.legs.map(x=>({km:x.distance/1000,minutes:x.duration/60})));
 const snapped=(j.waypoints||[]).map(w=>Number(w.distance)||0);
 if(snapped.some(m=>m>900))throw Error('有站點離可行駛道路超過900公尺，疑似定位在園區深處或山中央；請使用入口／停車場名稱後重算。');
 const accessCoords=coords.map((c,i)=>{const idx=routing.indices.findIndex((val,j)=>val<=i&&(routing.indices[j+1]??Infinity)>i);return j.waypoints?.[idx]?.location||c});
 const snapOffsets=coords.map((c,i)=>{const idx=routing.indices.findIndex((val,j)=>val<=i&&(routing.indices[j+1]??Infinity)>i);return snapped[idx]||0});
 return {segments,coordinates:route.geometry.coordinates,accessCoords,snapOffsets,source:'OSRM 免費粗估（無即時路況，不是 Google 車程）'};
}
async function getHgvRoute(coords){const names=stops.map(s=>s.name),routing=A.plan(names,coords);if(routing.coordinates.length===1)return {segments:A.expand(names,[]),coordinates:[routing.coordinates[0]],accessCoords:coords,source:'同區步行銜接（無額外車程）'};coords=routing.coordinates;if(cloudClient&&cloudUser){try{const {data,error}=await cloudClient.functions.invoke('coach-route',{body:{coordinates:coords,vehicle:vehicle()}});if(!error&&data?.features?.[0])return expandOrsRoute(convertOrs(data.features[0]),names,routing);if(!error&&data?.error)throw Error(data.error)}catch(e){console.warn('Edge function unavailable, checking session ORS key:',e)}}const key=$('ors-key').value.trim();if(!key)throw Error('大型車路由需要 ORS Key；請填寫 Key 或先切換成「快速估算」');const res=await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',{method:'POST',headers:{Authorization:key,'Content-Type':'application/json'},body:JSON.stringify({coordinates:coords,instructions:false,options:{vehicle_type:'bus',profile_params:{restrictions:vehicle()}}})});const data=await res.json();if(!res.ok||!data.features?.length)throw Error('大型車路由失敗：'+(data.error?.message||data.message||res.status));return expandOrsRoute(convertOrs(data.features[0]),names,routing)}
function expandOrsRoute(data,names,routing){return {...data,segments:A.expand(names,data.segments),accessCoords:stops.map((s,i)=>routing.coordinates[routing.indices.findIndex((v,j)=>v<=i&&(routing.indices[j+1]??Infinity)>i)])};}
function convertOrs(feature){return{segments:feature.properties.segments.map(s=>({km:s.distance/1000,minutes:s.duration/60})),coordinates:feature.geometry.coordinates,source:'大型車條件路由＋緩衝（仍需核對通行限制）'}}
function displayRoute(data,coords,googleRoute=null){if(data.segments.length!==stops.length-1)throw Error('路由段數與站點數不一致');latestRoute=data;const latlngs=data.coordinates.map(c=>[c[1],c[0]]);coords=data.accessCoords||coords;if(data.provider==='google'){if(routeLayer)routeLayer.clearLayers();if(markerLayer)markerLayer.clearLayers();if(riskLayer)riskLayer.clearLayers();drawGoogleMapRoute(googleRoute,coords)}else if(routeLayer){showBaseMap();routeLayer.clearLayers();markerLayer.clearLayers();riskLayer.clearLayers();routeLayer.addLayer(L.polyline(latlngs,{color:'#137b74',weight:5,opacity:.9}));const dropPoints=new Set();coords.forEach((c,i)=>{const known=A.known(stops[i].name),point=known?.entrance||c,pin=[point[1],point[0]];markerLayer.addLayer(L.marker(pin,{icon:L.divIcon({className:known?'tourflow-gate-stop':'tourflow-map-stop',html:'<span>'+(i+1)+'</span>',iconSize:[30,30],iconAnchor:[15,15]})}).bindPopup('<b>'+esc(i+1+'. '+stops[i].name)+'</b><div>'+esc(known?.entranceLabel||'道路接近點')+'</div>'));if(known){const id=known.key;if(!dropPoints.has(id)){dropPoints.add(id);markerLayer.addLayer(L.marker([known.lat,known.lon],{icon:L.divIcon({className:'tourflow-coach-access',html:'<span>車</span>',iconSize:[30,30],iconAnchor:[15,15]})}).bindPopup('道路接近點：'+esc(known.label)+'。不代表遊覽車合法停靠。'))}}});(latlngs.length===1?map.setView(latlngs[0],16):map.fitBounds(L.latLngBounds(latlngs.concat(stops.map(s=>A.known(s.name)?.entrance).filter(Boolean).map(p=>[p[1],p[0]]))).pad(.1)))}$('map-mode').textContent=data.source;$('map-subtitle').textContent='景點入口（橘色）與道路接近點（綠色）分開標示；溪頭與妖怪村步行銜接。非司機導航。';$('scan-risk').disabled=false;$('risk-summary').textContent='沿線限制尚未查詢，所有未驗證路段仍可能存在限制。';$('risk-list').innerHTML='';processTimeline(data.segments,data.source);locationAuditMarkup(data,coords)}
async function plan(){try{validate();setWorking(true);const isGoogle=$('provider').value==='google';let coords=[],data,googleRoute=null;if(isGoogle){setStatus('Google Maps 正在自動查詢各站車程…');const response=await computeGoogleRoute();coords=response.stopsCoords;data=response.data;googleRoute=response.route}else{setStatus('正在定位所有景點…');coords=await locateAll();setStatus('正在取得路網路線，計算各站車程…');data=$('provider').value==='ors'?await getHgvRoute(coords):await getCarRoute(coords)}displayRoute(data,coords,googleRoute);pendingOptimization=null;$('compare-panel').classList.add('is-hidden');setStatus('路線計算完成。'+data.source+'。已把溪頭與妖怪村視為同區步行景點，避免假車程。其他站點請看「實際路由定位點」；免費 OSRM 不具 Google 的路況精度。','ok');if($('risk-mode').value==='auto')await scanRisk()}catch(e){setStatus(e.message||String(e),'error')}finally{setWorking(false)}}
async function optimizeRoute(){try{validate();setWorking(true);const isGoogle=$('provider').value==='google';setStatus(isGoogle?'Google Maps 正在自動比較景點間車程（時間矩陣）…':'正在定位與查詢各站之間的路網時間矩陣…');const coords=isGoogle?[]:await locateAll();const matrix=isGoogle?await computeGoogleMatrix():await getMatrix(coords);latestMatrix=matrix;const result=P.optimize(stops,matrix,P.parseTime($('departure').value),Number($('buffer').value));pendingOptimization={...result,coords};$('compare-panel').classList.remove('is-hidden');$('before-min').textContent=showTime(result.original.result.driving);$('after-min').textContent=showTime(result.optimized.result.driving);$('before-sequence').textContent=stops.map(s=>s.name).join(' → ');$('after-sequence').textContent=result.optimized.order.map(i=>stops[i].name).join(' → ');let diff=result.original.result.driving-result.optimized.result.driving;let notices=[];if(result.original.result.violations.length)notices.push('原行程有時間窗超時警示。');if(result.optimized.result.violations.length)notices.push('候選行程也有時間窗超時警示。');if(!result.changed)notices.push('目前順序已是固定位置下的最佳候選，或沒有可移動站點。');if(diff>0.1)notices.push('路網矩陣估算可節省約 '+Math.round(diff)+' 分鐘（含緩衝）；套用後會重新查路線。');if($('provider').value==='ors')notices.push('排序依一般車路網時間矩陣，套用後再按大型車條件重算；不保證結果同樣縮短。');if(isGoogle)notices.push('排序與路線同樣使用 Google Maps，但不代表大型車可通行，亦不保證即時路況。');notices.push('已比較 '+result.tested+' 種可調整排列；固定站點位置不變。');$('opt-explanation').textContent=notices.join(' ');$('compare-source').textContent=isGoogle?'Google Maps 自動車程矩陣 · 非大型車通行保證':'免費一般車路網矩陣 · 非安全驗證';$('apply-opt').disabled=!result.changed;setStatus('候選順序已算出。先檢視比較，再決定是否套用。','ok');$('compare-panel').scrollIntoView({block:'nearest',behavior:'smooth'})}catch(e){setStatus(e.message||String(e),'error')}finally{setWorking(false);if(pendingOptimization)$('apply-opt').disabled=!pendingOptimization.changed}}
async function applyOptimization(){if(!pendingOptimization)return;const {optimized}=pendingOptimization;if(!optimized.changed)return;previousOrder=stops.map(s=>s.id);const old=[...stops];stops=optimized.order.map(i=>old[i]);renderStops();invalidate();setStatus('已套用優化順序，正在重新計算實際路線…');await plan();$('restore-btn').disabled=false}
function restore(){if(!previousOrder)return;const index=new Map(stops.map(s=>[s.id,s]));if(previousOrder.some(id=>!index.has(id)))return;stops=previousOrder.map(id=>index.get(id));previousOrder=null;renderStops();invalidate();setStatus('已還原原始站點順序。請重新計算路線。','neutral')}
function csvExport(){if(!latestRoute){setStatus('請先計算路線才能匯出 CSV。','warn');return}const result=P.scheduleFromSegments(stops,latestRoute.segments,P.parseTime($('departure').value),Number($('buffer').value));const lines=[['順序','站點','前段公里','前段車程（分鐘，含緩衝）','抵達','停留分鐘','離開','最早抵達','最晚抵達']];result.rows.forEach((r,i)=>lines.push([i+1,r.name,i?latestRoute.segments[i-1].km.toFixed(1):0,Math.round(r.leg),P.hhmm(r.arrive),r.stay,P.hhmm(r.leave),stops[i].earliest,stops[i].latest]));const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';const content='\ufeff'+lines.map(row=>row.map(quote).join(',')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=($('trip-name').value||'遊覽車行程')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
// OSM restrictions are candidates from samples near the route, not definitive road-segment topology checks.
function riskDescribe(t){return [['maxheight','限高'],['maxheight:physical','實體淨高'],['maxwidth','限寬'],['maxlength','限長'],['maxweight','限重'],['maxaxleload','限軸重'],['bus','大客車限制'],['psv','公共運輸限制'],['motorcoach','遊覽車限制'],['hgv','大型車限制'],['barrier','設施']].filter(([k])=>t[k]!=null).map(([k,name])=>name+'：'+t[k]).join('；')}
function limitValue(s){if(!s)return null;const v=String(s).trim().toLowerCase(),m=v.match(/\d+(?:[.,]\d+)?/);if(!m)return null;let num=Number(m[0].replace(',','.'));if(/feet|ft|'/.test(v))num*=.3048;else if(/inch|in\b|"/.test(v))num*=.0254;else if(/\bkg\b/.test(v))num/=1000;return num}
function riskLevel(tags,v){for(let [k,measure] of [['maxheight','height'],['maxheight:physical','height'],['maxwidth','width'],['maxlength','length'],['maxweight','weight']]){const val=limitValue(tags[k]);if(val!=null&&v[measure]>=val)return'danger'}if(['no','private'].some(x=>['bus','psv','motorcoach'].some(k=>tags[k]===x)))return'danger';return'caution'}
async function scanRisk(){if(!latestRoute)return;const btn=$('scan-risk');try{btn.disabled=true;$('risk-summary').textContent='正在查詢公開道路限制候選點，資料可能不完整…';const pts=latestRoute.coordinates;if(!pts?.length)throw Error('沒有路線幾何資料');if(pts.length<2){$('risk-summary').textContent='此段為同區景點步行銜接，沒有額外車輛路線可查；遊覽車上下車位置仍須確認。';return;}const samples=[];const n=Math.min(45,pts.length);for(let i=0;i<n;i++){const c=pts[Math.floor(i*(pts.length-1)/(n-1))];if(c&&!samples.some(s=>s[0]===c[0]&&s[1]===c[1]))samples.push(c)}const polyline=samples.map(c=>c[1].toFixed(5)+','+c[0].toFixed(5)).join(',');const filter='[~"^(maxheight|maxheight:physical|maxwidth|maxweight|maxlength|maxaxleload|bus|psv|motorcoach|hgv)$"~"."]';const query=`[out:json][timeout:25];(way(around:120,${polyline})${filter};node(around:120,${polyline})${filter};node(around:120,${polyline})[barrier=height_restrictor];);out center tags;`;const response=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query})});if(!response.ok)throw Error('公開限制查詢 HTTP '+response.status);const data=await response.json(),v=vehicle(),list=[],seen=new Set();if(riskLayer)riskLayer.clearLayers();for(const item of data.elements||[]){const id=item.type+'/'+item.id;if(seen.has(id))continue;seen.add(id);const tags=item.tags||{},lat=item.lat??item.center?.lat,lon=item.lon??item.center?.lon;if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const level=riskLevel(tags,v),name=tags.name||tags.ref||'未命名限制點',description=riskDescribe(tags)||'有限高設施但未記錄高度';list.push({id,name,description,level,lat,lon});if(riskLayer)riskLayer.addLayer(L.circleMarker([lat,lon],{color:level==='danger'?'#ba5446':'#c18842',radius:6,fillOpacity:.7}).bindPopup('<strong>'+esc(name)+'</strong><br>'+esc(description)))}list.sort((a,b)=>Number(b.level==='danger')-Number(a.level==='danger'));$('risk-list').innerHTML=list.slice(0,60).map(r=>`<div class="risk-item ${r.level==='danger'?'danger':''}"><strong>${r.level==='danger'?'可能衝突／請詢問車行':'沿線附近有限制紀錄'} · ${esc(r.name)}</strong>${esc(r.description)}<small>附近候選點；不保證位於實際行駛道路或相同行車方向</small><a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/${esc(r.id)}">查看 OSM 紀錄 ↗</a></div>`).join('');$('risk-summary').textContent='共查到 '+list.length+' 筆沿線附近候選限制（最多顯示 60 筆）。屬抽樣查詢、可能漏掉橋洞及道路限制；0 筆並不代表安全。';setStatus('公開候選道路限制查詢完成。結果僅供排團時提醒與人工複核。','ok')}catch(e){$('risk-summary').textContent='查詢失敗：'+(e.message||e)+'。道路限制仍全部視為待確認。';setStatus('行程計算保留，但公開道路資料暫時查不到。','warn')}finally{btn.disabled=false}}
function cloudConfig(){return JSON.parse(localStorage.getItem(configKey)||'{}')}
function setCloudConfig(url,key){localStorage.setItem(configKey,JSON.stringify({url,key}))}
async function connectCloud(){const url=$('sb-url').value.trim().replace(/\/$/,''),key=$('sb-key').value.trim();if(!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(url)||!/^sb_publishable_|^eyJ/.test(key)){cloudStatus('請輸入有效 Supabase Project URL 和 Publishable／舊版 anon Key。請勿輸入 secret/service_role。');return}if(/^sb_secret_/.test(key))return cloudStatus('禁止使用 Secret Key。');if(!window.supabase?.createClient)return cloudStatus('Supabase 套件未載入。請檢查網路。');cloudClient=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});setCloudConfig(url,key);const {data,error}=await cloudClient.auth.getUser();cloudUser=error?null:data?.user;cloudStatus(cloudUser?'已連線：'+cloudUser.email:'已連接雲端，請登入或註冊。');if(cloudUser)await refreshCloud()}
async function authenticate(signup){if(!cloudClient)return cloudStatus('請先連接 Supabase。');const email=$('sb-email').value.trim(),password=$('sb-password').value;if(!email||password.length<6)return cloudStatus('請輸入 Email 與至少 6 碼密碼。');const {data,error}=signup?await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}):await cloudClient.auth.signInWithPassword({email,password});if(error)return cloudStatus(error.message);cloudUser=data.user;cloudStatus(signup?'註冊已送出；若需信箱驗證，請先點擊郵件中的連結。':'登入成功：'+(cloudUser?.email||''));if(cloudUser)await refreshCloud()}
async function logout(){if(!cloudClient)return;await cloudClient.auth.signOut();cloudUser=null;selectedCloudId=null;$('cloud-trip-list').innerHTML='<option value="">請先登入</option>';cloudStatus('已登出。')}
async function refreshCloud(){if(!cloudUser||!cloudClient)return;const {data,error}=await cloudClient.from('trips').select('id,title,updated_at').order('updated_at',{ascending:false}).limit(100);if(error)return cloudStatus('讀取失敗：'+error.message);$('cloud-trip-list').innerHTML='<option value="">請選擇行程</option>'+data.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}（${new Date(x.updated_at).toLocaleDateString('zh-TW')}）</option>`).join('');if(selectedCloudId)$('cloud-trip-list').value=selectedCloudId;cloudStatus('已載入 '+data.length+' 筆雲端行程。')}
async function cloudSave(){if(!cloudUser)return cloudStatus('請先登入後再儲存。');const value=readForm(),body={owner_id:cloudUser.id,title:value.title,details:value};let response;if(selectedCloudId){response=await cloudClient.from('trips').update(body).eq('id',selectedCloudId).select('id').single()}else{response=await cloudClient.from('trips').insert(body).select('id').single()}if(response.error)return cloudStatus('儲存失敗：'+response.error.message);selectedCloudId=response.data.id;await refreshCloud();cloudStatus('已儲存至 Supabase。')}
async function cloudLoad(){if(!cloudUser)return cloudStatus('請先登入。');const id=$('cloud-trip-list').value;if(!id)return cloudStatus('請先選擇一筆行程。');const {data,error}=await cloudClient.from('trips').select('id,details').eq('id',id).single();if(error)return cloudStatus('載入失敗：'+error.message);try{loadForm(data.details);selectedCloudId=data.id;cloudStatus('行程已讀取；請重新計算路線。');$('cloud-dialog').close()}catch(e){cloudStatus('資料格式錯誤：'+e.message)}}
async function cloudDelete(){if(!cloudUser)return cloudStatus('請先登入。');const id=$('cloud-trip-list').value;if(!id)return cloudStatus('請選擇要刪除的行程。');if(!window.confirm('確定刪除這筆雲端行程？此動作無法復原。'))return;const {error}=await cloudClient.from('trips').delete().eq('id',id);if(error)return cloudStatus('刪除失敗：'+error.message);selectedCloudId=null;await refreshCloud()}
function bindEvents(){
 $('stop-list').addEventListener('input',e=>{const card=e.target.closest('.stop-card'),field=e.target.dataset.field;if(!card||!field||field==='locked')return;const item=stops.find(s=>s.id===card.dataset.stop);if(!item)return;item[field]=field==='stay'?Number(e.target.value):e.target.value;invalidate()});
 $('stop-list').addEventListener('change',e=>{if(e.target.dataset.field==='locked'){const s=stops.find(x=>x.id===e.target.closest('.stop-card')?.dataset.stop);if(s)s.locked=e.target.checked;invalidate()}});
 $('stop-list').addEventListener('click',e=>{const act=e.target.dataset.act;if(!act)return;const card=e.target.closest('.stop-card'),i=stops.findIndex(s=>s.id===card.dataset.stop);if(i<0)return;if(act==='del'&&i>0&&i<stops.length-1)stops.splice(i,1);if(act==='up'&&i>1)[stops[i],stops[i-1]]=[stops[i-1],stops[i]];if(act==='down'&&i<stops.length-2)[stops[i],stops[i+1]]=[stops[i+1],stops[i]];previousOrder=null;renderStops();invalidate()});
 $('add-stop').onclick=()=>{if(stops.length>=10){setStatus('最多支援 10 個站點。','warn');return}stops.splice(stops.length-1,0,makeStop());previousOrder=null;renderStops();invalidate()};
 $('load-example').onclick=()=>{stops=example();risks=[];previousOrder=null;renderStops();renderManualRisks();invalidate();setStatus('已載入範例，點選「計算目前路線」即可開始。','neutral')};
 $('vehicle').onchange=()=>{if(PRESETS[$('vehicle').value]){const v=PRESETS[$('vehicle').value];['v-height','v-width','v-length','v-weight'].forEach((id,i)=>$(id).value=v[i])}invalidate()};
 ['v-height','v-width','v-length','v-weight'].forEach(id=>$(id).addEventListener('change',()=>{$('vehicle').value='custom';invalidate()}));
 ['departure','trip-date','provider','buffer','day-limit'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='provider'){showProviderSettings();if($('provider').value==='google'&&$('buffer').value==='1.15'){$('buffer').value='1.0';setStatus('已切換 Google 自動估時，緩衝預設設為 0%。如需排團餘裕，可再調整緩衝。','neutral')}}invalidate()}));
 $('plan-btn').onclick=plan;$('opt-btn').onclick=optimizeRoute;$('apply-opt').onclick=applyOptimization;$('dismiss-opt').onclick=()=>{$('compare-panel').classList.add('is-hidden');pendingOptimization=null};$('restore-btn').onclick=restore;$('csv-btn').onclick=csvExport;$('print-btn').onclick=()=>window.print();$('scan-risk').onclick=scanRisk;
 $('risk-add').onclick=()=>{const v=$('risk-name').value.trim();if(!v)return;risks.push(v);$('risk-name').value='';renderManualRisks();scheduleDraft()};$('manual-risks').onclick=e=>{if(e.target.dataset.removeRisk===undefined)return;risks.splice(Number(e.target.dataset.removeRisk),1);renderManualRisks();scheduleDraft()};
 $('save-btn').onclick=persistLocal;$('btn-cloud').onclick=()=>{const records=localRecords();renderLocalRecords();$('cloud-dialog').showModal();cloudStatus('本機已有 '+records.length+' 筆行程；若連接雲端，可以跨裝置同步。')};$('local-load').onclick=localLoad;$('local-delete').onclick=localDelete;$('cloud-connect').onclick=connectCloud;$('cloud-signin').onclick=()=>authenticate(false);$('cloud-signup').onclick=()=>authenticate(true);$('cloud-signout').onclick=logout;$('cloud-save').onclick=cloudSave;$('cloud-load').onclick=cloudLoad;$('cloud-delete').onclick=cloudDelete;
 $('google-save-key').onclick=saveGoogleKey;
 $('backup-export').onclick=downloadBackup;$('backup-import').onclick=()=>$('backup-file').click();$('backup-file').onchange=e=>importBackup(e.target.files?.[0]);
 document.querySelector('.sidebar').addEventListener('input',scheduleDraft);
}
function init(){stops=example();renderStops();renderManualRisks();bindEvents();initMap();$('google-key').value=googleStoredKey();showProviderSettings();const saved=DEFAULT_SUPABASE;if(saved.url&&saved.key){$('sb-url').value=saved.url;$('sb-key').value=saved.key}const recovered=restoreDraft();showProviderSettings();if(recovered){setStatus('免登入模式：已還原上次草稿，修改會自動儲存在此瀏覽器。','ok')}else{scheduleDraft();setStatus('免登入模式已啟用：直接規劃，修改會自動保留草稿。','ok')}if(window.location.protocol==='file:')setStatus('已開啟本機檔案；地圖與線上路由可能受瀏覽器限制。建議用 GitHub Pages。','warn')}
init();
})();