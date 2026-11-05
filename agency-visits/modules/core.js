export const VERSION='1.17';
export const $=s=>document.querySelector(s);
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid=()=>crypto.randomUUID();
export const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date());
export const statuses=['尚未拜訪','已拜訪','待追蹤','已有合作','暫不合作'];
export const category=a=>a.category||String(a.note||'').match(/旅行業類別[：:]\s*(甲種|乙種|綜合)/)?.[1]||'未分類';
export const hasVisited=a=>a.status!=='尚未拜訪'&&((a.logs||[]).length>0||['已拜訪','待追蹤','已有合作','暫不合作'].includes(a.status));
export const rating=a=>hasVisited(a)&&Number(a.rating)>=1&&Number(a.rating)<=5?Math.round(Number(a.rating)):0;
export const intervals={1:90,2:60,3:30,4:14,5:7};
export function toast(message){const dialogs=[...document.querySelectorAll('dialog[open]')];(dialogs.at(-1)||document.body).append($('#toast'));$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500)}
export function formData(form){return Object.fromEntries(new FormData(form))}
export function initCore(){document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b&&!$('#'+b.dataset.close).hasAttribute('data-saving'))$('#'+b.dataset.close).close()});$('#version').textContent='v'+VERSION;$('#version').onclick=()=>location.reload()}
