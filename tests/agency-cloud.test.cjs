const {readFileSync}=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
(async()=>{
 const els=new Map();function el(s){if(!els.has(s))els.set(s,{textContent:'',value:'',disabled:false,classList:{add(){},remove(){},toggle(){}},checkValidity:()=>true});return els.get(s)}
 let remote=null,callback,captured;
 const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:remote,error:null})})})}),rpc:async(name,args)=>{assert.equal(name,'save_agency_visit_book');if(args.p_expected_revision!==(remote?.revision||0))return{error:{message:'VERSION_CONFLICT'}};remote={agencies:args.p_agencies,revision:(remote?.revision||0)+1,updated_at:new Date().toISOString()};return{data:[{revision:remote.revision,updated_at:remote.updated_at}]}},auth:{getSession:async()=>({data:{session:{user:{id:'owner',email:'qa@example.invalid'}}}}),onAuthStateChange:fn=>{callback=fn},signOut:async()=>({error:null})}};
 const context=vm.createContext({window:{supabase:{createClient:()=>client},addEventListener(){}},document:{querySelector:s=>s==='dialog[open]'?null:el(s),querySelectorAll:()=>[],addEventListener(){},visibilityState:'visible'},setTimeout,setInterval(){},Date,URL,AbortSignal,Error,fetch(){},console});
 vm.runInContext(readFileSync('agency-visits/cloud.js','utf8')+';this.cloud=Cloud;',context);const cloud=context.cloud;cloud.onData=rows=>{captured=rows};await cloud.start();assert.equal(cloud.ready,true);assert.equal(captured.length,0);
 const records=[{id:'agency-1',name:'測試用旅行社',logs:[]}];await cloud.save(records);assert.equal(remote.revision,1);assert.equal(remote.agencies[0].name,records[0].name);
 // A second device has committed: this client must not overwrite its dataset.
 remote={...remote,revision:2,agencies:[]};await assert.rejects(cloud.save(records),/其他裝置已更新/);assert.equal(remote.revision,2);assert.equal(remote.agencies.length,0);assert.equal(cloud.ready,false);
 await el('#sync').onclick();assert.equal(cloud.ready,true);await cloud.save(records);assert.equal(remote.revision,3);
 await assert.rejects(cloud.save([{id:'<bad>',name:'X',logs:[]}]),/格式/);assert.equal(remote.revision,3);
 callback('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,0));assert.equal(cloud.ready,false);console.log('PASS: cloud hydrate, atomic save, stale-write protection, refresh, invalid import rejection, signout');
})().catch(e=>{console.error(e);process.exitCode=1});
