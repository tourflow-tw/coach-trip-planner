# 同業拜訪簿 — 免登入 Supabase 同步版

一般入口： https://tourflow-tw.github.io/coach-trip-planner/agency-visits/

使用者請使用對話中提供的「專屬同步網址」。網址的 `#sync=…` 是 256-bit 隨機存取鑰匙；手機、電腦開啟同一完整網址即共用同一份資料，不需註冊或登入。持有完整網址者可讀寫，請勿公開轉傳。複製同步網址按鈕可搬到另一台自己的裝置。

## 同步方式

- 前端只呼叫 `agency-visit-sync` Edge Function，服務驗證同步鑰匙後存取 `public.agency_visit_sync`。
- 伺服器僅保存鑰匙的 SHA-256 hash。鑰匙不在 GitHub 原始碼；service_role 僅使用 Edge Function 內建環境變數，不回傳前端。
- 資料表啟用 RLS，匿名與 authenticated 都無直接讀寫權；每次讀寫均由 Edge Function 驗證鑰匙。
- 儲存使用 revision 比對，在資料庫 PATCH 條件同時檢查版本，攔截其他裝置造成的舊版本覆寫。
- 儲存後立即寫入 Supabase；每 15 秒、切回頁面或按「重新同步」會讀取最新資料。編輯視窗開啟期間不自動讀取，避免蓋掉輸入。
- 網路失敗、無效網址或版本衝突不會自動覆寫雲端或關閉編輯表單。請保留輸入內容，重新同步後再修改。沒有離線寫入佇列。
- 瀏覽器僅記住同步網址鑰匙，名單以 Supabase 為準。清除瀏覽器資料後，仍可透過原本完整網址取回名單。

## 功能與區域

旅行社名單、聯絡人、拜訪紀錄、今日待跑、下次追蹤、搜尋、狀態／區域篩選、地圖連結、CSV 匯出及 JSON 備份／還原。

區域為松江路以東、南京東路以北整個右上方，另含兩條路單號。區域由使用者標記，未自動定位地址、未預載實際旅行社。

原 Sites 本機版資料請先下載 JSON，再在新版匯入。舊帳號版資料表保留原本權限，未改為匿名開放。

## 容量與維護

每個同步簿一筆 JSON，最多約 3.9 MB、10,000 間，適合個人同業管理。需要大量資料時可再拆分逐筆資料表。更換鑰匙需在伺服器更新 hash 並另提供新連結；舊鑰匙會失效。

Schema: `../supabase/agency-visits-link.sql`。Edge Function: `../supabase/functions/agency-visit-sync/index.ts`。Function 使用 `verify_jwt=false` 並自行驗證每次請求的能力鑰匙；不得移除鑰匙檢查。
