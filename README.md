## 免登入模式（V4.1）

- **開啟網頁直接使用**，不用註冊或登入。網站預設僅用瀏覽器 `localStorage` 保留草稿及本機行程，無需與 Supabase 交換使用者資料。
- 「儲存到本機」建立／更新本機行程；「行程管理／備份」可以載入歷史行程、下載 JSON 備份、在另一裝置匯入 JSON。
- 編輯中草稿會自動儲存並在重開同一瀏覽器時恢復；不是雲端同步。**無痕模式、清除瀏覽器資料、換裝置／瀏覽器均可能遺失本機內容。**
- Supabase 已部署的 Auth、`trips` 表和 RLS 不變；選用登入後的雲端功能保留。不得把 `trips` 表改成公開匿名讀寫。
- 若需跨裝置同步，請改用選用的雲端登入，或手動匯出／匯入 JSON。

# 旅程智排 TourFlow — 遊覽車行程規劃系統

這是**旅行社排團工具**，不是駕駛導航。支援桌機與手機，前端可部署在 GitHub Pages，Supabase 雲端是選用的登入／儲存服務。

## 已具備功能

- 2～10 個站點；依序輸入出發地、景點、餐廳、飯店。每站可設定停留時間、最早抵達、最晚抵達。
- 固定起終點與任意中途站位置；其他站點使用路網時間矩陣搜尋較短排列（最多 8 個可移動站點）。
- 時間窗衝突與自訂 11 小時提醒；優化結果先比較、確認後才套用；可以還原原始順序。
- 免費快速估算：OSRM 公用 demo API 的一般汽車路網時間 + 可選緩衝。**不能視為遊覽車實際可通行路線。**
- 選用 openrouteservice driving-hgv/bus 路線：須自行取得 ORS API Key；若已部署 Edge Function 並登入，可把金鑰保存在伺服器。
- OSM/Overpass 附近候選限高、限重、禁行資料查詢（抽樣掃描；非保證完整）；人工補充道路備註。
- 計算分段車程、距離、抵達／離開時間，CSV 匯出與列印。
- 本機儲存行程；選用 Supabase Email Auth、Postgres + RLS 做雲端儲存。

## 本機啟動

將 ZIP 解壓縮，在目錄內執行：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000`。也能直接開啟 `index.html`，但 `file://` 模式下地圖與網路 API 可能受瀏覽器限制。實際路線查詢需連網，OSRM / Nominatim / Overpass 公共服務存在使用限制或不穩定性。

## GitHub Pages 部署（Repository `tourflow-tw/coach-trip-planner`）

將本專案根目錄檔案上傳至 `main` 分支：`index.html`、`styles.css`、`planner.js`、`app.js` 等。前往 GitHub Repository → Settings → Pages → Build and deployment：選擇 Deploy from a branch，Branch 選 `main`，Folder 選 `/ (root)`，儲存。GitHub Pages 顯示完成後網站將位於：

`https://tourflow-tw.github.io/coach-trip-planner/`

這是 GitHub Pages 格式；**發布前不能宣稱網址已能連線**。

## 新 Supabase Project 建置

1. 在**工作專用帳號**的 Organization 建立全新專案（須先確認費用與組織）。建議 Project Name `coach-trip-planner`、Region Tokyo (`ap-northeast-1`)。
2. Supabase Dashboard → SQL Editor，執行 `supabase/schema.sql`。所有使用者行程表 `public.trips` 已啟用 RLS，彼此隔離。
3. Authentication → Email：視需求開啟驗證信箱，並設定 GitHub Pages 正式網址作為 Site URL 與 Redirect URL。
4. Project Settings → API：取得 Project URL 和 **Publishable Key（`sb_publishable_...`）**，在前端右上方「雲端登入／設定」填入，連接後註冊/登入。
5. 可選：部署 `supabase/functions/coach-route/index.ts` 的 Edge Function `coach-route`；將 ORS 金鑰設為 `ORS_API_KEY` secret 並啟用 JWT 驗證，前端登入後會優先呼叫該函式。若使用較新的 asymmetric JWT / publishable keys，部署前請實際驗證該函式的 Auth 行為。

**絕對不要**將 `service_role`、`sb_secret_...` 或路由私人金鑰上傳 GitHub。使用者端只放 Publishable Key，並且依靠 RLS 保護行程資料。

## 如何規劃

1. 用「快速估算」輸入完整地點名稱（含縣市），選擇車型、停留、固定時間。
2. 按「計算目前路線」查看基準車程；按「一鍵優化順序」比較候選排列。
3. 選擇「套用建議順序」，重新計算路線與時間表。
4. 查看時間窗衝突、道路疑慮；必要時人工備註並問車行。
5. 儲存到本機或 Supabase，並匯出 CSV 給業務排表。

## 關鍵限制與資料風險

- 「一般車路網」不避開大型車不可通行路段。大型車模式受 ORS/OSM 資料覆蓋率限制，仍可能遇到小型橋洞、法規限制或狹路。
- **排序使用 OSRM 一般車路網的點對點時間矩陣**，即使選用大型車模式，也會先以一般車路網排序，再對套用後路線使用大型車路由查證；因此不保證真的減少大型車車程，也不保證安全。
- 最早／最晚抵達依規劃當日 00:00–23:59 模型處理；跨日景點時間窗需要分日建模；不能以此模型處理多日連續工作時數。
- 免費公共 API 無 SLA、有限流；大規模商用應換成授權或自架服務，並遵守 Nominatim、OSRM、Overpass 使用政策。
- OSM/Overpass 掃描為沿線抽樣 120 公尺候選限制，可能漏掉禁行路段、橋洞或錯將平行道路的限制列入。**0 筆不等於安全。**
- 車型示範尺寸僅供填表，請依車輛實際規格修正。
- 每日 11 小時為可調整的行程提醒值，不代表法規符合性判斷。

## 測試

```bash
node tests/planner.test.js
node --check planner.js
node --check app.js
```

需上線後人工驗證 Nominatim 定位、OSRM/ORS 路由、Overpass 風險掃描、Supabase Email 驗證、RLS 不可跨帳號存取、手機版及 CSV。

## 主要檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 介面 HTML、外部地圖／Supabase JS 元件 |
| `styles.css` | 手機與桌面響應式樣式 |
| `planner.js` | 可獨立測試的最佳化與時間表引擎 |
| `app.js` | 地圖、路由、定位、備註、儲存及 Supabase 登入 |
| `supabase/schema.sql` | 雲端資料表 + RLS |
| `supabase/functions/coach-route/index.ts` | 選用的 ORS 伺服器端代理 |


## 雲端部署進度（2026-10-13）

- Supabase 專案 `coach-trip-planner` 已建立（Tokyo，專案代號 `oafoxkpepuldeaaraxcm`）。
- `public.trips` 已部署，開啟 RLS 並設置四項行程擁有者政策，安全顧問目前無警告。
- `coach-route` Edge Function 已部署且驗證 JWT；**ORS_API_KEY 尚未設定**，大型車路由仍未啟用。
- GitHub 已上傳前端，使用 Publishable Key 連接新 Supabase。若要讓網頁公開，請於 GitHub Pages 設定選擇 main / (root)。
- 使用者註冊驗證郵件如需正確回到網站，請在 Supabase Authentication URL Configuration 設定 Site URL 和 Redirect URL：`https://tourflow-tw.github.io/coach-trip-planner/`（待 GitHub Pages 啟用）。
- Publishable Key 不是資料庫 secret；不可上傳 service_role／sb_secret／ORS 私人金鑰。