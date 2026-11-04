import {$,rating,intervals,toast} from './core.js';
import {store} from './store.js';
import {groups,origin} from './geo.js';
import {renderGroups} from './cards.js';
export function renderRatings(){const value=$('#ratingFilter').value,rows=store.rows.filter(a=>!value||rating(a)===Number(value));$('#ratingTitle').textContent=`星級評分（${rows.length}）`;const all=groups(rows,origin(store.settings));all.sort((a,b)=>Math.max(...b.rows.map(rating))-Math.max(...a.rows.map(rating))||a.distance-b.distance);$('#ratingList').innerHTML=renderGroups(all);$('#ratingIntervals').textContent=Object.entries(intervals).reverse().map(([stars,days])=>`${stars} 星：${days} 天`).join('　／　')}
export function initRatings(){$('#ratingFilter').onchange=renderRatings;document.addEventListener('click',async e=>{const b=e.target.closest('[data-rate-id]');if(b&&await store.update(b.dataset.rateId,{rating:Number(b.dataset.rating)}))toast('星級已儲存')})}
