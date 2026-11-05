import {$,esc,uid,today,formData,toast} from './core.js?v=1.15';
import {store} from './store.js?v=1.15';
import {refreshSelects} from './selects.js?v=1.15';
import {stages,outcomes,services,currencies,isActive,money,buildInquiry,updateContact} from './inquiry-data.js?v=1.15';
let context=null,saving=false;
export function inquiryMarkup(q,attrs=''){
 const due=isActive(q)&&q.nextDate&&q.nextDate<=today();
 return `<article class="inquiryCard"><div class="sectionHeading"><b>${esc(q.title)}</b><span class="inquiryBadge">${esc(q.outcome==='進行中'?q.stage:q.outcome)}</span></div><p>${esc([q.service,q.destination,q.people?`${q.people} 人`:'',q.startDate||''].filter(Boolean).join(' · '))}</p><p class="${due?'due':'muted'}">${isActive(q)?(q.nextDate?`${due?'待跟進 · ':''}下次追蹤 ${esc(q.nextDate)}`:'未設定跟進日期'):q.outcome==='已成交'?`成交總額 ${esc(money(q.dealAmount,q.currency))}`:esc(q.lostReason||'未填結案原因')}</p><button type="button" ${attrs}>查看／更新案件</button></article>`;
}
export function renderInquiries(agencyId,contactId){
 const c=store.rows.find(a=>a.id===agencyId)?.contacts?.find(c=>c.id===contactId);if(!c)return;
 const queries=[...(c.inquiries||[])].sort((a,b)=>Number(isActive(b))-Number(isActive(a))||(b.updatedAt||'').localeCompare(a.updatedAt||''));
 const attrs=`data-inquiry-agency="${esc(agencyId)}" data-inquiry-contact="${esc(contactId)}"`;
 $('#inquiryList').innerHTML=`<div class="sectionHeading"><h3>詢問案件（${queries.length}）</h3><button type="button" class="primary" data-inquiry-new ${attrs}>＋ 新增詢問</button></div>`+(queries.map(q=>inquiryMarkup(q,`${attrs} data-inquiry-id="${esc(q.id)}"`)).join('')||'<p class="empty">還沒有詢問案件。新增對方需求，之後持續記錄報價與成交結果。</p>');
}
function visibility(){const outcome=$('#inquiryForm').elements.outcome.value;$('#dealAmountField').hidden=outcome!=='已成交';$('#dealAmountField input').required=outcome==='已成交';$('#lostReasonField').hidden=!['未成交','已取消'].includes(outcome);$('#inquiryStageField').hidden=outcome!=='進行中';$('#inquiryNextField').hidden=outcome!=='進行中'}
export function openInquiry(agencyId,contactId,inquiryId=null){
 const a=store.rows.find(a=>a.id===agencyId),c=a?.contacts?.find(c=>c.id===contactId),q=c?.inquiries?.find(q=>q.id===inquiryId);if(!c||inquiryId&&!q)return toast('找不到這筆詢問案件');
 context={agencyId,contactId,inquiryId};const f=$('#inquiryForm');f.reset();for(const name of ['title','service','destination','people','startDate','endDate','requirements','stage','nextDate','outcome','budget','quotedAmount','dealAmount','currency','lostReason'])f.elements[name].value=q?.[name]??({service:services[0],stage:stages[0],outcome:outcomes[0],currency:'TWD'}[name]||'');
 $('#inquiryDialogTitle').textContent=q?'更新詢問案件':'新增詢問案件';$('#inquiryOwner').textContent=`${a.name} · ${c.name}`;$('#deleteInquiry').hidden=!q;
 $('#inquiryHistory').innerHTML=(q?.history||[]).slice().reverse().map(h=>`<article class="visitLog"><small>${esc(new Date(h.at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}))} · ${esc(h.outcome==='進行中'?h.stage:h.outcome)}</small><p>${esc(h.text)}</p><small>報價 ${esc(money(h.quotedAmount,h.currency))}${h.outcome==='已成交'?` · 成交 ${esc(money(h.dealAmount,h.currency))}`:''}${h.nextDate?` · 跟進 ${esc(h.nextDate)}`:''}</small></article>`).join('')||'<p class="muted">儲存後會保留每次跟進紀錄。</p>';
 visibility();refreshSelects();$('#inquiryDialog').showModal();$('#inquiryClose').focus({preventScroll:true});
}
export function initInquiries(){
 $('#inquiryDialog').addEventListener('cancel',e=>{if(saving)e.preventDefault()});
 for(const [name,options]of Object.entries({service:services,stage:stages,outcome:outcomes,currency:currencies}))$('#inquiryForm').elements[name].innerHTML=options.map(v=>`<option>${v}</option>`).join('');refreshSelects();
 document.addEventListener('click',e=>{const b=e.target.closest('[data-inquiry-new],[data-inquiry-id]');if(b)openInquiry(b.dataset.inquiryAgency,b.dataset.inquiryContact,b.dataset.inquiryId||null)});
 $('#inquiryForm').elements.outcome.onchange=visibility;
 $('#inquiryForm').onsubmit=async e=>{e.preventDefault();if(saving||!context)return;try{
  const {agencyId,contactId,inquiryId}=context,c=store.rows.find(a=>a.id===agencyId)?.contacts?.find(c=>c.id===contactId),old=c?.inquiries?.find(q=>q.id===inquiryId);if(inquiryId&&!old)throw Error('案件已不存在，請重新開啟');
  const q=buildInquiry(formData(e.target),old||{},uid());const rows=updateContact(store.rows,agencyId,contactId,c=>({inquiries:inquiryId?c.inquiries.map(item=>item.id===inquiryId?q:item):[...(c.inquiries||[]),q]}));
  if(new TextEncoder().encode(JSON.stringify(rows)).length>3800000)throw Error('資料已達容量上限，請先在設定備份並整理名片照片');
  saving=true;$('#inquiryDialog').setAttribute('data-saving','');$('#inquirySave').disabled=true;if(await store.save(rows)){$('#inquiryDialog').close();document.dispatchEvent(new Event('contactsrefresh'));toast('詢問案件已儲存')}
 }catch(err){toast(err.message)}finally{saving=false;$('#inquiryDialog').removeAttribute('data-saving');$('#inquirySave').disabled=false}};
 $('#deleteInquiry').onclick=async()=>{if(saving||!context?.inquiryId||!confirm('刪除這筆詢問案件及其跟進紀錄？'))return;try{const {agencyId,contactId,inquiryId}=context;saving=true;if(await store.save(updateContact(store.rows,agencyId,contactId,c=>({inquiries:(c.inquiries||[]).filter(q=>q.id!==inquiryId)})))){$('#inquiryDialog').close();document.dispatchEvent(new Event('contactsrefresh'));toast('詢問案件已刪除')}}catch(err){toast(err.message)}finally{saving=false}};
}
