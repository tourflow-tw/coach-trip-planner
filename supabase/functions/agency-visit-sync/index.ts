// Capability-link access: the token is required for every operation, including reads.
// Its SHA-256 hash is stored in the DB. No user datasets or secret keys are in source.
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
export async function handler(req:Request):Promise<Response>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>4200000)return reply({error:'TOO_LARGE'},413);
  const text=await req.text();if(new TextEncoder().encode(text).length>4200000)return reply({error:'TOO_LARGE'},413);
  let body;try{body=JSON.parse(text)}catch{return reply({error:'INVALID_REQUEST'},400)}
  if(!body||typeof body.key!=='string'||!/^[0-9a-f]{64}$/.test(body.key))return reply({error:'INVALID_LINK'},403);
  if(!['read','save'].includes(body.op))return reply({error:'INVALID_REQUEST'},400);
  if(body.op==='save'){
   const a=body.agencies;
   if(!Array.isArray(a)||a.length>10000||new TextEncoder().encode(JSON.stringify(a)).length>3900000||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0)return reply({error:'INVALID_DATA'},400);
   const ids=new Set();
   for(const row of a){
    if(!row||typeof row.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(row.id)||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||!Array.isArray(row.logs))return reply({error:'INVALID_DATA'},400);
    ids.add(row.id);
    for(const l of row.logs)if(!l||typeof l.text!=='string'||typeof l.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(l.date))return reply({error:'INVALID_DATA'},400);
   }
  }
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.key))),x=>x.toString(16).padStart(2,'0')).join('');
  const base=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!secret)return reply({error:'SERVER_CONFIGURATION'},503);
  const endpoint=base+'/rest/v1/agency_visit_sync?token_hash=eq.'+hash;
  const authHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  if(body.op==='read'&&Number.isInteger(body.knownRevision)&&body.knownRevision>=0){
   const metadata=await fetch(endpoint+'&select=revision,updated_at',{headers:authHeaders,signal:AbortSignal.timeout(15000)});
   if(!metadata.ok)return reply({error:'DATABASE_UNAVAILABLE'},503);
   const found=await metadata.json();if(!found.length)return reply({error:'INVALID_LINK'},403);
   if(found[0].revision===body.knownRevision)return reply({...found[0],unchanged:true});
  }
  const r=await fetch(endpoint+'&select=agencies,revision,updated_at',{headers:authHeaders,signal:AbortSignal.timeout(15000)});
  if(!r.ok)return reply({error:'DATABASE_UNAVAILABLE'},503);
  const rows=await r.json();if(!rows.length)return reply({error:'INVALID_LINK'},403);
  if(body.op==='read')return reply(rows[0]);
  if(rows[0].revision!==body.expectedRevision)return reply({error:'VERSION_CONFLICT'},409);
  const update=await fetch(endpoint+'&revision=eq.'+body.expectedRevision+'&select=revision,updated_at',{
   method:'PATCH',headers:{...authHeaders,Prefer:'return=representation'},
   body:JSON.stringify({agencies:body.agencies,revision:body.expectedRevision+1,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)
  });
  if(!update.ok)return reply({error:'DATABASE_UNAVAILABLE'},503);
  const saved=await update.json();if(!saved.length)return reply({error:'VERSION_CONFLICT'},409);
  return reply(saved[0]);
 }catch{return reply({error:'REQUEST_FAILED'},503)}
}
Deno.serve(handler);
