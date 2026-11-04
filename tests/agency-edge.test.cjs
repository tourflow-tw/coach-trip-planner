const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
test('conditional reads authenticate the link and omit unchanged agency payloads',async()=>{
 const book={revision:10,updated_at:'2026-11-04T12:00:00Z',agencies:[{id:'one',name:'同業',logs:[]}]};let handler,calls=[];const context=vm.createContext({crypto:webcrypto,TextEncoder,Request,Response,AbortSignal,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://example.supabase.co':'server-test-key'},serve:f=>{handler=f}},fetch:async url=>{calls.push(url);assert(url.includes('token_hash=eq.'));return new Response(JSON.stringify([url.includes('select=revision,updated_at')?{revision:book.revision,updated_at:book.updated_at}:book]),{status:200})}});
 const source=fs.readFileSync('supabase/functions/agency-visit-sync/index.ts','utf8').replace('export async function','async function');vm.runInContext(stripTypeScriptTypes(source),context);
 const read=body=>handler(new Request('https://example.com/sync',{method:'POST',body:JSON.stringify(body)}));
 let response=await read({op:'read',key:'bad',knownRevision:10});assert.equal(response.status,403);assert.equal(calls.length,0);
 response=await read({op:'read',key:'a'.repeat(64),knownRevision:10});const data=await response.json();assert.equal(data.unchanged,true);assert.equal(data.agencies,undefined);assert.equal(calls.length,1);
 calls=[];response=await read({op:'read',key:'a'.repeat(64),knownRevision:9});assert.equal((await response.json()).agencies[0].name,'同業');assert.equal(calls.length,2);
});
