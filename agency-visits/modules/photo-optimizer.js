import {toast} from './core.js?v=1.26';
import {store} from './store.js?v=1.26';
import {pendingKey,writePending} from './pending-sync.js?v=1.26';
import {photoStats,compressStoredPhoto,isCardPhoto} from './card-photo.js?v=1.26';
let working=false;
const format=chars=>(chars/1024/1024).toFixed(2)+' MB';
function showStats(){
 const element=document.querySelector('#cardPhotoStats');if(!element)return;
 const stat=photoStats(store.rows);
 element.textContent=stat.count?('目前 '+stat.count+' 張名片照片，約 '+format(stat.chars)+'（僅照片本身）。'):'目前沒有名片照片。';
 document.querySelector('#compressOldCards').disabled=working||!stat.count;
}
function progress(message){
 const element=document.querySelector('#cardPhotoCompressionStatus');if(element)element.textContent=message;
}
export function renderCardPhotoOptimizer(){showStats()}
export function initCardPhotoOptimizer(){
 const btn=document.querySelector('#compressOldCards');
 if(!btn)return;
 btn.onclick=async()=>{
  if(working)return;
  if(!window.Cloud?.hydrated||store.pending()||store.conflicted||store.sending||window.Cloud.busy||window.Cloud.loading){
   toast('請先等 Supabase 同步完成，或解除版本衝突後再壓縮名片');return;
  }
  const originalRows=store.rows,originalSettings=store.settings,baseRevision=window.Cloud.revision;
  const initial=photoStats(originalRows);
  if(!initial.count)return toast('目前沒有可壓縮的名片照片');
  if(!confirm('將檢查 '+initial.count+' 張名片照片，僅壓縮能明顯縮小的照片。\n\n開始前會將全部原始資料保存在此裝置的「封存備份」，不刪除聯絡人或拜訪紀錄。完成後同步到 Supabase。確定開始？'))return;
  working=true;btn.disabled=true;btn.textContent='名片壓縮中…';
  let optimized=0,skipped=0,images=0,afterChars=initial.chars;
  try{
   // Do not proceed if we cannot retain the unmodified, full-size source data.
   const archiveKey='archive:'+pendingKey()+':photo-before-'+Date.now()+'-'+crypto.randomUUID();
   progress('正在將原始名片與全部紀錄封存在此裝置…');
   await writePending({key:archiveKey,originalKey:pendingKey(),rows:originalRows,settings:originalSettings,baseRevision,archivedAt:new Date().toISOString(),type:'before-photo-compression'});
   const revised=[];
   for(const agency of originalRows){
    if(!Array.isArray(agency.contacts)||!agency.contacts.some(c=>isCardPhoto(c.photo))){revised.push(agency);continue}
    const newContacts=[];
    let changed=false;
    for(const contact of agency.contacts){
     if(!isCardPhoto(contact.photo)){newContacts.push(contact);continue}
     images++;
     progress('正在壓縮名片 '+images+' / '+initial.count+'，原始照片已封存…');
     try{
      const candidate=await compressStoredPhoto(contact.photo);
      if(candidate.length<contact.photo.length){
       afterChars+=candidate.length-contact.photo.length;
       optimized++;changed=true;newContacts.push({...contact,photo:candidate});
      }else newContacts.push(contact);
     }catch{skipped++;newContacts.push(contact)}
    }
    revised.push(changed?{...agency,contacts:newContacts}:agency);
   }
   if(store.rows!==originalRows||store.settings!==originalSettings||window.Cloud.revision!==baseRevision||store.pending()||store.conflicted)
    throw Error('壓縮期間雲端或本機資料有更新。為避免覆蓋其他修改，已取消本次寫入；原始資料仍保留。');
   if(!optimized){
    progress('已檢查 '+initial.count+' 張名片，沒有可以明顯縮小的照片'+(skipped?'；'+skipped+' 張無法處理':'')+'。資料庫未更動。');
    return;
   }
   progress('已壓縮 '+optimized+' 張，照片由 '+format(initial.chars)+' 降至 '+format(afterChars)+'。正在寫入 Supabase…');
   const confirmed=await store.saveConfirmed(revised,originalSettings);
   if(confirmed){
    progress('✓ 雲端儲存成功：'+optimized+' 張照片縮小 '+Math.round((1-afterChars/initial.chars)*100)+'%，從 '+format(initial.chars)+' 降至 '+format(afterChars)+(skipped?'；'+skipped+' 張略過':'')+'。原圖已封存在設定中的「本機衝突備份」。');
    toast('名片壓縮已儲存至 Supabase');
   }else{
    progress('已完成壓縮，但尚未收到雲端儲存確認。請查看頁面頂端的同步狀態；原始照片已封存，勿清除網站資料。');
    toast('名片已壓縮，尚未確認同步 Supabase');
   }
  }catch(e){progress('壓縮未完成：'+e.message+'。原資料未被直接刪除。');toast('名片壓縮中止：'+e.message)}
  finally{working=false;btn.textContent='壓縮現有名片照片';showStats()}
 };
}
