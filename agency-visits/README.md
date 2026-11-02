# 同業拜訪簿 — GitHub Pages + Supabase

正式入口： https://tourflow-tw.github.io/coach-trip-planner/agency-visits/

前端為純靜態 HTML/JS；使用工作專用 Supabase 專案的 Email Auth 與獨立的 `public.agency_visit_books` 表。每個帳號只可讀寫自己的資料，未登入無法讀取。前端僅含 publishable key。

## 使用方式

1. 首次使用點「第一次使用？註冊」，填寫信箱與至少 8 字元密碼。
2. 在信箱確認驗證信，回到拜訪簿登入。如果驗證信跳轉到其他頁面失敗，仍可回此頁登入；也能複製原始確認連結，使用登入頁下方「貼上確認連結」驗證。
3. 手機與電腦使用同一信箱登入，新增／修改完成即儲存雲端。開啟頁面、切回頁面與每 60 秒讀取最新資料；編輯視窗開啟時不自動重讀。也可按「重新同步」。
4. 原 Sites 版本的資料不會自動轉移。請先在原版下載 JSON 備份，再於新版登入後按「匯入／還原」。匯入 JSON 會提示取代目前名單；CSV 則追加並略過同名稱與地址。
5. 網路失敗或版本衝突時不會關閉表單。衝突時先保留未儲存文字／匯出現有名單，關閉表單並重新同步後再編輯。沒有離線寫入佇列。

## 區域

松江路以東、南京東路以北的整個右上方，另包含松江路單號及南京東路單號。沒有另外設定東、北邊界。區域由使用者建檔標記，沒有自動地址定位或完整旅行社名單。

## 資料設計與限制

- 每個使用者一筆 JSON 名單，包含旅行社及拜訪紀錄。單筆最大 4,000,000 bytes；適合個人同業拜訪管理。大量資料時應拆分逐筆資料表。
- `save_agency_visit_book` 是 security invoker RPC，在同一交易中檢查 revision 後儲存；舊版本寫入回傳 VERSION_CONFLICT。匯入也使用同一原子操作。
- SQL 定義：`../supabase/agency-visits.sql`。已在工作專案執行；不要重複執行 CREATE。
- Supabase JS 以官方 npm 套件 2.57.4 UMD 檔固定版本，與靜態頁一同部署。來源： https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js 。套件採 MIT 授權。
- GitHub 只保存程式碼；名單、聯絡人、拜訪紀錄均不寫入 GitHub。

## 驗證

`node --check agency-visits/app.js`

`node --check agency-visits/cloud.js`

`node tests/agency-cloud.test.cjs`

另已於遠端資料庫以交易測試首次新增、更新、版本衝突、不可更換擁有者及跨帳號隔離；測試資料 rollback。Supabase security advisors 無警告。實際寄信、使用者註冊與跨裝置登入仍需由使用者完成。
