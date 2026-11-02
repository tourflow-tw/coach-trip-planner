const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
(async()=>{
 const els=new Map(),events=new Map();let saved;
 function el(s){if(!els.has(s))els.set(s,{value:'',innerHTML:'',open:false,classList:{add(){},remove(){},toggle(){}},addEventListener(t,f){events.set(s+':'+t,f)},reset(){this.resets=(this.resets||0)+1},elements:{date:{value:''},next:{value:''}},showModal(){this.open=true},close(){this.open=false}});return els.get(s)}
 const ctx=vm.createContext({crypto:webcrypto,Intl,Date,TextEncoder,FormData:class{constructor(f){return f.values[Symbol.iterator]()}},Cloud:{ready:true,busy:false,save:async rows=>{saved=structuredClone(rows)},start(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}},window:{},setTimeout(){},clearTimeout(){},confirm:()=>true,URL,Blob});
 vm.runInContext(fs.readFileSync('agency-visits/app.js','utf8')+';this.api={set(rows){agencies=rows},detail,normalize,safePhoto};',ctx);
 const row={id:'one',name:'測試',address:'松江路131號',note:'旅行業類別：甲種\n來源資料',status:'已拜訪',next:'2026-11-10',logs:[{date:'2026-11-01',text:'相同內容',status:'已拜訪'},{date:'2026-11-01',text:'相同內容',status:'已拜訪'}]};
 ctx.api.set([row,{...row,id:'two'}]);ctx.api.detail('one');assert(!el('#detailInfo').innerHTML.includes('來源資料'));assert(el('#detailInfo').innerHTML.includes('甲種'));
 await el('#contactForm').onsubmit({preventDefault(){},target:{values:[['name','王窗口'],['title','業務'],['phone','02-1234#5'],['line','partner']]}});
 assert.equal(saved[0].contacts[0].name,'王窗口');assert.equal(saved[0].note,row.note);assert.equal(saved[0].logs.length,2);
 const imported=ctx.api.normalize(JSON.parse(JSON.stringify(saved[0])));assert.equal(imported.contacts[0].phone,'02-1234#5');assert.equal(imported.contacts[0].line,'partner');
 const resets=el('#logForm').resets;
 await events.get('#detailDialog:click')({target:{closest:s=>s==='[data-delete-log]'?{dataset:{deleteLog:'0'}}:null}});
 assert.equal(saved[0].logs.length,1);assert.equal(saved[1].logs.length,2);assert.equal(saved[0].contacts.length,1);assert.equal(saved[0].next,row.next);assert.equal(el('#logForm').resets,resets);
 await events.get('#detailDialog:click')({target:{closest:s=>s==='[data-delete-contact]'?{dataset:{deleteContact:'0'}}:null}});
 assert.equal(saved[0].contacts.length,0);assert.equal(saved[0].logs.length,1);assert.equal(ctx.api.safePhoto('javascript:alert(1)'),'');assert.equal(ctx.api.safePhoto('data:image/jpeg;base64,YWJj'),'data:image/jpeg;base64,YWJj');
 console.log('PASS: concise details, contact cloud/backup data, individual deletion, draft preservation and photo validation');
})().catch(e=>{console.error(e);process.exitCode=1});
