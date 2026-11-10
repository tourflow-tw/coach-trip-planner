import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayCounts,settleDay,settleSettings} from '../agency-visits/modules/day-close.js?v=1.25';
import {recordUnsuccessfulVisit,missedToday} from '../agency-visits/modules/visit-outcomes.js?v=1.25';
import {visibleVisitGroups} from '../agency-visits/modules/visit-visibility.js?v=1.25';
import {dueDate} from '../agency-visits/modules/routing.js?v=1.25';
const date='2026-11-05',base={id:'a',name:'A',status:'尚未拜訪',rating:0,planDate:date,planOrder:1,planRound:2,today:true,contacts:[{name:'窗口'}],logs:[]};
test('unsuccessful visit is logged but not rated, and collapses immediately',()=>{
 const attempted=recordUnsuccessfulVisit(base,'沒人在',date,'log1');assert.equal(attempted.status,'尚未拜訪');assert.equal(attempted.logs[0].status,'沒人在');assert(missedToday(attempted,date));assert.equal(dueDate(attempted),'');
 assert.equal(visibleVisitGroups([{key:'k',rows:[attempted]}],date).visible,0);
 assert.equal(visibleVisitGroups([{key:'k',rows:[attempted]}],date,true).visible,1);
 assert.throws(()=>recordUnsuccessfulVisit(attempted,'找不到',date,'log2'));
 assert.throws(()=>recordUnsuccessfulVisit(base,'其他',date,'log3'));
});
test('settlement clears all zones only today, preserving data and old schedule',()=>{
 const attempted=recordUnsuccessfulVisit(base,'找不到',date,'log1');const other={...base,id:'b',address:'內湖區',planOrder:2},old={...base,id:'old',planDate:'2026-11-04',planOrder:5};
 assert.deepEqual(dayCounts([attempted,other,old],date),{total:2,handled:1,unvisited:1});
 const result=settleDay([attempted,other,old],date);assert.equal(result[0].planDate,'');assert.equal(result[1].planOrder,0);assert.equal(result[1].planRound,0);assert.equal(result[1].today,false);assert.deepEqual(result[0].logs,attempted.logs);assert.deepEqual(result[0].contacts,attempted.contacts);assert.equal(result[2],old);
 const settings={travelDays:{[date]:{devices:{one:100}}},streetRoutes:{main:{total:500}},planStart:{date},planStarts:{main:{date},neihu:{date:'2026-11-04'}}};const settled=settleSettings(settings,date);assert.deepEqual(settled.travelDays,settings.travelDays);assert.deepEqual(settled.streetRoutes,settings.streetRoutes);assert.equal(settled.planStart,null);assert.equal(settled.planStarts.main,undefined);assert(settled.planStarts.neihu);
});
