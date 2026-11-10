import {$,toast} from './core.js?v=1.25';
import {store} from './store.js?v=1.25';
import {pendingKey,listPendingArchives} from './pending-sync.js?v=1.25';
import {conflictSummary} from './conflict-data.js?v=1.25';
let preview=null,busy=false;
const status=message=>{$('#syncConflictStatus').textContent=message};
function download(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function showSummary(snapshot,summary){
 $('#syncConflictDiff').textContent=[
  '雲端版本：'+snapshot.revision+'；本機草稿起始版本：'+store.baseRevision,
  '旅行社：雲端 '+summary.remoteAgencies+' 家／本機 '+summary.localAgencies+' 家',
  '雲端獨有的旅行社：'+summary.remoteOnlyAgencies+' 家',
  '本機獨有的旅行社：'+summary.localOnlyAgencies+' 家',
  '雲端獨有的拜訪紀錄：'+summary.remoteOnlyLogs+' 筆',
  '本機獨有的拜訪紀錄：'+summary.localOnlyLogs+' 筆',
  '兩邊內容不同的旅行社：'+summary.changedAgencies+' 家',
  '其他設定不同：'+(summary.settingsDifferent?'有':'沒有')
 ].join('\n');
 $('#syncConflictCloud').disabled=false;
 status(summary.localOnlyLogs||summary.localOnlyAgencies?
  '注意：本機有雲端沒有的旅行社或拜訪紀錄。若選擇採用雲端，這些內容不會被上傳；程式會先封存本機完整資料，供你之後核對與下載。':
  '雲端內容與本機有差異。選擇採用雲端前，程式會先封存本機完整備份，不會用舊資料覆蓋雲端。');
}
async function refresh(){
 preview=null;$('#syncConflictCloud').disabled=true;status('正在讀取最新 Supabase 資料，尚未變更本機或雲端資料…');
 $('#syncConflictDiff').textContent='';
 try{
  const snapshot=await window.Cloud.fetchRemote(),summary=conflictSummary(store.rows,store.settings,snapshot.agencies,snapshot.settings);
  if(summary.identical){
   await store.useCloudSnapshot(snapshot);$('#syncConflictDialog').close();toast('兩邊內容相同，已安全解除版本衝突');return;
  }
  preview={snapshot,summary};showSummary(snapshot,summary);
 }catch(e){status('無法比較雲端資料：'+e.message+'。本機待同步內容仍完整保留。')}
}
export function initConflictResolution(){
 $('#resolveConflict').onclick=async()=>{
  if(!store.conflicted)return toast('目前沒有需要處理的版本衝突');
  $('#syncConflictDialog').showModal();await refresh();
 };
 $('#syncConflictBackup').onclick=()=>$('#backup').click();
 $('#syncConflictRefresh').onclick=refresh;
 $('#syncConflictCloud').onclick=async()=>{
  if(busy||!preview||!store.conflicted)return;
  const {summary,snapshot}=preview;
  const warning=(summary.localOnlyLogs||summary.localOnlyAgencies)?
   '本機有 '+summary.localOnlyAgencies+' 家旅行社、'+summary.localOnlyLogs+' 筆拜訪紀錄是雲端沒有的。這些內容將只保留在本機封存，不會寫入雲端。\n\n':'';
  if(!confirm(warning+'確定保留本機封存後，改用目前的 Supabase 雲端資料？\n這會解除警告，且不會更動雲端既有資料。'))return;
  busy=true;$('#syncConflictCloud').disabled=true;status('核對最新版本並封存本機待同步資料中…');
  try{
   const latest=await window.Cloud.fetchRemote();
   if(latest.revision!==snapshot.revision){status('雲端剛被更新，請重新檢查差異再決定。');preview=null;await refresh();return}
   await store.useCloudSnapshot(latest);$('#syncConflictDialog').close();preview=null;
   toast('已切回 Supabase 雲端資料，衝突解除；本機草稿已封存');
  }catch(e){status('解除衝突失敗：'+e.message+'。待同步資料未被捨棄；請保留此頁重試。')}
  finally{busy=false;$('#syncConflictCloud').disabled=!preview}
 };
 $('#archiveBackups').onclick=async()=>{
  try{
   const saved=await listPendingArchives(pendingKey());
   if(!saved.length)return toast('這台裝置目前沒有已封存的衝突備份');
   const data=saved.map(item=>({archivedAt:item.archivedAt,baseRevision:item.baseRevision,agencies:item.rows,settings:item.settings}));
   download('同業拜訪簿-本機衝突封存-'+new Date().toISOString().slice(0,10)+'.json',{type:'agency-visit-conflict-archive',copies:data});
   toast('已匯出 '+saved.length+' 份本機封存');
  }catch(e){toast('無法下載封存備份：'+e.message)}
 };
}
