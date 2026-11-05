import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadDraft,saveDraft,applyDraft} from '../agency-visits/modules/visit-draft.js?v=1.21';
import {createVisitClock} from '../agency-visits/modules/visit-clock.js?v=1.21';
test('pending aggregates survive phone restart; interrupted response retries do not double count',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},draft={id:'session',meters:[['2026-11-05',120]],seconds:[['2026-11-05',60]],stopped:true};
 assert(saveDraft(storage,'phone',draft));assert.deepEqual(loadDraft(storage,'phone'),draft);assert.equal(loadDraft(storage,'other'),null);assert.equal(saveDraft(null,'phone',draft),false);
 const original={origin:{address:'捷利'},travelDays:{'2026-11-05':{devices:{phone:10,other:20},seconds:{phone:5}}}};
 const once=applyDraft(original,'2026-11-05','phone','session',120,60),retry=applyDraft(once,'2026-11-05','phone','session',120,60),more=applyDraft(retry,'2026-11-05','phone','session',150,90);
 assert.equal(retry.travelDays['2026-11-05'].devices.phone,130);assert.equal(retry.travelDays['2026-11-05'].seconds.phone,65);assert.equal(more.travelDays['2026-11-05'].devices.phone,160);assert.equal(more.travelDays['2026-11-05'].seconds.phone,95);assert.equal(more.travelDays['2026-11-05'].devices.other,20);assert.equal(original.travelDays['2026-11-05'].devices.phone,10);
});
test('restoring an active clock adds only elapsed background time without resetting the session',()=>{
 let stamp=Date.now(),total=0;const first=createVisitClock({now:()=>stamp,add:(d,s)=>total+=s});first.setActive(true);stamp+=10000;first.tick();const saved=first.snapshot();stamp+=60000;const restored=createVisitClock({now:()=>stamp,add:(d,s)=>total+=s,restore:saved});restored.tick();restored.setActive(true);assert.equal(restored.seconds,70);assert.equal(total,70);restored.setActive(false);stamp+=5000;restored.tick();assert.equal(total,70);
});
