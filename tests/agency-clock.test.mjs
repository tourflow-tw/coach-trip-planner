import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVisitClock,durationLabel,totalVisitSeconds,recordVisitSeconds} from '../agency-visits/modules/visit-clock.js?v=1.16';
test('start to stop measures elapsed time once; restarting resets only the session',()=>{
 let stamp=Date.parse('2026-11-05T10:00:00+08:00'),total=0;
 const clock=createVisitClock({now:()=>stamp,add:(day,seconds)=>{assert.equal(day,'2026-11-05');total+=seconds}});
 clock.setActive(true);stamp+=65000;clock.tick();clock.setActive(true);assert.equal(clock.seconds,65);stamp+=5000;clock.setActive(false);assert.equal(total,70);stamp+=60000;clock.tick();assert.equal(total,70);assert.equal(clock.seconds,70);clock.setActive(true);assert.equal(clock.seconds,0);stamp+=3000;clock.setActive(false);assert.equal(clock.seconds,3);assert.equal(total,73);
});
test('background gaps use timestamps and midnight splits into Taipei daily totals',()=>{
 let stamp=Date.parse('2026-11-05T23:59:30+08:00');const totals={};
 const clock=createVisitClock({now:()=>stamp,add:(day,seconds)=>totals[day]=(totals[day]||0)+seconds});clock.setActive(true);stamp+=120000;clock.setActive(false);assert.equal(clock.seconds,120);assert.deepEqual(totals,{'2026-11-05':30,'2026-11-06':90});
});
test('time records preserve mileage, route settings and other devices without mutation',()=>{
 const original={origin:{address:'捷利'},travelDays:{'2026-11-05':{devices:{phone:120},seconds:{other:30},planned:{main:7475}}}};
 let updated=recordVisitSeconds(original,'2026-11-05','phone',10.125);updated=recordVisitSeconds(updated,'2026-11-05','phone',5.5);
 assert.equal(totalVisitSeconds(updated.travelDays['2026-11-05']),45.625);assert.deepEqual(updated.travelDays['2026-11-05'].devices,{phone:120});assert.equal(updated.origin,original.origin);assert.deepEqual(original.travelDays['2026-11-05'].seconds,{other:30});assert.throws(()=>recordVisitSeconds(original,'2026-11-05','phone',-1));assert.throws(()=>recordVisitSeconds(original,'2026-11-05','phone',NaN));
});
test('duration formatting supports hours and an empty daily record',()=>{assert.equal(durationLabel(3661.9),'01:01:01');assert.equal(durationLabel(0),'00:00:00');assert.equal(totalVisitSeconds(undefined),0)});
