/* TourFlow access-point model — locations are approximate planning references, NOT coach parking approval. */
(function (root) {
  'use strict';
  // Source: OpenStreetMap way 438308866, public bus terminal "溪頭".
  // https://www.openstreetmap.org/way/438308866
  // The two attractions are visited from the same Xitou entrance district;
  // passengers walk between them while the coach is not re-routed.
  const XITOU = Object.freeze({ lon:120.79548, lat:23.67306, key:'xitou-entrance',
    label:'溪頭車站／園區第二售票處附近（步行到景點）',
    source:'OpenStreetMap 溪頭車站附近參考點；非遊覽車停靠核准位置',
    link:'https://www.openstreetmap.org/way/438308866' });
  const WALK_MINUTES=4; // planning allowance; not a measured route travel time
  const norm = s => String(s||'').normalize('NFKC').replace(/[\s\-－_（）()、·‧]/g,'').toLowerCase();
  function known(name){
    const s=norm(name);
    if (/妖怪村|松林町/.test(s) && /溪頭|妖怪村|松林町/.test(s))return {...XITOU,kind:'妖怪村',walkMinutes:WALK_MINUTES,entrance:[120.79590,23.67430],entranceLabel:'溪頭妖怪村入口附近參考點（待現場核對）',entranceSource:'https://travelblog.tw/2013-07-23-196/'};
    if (/溪頭/.test(s) && /(自然教育園區|森林遊樂區|森林遊樂園|自然教育園|森林園區|遊樂區)/.test(s))return {...XITOU,kind:'溪頭自然教育園區',walkMinutes:WALK_MINUTES,entrance:[120.79644,23.67231],entranceLabel:'溪頭自然教育園區第二售票處（入口）',entranceSource:'https://www.openstreetmap.org/node/5797571962'};
    return null;
  }
  function isVagueRegion(name){
    const s=norm(name).replace(/^台灣|^臺灣/,'');
    return /^(?:.+[縣市])?(?:.+[鄉鎮區市])$/.test(s) && !/[0-9號路街巷]|園區|中心|公所|飯店|車站|餐廳|農場|停車場/.test(s);
  }
  function isTransfer(a,b){ const x=known(a),y=known(b);return Boolean(x&&y&&x.key===y.key&&x.kind!==y.kind); }
  function walkLeg(){return {km:0,minutes:WALK_MINUTES,mode:'walk',approx:true};}
  // Collapse immediately adjacent attractions with the same access location.
  // The result still contains one leg per ORIGINAL itinerary segment.
  function plan(names,locations){
    if(!Array.isArray(names)||names.length<2)throw Error('至少需要兩個站點');
    const indices=[0],walking=new Set();
    for(let i=1;i<names.length;i++){
      if(isTransfer(names[i-1],names[i]))walking.add(i-1);
      else indices.push(i);
    }
    return {indices,walking,coordinates:locations?indices.map(i=>locations[i]):null};
  }
  function expand(names,driving){
    const out=[],expected=plan(names).indices.length-1;
    if(driving.length!==expected)throw Error('回傳路線段數與實際車輛移動段數不同');
    let n=0;
    for(let i=1;i<names.length;i++)out.push(isTransfer(names[i-1],names[i])?walkLeg():{...driving[n++],mode:'drive'});
    return out;
  }
  function haversineMeters(a,b){
    const [lon1,lat1]=a,[lon2,lat2]=b,rad=Math.PI/180;
    const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
    return 12742000*Math.asin(Math.sqrt(h));
  }
  function chooseEntrance(place){
    const arr=Array.isArray(place?.entrances)?place.entrances:[];
    const list=arr.filter(e=>Number.isFinite(Number(e.lon))&&Number.isFinite(Number(e.lat)));
    if(!list.length)return null;
    // Entrance type main/yes preferred; exclude service or private entrances where possible.
    const rank=e=>{const t=String(e.type||e.entrance||'').toLowerCase();return t==='main'?0:t==='yes'?1:t==='entrance'?2:t==='service'||t==='private'?10:3};
    const selected=[...list].sort((x,y)=>rank(x)-rank(y))[0];
    return [Number(selected.lon),Number(selected.lat)];
  }
  const api={known,isVagueRegion,isTransfer,walkLeg,plan,expand,haversineMeters,chooseEntrance,WALK_MINUTES};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TourFlowAccess=api;
})(typeof window!=='undefined'?window:globalThis);