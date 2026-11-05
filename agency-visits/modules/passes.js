import {today,toast} from './core.js?v=1.17';
import {store} from './store.js?v=1.17';
import {groupKey} from './geo.js?v=1.17';
import {nextMonday,isPassed} from './routing.js?v=1.17';
export const passChange=(a,date=today())=>isPassed(a,date)?{passUntil:''}:{passUntil:nextMonday(date),planDate:'',planOrder:0,today:false};
// Resolve the whole physical building from shared rows, even when the list is filtered.
export function buildingPassRows(rows,key,{cancel=false,date=today()}={}){return rows.map(a=>groupKey(a)===key&&!a.routeExcluded?{...a,...(cancel?{passUntil:''}:{passUntil:nextMonday(date),planDate:'',planOrder:0,today:false})}:a)}
export function initPasses(){document.addEventListener('click',async e=>{const building=e.target.closest('[data-building-pass]');if(building){const cancel=building.dataset.passAction==='cancel',rows=buildingPassRows(store.rows,building.dataset.buildingPass,{cancel});if(await store.save(rows))toast(cancel?'已取消整棟本週 pass':'整棟本週先 pass，下週一重新納入排程');return}const button=e.target.closest('[data-pass]');if(!button)return;const a=store.rows.find(a=>a.id===button.dataset.pass);if(!a)return;const passed=isPassed(a);if(await store.update(a.id,passChange(a)))toast(passed?'已取消本週 pass':'本週先 pass，下週一重新納入排程')})}
