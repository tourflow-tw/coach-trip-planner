import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildInquiry,updateContact,activeInquiries,money} from '../agency-visits/modules/inquiry-data.js?v=1.17';
const values={title:'大阪包車',service:'包車',destination:'大阪',people:'6',startDate:'2026-12-01',endDate:'2026-12-05',requirements:'海獅與行李空間',stage:'準備報價',nextDate:'2026-11-06',outcome:'進行中',currency:'JPY',budget:'',quotedAmount:'120000',dealAmount:'',lostReason:'',updateNote:'等待確認班機'};
test('contact data edits and multiple inquiries preserve photos, visit logs, other contacts and custom fields',()=>{
 const first=buildInquiry(values,{},'q1','2026-11-05T01:00:00Z'),second=buildInquiry({...values,title:'東京接送'}, {},'q2');
 const rows=[{id:'a',logs:[{text:'拜訪紀錄'}],rating:5,contacts:[{id:'c',name:'Eric',photo:'original-photo',custom:'keep',inquiries:[first]},{id:'other',name:'其他窗口'}]}];
 const withCases=updateContact(rows,'a','c',c=>({inquiries:[...c.inquiries,second]}));const edited=updateContact(withCases,'a','c',()=>({name:'新名字'}));
 assert.equal(edited[0].contacts[0].inquiries.length,2);assert.equal(edited[0].contacts[0].photo,'original-photo');assert.equal(edited[0].contacts[0].custom,'keep');assert.equal(edited[0].contacts[1],rows[0].contacts[1]);assert.equal(edited[0].logs,rows[0].logs);assert.equal(edited[0].rating,5);assert.equal(rows[0].contacts[0].name,'Eric');assert.throws(()=>updateContact(rows,'a','missing',()=>({})),/找不到聯絡人/);
});
test('won, lost and reopened inquiries retain history without attributing old deal amounts to open cases',()=>{
 const first=buildInquiry(values,{},'q1','2026-11-05T01:00:00Z');const won=buildInquiry({...values,outcome:'已成交',dealAmount:'115000',updateNote:'確認成交'},first,'ignored','2026-11-05T02:00:00Z');
 assert.equal(won.id,'q1');assert.equal(won.createdAt,first.createdAt);assert.equal(won.history.length,2);assert.equal(won.dealAmount,115000);assert.equal(won.history[0].text,'等待確認班機');
 const reopened=buildInquiry(values,won,'ignored');assert.equal(reopened.dealAmount,null);assert.equal(reopened.history[1].dealAmount,115000);assert.equal(reopened.history.length,3);assert.equal(first.history.length,1);
 const free=buildInquiry({...values,outcome:'已成交',dealAmount:'0'});assert.equal(free.dealAmount,0);assert.equal(money(0,'JPY'),'JPY 0');assert.equal(money(null),'未填');
});
test('business validation rejects impossible dates, fractional people, negative amounts and missing deal amounts',()=>{
 for(const patch of [{title:''},{people:'1.5'},{quotedAmount:'-1'},{startDate:'2026-12-10',endDate:'2026-12-01'},{startDate:'2026-02-30'},{outcome:'已成交',dealAmount:''},{currency:'INVALID'}])assert.throws(()=>buildInquiry({...values,...patch},{},'test'));
});
test('tracking orders active cases by followup date and includes excluded agencies without changing routes',()=>{
 const q=(id,nextDate,outcome='進行中')=>({id,nextDate,outcome});const rows=[{id:'excluded',routeExcluded:true,contacts:[{id:'one',inquiries:[q('later','2026-11-07'),q('won','2026-11-01','已成交')]}]},{id:'b',contacts:[{id:'two',inquiries:[q('none',''),q('due','2026-11-05'),q('lost','2026-11-01','未成交')]}]}];
 assert.deepEqual(activeInquiries(rows).map(x=>x.inquiry.id),['due','later','none']);assert.equal(rows[0].routeExcluded,true);
});
