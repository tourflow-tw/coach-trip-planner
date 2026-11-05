import {test} from 'node:test';import assert from 'node:assert/strict';
import {appendSmartToday,appendToday} from '../agency-visits/modules/add-today-data.js?v=1.21';
const date='2026-11-05',settings={origin:{address:'捷利',lat:25.06,lng:121.53}};
const a=(id,lat,address,extra={})=>({id,name:id,address,lat,lng:121.53,status:'尚未拜訪',logs:[],...extra});
test('smart additions continue at the last scheduled building and preserve completed rows and the office',()=>{
 const completed=a('done',25.061,'臺北市中山區松江路101號5樓',{planDate:date,planOrder:1,logs:[{date,text:'已聊過',next:'2026-11-12'}],contacts:[{name:'窗口'}],rating:5}),tail=a('tail',25.07,'臺北市中山區松江路103號3樓',{planDate:date,planOrder:2}),nearOffice=a('office',25.0601,'臺北市中山區松江路105號3樓'),nearTail=a('next',25.0701,'臺北市中山區松江路107號3樓');
 const rows=[completed,tail,nearOffice,nearTail],result=appendSmartToday(rows,settings,{zone:'main',limit:1,date});assert.equal(result.count,1);assert.equal(result.added[0].id,'next');assert.equal(result.rows[0],completed);assert.equal(result.rows[1],tail);assert.equal(result.rows.find(a=>a.id==='next').planOrder,3);assert.equal(result.rows.find(a=>a.id==='next').planRound,1);assert.equal(settings.origin.address,'捷利');assert(!nearTail.planDate);
});
test('smart additions keep whole buildings high to low, respect zone/pass/due dates and report the actual count',()=>{
 const rows=[a('low',25.061,'臺北市中山區松江路111號2樓'),a('high',25.061,'臺北市中山區松江路111號8樓'),a('pass',25.0601,'臺北市中山區松江路113號',{passUntil:'2026-11-09'}),a('excluded',25.0601,'臺北市中山區松江路115號',{routeExcluded:true}),a('not-due',25.0601,'臺北市中山區松江路117號',{next:'2026-12-01'}),a('neihu',25.061,'臺北市內湖區內湖路119號'),a('visited',25.0601,'臺北市中山區松江路121號',{logs:[{date}]})];
 const result=appendSmartToday(rows,settings,{zone:'main',limit:1,date});assert.equal(result.count,2);assert.deepEqual(result.added.map(a=>a.id),['high','low']);assert.equal(result.rows.filter(a=>a.planDate===date).length,2);assert.equal(appendSmartToday(rows,settings,{zone:'main',limit:20,date}).count,2);assert.equal(appendSmartToday(rows,settings,{zone:'neihu',limit:1,date}).added[0].id,'neihu');assert.throws(()=>appendSmartToday(rows,settings,{limit:0,date}),/1 至 200/);
 const again=appendSmartToday(result.rows,settings,{zone:'neihu',limit:1,date});assert.equal(again.rows.find(a=>a.id==='neihu').planOrder,3);assert.equal(again.rows.find(a=>a.id==='neihu').planRound,2);
});
test('exhausted smart plans explain manual mode and manual selection remains available for not-due agencies',()=>{
 const row=a('future',25.061,'臺北市中山區松江路111號',{next:'2026-12-01'});assert.throws(()=>appendSmartToday([row],settings,{zone:'main',limit:5,date}),/手動追加/);assert.equal(appendToday([row],'future','agency',date).count,1);
});
