/* 이름 없는 탑 — 온라인 서버 (무의존성)
 * 계정 + 클라우드 세이브 + 실시간 채팅(SSE) + 경매장.
 * 실행: node server/server.js   →   http://localhost:8787
 * 클라(index.html)의 온라인 레이어(js/net.js)가 여기에 연결.
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { db, markDirty, flushNow, CHAT_MAX } = require("./store");

const PORT = process.env.PORT || 8787;
const CLIENT_DIR = path.join(__dirname, "..");   // 게임 정적 파일(index.html·js·assets) 루트
const tokens = new Map();   // token -> userId (인메모리; 재시작 시 재로그인)
const STATIC_MIME = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".gif":"image/gif",
  ".svg":"image/svg+xml", ".ico":"image/x-icon", ".webp":"image/webp", ".woff":"font/woff", ".woff2":"font/woff2", ".ttf":"font/ttf" };
/* 게임 정적 파일 서빙 — server/ 와 data/ 는 노출 금지 */
function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const safe = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");
  if (safe.startsWith("/server") || safe.startsWith("\\server")) { res.writeHead(403); return res.end("forbidden"); }
  const filePath = path.join(CLIENT_DIR, safe);
  if (!filePath.startsWith(CLIENT_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("404"); }
    res.writeHead(200, { "Content-Type": STATIC_MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

/* ---------- 유틸 ---------- */
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...cors() });
  res.end(JSON.stringify(obj));
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}
function body(req) {
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 4e6) req.destroy(); });
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
  });
}
function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 64).toString("hex"); }
function newId() { return crypto.randomBytes(9).toString("hex"); }
function authUser(req) {
  const h = req.headers["authorization"] || "";
  const tok = h.replace(/^Bearer\s+/i, "");
  const uid = tokens.get(tok);
  return uid ? db.accounts[uid] : null;
}
function nameTaken(name) { return Object.values(db.accounts).some((a) => a.name.toLowerCase() === String(name).toLowerCase()); }

