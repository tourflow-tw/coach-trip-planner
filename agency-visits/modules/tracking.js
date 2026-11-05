import {$,esc,today} from './core.js?v=1.20';
import {store} from './store.js?v=1.20';
import {groups,origin} from './geo.js?v=1.20';
import {renderGroups} from './cards.js?v=1.20';
import {activeInquiries} from './inquiry-data.js?v=1.20';
import {inquiryMarkup} from './inquiries.js?v=1.20';
export function renderTracking(){const cases=activeInquiries(store.rows),rows=store.rows.filter(a=>a.status==='待追蹤'&&!a.routeExcluded);$('#trackingTitle').textContent=`正在追蹤詢問（${cases.length} 筆案件）`;$('#trackingList').innerHTML=`<p class="muted pageIntro">今日／逾期待跟進 ${cases.filter(x=>x.inquiry.nextDate&&x.inquiry.nextDate<=today()).length} 筆</p>`+(cases.map(({agency:a,contact:c,inquiry:q})=>`<section class="trackingCase"><button type="button" class="contactLink" data-contact-open="${esc(c.id)}" data-contact-agency="${esc(a.id)}">${esc(a.name)} · ${esc(c.name)} ↗</button>${inquiryMarkup(q,`data-inquiry-agency="${esc(a.id)}" data-inquiry-contact="${esc(c.id)}" data-inquiry-id="${esc(q.id)}"`)}</section>`).join('')||'<p class="empty">目前沒有進行中的詢問。從旅行社的「查看聯絡人」新增案件。</p>')+(rows.length?'<h2 class="legacyTracking">旅行社追蹤標記</h2>'+renderGroups(groups(rows,origin(store.settings))):'')}
