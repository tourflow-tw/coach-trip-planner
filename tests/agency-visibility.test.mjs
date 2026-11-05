import {test} from 'node:test';import assert from 'node:assert/strict';
import {ratedToday,visibleVisitGroups} from '../agency-visits/modules/visit-visibility.js?v=1.21';
const date='2026-11-05';
test('only today completed and rated visits collapse, preserving mixed buildings and original step numbers',()=>{
 const done={id:'done',status:'已拜訪',rating:4,logs:[{date}]},needsRating={id:'rating',status:'已拜訪',rating:0,logs:[{date}]},returnVisit={id:'return',status:'已拜訪',rating:5,logs:[{date:'2026-10-01'}]},newAgency={id:'new',status:'尚未拜訪',rating:5,logs:[]};
 const input=[{key:'one',walkingLeg:250,rows:[done,needsRating]},{key:'two',walkingLeg:100,rows:[returnVisit,newAgency]}],result=visibleVisitGroups(input,date);
 assert.equal(result.completed,1);assert.equal(result.visible,3);assert.equal(result.total,4);assert.equal(result.groups[0].walkingLeg,250);assert.deepEqual(result.groups.flatMap(g=>g.rows.map(a=>a.routeStep)),[2,3,4]);assert.deepEqual(result.groups.flatMap(g=>g.rows.map(a=>a.id)),['rating','return','new']);assert.equal(input[0].rows.length,2);assert.equal(done.routeStep,undefined);
 const expanded=visibleVisitGroups(input,date,true);assert.equal(expanded.visible,4);assert.deepEqual(expanded.groups.flatMap(g=>g.rows.map(a=>a.id)),['done','rating','return','new']);assert(!ratedToday(returnVisit,date));assert(!ratedToday(newAgency,date));
});
test('all rated visits collapse to an empty presentation without changing the source route',()=>{const groups=[{key:'one',rows:[{id:'done',rating:5,status:'已拜訪',logs:[{date}]}]}];assert.equal(visibleVisitGroups(groups,date).groups.length,0);assert.equal(visibleVisitGroups(groups,date,true).groups.length,1);assert.equal(groups[0].rows.length,1)});
