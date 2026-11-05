import {$,esc,today,toast} from './core.js?v=1.17';
import {store} from './store.js?v=1.17';
import {isPassed} from './routing.js?v=1.17';
import {refreshSelects} from './selects.js?v=1.17';
import {appendToday} from './add-today-data.js?v=1.17';
import {prepareStreetPlan} from './street-plan.js?v=1.17';
let busy=false;
export function initAddToday(){const dialog=$('#addTodayDialog');dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});$('#appendTodayButton').onclick=()=>{const date=today(),select=$('#appendAgency');const rows=store.rows.filter(a=>!a.routeExcluded&&!isPassed(a,date)&&a.planDate!==date&&!(a.logs||[]).some(l=>l.date===date));select.innerHTML='<option value="">請選擇，可搜尋名稱或地址</option>'+rows.sort((a,b)=>a.name.localeCompare(b.name,'zh-TW')).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}｜${esc(a.address)}</option>`).join('');$('#appendMode').value='agency';refreshSelects();dialog.showModal();$('#appendClose').focus({preventScroll:true})};
 $('#appendNewAgency').onclick=()=>{if(busy)return;dialog.close();document.dispatchEvent(new Event('addagency'))};
 $('#addTodayForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;dialog.setAttribute('data-saving','');$('#appendSave').disabled=true;$('#appendStatus').textContent='正在追加並計算步行道路…';try{const originalRows=store.rows,originalSettings=store.settings,date=today(),change=appendToday(originalRows,$('#appendAgency').value,$('#appendMode').value,date);let settings=originalSettings,warning='';try{settings=await prepareStreetPlan(change.rows,originalSettings,change.zone,date)}catch(err){warning='；道路尚未算出，請點重新計算道路'}if(store.rows!==originalRows||store.settings!==originalSettings)throw Error('資料剛有更新，請重新按加入');if(await store.save(change.rows,settings)){dialog.close();store.go('route');$('#planZone').value=change.zone;$('#planZone').dispatchEvent(new Event('change'));toast(`已追加 ${change.count} 家，原有拜訪紀錄已保留${warning}`)}}catch(err){toast(err.message)}finally{busy=false;dialog.removeAttribute('data-saving');$('#appendSave').disabled=false;$('#appendStatus').textContent=''}};
}
