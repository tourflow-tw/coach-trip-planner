const assert=require('node:assert/strict');
const A=require('../access-points.js'),P=require('../planner.js');
const names=['桃園市龜山區公所','溪頭自然教育園區','溪頭妖怪村','桃園市龜山區公所'];
assert.equal(A.known(names[1]).key,'xitou-entrance');
assert.equal(A.known(names[2]).key,'xitou-entrance');
assert.equal(A.known(names[1]).lon,A.known(names[2]).lon);
assert.equal(A.known(names[1]).lat,A.known(names[2]).lat);
assert.equal(A.isTransfer(names[1],names[2]),true);
assert.deepEqual(A.plan(names).indices,[0,1,3]);
const expanded=A.expand(names,[{km:195,minutes:158},{km:195,minutes:157}]);
assert.equal(expanded.length,3);
assert.deepEqual(expanded.map(x=>x.mode),['drive','walk','drive']);
assert.deepEqual(expanded.map(x=>x.minutes),[158,4,157]);
const stops=names.map((name,i)=>({name,stay:i===1?150:i===2?60:0,earliest:'',latest:''}));
const timetable=P.scheduleFromSegments(stops,expanded,450,1.0);
assert.equal(timetable.valid,true);
assert.equal(timetable.rows[1].arrive,608); // 10:08
assert.equal(timetable.rows[2].arrive,762); // 12:42, after 150-min stay and 4-min walk
assert.equal(timetable.rows[2].mode,'walk');
assert.equal(timetable.walking,4);
assert.equal(timetable.driving,315); // walking excluded from coach driving
assert.equal(P.routeKm(expanded),390);
assert.equal(A.isVagueRegion('南投縣鹿谷鄉'),true);
assert.equal(A.isVagueRegion('桃園市龜山區公所'),false);
assert.deepEqual(A.chooseEntrance({entrances:[{type:'service',lat:23,lon:120},{type:'main',lat:24,lon:121}]}),[121,24]);
console.log('PASS: Xitou/Monster Village use shared access point, zero false 30-min drive, walk accounting and vague region rejection');