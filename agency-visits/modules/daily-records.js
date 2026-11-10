import {$,esc,today} from './core.js?v=1.26';
import {store} from './store.js?v=1.26';
import {groupKey,floorLabel,distanceLabel} from './geo.js?v=1.26';
import {buildingNameFor} from './building-names.js?v=1.26';
import {durationLabel} from './visit-clock.js?v=1.26';
import {dayRecord,historyDates} from './daily-records-data.js?v=1.26';
let selectedDate='',chosen=false,filter='all';
const metric=(name,value)=>'<div class="dailyMetric"><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong></div>';
const statusClass=status=>status==='找不到'?'notFound':status==='沒人在'?'absent':'visited';
const resultLabel=entry=>entry.result==='已拜訪'?(entry.logs.at(-1).status||'已拜訪'):entry.result;
function renderVisits(entries){
 if(!entries.length)return '<p class="empty">這個日期沒有符合條件的拜訪紀錄。</p>';
 const buildings=new Map();
 for(const entry of entries){const key=groupKey(entry.agency)||entry.agency.address||entry.agency.id;
  if(!buildings.has(key))buildings.set(key,{address:key,title:buildingNameFor(entry.agency),entries:[]});
  buildings.get(key).entries.push(entry);
 }
 return [...buildings.values()].map(building=>
  '<section class="dailyBuilding"><div class="dailyBuildingHeader"><div><h3>'+esc(building.title||building.address)+'</h3>'+
  (building.title?'<small>'+esc(building.address)+'</small>':'')+'</div><span>'+building.entries.length+' 家</span></div>'+
  building.entries.map(entry=>'<article class="dailyEntry"><div class="dailyEntryHeading"><div><b>'+esc(entry.agency.name)+'</b><small>'+esc(floorLabel(entry.agency))+' · '+esc(entry.agency.address||'地址待確認')+'</small></div><span class="dailyResult '+statusClass(entry.result)+'">'+esc(resultLabel(entry))+'</span></div>'+
  entry.logs.map(log=>'<p class="dailyNote">'+esc(log.text||'（無備註）')+'</p>').join('')+
  '<button type="button" data-detail="'+esc(entry.agency.id)+'">查看旅行社與拜訪紀錄</button></article>').join('')+
  '</section>').join('');
}
export function renderDailyRecords(){
 if(store.page!=='daily')return;
 const dates=historyDates(store.rows,store.settings),latest=dates[0]||today();
 if(!chosen)selectedDate=dates.includes(today())?today():latest;
 const date=selectedDate||today(),record=dayRecord(store.rows,store.settings,date);
 const input=$('#dailyDate');if(input.value!==date)input.value=date;input.max=today();
 const older=dates.find(d=>d<date),newer=[...dates].reverse().find(d=>d>date);
 $('#dailyPrevious').disabled=!older;$('#dailyNext').disabled=!newer;
 $('#dailyTitle').textContent=date+'｜每日拜訪紀錄';
 $('#dailyStats').innerHTML=metric('當日有紀錄',record.total+' 家')+metric('已拜訪',record.visited+' 家')+
 metric('找不到',record.notFound+' 家')+metric('沒人在',record.absent+' 家')+
 metric('GPS 估算移動距離',record.moved===null?'未記錄':distanceLabel(record.moved))+
 metric('拜訪累計時間',record.seconds===null?'未記錄':durationLabel(record.seconds));
 $('#dailyPlanned').textContent=record.planned===null?'當日未記錄預計里程':'當日預計路線：'+distanceLabel(record.planned)+(record.plannedIsRoad?'（步行道路）':'（含舊版直線資料）');
 $('#dailySettlement').textContent=record.settlement?'已結算 '+record.settlement.rounds+' 次：累計排程 '+record.settlement.planned+' 家次、已處理 '+record.settlement.handled+' 家次、未跑到 '+record.settlement.unvisited+' 家次。':'此日期沒有結算統計（舊版結算不會補造數字）。';
 const entries=filter==='all'?record.entries:record.entries.filter(e=>e.result===filter);
 $('#dailyEntries').innerHTML=renderVisits(entries);
 $('#dailyCount').textContent='顯示 '+entries.length+' 家'+(filter==='all'?'':'（已篩選）');
}
export function initDailyRecords(){
 $('#dailyDate').onchange=e=>{selectedDate=e.target.value;chosen=true;renderDailyRecords()};
 $('#dailyToday').onclick=()=>{selectedDate=today();chosen=true;renderDailyRecords()};
 $('#dailyFilter').onchange=e=>{filter=e.target.value;renderDailyRecords()};
 $('#dailyPrevious').onclick=()=>{const older=historyDates(store.rows,store.settings).find(d=>d<selectedDate);if(older){selectedDate=older;chosen=true;renderDailyRecords()}};
 $('#dailyNext').onclick=()=>{const newer=[...historyDates(store.rows,store.settings)].reverse().find(d=>d>selectedDate);if(newer){selectedDate=newer;chosen=true;renderDailyRecords()}};
}
