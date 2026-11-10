import {refreshSelects} from './selects.js?v=1.26';
import {$,esc,formData,toast} from './core.js?v=1.26';import {store} from './store.js?v=1.26';import {groups,origin} from './geo.js?v=1.26';import {renderGroups} from './cards.js?v=1.26';
let selected=null;
export const reasons=['不適合合作','暫停營業／搬遷','對方婉拒拜訪','已有固定對接窗口','重複名單','其他原因'];
export function renderExclusions(){const rows=store.rows.filter(a=>a.routeExcluded);$('#excludedTitle').textContent=`不用再跑（${rows.length}）`;$('#excludedList').innerHTML=renderGroups(groups(rows,origin(store.settings)))+rows.map(a=>`<div class="reasonLine"><b>${esc(a.name)}</b><span>${esc(a.excludeReason||'原因待補')} ${esc(a.excludeNote||'')}</span></div>`).join('')}
export function openExclusion(id){selected=id;const a=store.rows.find(a=>a.id===id);$('#exclusionForm').reset();$('#excludeReason').value=reasons.includes(a.excludeReason)?a.excludeReason:reasons[0];$('#excludeNote').value=a.excludeNote||'';refreshSelects();$('#exclusionDialog').showModal()}
export function initExclusions(){$('#exclusionForm').onsubmit=async e=>{e.preventDefault();const d=formData(e.target);if(await store.update(selected,{routeExcluded:true,excludeReason:d.reason,excludeNote:d.note.trim(),today:false})){$('#exclusionDialog').close();document.dispatchEvent(new Event('detailrefresh'));toast('已設為不用再跑，後續排程會排除')}}}
