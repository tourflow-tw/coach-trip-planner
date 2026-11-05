import {today,toast} from './core.js?v=1.05';
import {store} from './store.js?v=1.05';
import {nextMonday,isPassed} from './routing.js?v=1.05';
export const passChange=(a,date=today())=>isPassed(a,date)?{passUntil:''}:{passUntil:nextMonday(date),planDate:'',planOrder:0,today:false};
export function initPasses(){document.addEventListener('click',async e=>{const button=e.target.closest('[data-pass]');if(!button)return;const a=store.rows.find(a=>a.id===button.dataset.pass);if(!a)return;const passed=isPassed(a);if(await store.update(a.id,passChange(a)))toast(passed?'已取消本週 pass':'本週先 pass，下週一重新納入排程')})}
