/* Optional server-side ORS proxy. Deploy only after creating a Supabase project.
 * Set ORS_API_KEY as a Supabase function secret. Enforce valid user JWT.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Only POST is supported'},405);
 try {
  const header=req.headers.get('Authorization')||'';if(!header.startsWith('Bearer '))return reply({error:'請先登入'},401);
  const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',orsKey=Deno.env.get('ORS_API_KEY')||'';
  if(!orsKey||!url||!anon)return reply({error:'後端 ORS Key 或 Supabase 設定尚未完成'},503);
  const client=createClient(url,anon);
  const {data,error}=await client.auth.getUser(header.slice(7));if(error||!data.user)return reply({error:'登入憑證無效'},401);
  const body=await req.json(),coords=body.coordinates,car=body.vehicle;
  if(!Array.isArray(coords)||coords.length<2||coords.length>10||coords.some((p:unknown)=>!Array.isArray(p)||(p as unknown[]).length!==2||(p as number[]).some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>180)))return reply({error:'座標不正確'},400);
  if(!car||['height','width','length','weight'].some(x=>!Number.isFinite(car[x])||car[x]<=0||car[x]>50))return reply({error:'車輛尺寸不正確'},400);
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),20000);
  try{
   const res=await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',{method:'POST',headers:{'Content-Type':'application/json',Authorization:orsKey},body:JSON.stringify({coordinates:coords,instructions:false,options:{vehicle_type:'bus',profile_params:{restrictions:{height:car.height,width:car.width,length:car.length,weight:car.weight}}}}),signal:ctrl.signal});const data=await res.json();return reply(data,res.ok?200:502)
  }finally{clearTimeout(timeout)}
 }catch(e){return reply({error:e instanceof Error?e.message:'未知錯誤'},500)}
});