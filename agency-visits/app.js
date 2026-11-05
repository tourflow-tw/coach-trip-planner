/* Assembly only. Each screen / feature lives in modules/. */
import {initCore,toast} from './modules/core.js?v=1.04';
import {initSelects,refreshSelects} from './modules/selects.js?v=1.04';
import {store} from './modules/store.js?v=1.04';
import {loadGeo} from './modules/geo.js?v=1.04';
import {initNavigation,renderNavigation} from './modules/navigation.js?v=1.04';
import {initSchedule,renderSchedule} from './modules/schedule.js?v=1.04';
import {initList,renderList} from './modules/list.js?v=1.04';
import {initDetails} from './modules/details.js?v=1.04';
import {initContacts} from './modules/contacts.js?v=1.04';
import {initRatings,renderRatings} from './modules/ratings.js?v=1.04';
import {initExclusions,renderExclusions} from './modules/exclusions.js?v=1.04';
import {renderTracking} from './modules/tracking.js?v=1.04';
import {initSettings,renderSettings} from './modules/settings.js?v=1.04';
import {initMap,renderMap} from './modules/map.js?v=1.04';
initCore();initSelects();initNavigation();initSchedule();initList();initDetails();initContacts();initRatings();initExclusions();initSettings();initMap();
store.subscribe(()=>{renderNavigation();renderSchedule();renderList();renderTracking();renderRatings();renderExclusions();renderSettings();refreshSelects();renderMap()});
window.Cloud.onData=(rows,settings)=>store.hydrate(rows,settings);
try{await loadGeo()}catch(e){toast(e.message)}
store.emit();window.Cloud.start();
