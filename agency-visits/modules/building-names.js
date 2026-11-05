import {$,esc,toast} from './core.js?v=1.19';
import {store} from './store.js?v=1.19';
import {groupKey,building} from './geo.js?v=1.19';
import {buildingInfo} from './building-data.js?v=1.19';
let selected='';
export function buildingNameFor(a){return buildingInfo(groupKey(a),store.settings,building(a))?.name||''}
export function buildingNameRows(settings,key,name){return{...settings,buildingNames:{...settings.buildingNames,[key]:{name:name.trim()}}}}
export function initBuildingNames(){document.addEventListener('click',e=>{const button=e.target.closest('[data-building-name]');if(!button)return;selected=button.dataset.buildingName;const info=buildingInfo(selected,store.settings);$('#buildingNameAddress').textContent=selected;$('#buildingNameInput').value=info?.name||'';$('#buildingNameSource').innerHTML=info&&!info.manual?`地圖比對，請確認。<a href="${esc(info.source)}" target="_blank" rel="noopener">查看來源</a>`:info?'目前為手動名稱':'地圖沒有可確認的名稱，可自行填寫。';$('#buildingNameDialog').showModal()});$('#buildingNameForm').onsubmit=async e=>{e.preventDefault();if(await store.save(store.rows,buildingNameRows(store.settings,selected,$('#buildingNameInput').value))){$('#buildingNameDialog').close();document.dispatchEvent(new Event('detailrefresh'));toast('大樓名稱已儲存，同棟一起更新')}};$('#resetBuildingName').onclick=async()=>{const names={...store.settings.buildingNames};delete names[selected];if(await store.save(store.rows,{...store.settings,buildingNames:names})){$('#buildingNameDialog').close();document.dispatchEvent(new Event('detailrefresh'));toast('已恢復地圖比對名稱')}}}
