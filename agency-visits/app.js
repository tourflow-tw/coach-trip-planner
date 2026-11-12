import {initAddToday} from './modules/add-today.js?v=1.26';
import {initDayClose} from './modules/day-close.js?v=1.26';
import {initConflictResolution} from './modules/conflict-resolution.js?v=1.26';
import {initDailyRecords,renderDailyRecords} from './modules/daily-records.js?v=1.26';
import {initTravel} from './modules/travel.js?v=1.26';
import {initInquiries} from './modules/inquiries.js?v=1.26';
/* Assembly only. Each screen / feature lives in modules/. */
import {initCore,toast} from './modules/core.js?v=1.26';
import {initSelects,refreshSelects} from './modules/selects.js?v=1.26';
import {store} from './modules/store.js?v=1.26';
import {loadGeo} from './modules/geo.js?v=1.26';
import {initNavigation,renderNavigation} from './modules/navigation.js?v=1.26';
import {initSchedule,renderSchedule} from './modules/schedule.js?v=1.26';
import {initList,renderList} from './modules/list.js?v=1.26';
import {initDetails} from './modules/details.js?v=1.26';
import {initContacts} from './modules/contacts.js?v=1.26';
import {initCardPhotoOptimizer,renderCardPhotoOptimizer} from './modules/photo-optimizer.js?v=1.26';
import {initRatings,renderRatings} from './modules/ratings.js?v=1.26';
import {initExclusions,renderExclusions} from './modules/exclusions.js?v=1.26';
import {renderTracking} from './modules/tracking.js?v=1.26';
import {initSettings,renderSettings} from './modules/settings.js?v=1.26';
import {initMap,renderMap} from './modules/map.js?v=1.26';
import {initVisitLocation,renderVisitLocation} from './modules/visit-location.js?v=1.26';
import {loadBuildingData} from './modules/building-data.js?v=1.26';
import {initBuildingNames} from './modules/building-names.js?v=1.26';
import {initPasses} from './modules/passes.js?v=1.26';
initPasses();store.init();initConflictResolution();initCore();initSelects();initNavigation();initSchedule();initList();initDetails();initContacts();initCardPhotoOptimizer();initInquiries();initRatings();initExclusions();initSettings();initMap();initBuildingNames();initVisitLocation();initTravel();initAddToday();initDayClose();initDailyRecords();
store.subscribe(()=>{renderNavigation();renderSchedule();renderDailyRecords();renderList();renderTracking();renderRatings();renderExclusions();renderSettings();renderCardPhotoOptimizer();refreshSelects();renderMap();renderVisitLocation()});
window.Cloud.onData=(rows,settings)=>store.hydrate(rows,settings);
try{await loadGeo()}catch(e){toast(e.message)}
try{await loadBuildingData()}catch(e){toast(e.message)}
store.emit();
await store.recover();
window.Cloud.start().catch(e=>{toast('雲端初始化失敗，手機資料仍保留：'+e.message)});
