/* 이름 없는 탑 — 서버 데이터 저장 계층 (무의존성 JSON 파일 스토어)
 * 개인/취미 규모용. 원자적 쓰기(temp→rename)로 손상 방지. 추후 SQLite 이관 가능.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");   // 클라우드 볼륨은 DATA_DIR 환경변수로 지정
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function file(name) { return path.join(DATA_DIR, name); }
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), "utf8")); }
  catch (e) { return fallback; }
}
function writeJSON(name, obj) {
  const tmp = file(name + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file(name));   // 원자적 교체
}

/* ---- 인메모리 상태 (부팅 시 로드, 변경 시 디스크 반영) ---- */
const db = {
  accounts: readJSON("accounts.json", {}),   // { userId: {id, name, salt, hash, created} }
  saves:    readJSON("saves.json", {}),       // { userId: {data, updated} }   data = 클라 P 전체
  chat:     readJSON("chat.json", []),        // [ {id, name, text, ts} ]  최근 N개
  auctions: readJSON("auctions.json", []),    // [ {id, sellerId, sellerName, item, price, ts, sold, buyerName} ]
};
const CHAT_MAX = 200;

let dirty = {};
function markDirty(k) { dirty[k] = true; }
/* 1초마다 변경분만 디스크에 반영(쓰기 폭주 방지) */
setInterval(() => {
  for (const k of Object.keys(dirty)) { try { writeJSON(k + ".json", db[k]); } catch (e) { console.error("save fail", k, e.message); } }
  dirty = {};
}, 1000);
function flushNow() { for (const k of Object.keys(db)) writeJSON(k + ".json", db[k]); }

module.exports = { db, markDirty, flushNow, CHAT_MAX };
