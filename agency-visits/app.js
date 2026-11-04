/* Assembly only. Each screen / feature lives in modules/. */
import {initCore,toast} from './modules/core.js';
import {store} from './modules/store.js';
import {loadGeo} from './modules/geo.js';
import {initNavigation,renderNavigation} from './modules/navigation.js';
import {initSchedule,renderSchedule} from './modules/schedule.js';
import {initList,renderList} from './modules/list.js';
import {initDetails} from './modules/details.js';
import {initContacts} from './modules/contacts.js';
import {initRatings,renderRatings} from './modules/ratings.js';
import {initExclusions,renderExclusions} from './modules/exclusions.js';
import {renderTracking} from './modules/tracking.js';
import {initSettings,renderSettings} from './modules/settings.js';
import {initMap,renderMap} from './modules/map.js';
initCore();initNavigation();initSchedule();initList();initDetails();initContacts();initRatings();initExclusions();initSettings();initMap();
store.subscribe(()=>{renderNavigation();renderSchedule();renderList();renderTracking();renderRatings();renderExclusions();renderSettings();renderMap()});
window.Cloud.onData=(rows,settings)=>store.hydrate(rows,settings);
try{await loadGeo()}catch(e){toast(e.message)}
store.emit();window.Cloud.start();
