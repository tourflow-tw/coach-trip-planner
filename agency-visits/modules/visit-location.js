import {$} from './core.js?v=1.25';
import {distance,distanceLabel} from './geo.js?v=1.25';
export function createVisitTracker({geo,now=()=>Date.now(),changed=()=>{}}){
 let watcher=null,generation=0,poll=null,lastPoll=-Infinity,watchStarted=0;
 const state={active:false,position:null,message:'開始拜訪後，依定位更新距離'};
 const fresh=()=>state.active&&state.position&&now()-state.position.timestamp<=60000?state.position:null;
 function clear(){if(watcher!==null){geo?.clearWatch(watcher);watcher=null}}
 function stop(message='已停止定位，距離恢復原起點'){generation++;poll=null;clear();state.active=false;state.position=null;state.message=message;changed()}
 function accept(p,token){
  if(token!==generation||!state.active)return;const c=p.coords;
  if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>150||!Number.isFinite(p.timestamp)||now()-p.timestamp>60000||p.timestamp>now()+5000){state.message='定位精度不足或資料過期，請開啟精確位置並到戶外重新定位';changed();return}
  if(state.position&&p.timestamp<=state.position.timestamp)return;
  state.position={lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,timestamp:p.timestamp};state.message=c.accuracy>100?'定位誤差過大，暫不累計里程':'定位中';changed();
 }
 function fail(error,token){if(token!==generation||!state.active)return;if(error.code===1){stop('未開放定位權限，請允許此網站使用精確位置後再開始');return}state.message=error.code===3?'定位逾時，正在重新取得位置':'暫時無法定位，正在重試';changed()}
 function start(){
  if(state.active&&watcher!==null)return;if(!geo){stop('這個瀏覽器不支援定位');return}
  state.active=true;state.message='等待定位權限與目前位置…';const token=++generation;watchStarted=now();poll=null;changed();
  try{watcher=geo.watchPosition(p=>accept(p,token),e=>fail(e,token),{enableHighAccuracy:true,maximumAge:0,timeout:15000});refresh(true)}catch{stop('無法啟用定位，請確認網站權限與 HTTPS 連線')}
 }
 function refresh(force=false){
  if(!state.active)return;
  if(now()-(state.position?.timestamp??watchStarted)>30000&&now()-watchStarted>30000){clear();start();return}
  if(!geo?.getCurrentPosition||(!force&&now()-lastPoll<10000)||(poll&&now()-poll.at<20000))return;
  const request={at:now(),token:generation};poll=request;lastPoll=now();
  const done=fn=>value=>{if(poll!==request)return;poll=null;fn(value,request.token)};
  try{geo.getCurrentPosition(done(accept),done(fail),{enableHighAccuracy:true,maximumAge:0,timeout:15000})}catch{poll=null;state.message='無法重新定位，請確認網站位置權限';changed()}
 }
 return{state,start,stop,refresh,suspend(){generation++;poll=null;clear()},current:fresh};
}
let tracker=null;
export const resumeVisitLocation=()=>tracker?.start();
export const currentVisitPosition=()=>tracker?.current()||null;
export function distanceMarkup(p,base){return `<span class="distanceValue" data-distance-lat="${p?.lat??''}" data-distance-lng="${p?.lng??''}" data-distance-base="${base}">${base}</span>`}
export function renderVisitLocation(){const button=$('#visitLocationToggle'),status=$('#visitLocationStatus');if(!button||!tracker)return;const p=tracker.current();button.textContent=tracker.state.active?'停止拜訪':'開始拜訪';button.setAttribute('aria-pressed',String(tracker.state.active));status.textContent=p?`${tracker.state.message} · 精度約 ${Math.round(p.accuracy)} m · ${Math.max(0,Math.floor((Date.now()-p.timestamp)/1000))} 秒前更新 · 距我為直線參考`:tracker.state.active&&tracker.state.position?'超過 60 秒未收到新位置，正在重新定位；移動里程暫停':tracker.state.message;document.querySelectorAll('[data-distance-lat]').forEach(el=>{const lat=Number(el.dataset.distanceLat),lng=Number(el.dataset.distanceLng);el.textContent=p&&el.dataset.distanceLat&&el.dataset.distanceLng&&Number.isFinite(lat)&&Number.isFinite(lng)?'距我（直線參考）'+distanceLabel(distance(p,{lat,lng})):el.dataset.distanceBase})}
export function initVisitLocation(){let lastStamp=null,finish=false;const update=()=>{renderVisitLocation();document.dispatchEvent(new CustomEvent('visitposition',{detail:{position:tracker.current(),active:tracker.state.active,finish}}));const p=tracker.current(),stamp=p?.timestamp??null;if(stamp!==lastStamp){lastStamp=stamp;document.dispatchEvent(new Event('mapdata'))}};tracker=createVisitTracker({geo:navigator.geolocation,changed:update});$('#visitLocationToggle').onclick=()=>{finish=tracker.state.active;try{finish?tracker.stop():tracker.start()}finally{finish=false}};setInterval(()=>{if(tracker.state.active){if(!document.hidden)tracker.refresh();update()}},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tracker.refresh(true);update()}});window.addEventListener('pagehide',()=>tracker.suspend());window.addEventListener('pageshow',e=>{if(e.persisted&&tracker.state.active)tracker.start()});$('#refreshVisitLocation').onclick=()=>tracker.state.active?tracker.refresh(true):tracker.start();renderVisitLocation()}
