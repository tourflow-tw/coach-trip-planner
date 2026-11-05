# 同業拜訪簿 v1.02

GitHub Pages 前端、Supabase 權限網址讀寫；前端不保存名單副本。點右下版本號刷新。

## 程式定位

| 檔案 | 負責範圍 |
| --- | --- |
| app.js | 僅組裝各模組與連接資料更新 |
| sync.js | Supabase 讀寫、自動更新、版本衝突保護 |
| modules/navigation.js | 分頁切換 |
| modules/selects.js | 自訂可搜尋選單、鍵盤操作與表單值同步 |
| modules/schedule.js | 今日頁與產生排程 |
| modules/routing.js | 星等回訪間隔、最近鄰與開放路徑 2-opt |
| modules/geo.js | 門牌正規化、樓層、座標、距離、同棟分組 |
| modules/list.js | 名單搜尋、路名／狀態／同棟篩選、家數與分頁 |
| modules/cards.js | 同棟卡片與星等按鈕 |
| modules/details.js | 旅行社編輯與拜訪紀錄 |
| modules/contacts.js | 聯絡人、名片照片與儲存 |
| modules/ocr.js | Tesseract.js 6.0.1 繁體中文／英文辨識、欄位擷取 |
| modules/ratings.js | 1–5 星設定及星等頁 |
| modules/tracking.js | 正在追蹤詢問頁 |
| modules/exclusions.js | 不用再跑、原因與恢復排程 |
| modules/settings.js | 中心座標、備份與設定頁 |
| modules/map.js | Leaflet 1.9.4 地圖側欄及拜訪順序 |
| modules/store.js | 記憶體狀態、通知與寫入組裝 |
| modules/core.js | 日期、文字跳脫、版本與基本互動 |
| pwa.js / sw.js | 安裝與程式檔案快取；不快取 Supabase 回應 |

## 資料與路線

- 中心：使用者提供的捷利地址，臺北市中山區民權東路二段9號2樓之4。
- 公開門牌座標：臺北市民政局 2026-11-02 資料；`address-points.json` 只含需要的公開門牌；北泰國際旅行社使用其官網提供的座標。
- 路名以最近一個同業門牌到中心的直線距離排序；同棟名單以中心距離排序。
- 排程先依到期、星等與距離選棟，再以最近鄰及 2-opt 排序。地圖虛線不是步行導航。
- 回訪間隔：1 星 90 天、2 星 60 天、3 星 30 天、4 星 14 天、5 星 7 天；手動指定日期優先。
- OCR 在瀏覽器處理圖片，第一次下載語言模型需網路；只在使用者確認後儲存。
- Supabase `settings` 與名單使用同一 revision 原子儲存，舊客戶端沒有傳 settings 時不覆寫。

## 版本維護

每次發布將 `modules/core.js` 的版本加 0.01，並同步更新 HTML、模組匯入 URL 與 Service Worker 快取版本。右下版本按鈕重新載入頁面。

## 指定第一棟

智慧排程可搜尋並指定第一棟地址，該棟固定排最前；棟內由高樓往下，再接續附近同業。同棟地址合併顯示家數。人工指定可優先於自動回訪日期，但不接受不用再跑或今天已完成的同業。
