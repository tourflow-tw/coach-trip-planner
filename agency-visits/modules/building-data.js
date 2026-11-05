let snapshot={matches:{}};
export function setBuildingData(value){snapshot=value&&typeof value.matches==='object'?value:{matches:{}}}
export function buildingInfo(key,settings={},fallback=''){const manual=settings.buildingNames?.[key];if(manual)return manual.name?.trim()?{name:manual.name.trim(),manual:true,source:''}:null;const found=snapshot.matches[key]||snapshot.matches[fallback];return found?{...found,manual:false}:null}
export async function loadBuildingData(){const response=await fetch('./building-names.json?v=1.08',{cache:'no-cache'});if(!response.ok)throw Error('大樓名稱資料未能載入，仍可手動填寫');setBuildingData(await response.json())}
