/* Address-based planning: no external geocoding, model, or location upload. */
(function(root){
'use strict';
const clean=s=>String(s||'').normalize('NFKC').replace(/\s/g,'').replace(/台北市/g,'臺北市');
function number(s){if(/^\d+$/.test(s))return Number(s);const digits={'零':0,'〇':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};let n=0,current=0;for(const c of s){if(c in digits)current=digits[c];else if(c==='十'){n+=(current||1)*10;current=0}else if(c==='百'){n+=(current||1)*100;current=0}else return NaN}return n+current}
function canonical(s){return clean(s).replace(/([一二三四五六七八九十]+)段/g,(_,n)=>number(n)+'段').replace(/(\d+)-(\d+)號/g,'$1之$2號')}
function address(a){const text=canonical(a.address),override=canonical(a.routeBuilding);const door=(override||text).match(/^(.*?號)/)?.[1]||override;const building=door||'';
 let floor=null;const f=String(a.routeFloor??'').trim();if(f!==''&&Number.isFinite(Number(f))&&Number(f)>=-20&&Number(f)<=200)floor=Number(f);else{const tail=door?text.slice(text.indexOf('號')+1):text;const basement=tail.match(/(?:地下|B)([0-9一二兩三四五六七八九十]+)?(?:樓|層|F)?/i);const above=tail.match(/([0-9一二兩三四五六七八九十百]+)(?:樓|層|F)/i);if(basement)floor=-(basement[1]?number(basement[1]):1);else if(above)floor=number(above[1]);if(!Number.isFinite(floor))floor=null}
 const road=building.replace(/^[臺台]北市/,'').replace(/^[^區]{1,6}區/,'').match(/^([^0-9號巷弄]+?(?:路|街|大道))/)?.[1]||'';
 return{building,floor,road,label:floor===null?'樓層待確認':floor<0?'地下'+Math.abs(floor)+'樓':floor+'樓',valid:!!building};
}
const markedToday=(a,date)=>a.today&&(!a.planDate||a.planDate===date);
function eligible(a,date){return a.routeExcluded!==true&&!(a.next&&a.next>date&&!markedToday(a,date))&&!(a.logs||[]).some(l=>l.date===date)}
function priority(a,date){return markedToday(a,date)?0:a.next&&a.next<=date?1:a.status==='尚未拜訪'?2:3}
function plan(agencies,{date,road='',category='',limit=20,start=''}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('請指定排程日期');
 const max=Number(limit);if(!Number.isInteger(max)||max<1||max>200)throw Error('目標家數須為 1 至 200');
 const groups=new Map();let unknown=0;
 for(const a of agencies){if(!eligible(a,date))continue;const p=address(a);if(!p.valid){unknown++;continue}if(road&&p.road!==road)continue;if(category&&a.category!==category)continue;const group=groups.get(p.building)||{building:p.building,road:p.road,rows:[],priority:4};group.rows.push(a);group.priority=Math.min(group.priority,priority(a,date));groups.set(p.building,group)}
 let available=[...groups.values()];available.sort((a,b)=>a.priority-b.priority||b.rows.length-a.rows.length||a.building.localeCompare(b.building,'zh-TW',{numeric:true}));
 if(start){const idx=available.findIndex(g=>g.building===start);if(idx>=0)available.unshift(...available.splice(idx,1))}
 const chosen=[];let count=0;for(const g of available){if(count>=max)break;chosen.push(g);count+=g.rows.length}
 // Keep a building intact, then traverse door numbers; pin the chosen start first.
 chosen.sort((a,b)=>a.road.localeCompare(b.road,'zh-TW')||a.building.localeCompare(b.building,'zh-TW',{numeric:true}));
 if(start){const idx=chosen.findIndex(g=>g.building===start);if(idx>=0)chosen.unshift(...chosen.splice(idx,1))}
 for(const g of chosen)g.rows.sort((a,b)=>{const fa=address(a).floor,fb=address(b).floor;return (fb??-Infinity)-(fa??-Infinity)||a.name.localeCompare(b.name,'zh-TW')});
 return{groups:chosen,ids:chosen.flatMap(g=>g.rows.map(a=>a.id)),unknown,count,available:available.reduce((n,g)=>n+g.rows.length,0)};
}
const api={number,canonical,address,eligible,plan};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RoutePlanner=api;
})(typeof window!=='undefined'?window:globalThis);
