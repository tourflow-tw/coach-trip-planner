/* Official NLSC public EMAP WMTS; only visible tiles, no prefetch or offline tile cache. */
export const TILE_URL='https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';
export const TILE_OPTIONS={minZoom:7,maxZoom:19,referrerPolicy:'strict-origin',attribution:'© <a href="https://maps.nlsc.gov.tw/" target="_blank" rel="noopener">內政部國土測繪中心</a>'};
