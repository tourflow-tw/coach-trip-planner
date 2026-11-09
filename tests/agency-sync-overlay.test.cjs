const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('save really writes to cloud without a removed full-screen overlay',async()=>{
 const rows=[{id:'one',name:'一號同業',logs:[]}];
 let remote={agencies:[],settings:{},revision:0,updated_at:new Date().toISOString()},saves=0;
 const elements=new Map();
 function el(selector){if(selector==='#saveOverlay')return null;if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',classList:{add(){},remove(){}}});return elements.get(selector)}
 const events={};
 const context=vm.createContext({
  window:{addEventListener:(name,cb)=>events[name]=cb},document:{querySelector:el,addEventListener(){},dispatchEvent(){},visibilityState:'visible'},
  navigator:{onLine:true},location:{hash:'#sync='+'a'.repeat(64),pathname:'/agency-visits/',search:''},history:{replaceState(){}},
  localStorage:{setItem(){},getItem(){return null}},URL,URLSearchParams,Date,Error,AbortSignal,Event,
  setInterval(){},
  fetch:async(_,options)=>{
   const body=JSON.parse(options.body);
   if(body.op==='read')return{ok:true,json:async()=>body.knownRevision===remote.revision?{unchanged:true,revision:remote.revision,updated_at:remote.updated_at}:structuredClone(remote)};
   assert.equal(body.expectedRevision,remote.revision);saves++;
   remote={agencies:body.agencies,settings:body.settings,revision:remote.revision+1,updated_at:new Date().toISOString()};
   return{ok:true,json:async()=>({revision:remote.revision,updated_at:remote.updated_at})};
  }
 });
 const code=fs.readFileSync('agency-visits/sync.js','utf8');
 assert(!code.includes('saveOverlay'),'removed overlay must not appear in sync code');
 vm.runInContext(code+';this.cloud=Cloud;',context);
 await context.cloud.start();assert(context.cloud.hydrated);
 await context.cloud.save(rows,{newField:1});assert.equal(saves,1);assert.equal(remote.revision,1);
 assert.equal(remote.agencies[0].name,'一號同業');assert.equal(remote.settings.newField,1);
 assert.equal(context.cloud.busy,false);
});
