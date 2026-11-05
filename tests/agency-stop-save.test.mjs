import {test} from 'node:test';import assert from 'node:assert/strict';
import {encodeLine} from '../agency-visits/modules/street-route.js?v=1.20';
import {store} from '../agency-visits/modules/store.js?v=1.20';
test('active visits never upload on intervals, reconnect, dialogs or pagehide; explicit stop saves once',async()=>{
 const els=new Map(),docEvents=new Map(),winEvents=new Map(),intervals=[],values=new Map();let saves=0,stamp=Date.now();const realNow=Date.now;Date.now=()=>stamp;
 const on=(map,n,fn)=>{if(!map.has(n))map.set(n,[]);map.get(n).push(fn)},emit=async(map,n,e={})=>{for(const fn of map.get(n)||[])fn(e);await new Promise(setImmediate)};
 const el=s=>{if(!els.has(s))els.set(s,{value:s==='#planZone'?'main':'',textContent:'',hidden:false,disabled:false});return els.get(s)};
 const old={window:globalThis.window,document:globalThis.document,location:globalThis.location,localStorage:globalThis.localStorage,setInterval:globalThis.setInterval,fetch:globalThis.fetch};
 globalThis.document={querySelector:s=>s==='dialog[open]'?null:el(s),addEventListener:(n,fn)=>on(docEvents,n,fn)};globalThis.window={Cloud:{ready:true,busy:false,save:async()=>{saves++}},addEventListener:(n,fn)=>on(winEvents,n,fn)};globalThis.location={hash:''};globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};globalThis.setInterval=(fn,ms)=>intervals.push({fn,ms});
 try{
 const {initTravel}=await import('../agency-visits/modules/travel.js?v=1.20');store.rows=[{id:'test',name:'測試',logs:[]}];store.settings={};initTravel();
 await emit(docEvents,'visitposition',{detail:{active:true,position:{lat:25,lng:121.53,accuracy:5,timestamp:stamp}}});stamp+=20000;await emit(docEvents,'visitposition',{detail:{active:true,position:{lat:25.0002,lng:121.53,accuracy:5,timestamp:stamp}}});for(const i of intervals)i.fn();await emit(winEvents,'online');await emit(docEvents,'close');await emit(winEvents,'pagehide');assert.equal(saves,0);assert.equal(el('#saveTravel').hidden,true);assert.match(el('#travelSaveState').textContent,/手機記錄中/);
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date());store.rows=[{...store.rows[0],address:'臺北市中山區長春路172號',lat:25.063,lng:121.53,planDate:date,planOrder:1}];
 globalThis.fetch=async()=>({ok:true,json:async()=>({code:'Ok',waypoints:[{distance:0},{distance:0},{distance:0}],routes:[{legs:[{distance:100},{distance:150}],geometry:encodeLine([[25.0624,121.5267],[25.063,121.53],[25.0624,121.5267]])}]})});
 await emit(docEvents,'mapdata');assert.equal(saves,0);assert.equal(el('#travelPlanned').textContent,'250 m');assert.equal(store.settings.streetRoutes,undefined);
 await emit(docEvents,'visitposition',{detail:{active:false,position:null,finish:true}});assert.equal(saves,1);assert.equal(store.settings.streetRoutes.main.total,250);assert(Object.values(store.settings.travelDays)[0].devices[values.get('agency-mileage-device')]>20);assert.equal(Object.values(store.settings.travelDays)[0].seconds[values.get('agency-mileage-device')],20);for(const i of intervals)i.fn();await new Promise(setImmediate);assert.equal(saves,1);
 await emit(docEvents,'visitposition',{detail:{active:true,position:null}});stamp+=10000;window.Cloud.ready=false;await emit(docEvents,'visitposition',{detail:{active:false,position:null,finish:true}});assert.equal(saves,1);window.Cloud.ready=true;await emit(winEvents,'online');assert.equal(saves,2);assert.equal(Object.values(store.settings.travelDays)[0].seconds[values.get('agency-mileage-device')],30);
 }finally{Object.assign(globalThis,old);Date.now=realNow;store.listeners.clear()}
});
