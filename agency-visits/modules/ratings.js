import {$,rating,hasVisited,intervals,toast} from './core.js?v=1.03';
import {store} from './store.js?v=1.03';
import {groups,origin} from './geo.js?v=1.03';
import {renderGroups} from './cards.js?v=1.03';
export function renderRatings(){const value=$('#ratingFilter').value,rows=store.rows.filter(a=>!value||rating(a)===Number(value));$('#ratingTitle').textContent=`星級評分（${rows.length}）`;const all=groups(rows,origin(store.settings));all.sort((a,b)=>Math.max(...b.rows.map(rating))-Math.max(...a.rows.map(rating))||a.distance-b.distance);$('#ratingList').innerHTML=renderGroups(all);$('#ratingIntervals').textContent=Object.entries(intervals).reverse().map(([stars,days])=>`${stars} 星：${days} 天`).join('　／　')}
export function initRatings(){$('#ratingFilter').onchange=renderRatings;document.addEventListener('click',async e=>{const b=e.target.closest('[data-rate-id]');if(b&&!hasVisited(store.rows.find(a=>a.id===b.dataset.rateId)||{}))return;if(b&&await store.update(b.dataset.rateId,{rating:Number(b.dataset.rating)}))toast('星級已儲存')})}