/* ---------- SSE 허브 (실시간 푸시) ---------- */
const sseClients = new Set();   // { res, userId, name }
function sseSend(client, event, data) {
  try { client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {}
}
function broadcast(event, data) { for (const c of sseClients) sseSend(c, event, data); }
setInterval(() => broadcast("ping", { t: Date.now() }), 25000);   // keep-alive

/* ---------- 라우팅 ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (req.method === "OPTIONS") { res.writeHead(204, cors()); return res.end(); }

  try {
    /* 상태 확인 (클라가 서버 존재 감지용) */
    if (p === "/api/ping") return json(res, 200, { ok: true, online: sseClients.size, name: "이름 없는 탑 서버" });

    /* 회원가입 */
    if (p === "/api/register" && req.method === "POST") {
      const { name, password } = await body(req);
      const nm = String(name || "").trim().slice(0, 16);
      if (nm.length < 2) return json(res, 400, { error: "이름은 2자 이상" });
      if (!password || String(password).length < 4) return json(res, 400, { error: "비밀번호는 4자 이상" });
      if (nameTaken(nm)) return json(res, 409, { error: "이미 존재하는 이름" });
      const id = newId(), salt = crypto.randomBytes(16).toString("hex");
      db.accounts[id] = { id, name: nm, salt, hash: hashPw(password, salt), created: Date.now() };
      markDirty("accounts");
      const token = newId() + newId(); tokens.set(token, id);
      return json(res, 200, { token, userId: id, name: nm });
    }

    /* 로그인 */
    if (p === "/api/login" && req.method === "POST") {
      const { name, password } = await body(req);
      const acc = Object.values(db.accounts).find((a) => a.name.toLowerCase() === String(name || "").toLowerCase());
      if (!acc || acc.hash !== hashPw(password, acc.salt)) return json(res, 401, { error: "이름 또는 비밀번호가 틀림" });
      const token = newId() + newId(); tokens.set(token, acc.id);
      return json(res, 200, { token, userId: acc.id, name: acc.name });
    }

    /* 클라우드 세이브 조회/저장 */
    if (p === "/api/save") {
      const user = authUser(req); if (!user) return json(res, 401, { error: "로그인 필요" });
      if (req.method === "GET") { const s = db.saves[user.id]; return json(res, 200, { data: s ? s.data : null, updated: s ? s.updated : 0 }); }
      if (req.method === "PUT") { const { data } = await body(req); db.saves[user.id] = { data, updated: Date.now() }; markDirty("saves"); return json(res, 200, { ok: true, updated: db.saves[user.id].updated }); }
    }

    /* 채팅: 최근 로그 조회 / 전송 */
    if (p === "/api/chat") {
      if (req.method === "GET") return json(res, 200, { messages: db.chat.slice(-60) });
      if (req.method === "POST") {
        const user = authUser(req); if (!user) return json(res, 401, { error: "로그인 필요" });
        const { text } = await body(req); const t = String(text || "").trim().slice(0, 200);
        if (!t) return json(res, 400, { error: "빈 메시지" });
        const msg = { id: newId(), name: user.name, text: t, ts: Date.now() };
        db.chat.push(msg); if (db.chat.length > CHAT_MAX) db.chat = db.chat.slice(-CHAT_MAX); markDirty("chat");
        broadcast("chat", msg);
        return json(res, 200, { ok: true });
      }
    }

    /* 경매장: 목록 / 등록 / 구매 */
    if (p === "/api/auctions" && req.method === "GET") {
      return json(res, 200, { auctions: db.auctions.filter((a) => !a.sold).slice(-100) });
    }
    if (p === "/api/auctions" && req.method === "POST") {
      const user = authUser(req); if (!user) return json(res, 401, { error: "로그인 필요" });
      const { item, price, up } = await body(req);
      const pr = Math.max(1, Math.round(+price || 1));
      if (!item) return json(res, 400, { error: "아이템 없음" });
      const a = { id: newId(), sellerId: user.id, sellerName: user.name, item: String(item).slice(0, 40), up: +up || 0, price: pr, ts: Date.now(), sold: false };
      db.auctions.push(a); if (db.auctions.length > 500) db.auctions = db.auctions.slice(-500); markDirty("auctions");
      broadcast("auction", { type: "list", a });
      return json(res, 200, { ok: true, id: a.id });
    }
    const buyM = p.match(/^\/api\/auctions\/([a-f0-9]+)\/buy$/);
    if (buyM && req.method === "POST") {
      const user = authUser(req); if (!user) return json(res, 401, { error: "로그인 필요" });
      const a = db.auctions.find((x) => x.id === buyM[1]);
      if (!a || a.sold) return json(res, 404, { error: "이미 팔렸거나 없음" });
      if (a.sellerId === user.id) return json(res, 400, { error: "자기 물건은 못 삼" });
      a.sold = true; a.buyerName = user.name; a.soldTs = Date.now(); markDirty("auctions");
      broadcast("auction", { type: "sold", id: a.id });
      return json(res, 200, { ok: true, item: a.item, up: a.up, price: a.price, sellerName: a.sellerName });
    }

    /* SSE 실시간 스트림 (?token=... 로 인증) */
    if (p === "/events") {
      const uid = tokens.get(url.searchParams.get("token") || "");
      const acc = uid ? db.accounts[uid] : null;
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", ...cors() });
      res.write(`event: hello\ndata: ${JSON.stringify({ name: acc ? acc.name : "손님", online: sseClients.size + 1 })}\n\n`);
      const client = { res, userId: uid, name: acc ? acc.name : "손님" };
      sseClients.add(client);
      broadcast("presence", { online: sseClients.size });
      req.on("close", () => { sseClients.delete(client); broadcast("presence", { online: sseClients.size }); });
      return;
    }

    /* API가 아니면 게임 정적 파일 서빙 (한 서버가 게임+API 모두 제공 → 배포 URL 하나) */
    if (req.method === "GET" && !p.startsWith("/api/") && p !== "/events") return serveStatic(req, res, p);
    json(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "server error" });
  }
});

server.listen(PORT, () => console.log(`🌐 이름 없는 탑 온라인 서버: http://localhost:${PORT}`));
process.on("SIGINT", () => { flushNow(); process.exit(0); });
process.on("SIGTERM", () => { flushNow(); process.exit(0); });
