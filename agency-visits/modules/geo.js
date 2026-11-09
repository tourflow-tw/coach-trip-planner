let data={points:{},origin:{address:'臺北市中山區民權東路2段9號2樓之4',lat:25.0624,lng:121.5267}};
export function numeral(s){if(/^\d+$/.test(s))return Number(s);const digits={'零':0,'〇':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};let total=0,current=0;for(const c of s){if(c in digits)current=digits[c];else if(c==='十'){total+=(current||1)*10;current=0}else if(c==='百'){total+=(current||1)*100;current=0}else return NaN}return total+current}
export function canonical(value){return String(value||'').normalize('NFKC').replace(/\s|,/g,'').replace(/台北市/g,'臺北市').replace(/([一二三四五六七八九十]+)段/g,(_,n)=>numeral(n)+'段').replace(/(\d+)-(\d+)號/g,'$1之$2號').replace(/(\d+)號之(\d+)/g,'$1之$2號')}
export function building(a){return canonical(a.routeBuilding||a.address).match(/^.*?號/)?.[0]||''}
export function floor(a){if(a.routeFloor!==null&&a.routeFloor!==undefined&&a.routeFloor!==''&&Number.isFinite(Number(a.routeFloor)))return Number(a.routeFloor);const text=canonical(a.address).split('號').slice(1).join('號');const b=text.match(/(?:地下|B)([0-9一二兩三四五六七八九十]+)?(?:樓|層|F)?/i);if(b)return -(b[1]?numeral(b[1]):1);const f=text.match(/([0-9一二兩三四五六七八九十百]+)(?:樓|層|F)/i);return f?numeral(f[1]):null}
export const floorLabel=a=>floor(a)===null?'樓層待確認':floor(a)<0?'B'+Math.abs(floor(a)):floor(a)+'F';
export function road(a){return building(a).replace(/^臺北市/,'').replace(/^[^區]{1,6}區/,'').match(/^([^0-9號巷弄]+?(?:路|街|大道))/)?.[1]||'路名待確認'}
export async function loadGeo(){const r=await fetch('./address-points.json?v=1.22',{cache:'no-cache'});if(!r.ok)throw Error('門牌座標未能載入');data=await r.json()}
export function point(a){if(Number.isFinite(Number(a.lat))&&Number.isFinite(Number(a.lng))&&a.lat&&a.lng)return{lat:Number(a.lat),lng:Number(a.lng),accuracy:'manual'};return data.points[building(a)]||null}
export function origin(settings={}){const p=settings.origin;return p&&typeof p.address==='string'&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Number(p.lat)>24&&Number(p.lat)<26&&Number(p.lng)>120&&Number(p.lng)<123?{...p,lat:Number(p.lat),lng:Number(p.lng)}:data.origin}
export function distance(a,b){if(!a||!b)return Infinity;const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;const x=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
export const distanceLabel=d=>!Number.isFinite(d)?'座標待確認':d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km';
export function groupKey(a){const raw=building(a);if(a.routeBuilding)return raw;const main=raw.replace(/之\d+號$/,'號');return data.points[main]&&point(a)&&distance(data.points[main],point(a))<=35?main:raw}
export function groups(rows,center){const result=new Map();for(const a of rows){const key=groupKey(a)||'待確認-'+a.id;if(!result.has(key))result.set(key,{key,address:groupKey(a)||a.address||'地址待確認',point:data.points[key]||point(a),rows:[]});result.get(key).rows.push(a)}return[...result.values()].map(g=>({...g,distance:distance(center,g.point),rows:g.rows.sort((a,b)=>(floor(b)??-Infinity)-(floor(a)??-Infinity)||a.name.localeCompare(b.name,'zh-TW'))})).sort((a,b)=>a.distance-b.distance||a.address.localeCompare(b.address,'zh-TW',{numeric:true}))}
export function roads(rows,center){const r=new Map();for(const a of rows){const key=road(a),d=distance(center,point(a));if(!r.has(key))r.set(key,{name:key,distance:d,count:0});const x=r.get(key);x.distance=Math.min(x.distance,d);x.count++}return[...r.values()].sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name,'zh-TW'))}

export function planStartFor(settings,date,zone){const p=zone?(settings.planStarts?.[zone]||((settings.planStart?.zone||'main')===zone?settings.planStart:null)):settings.planStart;return p?.date===date?p:null}
export function planningOrigin(settings,date,zone){const p=planStartFor(settings,date,zone);return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))?{...p,lat:Number(p.lat),lng:Number(p.lng)}:origin(settings)}

export const routeZone=a=>canonical(a.address||a.routeBuilding).includes('內湖區')?'neihu':'main';
export const zoneLabel=z=>z==='neihu'?'內湖區':'市區（不含內湖）';
