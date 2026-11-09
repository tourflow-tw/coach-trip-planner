import {initAddToday} from './modules/add-today.js?v=1.24';
import {initDayClose} from './modules/day-close.js?v=1.24';
import {initDailyRecords,renderDailyRecords} from './modules/daily-records.js?v=1.24';
import {initTravel} from './modules/travel.js?v=1.24';
import {initInquiries} from './modules/inquiries.js?v=1.24';
/* Assembly only. Each screen / feature lives in modules/. */
import {initCore,toast} from './modules/core.js?v=1.24';
import {initSelects,refreshSelects} from './modules/selects.js?v=1.24';
import {store} from './modules/store.js?v=1.24';
import {loadGeo} from './modules/geo.js?v=1.24';
import {initNavigation,renderNavigation} from './modules/navigation.js?v=1.24';
import {initSchedule,renderSchedule} from './modules/schedule.js?v=1.24';
import {initList,renderList} from './modules/list.js?v=1.24';
import {initDetails} from './modules/details.js?v=1.24';
import {initContacts} from './modules/contacts.js?v=1.24';
import {initRatings,renderRatings} from './modules/ratings.js?v=1.24';
import {initExclusions,renderExclusions} from './modules/exclusions.js?v=1.24';
import {renderTracking} from './modules/tracking.js?v=1.24';
import {initSettings,renderSettings} from './modules/settings.js?v=1.24';
import {initMap,renderMap} from './modules/map.js?v=1.24';
import {initVisitLocation,renderVisitLocation} from './modules/visit-location.js?v=1.24';
import {loadBuildingData} from './modules/building-data.js?v=1.24';
import {initBuildingNames} from './modules/building-names.js?v=1.24';
import {initPasses} from './modules/passes.js?v=1.24';
initPasses();store.init();initCore();initSelects();initNavigation();initSchedule();initList();initDetails();initContacts();initInquiries();initRatings();initExclusions();initSettings();initMap();initBuildingNames();initVisitLocation();initTravel();initAddToday();initDayClose();initDailyRecords();
store.subscribe(()=>{renderNavigation();renderSchedule();renderDailyRecords();renderList();renderTracking();renderRatings();renderExclusions();renderSettings();refreshSelects();renderMap();renderVisitLocation()});
window.Cloud.onData=(rows,settings)=>store.hydrate(rows,settings);
try{await loadGeo()}catch(e){toast(e.message)}
try{await loadBuildingData()}catch(e){toast(e.message)}
store.emit();window.Cloud.start().then(()=>store.recover()).catch(e=>{toast('雲端初始化失敗，請檢查連線：'+e.message);store.recover()});
