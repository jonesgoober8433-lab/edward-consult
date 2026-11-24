# 預約諮詢收件程式：設定步驟（一次約 10 分鐘）

網頁送出 → Apps Script → ① Google 試算表 ② Notion「預約諮詢收件匣」 ③ 通知信寄給自己

> Notion 鑰匙只貼在 Apps Script 的「指令碼屬性」，不要貼到對話、GitHub、記憶檔。

## A. 拿 Notion 鑰匙（3 分鐘）
1. 開 https://www.notion.so/profile/integrations → 「新增整合（New integration）」
2. 名稱填「預約諮詢收件」，工作區選你的，類型「內部（Internal）」→ 儲存
3. 複製「內部整合密鑰（Internal Integration Secret）」，等一下要貼（先不要關分頁）
4. 回 Notion 打開「預約諮詢收件匣」資料庫 → 右上角「⋯」→「連線（Connections）」→ 加入「預約諮詢收件」

## B. 建試算表＋貼程式（5 分鐘）
1. 開 https://sheets.new ，檔名改成「預約諮詢回覆」
2. 上方選單「擴充功能 → Apps Script」
3. 把 `Code.gs` 全部內容貼上，取代原本的程式 → 按 💾 儲存
4. 左邊齒輪「專案設定」→ 最下面「指令碼屬性」→「新增指令碼屬性」
   - 屬性：`NOTION_TOKEN`
   - 值：貼上 A-3 複製的密鑰 → 儲存

## C. 測試＋上線（2 分鐘）
1. 回「編輯器」，上方函式選「測試一筆」→ 按「執行」→ 第一次會要求授權，選你的 Google 帳號 → 允許
2. 看試算表多了一列「（測試）可刪除」，最後一欄是「✅ 已建立」；Notion 收件匣也有一筆 → 兩邊都刪掉
3. 右上角「部署 → 新增部署作業」→ 類型「網頁應用程式」
   - 執行身分：**我**
   - 誰可以存取：**所有人**
4. 按「部署」→ 複製「網頁應用程式網址」（https://script.google.com/macros/s/…/exec）→ 貼給小Edward

小Edward 會把網址填進網頁、實際送一筆測試，確認兩邊都收到才換成正式版。
