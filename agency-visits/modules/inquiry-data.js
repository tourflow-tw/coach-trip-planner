// Contact inquiries are separate from visit status and route planning.
export const stages=['待了解需求','準備報價','已報價','洽談中','待確認'];
export const outcomes=['進行中','已成交','未成交','已取消'];
export const services=['團體旅遊','小包團','自由行','包車','機場接送','訂房','機票','郵輪','商務考察','其他'];
export const currencies=['TWD','JPY','USD','CNY','EUR','HKD','THB','KRW','SGD'];
export const isActive=q=>q.outcome==='進行中';
export const money=(value,currency='TWD')=>value===null||value===undefined||value===''?'未填':`${currency} ${Number(value).toLocaleString('zh-TW',{maximumFractionDigits:2})}`;
const date=v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
function amount(v,label){if(v===''||v===null||v===undefined)return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e12)throw Error(label+'請填入有效的非負金額');return Math.round(n*100)/100}
export function buildInquiry(values,old={},id,now=new Date().toISOString()){
 const q={...old,id:old.id||id,createdAt:old.createdAt||now,updatedAt:now};
 for(const key of ['title','service','destination','startDate','endDate','requirements','stage','nextDate','outcome','currency','lostReason'])q[key]=String(values[key]||'').trim();
 if(!q.title)throw Error('請填寫詢問案件名稱');
 if(q.title.length>150||q.requirements.length>8000||q.lostReason.length>2000)throw Error('文字內容超過長度上限');
 if(!stages.includes(q.stage)||!outcomes.includes(q.outcome)||!services.includes(q.service)||!currencies.includes(q.currency))throw Error('請選擇有效的案件選項');
 if(![q.startDate,q.endDate,q.nextDate].every(date))throw Error('請確認日期格式');
 if(q.startDate&&q.endDate&&q.endDate<q.startDate)throw Error('結束日期不能早於開始日期');
 q.people=values.people===''||values.people===null||values.people===undefined?null:Number(values.people);
 if(q.people!==null&&(!Number.isInteger(q.people)||q.people<1||q.people>100000))throw Error('人數請填入正整數');
 for(const [key,label]of [['budget','預算'],['quotedAmount','報價'],['dealAmount','成交金額']])q[key]=amount(values[key],label);
 if(q.outcome==='已成交'&&q.dealAmount===null)throw Error('成交案件請填寫成交總額，可填 0');
 if(q.outcome!=='已成交')q.dealAmount=null;
 if(q.outcome==='進行中'||q.outcome==='已成交')q.lostReason='';
 const note=String(values.updateNote||'').trim();if(note.length>4000)throw Error('跟進紀錄請少於 4000 字');
 const snapshot={at:now,stage:q.stage,outcome:q.outcome,currency:q.currency,quotedAmount:q.quotedAmount,dealAmount:q.dealAmount,nextDate:q.nextDate,text:note||(!old.id?'建立詢問案件':'更新案件資料')};
 q.history=[...(old.history||[]),snapshot];return q;
}
export function updateContact(rows,agencyId,contactId,change){
 let found=false;const result=rows.map(a=>a.id!==agencyId?a:{...a,contacts:(a.contacts||[]).map(c=>{if(c.id!==contactId)return c;found=true;return {...c,...change(c)}})});
 if(!found)throw Error('找不到聯絡人，請關閉視窗後重新開啟');return result;
}
export function activeInquiries(rows){return rows.flatMap(a=>(a.contacts||[]).flatMap(c=>(c.inquiries||[]).filter(isActive).map(q=>({agency:a,contact:c,inquiry:q})))).sort((a,b)=>(a.inquiry.nextDate||'9999').localeCompare(b.inquiry.nextDate||'9999')||(b.inquiry.updatedAt||'').localeCompare(a.inquiry.updatedAt||''))}
