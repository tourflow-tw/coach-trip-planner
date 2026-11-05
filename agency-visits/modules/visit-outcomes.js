export const UNSUCCESSFUL_VISITS=['找不到','沒人在'];
export function missedToday(agency,date){return(agency.logs||[]).some(log=>log.date===date&&UNSUCCESSFUL_VISITS.includes(log.outcome||log.status))}
export function recordUnsuccessfulVisit(agency,outcome,date,id){
 if(!UNSUCCESSFUL_VISITS.includes(outcome))throw Error('未知的到訪結果');
 if((agency.logs||[]).some(log=>log.date===date))throw Error('今天已有拜訪紀錄，可在詳細頁修改或刪除');
 return{...agency,today:false,logs:[...(agency.logs||[]),{id,date,status:outcome,outcome,text:outcome==='找不到'?'現場找不到旅行社':'到訪時沒有人在'}]};
}
