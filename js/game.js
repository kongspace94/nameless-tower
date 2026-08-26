"use strict";
/* ============================================================
   죽음 / 승리 (로그라이트: 마을 귀환, 캐릭터 유지)
   ============================================================ */
function die(){ stopAuctionTimer(); enemy=null; B=null; clearLog(); setScene("💀","");
  line(`<b style="color:var(--danger)">탑 ${P.floor}층에서 정신을 잃었다…</b>`);
  line("눈을 떠보니 마을 어귀였다. 누군가 당신을 옮겨준 모양이다.","quote");
  const loss=Math.floor(P.gold*0.1); if(loss>0){ P.gold-=loss; line(`정신없는 사이 금화 ${loss}를 잃었다.`,"dmg"); }
  line("얻은 재료와 스킬, 스탯은 그대로다.","sys");
  render(); setActions([{label:"🏘 마을로 돌아간다",full:true,act:townMenu}]); }
function victory(){ stopAuctionTimer(); enemy=null; B=null; clearLog(); setScene("👑","");
  const good=P.karma>=3, evil=P.karma<=-3;
  line(`<b style="color:var(--gold)">— 탑의 꼭대기 —</b>`);
  line("이름 없는 신이 재가 되고, 탑 전체가 숨을 멈춘다. 남은 것은 당신, 그리고 텅 빈 옥좌뿐이다.");
  if(good){
    line("당신은 옥좌를 등진다. 갇혔던 영혼들이 빛으로 풀려나고, 탑이 안에서부터 무너져 내린다.","quote");
    line("오랜 저주가 끝났다. 탑 아래에 — 처음으로, 아침이 온다.","quote");
    line("★ <b>해방자</b> 엔딩 — 오른 끝에서, 당신은 오르지 않기를 택했다.","loot");
  } else if(evil){
    line("당신은 텅 빈 옥좌에 앉는다. 이름 없는 신의 힘이 당신을 감싸고, 얼굴이 서서히 지워진다.","quote");
    line("탑은 무너지지 않는다. 다음 오르는 자를 기다리며 — 이제 <b>당신의 이름 없는 이름</b>으로.","quote");
    line("★ <b>새로운 탑의 주인</b> 엔딩 — 힘을 택한 자는, 스스로 시련이 된다.","loot");
  } else {
    line("당신은 옥좌도, 파괴도 택하지 않고 돌아선다. 탑은 그대로 서 있다.","quote");
    line("왜 올랐는지 끝내 기억해내지 못한 채 — 오른 자만이 아는 침묵을 안고, 다시 아래로.","quote");
    line("★ <b>방랑자</b> 엔딩 — 답을 얻지 못한 자의, 조용한 결말.","loot");
  }
  line("정상의 보물을 쓸어담아 마을로 돌아왔다.","sys"); P.gold+=300; Object.keys(MATS).forEach(m=>addMat(m,5)); gainStamina(STAM_MAX); line("💰 금화 +300, 재료 대량 획득! 생활력도 가득 찼다.","loot");
  const firstClear = !(P.flags.cleared>0);
  P.flags.cleared=(P.flags.cleared||0)+1;
  if(firstClear){ P.flags.continentUnlocked=true;   // 정상 도달 → 대륙 개척 해금 + 세계관 확장
    line("— 그러나, 탑을 내려서던 순간 —","sys");
    line("끝이라 믿었던 하늘 너머로, <b>광대한 대륙</b>과 그 위에 솟은 <b>수많은 탑</b>이 모습을 드러낸다.","loot");
    line("이 탑은 시작에 불과했다. 진짜 여정은 이제부터다 — <b>🧭 대륙 개척</b>이 열렸다!","loot");
    toast("🧭 대륙 개척 해금!");
  }
  line(`— 회귀 ${P.flags.cleared}회. 탑은, 다시 당신을 부를 것이다. —`,"sys");   // 로그라이트 회귀 암시
  checkTitleUnlocks(); render();
  setActions([{label:"🏘 마을로 (다시 도전 가능)",full:true,act:townMenu}]); }

/* ============================================================
   🌌 회귀 (로그라이트 메타성장)
   ============================================================ */
