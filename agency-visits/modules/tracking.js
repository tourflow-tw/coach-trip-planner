import {$} from './core.js';import {store} from './store.js';import {groups,origin} from './geo.js';import {renderGroups} from './cards.js';
export function renderTracking(){const rows=store.rows.filter(a=>a.status==='待追蹤'&&!a.routeExcluded);$('#trackingTitle').textContent=`正在追蹤詢問（${rows.length}）`;$('#trackingList').innerHTML=renderGroups(groups(rows,origin(store.settings)))}
