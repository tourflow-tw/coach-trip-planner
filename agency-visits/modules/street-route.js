import {distance} from './geo.js?v=1.26';
const ENDPOINT='https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
let busy=0,lastRequest=0;
export const roadRouteBusy=()=>busy>0;
export const routeSignature=(route,office)=>JSON.stringify([[office.lat,office.lng],...route.map(g=>[g.key,g.point?.lat,g.point?.lng])]);
export function decodeLine(text,precision=6){let index=0,lat=0,lng=0,result=[];const part=()=>{let value=0,shift=0,byte;do{if(index>=text.length||shift>30)throw Error('道路圖形格式錯誤');byte=text.charCodeAt(index++)-63;value|=(byte&31)<<shift;shift+=5}while(byte>=32);return value&1?~(value>>>1):value>>>1};while(index<text.length){lat+=part();lng+=part();result.push([lat/10**precision,lng/10**precision])}return result}
export function encodeLine(points){let lat=0,lng=0,text='';const part=n=>{let v=n<0?~(n<<1):n<<1;while(v>=32){text+=String.fromCharCode((32|(v&31))+63);v>>>=5}text+=String.fromCharCode(v+63)};for(const p of points){const a=Math.round(p[0]*1e6),b=Math.round(p[1]*1e6);part(a-lat);part(b-lng);lat=a;lng=b}return text}
export function savedStreetRoute(settings,zone,route,office,date){const r=settings.streetRoutes?.[zone];return r?.date===date&&r.signature===routeSignature(route,office)&&r.kind==='foot'?r:null}
export function remainingRoadMeters(saved,route,date){const i=route.findIndex(g=>g.rows.some(a=>!(a.logs||[]).some(l=>l.date===date)));return saved.legs.slice(i<0?route.length:i).reduce((sum,n)=>sum+n,0)}
export async function calculateStreetRoute(route,office,{fetcher=fetch,date,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(busy)throw Error('正在計算道路，請稍候');if(!route.length)throw Error('請先加入今日拜訪');if(route.some(g=>!g.point))throw Error('部分門牌尚無座標，請先修正地址再計算道路');
 const points=[office,...route.map(g=>g.point),office],legs=[],line=[];busy++;
 try{for(let start=0;start<points.length-1;start+=25){const part=points.slice(start,start+26),delay=Math.max(0,1100-(Date.now()-lastRequest));if(delay)await wait(delay);lastRequest=Date.now();
 const coords=part.map(p=>`${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');const response=await fetcher(ENDPOINT+coords+'?overview=full&geometries=polyline6&steps=false&continue_straight=false',{referrerPolicy:'strict-origin',signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('步行道路服務暫時無法連線，請稍後重試');const body=await response.json(),r=body.routes?.[0];if(body.code!=='Ok'||!r||r.legs?.length!==part.length-1||body.waypoints?.some(w=>!Number.isFinite(w.distance)||w.distance>150))throw Error('部分地址找不到附近的步行道路，請確認門牌或定位');if(r.legs.some(l=>!Number.isFinite(l.distance)||l.distance<0))throw Error('道路距離資料不完整');const decoded=decodeLine(r.geometry);if(!decoded.length)throw Error('道路圖形不存在');if(line.length&&distance({lat:line.at(-1)[0],lng:line.at(-1)[1]},{lat:decoded[0][0],lng:decoded[0][1]})>100)throw Error('道路分段未能銜接，請重新計算');line.push(...(line.length?decoded.slice(1):decoded));legs.push(...r.legs.map(l=>l.distance))}
 return{kind:'foot',date,signature:routeSignature(route,office),legs,total:legs.reduce((n,v)=>n+v,0),geometry:encodeLine(line),calculatedAt:new Date().toISOString()};
 }finally{busy--}
}
export function withStreetRoute(settings,zone,route){return{...settings,streetRoutes:{...settings.streetRoutes,[zone]:route}}}