function echoesEarned(){ if(!P)return 0; const statTotal=Object.values(P.stats).reduce((a,b)=>a+(b||0),0);
  const peak=Math.max(P.runPeakFloor||0,P.floor||0);
  return Math.max(0, Math.round(peak*0.7 + (P.runContClears||0)*20 + (P.runKills||0)*0.06 + statTotal*0.3 + ((P.karma>=3||P.karma<=-3)?15:0))); }
/* 🌌 회귀 — 제자리 리셋. 오직 스탯·배운 스킬만 초기화(장비·가방·창고·골드·계약·재료 전부 유지 → 창고 관리 불필요). NG+로 난이도 보완 */
function reincarnate(){ const meta=P.meta||{echoes:0,spent:{},runs:0,bestFloor:0,bestCont:0};
  const gained=echoesEarned(); meta.echoes=(meta.echoes||0)+gained; meta.runs=(meta.runs||0)+1;
  meta.bestFloor=Math.max(meta.bestFloor||0, P.runPeakFloor||P.floor||0);
  meta.bestCont=Math.max(meta.bestCont||0, (P.flags&&P.flags.contCleared)||0);
  stopAuctionTimer(); auction=null; enemy=null; B=null; EXP=null; expReturn=null; mode="town";
  // ▼ 리셋: 스탯·성장·이번 런 버프/추적 (그 외 전부 유지). 스킬은 '지식 계승' 강화 있으면 유지
  P.stats={str:5,int:5,dex:5,vit:5,luk:3}; P.train={str:0,int:0,dex:0,vit:0,luk:0}; P.lifeStat={str:0,int:0,dex:0,vit:0,luk:0};
  if(!metaEff().legacy){ P.skills=[]; P.skillProf={}; P.loadout=[]; P.passives=[]; P.skillSlots=SLOT_BASE; }
  P.buffs={}; P.runPeakFloor=0; P.runContClears=0; P.runKills=0; P.floor=1; P.portals=[1];
  applyMetaStart();   // 🌌 회귀 강화 시작 보너스(시작 스탯/골드/물약) 재적용
  P.hp=MAXHP(); P.mp=MAXMP();
  normalizeP(); save(true); render();
  return gained; }

/* ============================================================
   세이브 / 시작
   ============================================================ */
const SAVE_KEY="nameless_tower_save_v4";
function save(silent){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(P)); if(!silent)toast("저장했습니다"); }catch(e){}
  if(P&&P._online&&typeof netSavePush==="function")netSavePush(P);   // 🌐 온라인: 클라우드 세이브(디바운스)
}
function newGame(){ stopAuctionTimer(); auction=null; enemy=null; B=null; mode="town"; if(document.body)document.body.classList.remove("title"); P=freshPlayer(); render(); clearLog(); intro(); }
function intro(){ setScene("🗼","끝이 보이지 않는 탑이 하늘을 찌른다.");
  line("<b>이름 없는 탑.</b> 언제부터 거기 있었는지 아무도 모른다.");
  line("탑은 오르는 자에게 무엇이든 약속한다 — 부, 힘, 잃어버린 것, 되돌리고 싶은 단 하루.");
  line('<span class="quote">"오르라. 끝에서 너를 기다리는 것은 — 너 자신이다."</span>');
  line("그 목소리에 홀려 수많은 이가 올랐고, 아무도 내려오지 않았다.","sys");
  line("당신도 그중 하나다. 이름도, 어제도 기억나지 않는 채 — 탑 아래 <b>거점 마을</b>에서 눈을 떴다.");
  line("먼저, 당신을 뭐라 부를까?","sys");
  setActions([{label:"이름을 정한다",act:askName},{label:"'방랑자'로 시작",act:()=>{ P.name="방랑자"; render(); chooseCompanion(); }}]); }
function askName(){ const n=prompt("당신의 이름은?","방랑자"); P.name=(n&&n.trim())?n.trim().slice(0,12):"방랑자"; render(); chooseCompanion(); }
function chooseCompanion(){ clearLog(); setScene("🧚","작은 정령 셋이 당신을 바라본다.");
  line(`<b>${P.name}</b>. 함께 탑을 오를 <b>서포트 동료</b>를 고르자. 전투마다 자동으로 돕는다.`);
  Object.entries(COMPANIONS).forEach(([k,c])=>line(`${c.emoji} <b>${c.n}</b> — ${c.note}`,"sys"));
  setActions(Object.entries(COMPANIONS).map(([k,c])=>({ label:`${c.emoji} ${c.n}`, desc:c.note, act:()=>{ P.companion=k; render(); tutorial(); } }))); }
