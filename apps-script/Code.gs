/**
 * Edward 1:1 諮詢表單：收件程式（Google Apps Script）
 * ---------------------------------------------------------------
 * 網頁送出 → 這支程式 → ① 這個 Google 試算表多一列  ② Notion「預約諮詢收件匣」多一筆  ③ 寄一封通知信給你自己
 *
 * 設定方式見同資料夾的 README.md。
 * Notion 鑰匙（NOTION_TOKEN）放在「專案設定 → 指令碼屬性」，不要寫在這個檔案裡。
 */

const NOTION_DB = '42129ee3ddc181fb8c43c531dce36a71'; // 預約諮詢收件匣
const SHEET_NAME = '預約諮詢回覆';
const NOTIFY_ME = true; // 每筆新預約寄一封信到你自己的 Gmail

const COLUMNS = ['送出時間', '姓名', '聯絡方式', '電子郵件', '方便聯絡時段', '最想解決的痛點', '困擾多久', '家庭狀況',
  '使用中的金融工具', '拿回時間想做什麼', '貸款與槓桿駕駛技術', '過去理財學習花費', '目前職業', '所在縣市',
  '得知管道', '社群帳號', '裝置', 'Notion 狀態'];

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  if (d.website) return out({ ok: true }); // 機器人陷阱欄位

  const clean = v => Array.isArray(v) ? v.map(x => String(x).slice(0, 60)).slice(0, 12) : String(v || '').trim().slice(0, 500);
  Object.keys(d).forEach(k => d[k] = clean(d[k]));
  if (!d['姓名'] || !d['聯絡方式']) return out({ ok: false, error: 'missing' });

  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let row;
  try {
    const sh = sheet();
    sh.appendRow(COLUMNS.map(c => c === '送出時間' ? now : c === 'Notion 狀態' ? '處理中' : Array.isArray(d[c]) ? d[c].join('、') : (d[c] || '')));
    row = sh.getLastRow();
  } finally { lock.releaseLock(); }

  let notion = '✅ 已建立';
  try { toNotion(d, now); } catch (err) { notion = '❌ ' + String(err).slice(0, 200); }
  sheet().getRange(row, COLUMNS.length).setValue(notion);

  if (NOTIFY_ME) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `【新預約】${d['姓名']}｜${[].concat(d['最想解決的痛點']).join('、')}`,
        COLUMNS.slice(1, -1).map(c => `${c}：${Array.isArray(d[c]) ? d[c].join('、') : (d[c] || '—')}`).join('\n') + `\n\nNotion：${notion}\n24 小時內記得聯絡！`);
    } catch (err) {}
  }
  return out({ ok: true }); // 試算表已存好就算成功；Notion 失敗會寫在試算表最後一欄＋通知信
}

function toNotion(d, now) {
  const token = PropertiesService.getScriptProperties().getProperty('NOTION_TOKEN');
  if (!token) throw new Error('還沒設定 NOTION_TOKEN');
  const txt = v => ({ rich_text: [{ text: { content: String(v || '').slice(0, 1900) } }] });
  const sel = v => v ? { select: { name: v } } : undefined;
  const multi = v => ({ multi_select: [].concat(v || []).filter(Boolean).map(name => ({ name })) });
  const iso = t => Utilities.formatDate(t, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const props = {
    '姓名': { title: [{ text: { content: d['姓名'] } }] },
    '狀態': { select: { name: '🆕 新進件' } },
    '送出時間': { date: { start: iso(now) } },
    '24 小時內聯絡': { date: { start: iso(new Date(now.getTime() + 24 * 3600 * 1000)) } },
    '聯絡方式': txt(d['聯絡方式']),
    '方便聯絡時段': multi(d['方便聯絡時段']),
    '最想解決的痛點': multi(d['最想解決的痛點']),
    '困擾多久': sel(d['困擾多久']),
    '家庭狀況': multi(d['家庭狀況']),
    '使用中的金融工具': multi(d['使用中的金融工具']),
    '拿回時間想做什麼': txt(d['拿回時間想做什麼']),
    '貸款與槓桿駕駛技術': sel(d['貸款與槓桿駕駛技術']),
    '過去理財學習花費': sel(d['過去理財學習花費']),
    '目前職業': txt(d['目前職業']),
    '所在縣市': txt(d['所在縣市']),
    '得知管道': sel(d['得知管道']),
    '社群帳號': txt(d['社群帳號']),
  };
  if (d['電子郵件']) props['電子郵件'] = { email: d['電子郵件'] };
  Object.keys(props).forEach(k => props[k] === undefined && delete props[k]);

  const res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28' },
    payload: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: props }),
  });
  if (res.getResponseCode() >= 300) throw new Error(res.getResponseCode() + ' ' + res.getContentText().slice(0, 160));
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#f4e8cf');
  }
  return sh;
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 設定好之後，在編輯器上方選這個函式按「執行」：會用一筆假資料測試試算表＋Notion。 */
function 測試一筆() {
  const r = doPost({ postData: { contents: JSON.stringify({
    '姓名': '（測試）可刪除', '聯絡方式': 'test', '最想解決的痛點': ['退休與傳承'], '困擾多久': '半年左右',
    '家庭狀況': ['有伴侶'], '使用中的金融工具': ['股票'], '拿回時間想做什麼': '測試', '方便聯絡時段': ['平日晚上'] }) } });
  Logger.log(r.getContent());
  Logger.log('看試算表最後一列的「Notion 狀態」：✅ 就代表 Notion 也寫進去了');
}
