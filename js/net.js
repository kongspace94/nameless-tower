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
  name: localStorage.getItem("nt_name") || null,   // 아이디(로그인용)
  nick: localStorage.getItem("nt_nick") || null,   // 닉네임(게임 표시명)
  online: !!localStorage.getItem("nt_token"),   // 저장된 토큰 있으면 이미 로그인된 것으로(→ 타이틀서 로그아웃 노출)
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
  const r = await fetch(NET.url + path, { method: opts.method || "GET", headers, cache: "no-store", body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = null; try { data = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((data && data.error) || ("HTTP " + r.status));
  return data;
}

/* 서버 존재 감지 (2초 타임아웃) */
async function netPing() {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 60000);   // 무료 콜드스타트 대비 넉넉히
    const r = await fetch(NET.url + "/api/ping?t=" + Date.now(), { signal: ctrl.signal, cache: "no-store" }); clearTimeout(t);   // 캐시버스터
    NET.serverUp = r.ok; return r.ok;
  } catch (e) { NET.serverUp = false; return false; }
}

/* 비밀번호 IME 통일: 한글(두벌식)을 항상 같은 영문 키스트로크로 변환 → IME 상태 무관하게 동일 비번
 * 예) "의주홍1234"(한글) == "dmlwnghd1234"(영문) — 같은 물리 키니까 */
const KO_CHO=["r","R","s","e","E","f","a","q","Q","t","T","d","w","W","c","z","x","v","g"];
const KO_JUNG=["k","o","i","O","j","p","u","P","h","hk","ho","hl","y","n","nj","np","nl","b","m","ml","l"];
const KO_JONG=["","r","R","rt","s","sw","sg","e","f","fr","fa","fq","ft","fx","fv","fg","a","q","qt","t","T","d","w","c","z","x","v","g"];
const KO_JAMO={"ㄱ":"r","ㄲ":"R","ㄴ":"s","ㄷ":"e","ㄸ":"E","ㄹ":"f","ㅁ":"a","ㅂ":"q","ㅃ":"Q","ㅅ":"t","ㅆ":"T","ㅇ":"d","ㅈ":"w","ㅉ":"W","ㅊ":"c","ㅋ":"z","ㅌ":"x","ㅍ":"v","ㅎ":"g","ㅏ":"k","ㅐ":"o","ㅑ":"i","ㅒ":"O","ㅓ":"j","ㅔ":"p","ㅕ":"u","ㅖ":"P","ㅗ":"h","ㅛ":"y","ㅜ":"n","ㅠ":"b","ㅡ":"m","ㅣ":"l"};
function pwNormalize(pw){ let out=""; const s=String(pw||"");
  for(const ch of s){ const code=ch.codePointAt(0);
    if(code>=0xAC00 && code<=0xD7A3){ const c=code-0xAC00, jong=c%28, jung=((c-jong)/28)%21, cho=(((c-jong)/28)-jung)/21; out+=KO_CHO[cho]+KO_JUNG[jung]+KO_JONG[jong]; }
    else if(KO_JAMO[ch]) out+=KO_JAMO[ch];
    else out+=ch;
  } return out; }
async function netRegister(name, password) {
  const d = await netFetch("/api/register", { method: "POST", body: { name, password: pwNormalize(password) } });
  netStoreAuth(d); return d;
}
async function netLogin(name, password) {
  // 변환값 + 원본 둘 다 보냄 → 옛 계정(변환 전 저장)도 로그인되게(서버가 둘 중 하나 일치하면 통과)
  const d = await netFetch("/api/login", { method: "POST", body: { name, password: pwNormalize(password), passwordRaw: String(password || "") } });
  netStoreAuth(d); return d;
}
async function netRecover(name, code, newPassword) {   // 🔑 이름+복구코드로 새 비번 설정 후 로그인
  const d = await netFetch("/api/recover", { method: "POST", body: { name, code: String(code || ""), newPassword: pwNormalize(newPassword) } });
  netStoreAuth(d); return d;
}
async function netRecoveryRegen() {   // 🔑 로그인 상태에서 복구 코드 재발급
  const d = await netFetch("/api/recovery/regen", { method: "POST", body: {} }); return d.recoveryCode;
}
function netStoreAuth(d) {
  NET.token = d.token; NET.userId = d.userId; NET.name = d.name; NET.nick = d.nick || d.name; NET.online = true;
  localStorage.setItem("nt_token", d.token); localStorage.setItem("nt_uid", d.userId); localStorage.setItem("nt_name", d.name);
  localStorage.setItem("nt_nick", NET.nick);
}
async function netSetNick(nick, avatar) {   // 🏷 닉네임 + 아바타를 서버에 반영(채팅 표시명·프로필 사진)
  const body = { nick: String(nick || "") }; if (avatar !== undefined) body.avatar = (avatar == null ? "" : avatar);
  const d = await netFetch("/api/nick", { method: "POST", body });
  NET.nick = d.nick; try { localStorage.setItem("nt_nick", d.nick); } catch (e) {}
  return d.nick;
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
  es.addEventListener("townpos", (e) => { try { NET.onTownPos && NET.onTownPos(JSON.parse(e.data)); } catch (x) {} });
  es.addEventListener("townleave", (e) => { try { NET.onTownLeave && NET.onTownLeave(JSON.parse(e.data)); } catch (x) {} });
  es.onerror = () => { /* EventSource가 자동 재연결 */ };
}
/* 🗺 마을 위치 동기화 */
async function netTownPos(x, y) { return netFetch("/api/town/pos", { method: "POST", body: { x, y } }); }
async function netTownLeave() { try { return await netFetch("/api/town/pos", { method: "POST", body: { leave: true } }); } catch (e) {} }
async function netTownRoster() { const d = await netFetch("/api/town/pos"); return d.players || []; }
