import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dayRecord,historyDates} from '../agency-visits/modules/daily-records-data.js?v=1.24';
import {settleSettings} from '../agency-visits/modules/day-close.js?v=1.24';
const date='2026-11-09';
const rows=[
 {id:'a',name:'甲旅',address:'臺北市中山區松江路1號',logs:[{date,status:'已拜訪',text:'第一次詢問'},{date,status:'待追蹤',text:'第二次詢問'},{date:'2026-11-08',status:'已拜訪'}]},
 {id:'b',name:'乙旅',address:'臺北市中山區松江路2號',logs:[{date,status:'找不到',text:'門牌無公司'}]},
 {id:'c',name:'丙旅',address:'臺北市中山區松江路3號',logs:[{date,status:'沒人在',text:'無人應門'}]},
 {id:'d',name:'丁旅',address:'臺北市中山區松江路4號',logs:[]}
];
test('history combines agency logs and travel records without inventing timestamps',()=>{
 const settings={travelDays:{'2026-11-07':{devices:{phone:800}}},daySettlements:{'2026-11-06':{unvisited:2}}};
 assert.deepEqual(historyDates(rows,settings),['2026-11-09','2026-11-08','2026-11-07','2026-11-06']);
 assert.equal(dayRecord(rows,settings,'2026-11-09').entries[0].recordedAt,null);
 assert.equal(dayRecord(rows,settings,'2026-11-07').total,0);
});
test('per-day counts are unique companies while preserving multiple notes and missed outcomes',()=>{
 const settings={travelDays:{[date]:{devices:{phone:1200,other:400},seconds:{phone:400,other:80},planned:{main:2000},plannedBasis:{main:'foot'}}}};
 const r=dayRecord(rows,settings,date);
 assert.deepEqual([r.total,r.visited,r.notFound,r.absent],[3,1,1,1]);assert.equal(r.entries.find(e=>e.agency.id==='a').logs.length,2);
 assert.equal(r.moved,1600);assert.equal(r.seconds,480);assert.equal(r.planned,2000);assert.equal(r.plannedIsRoad,true);
});
test('settlements preserve cumulative unfinished assignments without clearing travel data',()=>{
 const settings={travelDays:{[date]:{devices:{phone:500}}},streetRoutes:{main:{total:1200}}};
 const once=settleSettings(settings,date,{total:10,handled:7,unvisited:3});
 const twice=settleSettings(once,date,{total:4,handled:3,unvisited:1});
 assert.deepEqual(twice.daySettlements[date],{planned:14,handled:10,unvisited:4,rounds:2});
 assert.deepEqual(twice.travelDays,settings.travelDays);assert.deepEqual(twice.streetRoutes,settings.streetRoutes);
});
test('daily tab, assets and date filters are published together',()=>{
 const html=fs.readFileSync('agency-visits/index.html','utf8'),sw=fs.readFileSync('agency-visits/sw.js','utf8'),app=fs.readFileSync('agency-visits/app.js','utf8');
 assert(html.includes('data-page="daily"'));assert(html.includes('id="dailyDate"'));assert(html.includes('id="dailyEntries"'));
 assert(sw.includes('modules/daily-records.js?v=1.24'));assert(sw.includes('modules/daily-records-data.js?v=1.24'));
 assert(app.includes('renderDailyRecords()'));assert(app.includes('initDailyRecords()'));
});
