import {rating} from './core.js?v=1.24';
import {missedToday} from './visit-outcomes.js?v=1.24';
export const ratedToday=(agency,date)=>rating(agency)>0&&(agency.logs||[]).some(log=>log.date===date);
export const handledToday=(agency,date)=>ratedToday(agency,date)||missedToday(agency,date);
export function visibleVisitGroups(groups,date,showCompleted=false){
 let step=0,completed=0;
 const visible=groups.map(group=>({...group,rows:group.rows.map(agency=>{step++;const complete=handledToday(agency,date);if(complete)completed++;return{...agency,routeStep:step,hideVisit:complete&&!showCompleted}}).filter(a=>!a.hideVisit)})).filter(g=>g.rows.length);
 return{groups:visible,completed,total:step,visible:visible.reduce((n,g)=>n+g.rows.length,0)};
}