function tutorial(){ clearLog(); setScene("🏘️","거점 마을에 도착했다.");
  line("좋다. 이제 <b>거점 마을</b>에서 시작한다.","sys");
  line("• <b>생활 활동</b>으로 스탯을 단련하고 재료를 모아라 (예: 벌목→힘).","sys");
  line("• 모은 재료로 <b>스킬</b>을 배우고, <b>경매장</b>에서 사고팔아라.","sys");
  line("• 준비되면 <b>탑에 다이브</b>해 재료·골드·유물을 얻어라. 죽어도 마을로 돌아온다.","sys");
  setActions([{label:"마을 시작",full:true,act:townMenu}]); }

/* 하단 버튼 */
function navBlockMsg(){ return enemy?"전투 중엔 갈 수 없어요":"탑 안에서는 사용할 수 없어요. 아래 '🚪 마을로 귀환'으로 나가세요"; }
const canNav = () => P && !enemy && mode!=="dive";
$("btnTown").onclick=()=>{ if(canNav())townMenu(); else toast(navBlockMsg()); };
$("btnInv").onclick=()=>{ if(canNav())inventoryMenu(); else toast(enemy?"전투 중엔 볼 수 없어요":"탑에서는 '계단' 화면의 🎒 소지품에서 장비를 착용하세요"); };
$("btnSkill").onclick=()=>{ if(canNav())skillWindow(); else toast(navBlockMsg()); };
$("btnTitle").onclick=()=>{ if(canNav())titleMenu(); else toast(enemy?"전투 중엔 볼 수 없어요":navBlockMsg()); };
$("btnDex").onclick=()=>{ if(P&&!enemy)codexMenu(); else toast("전투 중엔 볼 수 없어요"); };
{ const ch=$("cdhead"); if(ch)ch.onclick=()=>toggleChatDock(); const cs=$("cdsend"); if(cs)cs.onclick=()=>chatSend(); }
$("pname").onclick=()=>{ if(P&&!enemy)profileMenu(); };
{ const po=$("por"); if(po){ po.style.cursor="pointer"; po.onclick=()=>{ if(P&&!enemy)profileMenu(); }; } }
$("btnAuction").onclick=()=>{ if(canNav())openAuction(); else toast(navBlockMsg()); };
$("btnSave").onclick=()=>{ if(P)save(); };
$("btnReset").onclick=()=>{ if(confirm("정말 처음부터? 캐릭터가 삭제됩니다.")){ localStorage.removeItem(SAVE_KEY); newGame(); } };

