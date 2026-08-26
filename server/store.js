/* 이름 없는 탑 — 서버 데이터 저장 계층
 * MONGODB_URI 있으면 MongoDB Atlas(영구 저장), 없으면 로컬 JSON 파일(개발용) 자동 폴백.
 * 서버는 인메모리(db 객체)로 동작하고, 부팅 시 로드 + 변경분을 주기적으로 저장소에 반영.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const MONGODB_URI = process.env.MONGODB_URI || "";
const CHAT_MAX = 200;
const KEYS = ["accounts", "saves", "chat", "auctions"];
const DEFAULTS = { accounts: {}, saves: {}, chat: [], auctions: [] };

/* 인메모리 상태 (server.js가 동기적으로 사용) — 프로퍼티를 '뮤테이트'만 함(재할당 X) */
const db = { accounts: {}, saves: {}, chat: [], auctions: [] };
let dirty = {}, col = null, client = null;

function markDirty(k) { dirty[k] = true; }

/* ---- JSON 파일 폴백 ---- */
function file(name) { return path.join(DATA_DIR, name); }
function readJSON(name, fb) { try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch (e) { return fb; } }
function writeJSON(name, obj) { const tmp = file(name + ".tmp"); fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, file(name)); }

/* ---- 부팅 시 저장소에서 로드 ---- */
async function init() {
  if (MONGODB_URI) {
    const { MongoClient } = require("mongodb");
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    col = client.db("nameless_tower").collection("kv");   // {_id:"accounts"|..., data:{...}}
    for (const k of KEYS) {
      const doc = await col.findOne({ _id: k });
      db[k] = (doc && doc.data !== undefined) ? doc.data : structuredClone(DEFAULTS[k]);
    }
    console.log("💾 MongoDB Atlas 연결됨 — 데이터 영구 저장");
  } else {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db.accounts = readJSON("accounts.json", {}); db.saves = readJSON("saves.json", {});
    db.chat = readJSON("chat.json", []); db.auctions = readJSON("auctions.json", []);
    console.log("📁 로컬 파일 스토어 (MONGODB_URI 미설정 — 개발용)");
  }
}

/* ---- 변경분 저장(디바운스) ---- */
async function flushKey(k) {
  try { if (col) await col.updateOne({ _id: k }, { $set: { data: db[k] } }, { upsert: true }); else writeJSON(k + ".json", db[k]); }
  catch (e) { console.error("flush fail", k, e.message); }
}
setInterval(() => { const ks = Object.keys(dirty); dirty = {}; ks.forEach(flushKey); }, 1500);
async function flushNow() { for (const k of KEYS) await flushKey(k); }

module.exports = { db, markDirty, flushNow, init, CHAT_MAX };
