/* 이름 없는 탑 — 클라이언트 온라인 레이어
 * 서버(server/server.js)에 연결: 계정·클라우드 세이브·실시간 채팅(SSE)·경매장.
 * 서버 없으면 조용히 오프라인(localStorage·로컬 시뮬)으로 폴백 → 포터빌리티 유지.
 */
const NET = {
  // 게임이 http(s)로 서빙되면 같은 origin(=서버)에 연결 → 배포 시 설정 불필요. file://(단일파일)이면 로컬/지정 서버.
  url: (window.__SERVER_URL__ || localStorage.getItem("nt_server") ||
    ((typeof location!=="undefined" && /^https?:$/.test(location.protocol)) ? location.origin : "http://localhost:8787")),
  token: localStorage.getItem("nt_token") || null,
  userId: localStorage.getItem("nt_uid") || null,
  name: localStorage.getItem("nt_name") || null,
  online: false,      // 로그인되어 온라인 모드로 플레이 중인가
  serverUp: false,    // 서버가 살아있는가(감지)
  sse: null,
  onChat: null,       // (msg)=>{}
  onPresence: null,   // (n)=>{}
  onAuction: null,    // (evt)=>{}
  saveTimer: null,
};

async function netFetch(path, opts) {
  opts = opts || {};
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (NET.token) headers["Authorization"] = "Bearer " + NET.token;
  const r = await fetch(NET.url + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = null; try { data = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((data && data.error) || ("HTTP " + r.status));
  return data;
}

/* 서버 존재 감지 (2초 타임아웃) */
async function netPing() {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(NET.url + "/api/ping", { signal: ctrl.signal }); clearTimeout(t);
    NET.serverUp = r.ok; return r.ok;
  } catch (e) { NET.serverUp = false; return false; }
}

async function netRegister(name, password) {
  const d = await netFetch("/api/register", { method: "POST", body: { name, password } });
  netStoreAuth(d); return d;
}
async function netLogin(name, password) {
  const d = await netFetch("/api/login", { method: "POST", body: { name, password } });
  netStoreAuth(d); return d;
}
function netStoreAuth(d) {
  NET.token = d.token; NET.userId = d.userId; NET.name = d.name; NET.online = true;
  localStorage.setItem("nt_token", d.token); localStorage.setItem("nt_uid", d.userId); localStorage.setItem("nt_name", d.name);
}
function netLogout() {
  NET.online = false; NET.token = null;
  localStorage.removeItem("nt_token");
  if (NET.sse) { try { NET.sse.close(); } catch (e) {} NET.sse = null; }
}

/* 클라우드 세이브 */
async function netSaveLoad() { const d = await netFetch("/api/save"); return d.data; }        // 없으면 null
function netSavePush(P) {
  if (!NET.online) return;
  clearTimeout(NET.saveTimer);
  NET.saveTimer = setTimeout(() => { netFetch("/api/save", { method: "PUT", body: { data: P } }).catch(() => {}); }, 800);  // 디바운스
}

/* 채팅 */
async function netChatHistory() { const d = await netFetch("/api/chat"); return d.messages || []; }
async function netChatSend(text) { return netFetch("/api/chat", { method: "POST", body: { text } }); }

/* 경매장 */
async function netAuctionList() { const d = await netFetch("/api/auctions"); return d.auctions || []; }
async function netAuctionSell(item, up, price) { return netFetch("/api/auctions", { method: "POST", body: { item, up, price } }); }
async function netAuctionBuy(id) { return netFetch("/api/auctions/" + id + "/buy", { method: "POST" }); }

/* SSE 실시간 스트림 연결 */
function netConnectSSE() {
  if (!NET.online || !NET.token) return;
  if (NET.sse) { try { NET.sse.close(); } catch (e) {} }
  const es = new EventSource(NET.url + "/events?token=" + encodeURIComponent(NET.token));
  NET.sse = es;
  es.addEventListener("chat", (e) => { try { NET.onChat && NET.onChat(JSON.parse(e.data)); } catch (x) {} });
  es.addEventListener("presence", (e) => { try { const d = JSON.parse(e.data); NET.onPresence && NET.onPresence(d.online); } catch (x) {} });
  es.addEventListener("auction", (e) => { try { NET.onAuction && NET.onAuction(JSON.parse(e.data)); } catch (x) {} });
  es.onerror = () => { /* EventSource가 자동 재연결 */ };
}
