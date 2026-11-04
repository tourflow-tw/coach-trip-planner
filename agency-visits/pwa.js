'use strict';
(()=>{
 let promptEvent=null;const button=document.querySelector('#installApp');
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const reflect=()=>{button.textContent=installed()?'已安裝 APP':'安裝 APP';button.disabled=installed()};reflect();
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;reflect()});
 window.addEventListener('appinstalled',()=>{promptEvent=null;reflect()});
 button.onclick=async()=>{
  if(promptEvent){const event=promptEvent;promptEvent=null;await event.prompt();await event.userChoice;reflect();return}
  document.querySelector('#installText').textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'請使用 Safari 開啟，點「分享」→「加入主畫面」。':'請用 Chrome 或 Edge 開啟此網址，在瀏覽器選單選擇「安裝應用程式」或「新增至主畫面」。若剛更新網站，請重新整理後再試。';
  document.querySelector('#installHelp').classList.remove('hidden');
 };
 document.querySelector('#closeInstallHelp').onclick=()=>document.querySelector('#installHelp').classList.add('hidden');
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{button.title='離線快取未啟用，請重新整理後再試'});
})();