/* ---------- 타이틀 화면 ---------- */
function titleBgSvg(){   // 인라인 SVG로 그린 '끝이 보이지 않는 탑' 배경 (외부 이미지 없이 자급자족)
  const cx=720, halfW=y=>48+60*((y-130)/770);
  let stars=""; for(let i=0;i<82;i++){ const x=Math.round(Math.random()*1440), y=Math.round(Math.random()*560);
    if(Math.hypot(x-1140,y-190)<145)continue; const r=(Math.random()*1.5+0.3).toFixed(2), o=(Math.random()*0.65+0.2).toFixed(2);
    stars+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#e6ecff" opacity="${o}"/>`; }
  let tiers=""; [820,660,500,340,200].forEach(y=>{ const hw=halfW(y)+8, x=Math.round(cx-hw), w=Math.round(hw*2);
    tiers+=`<rect x="${x}" y="${y-7}" width="${w}" height="16" fill="#1c2340"/><rect x="${x}" y="${y-9}" width="${w}" height="3" fill="#2b3457"/>`;
    for(let m=0;m<Math.round(w/16);m++)tiers+=`<rect x="${x+m*16}" y="${y-15}" width="8" height="7" fill="#1c2340"/>`; });
  let win=""; for(let y=840;y>=240;y-=54){ const jit=(Math.floor(y/54)%2?13:-13), wx=cx+jit;
    win+=`<circle cx="${wx}" cy="${y+7}" r="13" fill="url(#wglow)"/><rect x="${wx-4}" y="${y}" width="8" height="14" rx="2" fill="#ffce6b"/>`; }
  const p=`M ${cx-halfW(900)} 900 L ${(cx-halfW(70)).toFixed(0)} 70 L ${(cx+halfW(70)).toFixed(0)} 70 L ${cx+halfW(900)} 900 Z`;
  return `<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080b18"/><stop offset="0.4" stop-color="#141a33"/><stop offset="0.72" stop-color="#26203f"/><stop offset="1" stop-color="#0b0912"/></linearGradient>
      <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fdf6dd"/><stop offset="0.55" stop-color="#efe3b8"/><stop offset="1" stop-color="#efe3b8" stop-opacity="0"/></radialGradient>
      <linearGradient id="twr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10152a"/><stop offset="1" stop-color="#1b2138"/></linearGradient>
      <radialGradient id="wglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffcf6a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/></radialGradient>
      <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2444" stop-opacity="0"/><stop offset="1" stop-color="#0b0912"/></linearGradient>
      <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.62"/></radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#sky)"/>
    ${stars}
    <circle cx="1140" cy="190" r="115" fill="url(#moon)"/><circle cx="1140" cy="190" r="66" fill="#fbf4d8"/>
    <circle cx="1120" cy="175" r="10" fill="#e5d9ad" opacity="0.45"/><circle cx="1162" cy="206" r="7" fill="#e5d9ad" opacity="0.45"/>
    <path d="M 360 900 L 372 470 L 420 470 L 432 900 Z" fill="#0e1326" opacity="0.85"/>
    <path d="M 1010 900 L 1020 540 L 1060 540 L 1070 900 Z" fill="#0e1326" opacity="0.8"/>
    <path d="${p}" fill="url(#twr)" stroke="#2b3457" stroke-width="1.5"/>
    ${tiers}${win}
    <circle cx="720" cy="120" r="28" fill="url(#wglow)"/><circle cx="720" cy="120" r="5" fill="#ffd98a"/>
    <ellipse cx="720" cy="150" rx="520" ry="62" fill="#141a33" opacity="0.55"/>
    <ellipse cx="640" cy="186" rx="360" ry="42" fill="#181f3a" opacity="0.5"/>
    <ellipse cx="860" cy="206" rx="300" ry="36" fill="#181f3a" opacity="0.45"/>
    <rect x="0" y="560" width="1440" height="340" fill="url(#mist)"/>
    <ellipse cx="480" cy="852" rx="640" ry="92" fill="#0b0912" opacity="0.72"/>
    <ellipse cx="1000" cy="882" rx="640" ry="92" fill="#0b0912" opacity="0.72"/>
    <rect width="1440" height="900" fill="url(#vig)"/>
  </svg>`;
}
function hasSave(){ try{ const s=localStorage.getItem(SAVE_KEY); if(!s)return false; const p=JSON.parse(s); return !!(p&&p.stats); }catch(e){ return false; } }
function leaveTitle(){ if(document.body)document.body.classList.remove("title"); }
function titleScreen(){ stopAuctionTimer(); auction=null; enemy=null; B=null; mode="town";
  if(document.body){ document.body.classList.remove("combat","intower"); document.body.classList.add("title"); }
  const hud=$("hud"); if(hud)hud.hidden=true; const ub=$("uibar"); if(ub)ub.hidden=true; const qt=$("qtrack"); if(qt)qt.hidden=true;
  const bg=$("titlebg"); if(bg&&!bg.firstChild)bg.innerHTML=titleBgSvg();   // 탑 배경 주입(1회)
  clearLog(); setScene("🗼","끝이 보이지 않는 탑이 하늘을 찌른다.");
  let info=""; try{ const p=JSON.parse(localStorage.getItem(SAVE_KEY)||"null"); if(p&&p.stats)info=`이어할 캐릭터 — <b>${p.name}</b> · 다이브 ${p.dives||0}회 · 처치 ${p.kills||0}`; }catch(e){}
  line(info || '기억 없는 방랑자가 되어, 탑 정상의 진실을 마주하라.', info?"sys":"quote");
  const acts=[];
  if(hasSave())acts.push({label:"▶ 이어하기",desc:"저장된 캐릭터로 계속 (오프라인)",full:true,act:loadSaveGame});
  acts.push({label:"✦ 새로 시작",desc:hasSave()?"저장을 지우고 새 캐릭터로":"새 캐릭터로 시작",full:true,act:confirmNewGame});
  acts.push({label: (typeof NET!=="undefined"&&NET.online)?`🌐 온라인 (${NET.name})`:"🌐 온라인 플레이",desc:"계정·클라우드 세이브·실시간 채팅·경매",full:true,act:onlineScreen});
  acts.push({label:"⚙ 설정",full:true,act:settingsScreen});
  acts.push({label:"❔ 도움말",full:true,act:helpScreen});
  setActions(acts); }
/* 🌐 온라인 진입 — 서버 감지 → 로그인/가입 → 클라우드 세이브 로드 */
async function onlineScreen(){ if(typeof NET==="undefined"){ toast("온라인 모듈 없음"); return; }
  clearLog(); setScene("🌐","서버에 연결 중…");
  const up=await netPing();
  if(!up){ setScene("🌐","서버 오프라인"); line("온라인 서버에 연결할 수 없어요. 서버를 켜거나, 오프라인으로 플레이하세요.","dmg"); setActions([{label:"↻ 다시 시도",full:true,act:onlineScreen},{label:"← 뒤로",full:true,act:titleScreen}]); return; }
  clearLog(); setScene("🌐","온라인 — 서버 연결됨.");
  if(NET.online && NET.token){
    line(`<b>${NET.name}</b>님, 다시 오셨군요. 클라우드에서 이어가거나 로그아웃할 수 있어요.`,"sys");
    setActions([{label:`▶ 온라인 이어하기 (${NET.name})`,desc:"클라우드 세이브 불러오기",full:true,act:enterOnline},
      {label:"🔓 로그아웃",full:true,act:()=>{ netLogout(); toast("로그아웃됨"); titleScreen(); }},
      {label:"← 뒤로",full:true,act:titleScreen}]);
    return;
  }
  line("계정으로 로그인하면 어느 기기에서든 이어하고, 광장 채팅·경매장이 <b>실시간</b>으로 연결돼요.","quote");
  setActions([{label:"🔑 로그인",desc:"기존 계정으로",full:true,act:()=>authForm("login")},
    {label:"✨ 회원가입",desc:"새 계정 만들기",full:true,act:()=>authForm("register")},
    {label:"← 뒤로",full:true,act:titleScreen}]);
}
/* 게임 내 로그인/회원가입 폼 (팝업 대신) — 비번 마스킹 + 👁 토글 + 엔터 제출 */
function authForm(mode){ if(typeof NET==="undefined")return; const isLogin=(mode==="login");
  clearLog(); setScene("🌐", isLogin?"로그인":"회원가입");
  const nm=(NET.name||"").replace(/[<>"]/g,"");
  $("log").innerHTML=`<div class="authbox">
    <div class="authrow"><label>👤 이름</label><input id="authName" class="authin" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="캐릭터 이름 (2~16자)" value="${nm}"></div>
    <div class="authrow"><label>🔒 비밀번호</label>
      <div class="authpw"><input id="authPw" class="authin" type="password" autocomplete="off" placeholder="4자 이상">
      <button type="button" class="eyebtn" id="authEye" title="표시/숨기기" tabindex="-1">👁</button></div></div>
    <div id="authErr" class="autherr"></div>
    <div class="authtip">${isLogin?"처음이면 아래 '회원가입'으로 계정을 먼저 만드세요.":"이름·비밀번호만 있으면 가입 완료. 잊지 않게 적어두세요!"}</div>
  </div>`;
  const eye=$("authEye"), pw=$("authPw"), nmi=$("authName");
  if(eye&&pw)eye.onclick=()=>{ const hidden=pw.type==="password"; pw.type=hidden?"text":"password"; eye.textContent=hidden?"🙈":"👁"; try{pw.focus();}catch(e){} };
  const onEnter=(e)=>{ if(e.key==="Enter"){ e.preventDefault(); submitAuth(mode); } };
  if(pw)pw.addEventListener("keydown",onEnter); if(nmi)nmi.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); if(pw)pw.focus(); } });
  setTimeout(()=>{ try{ nmi&&nmi.focus(); }catch(e){} },40);
  setActions([{label:isLogin?"🔑 로그인":"✨ 가입하고 시작",full:true,act:()=>submitAuth(mode)},
    {label:isLogin?"→ 계정이 없나요? 회원가입":"→ 이미 계정이 있나요? 로그인",full:true,act:()=>authForm(isLogin?"register":"login")},
    {label:"← 뒤로",full:true,act:onlineScreen}]);
}
async function submitAuth(mode){ const nmi=$("authName"), pwi=$("authPw"), err=$("authErr");
  const name=(nmi?nmi.value:"").trim(), pw=(pwi?pwi.value:""); const setErr=(m,c)=>{ if(err){ err.textContent=m; err.style.color=c||"var(--danger)"; } };
  if(name.length<2){ setErr("이름은 2자 이상이어야 해요"); return; }
  if(pw.length<4){ setErr("비밀번호는 4자 이상이어야 해요"); return; }
  setErr("서버에 연결 중…","var(--dim)");
  try{ if(mode==="login")await netLogin(name,pw); else await netRegister(name,pw);
    toast((mode==="login"?"로그인":"가입")+" 성공: "+NET.name); onlineScreen();
  }catch(e){ setErr((mode==="login"?"로그인":"가입")+" 실패 — "+e.message); }
}
async function enterOnline(){
  let cloud=null; try{ cloud=await netSaveLoad(); }catch(e){}
  const hasCloud=!!(cloud&&cloud.stats);
  if(hasCloud){ P=cloud; normalizeP(); } else { P=freshPlayer(); P.name=NET.name||P.name; }
  P._online=true; netConnectSSE(); leaveTitle(); render(); clearLog();
  if(hasCloud){ toast("클라우드에서 불러옴"); townMenu(); } else { toast("새 온라인 캐릭터"); intro(); }
}
function loadSaveGame(){ try{ P=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!P||!P.stats)throw 0; normalizeP(); }catch(e){ toast("저장을 읽지 못했어요"); leaveTitle(); newGame(); return; } leaveTitle(); render(); townMenu(); }
function confirmNewGame(){ if(hasSave()&&!confirm("새로 시작하면 저장된 캐릭터가 삭제됩니다. 계속할까요?"))return; localStorage.removeItem(SAVE_KEY); leaveTitle(); newGame(); }
function settingsScreen(){ clearLog(); setScene("⚙️","설정");
  line("이 게임은 브라우저에 <b>자동 저장</b>됩니다. HTML 파일 하나로 어디서든 실행돼요.","sys");
  line(hasSave()?"저장된 캐릭터가 있습니다.":"저장된 캐릭터가 없습니다.","sys");
  setActions([
    {label:"🗑 저장 데이터 삭제",desc:"모든 진행 삭제 · 되돌릴 수 없음",disabled:!hasSave(),act:()=>{ if(confirm("정말 저장 데이터를 삭제할까요? 되돌릴 수 없습니다.")){ localStorage.removeItem(SAVE_KEY); toast("저장 데이터 삭제됨"); } titleScreen(); }},
    {label:"← 뒤로",full:true,act:titleScreen},
  ]); }
function helpScreen(){ clearLog(); setScene("❔","도움말");
  line("🗼 <b>이름 없는 탑</b> — 기억 없는 방랑자가 되어 탑 정상의 진실을 마주하라.");
  line("• <b>거점 마을</b>: 생활 활동으로 스탯을 키우고, 교관에게 스킬을 배우고, 상점·경매장을 이용한다.","sys");
  line("• <b>탑 등반·대륙 개척</b>: 층을 오르며 전투·이벤트·보물을 만난다. 죽어도 마을로 귀환하고 성장은 유지된다.","sys");
  line("• <b>전투</b>: 무기마다 미니게임이 다르다 — 타이밍을 맞춰 치명타! 보스의 <b>충전 궁극기</b>는 그로기 게이지를 채워 파훼하라.","sys");
  line("• 성향(카르마)에 따라 정상의 <b>엔딩</b>이 갈린다.","sys");
  setActions([{label:"← 뒤로",full:true,act:titleScreen}]); }

/* 부팅 → 타이틀 화면 */
titleScreen();
