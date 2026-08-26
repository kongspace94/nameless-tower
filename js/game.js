"use strict";
/* ============================================================
   죽음 / 승리 (로그라이트: 마을 귀환, 캐릭터 유지)
   ============================================================ */
function die(){ stopAuctionTimer(); enemy=null; B=null; if(typeof sfx==="function")sfx("defeat"); clearLog(); setScene("💀","");
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
    setScene("🪟","탑 꼭대기의 창 — 처음으로, 바깥이 보인다.");
    line("— 정상의 창을 열어젖힌 순간 —","sys");
    line("끝이라 믿었던 하늘 너머로, <b>광대한 대륙</b>이 펼쳐진다. 그리고 그 위에 점점이 — <b>수많은 탑</b>이 솟아 있다.","loot");
    line("<span class=\"quote\">저마다의 탑엔 저마다의 수호자가 잠들어 있다. 네가 오른 이 탑은… 그중 가장 낮은 하나였을 뿐이다.</span>");
    line("진짜 여정은 이제부터다 — <b>🧭 대륙 개척</b>으로 대륙을 누비며 <b>새로운 탑들을 찾아 오르자!</b>","loot");
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
const SAVE_KEY="nameless_tower_save_v4";           // 오프라인 캐릭터
const CLOUD_KEY="nameless_tower_cloud_v4";         // 온라인 캐릭터 로컬 캐시 (오프라인과 분리 — 서로 덮어쓰지 않게)
function save(silent){ const key=(P&&P._online)?CLOUD_KEY:SAVE_KEY;   // 온라인/오프라인 슬롯 분리 저장
  try{ localStorage.setItem(key,JSON.stringify(P)); if(!silent)toast("저장했습니다"); }catch(e){}
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
  setActions([{label:"닉네임을 정한다",act:askName},{label:"'방랑자'로 시작",act:()=>{ P.name="방랑자"; syncNick(); render(); chooseCompanion(); }}]); }
function syncNick(){ if(P&&P._online&&typeof netSetNick==="function")netSetNick(P.name, P.avatar).catch(()=>{}); }   // 닉네임+아바타를 서버에 반영(채팅 표시명·프로필 사진)
function askName(){ const n=prompt("게임에서 쓸 닉네임은? (남들에게 보여요)","방랑자"); P.name=(n&&n.trim())?n.trim().slice(0,12):"방랑자"; syncNick(); render(); chooseCompanion(); }
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
{ const s5=$("stats5"); if(s5){ s5.style.cursor="pointer"; s5.title="클릭 — 상세 스탯"; s5.onclick=()=>{ if(P&&typeof statsDetail==="function")statsDetail(); }; } }   // 📊 스탯 클릭 → 상세
{ const ch=$("cdhead"); if(ch)ch.onclick=()=>toggleChatDock();
  const cs=$("cdsend"); if(cs)cs.onclick=()=>chatSend();
  const ci=$("cdinput"); if(ci)ci.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); chatSend(); } }); }
$("pname").onclick=()=>{ if(P&&!enemy)profileMenu(); };
{ const po=$("por"); if(po){ po.style.cursor="pointer"; po.onclick=()=>{ if(P&&!enemy)profileMenu(); }; } }
$("btnAuction").onclick=()=>{ if(canNav())openAuction(); else toast(navBlockMsg()); };
$("btnSave").onclick=()=>{ if(P)save(); };
$("btnReset").onclick=()=>{ if(enemy){ toast("전투 중엔 나갈 수 없어요"); return; }   // 🚪 메인화면(타이틀)로 — 저장 후 나가기 (캐릭터 삭제 아님. 새로 시작은 타이틀의 '새로 시작')
  if(P&&!confirm("메인화면으로 나갈까요? (진행은 자동 저장돼요)"))return; if(P)save(true); titleScreen(); };
{ const bs=$("btnSettings"); if(bs)bs.onclick=()=>openSettings(); }
/* ⚙ 사운드 설정 모달 — 배경음악·효과음·환경음 각각 on/off + 음량 바 */
function openSettings(){ if(document.querySelector(".setmodal"))return; if(typeof sfx==="function")sfx("click");
  const A=(typeof AUDIO!=="undefined")?AUDIO:null;
  const row=(k,ic,label,on,vol,note)=>`<div class="setrow">
    <div class="setrowtop"><span class="setlbl">${ic} ${label}</span><button type="button" class="settgl ${on?'on':''}" data-k="${k}">${on?"켜짐":"꺼짐"}</button></div>
    <input type="range" class="setsld" data-k="${k}" min="0" max="1" step="0.02" value="${vol}" ${on?"":"disabled"}>
    ${note?`<div class="setnote">${note}</div>`:""}</div>`;
  const ov=document.createElement("div"); ov.className="setmodal";
  ov.innerHTML=`<div class="setbox">
    <div class="settitle">⚙ 설정 · 사운드</div>
    ${A?row("bgm","🎵","배경음악",A.bgmOn,A.bgmVol,"임시 합성곡 재생 중 · 파일 넣으면 교체"):""}
    ${A?row("sfx","🔊","효과음",A.on,A.vol,"지금도 나요"):""}
    ${A?row("amb","🌬️","환경음",A.ambOn,A.ambVol,"바람·마을 소음 등 · 파일 넣으면 재생"):""}
    ${A?"":'<div class="setnote">오디오를 사용할 수 없는 환경이에요.</div>'}
    <div class="setbtns"><button type="button" class="setbtn settest">🔊 효과음 테스트</button><button type="button" class="setbtn setclose">닫기</button></div>
  </div>`;
  document.body.appendChild(ov);
  const close=()=>{ try{ document.body.removeChild(ov); }catch(e){} };
  ov.addEventListener("click",e=>{ if(e.target===ov)close(); });
  const cb=ov.querySelector(".setclose"); if(cb)cb.onclick=close;
  const tb=ov.querySelector(".settest"); if(tb)tb.onclick=()=>{ if(typeof sfx==="function")sfx("loot"); };
  ov.querySelectorAll(".setsld").forEach(s=>{ s.oninput=()=>{ const v=parseFloat(s.value), k=s.dataset.k;
    if(k==="bgm"&&typeof bgmSetVol==="function")bgmSetVol(v);
    else if(k==="sfx"&&typeof sfxSetVol==="function")sfxSetVol(v);
    else if(k==="amb"&&typeof ambSetVol==="function")ambSetVol(v); }; });
  ov.querySelectorAll(".settgl").forEach(b=>{ b.onclick=()=>{ const k=b.dataset.k; let on=false;
    if(k==="bgm"){ on=!A.bgmOn; bgmSetOn(on); } else if(k==="sfx"){ on=!A.on; sfxSetOn(on); } else { on=!A.ambOn; ambSetOn(on); }
    b.textContent=on?"켜짐":"꺼짐"; b.classList.toggle("on",on); const sld=ov.querySelector('.setsld[data-k="'+k+'"]'); if(sld)sld.disabled=!on; }; });
}

/* ---------- 타이틀 화면 ---------- */
/* 🖼 메인(타이틀) 배경 이미지 — 지금은 아래 인라인 SVG가 임시 배경.
 * 진짜 이미지로 바꾸려면: bg 폴더에 파일 넣고 MAIN_BG="bg/title.jpg" 처럼 경로만 지정.
 * (파일이 없거나 로드 실패하면 자동으로 SVG 배경으로 폴백) */
const MAIN_BG = "";
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
  if(typeof bgm==="function")bgm("town");   // 🎵 메인화면에도 메인 테마(첫 클릭 순간부터 재생 — 자동재생 정책상 그 전엔 무음)
  if(document.body){ document.body.classList.remove("combat","intower"); document.body.classList.add("title"); }
  const hud=$("hud"); if(hud)hud.hidden=true; const ub=$("uibar"); if(ub)ub.hidden=true; const qt=$("qtrack"); if(qt)qt.hidden=true;
  const bg=$("titlebg"); if(bg&&!bg.firstChild)bg.innerHTML=titleBgSvg()+(MAIN_BG?`<img class="titlebgimg" src="${MAIN_BG}" alt="" onerror="this.remove()">`:"");   // 임시=SVG 배경, MAIN_BG 지정 시 그 이미지로 덮음(실패 시 SVG)
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
/* 눈 아이콘 (뜬/감은) — 비번 표시/숨김 토글용 */
const EYE_ON_SVG=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
/* 🔒 비번 입력칸 1개 마크업 — 눈 토글 버튼 포함 */
function pwFieldHtml(id, ac, ph){ return `<div class="authpw"><input id="${id}" class="authin" type="password" autocomplete="${ac}" autocapitalize="off" spellcheck="false" placeholder="${ph}"><button type="button" class="eyebtn" id="${id}Eye" title="표시/숨기기" tabindex="-1">${EYE_OFF_SVG}</button></div>`; }
/* 눈 토글 + 한글→QWERTY 실시간 변환 + 엔터 콜백 을 비번칸에 부착 (여러 폼에서 재사용) */
function wirePw(id, onEnter){ const pw=$(id), eye=$(id+"Eye"); if(!pw)return null;
  if(eye){ eye.onmousedown=(e)=>e.preventDefault(); eye.onclick=()=>{ const show=pw.type==="password"; pw.type=show?"text":"password"; eye.innerHTML=show?EYE_ON_SVG:EYE_OFF_SVG; }; }
  if(typeof pwNormalize==="function"){ let composing=false; const normPw=()=>{ try{ const v=pw.value,n=pwNormalize(v); if(n!==v)pw.value=n; }catch(e){} };
    pw.addEventListener("compositionstart",()=>composing=true); pw.addEventListener("compositionend",()=>{composing=false;normPw();}); pw.addEventListener("input",()=>{ if(!composing)normPw(); }); }
  if(onEnter)pw.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); onEnter(); } });
  return pw; }
/* 게임 내 로그인/회원가입 폼 (팝업 대신) — 비번 마스킹 + 눈 토글 + 엔터 제출 */
function authForm(mode){ if(typeof NET==="undefined")return; const isLogin=(mode==="login");
  clearLog(); setScene("🌐", isLogin?"로그인":"회원가입");
  const nm=(NET.name||"").replace(/[<>"]/g,"");
  $("log").innerHTML=`<div class="authbox">
    <div class="authrow"><label>🆔 아이디</label><input id="authName" class="authin" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="${isLogin?"로그인 아이디":"로그인에 쓸 아이디 (2~16자)"}" value="${nm}"></div>
    <div class="authrow"><label>🔒 비밀번호</label>${pwFieldHtml("authPw",isLogin?"current-password":"new-password","4자 이상 (한글 가능)")}</div>
    ${isLogin?"":`<div class="authrow"><label>🔒 비밀번호 확인</label>${pwFieldHtml("authPw2","new-password","같은 비밀번호 다시")}</div>`}
    <div id="authErr" class="autherr"></div>
    <div class="authtip">${isLogin?"처음이면 아래 '회원가입'으로 계정을 먼저 만드세요.":"아이디는 <b>로그인용</b>이에요. 게임 <b>닉네임</b>은 들어가서 정해요. 가입 시 나오는 <b>복구 코드</b>도 꼭 저장하세요."}</div>
  </div>`;
  const nmi=$("authName");
  const pw=wirePw("authPw", isLogin?()=>submitAuth(mode):null);
  if(!isLogin)wirePw("authPw2", ()=>submitAuth(mode));
  if(nmi)nmi.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); if(pw)pw.focus(); } });
  setTimeout(()=>{ try{ nmi&&nmi.focus(); }catch(e){} },40);
  const acts=[{label:isLogin?"🔑 로그인":"✨ 가입하고 시작",full:true,act:()=>submitAuth(mode)},
    {label:isLogin?"→ 계정이 없나요? 회원가입":"→ 이미 계정이 있나요? 로그인",full:true,act:()=>authForm(isLogin?"register":"login")}];
  if(isLogin)acts.push({label:"🔑 비밀번호를 잊으셨나요? — 복구 코드로 찾기",full:true,act:recoverForm});
  acts.push({label:"← 뒤로",full:true,act:onlineScreen});
  setActions(acts);
}
async function submitAuth(mode){ const nmi=$("authName"), pwi=$("authPw"), pwi2=$("authPw2"), err=$("authErr");
  const name=(nmi?nmi.value:"").trim(), pw=(pwi?pwi.value:""); const setErr=(m,c)=>{ if(err){ err.textContent=m; err.style.color=c||"var(--danger)"; } };
  if(name.length<2){ setErr("이름은 2자 이상이어야 해요"); return; }
  if(pw.length<4){ setErr("비밀번호는 4자 이상이어야 해요"); return; }
  if(mode!=="login"){ const pw2=(pwi2?pwi2.value:""); if(pw!==pw2){ setErr("비밀번호 확인이 일치하지 않아요"); if(pwi2)pwi2.focus(); return; } }
  setErr("서버에 연결 중…","var(--dim)");
  try{ if(mode==="login"){ await netLogin(name,pw); toast("로그인 성공: "+NET.name); onlineScreen(); }
    else { const d=await netRegister(name,pw); toast("가입 성공: "+NET.name); recoveryCodeScreen(d&&d.recoveryCode, true); }
  }catch(e){ setErr((mode==="login"?"로그인":"가입")+" 실패 — "+e.message); }
}
/* 🔑 복구 코드 안내 화면 — 가입 직후(첫인자 코드) / 재발급 시 재사용 */
function recoveryCodeScreen(code, afterRegister){ clearLog(); setScene("🔑","복구 코드");
  if(!code){ onlineScreen(); return; }
  try{ localStorage.setItem("nt_reccode", code); localStorage.setItem("nt_reccode_name", NET.name||""); }catch(e){}   // 같은 기기 편의 백업
  $("log").innerHTML=`<div class="authbox">
    <div class="authtip" style="color:var(--gold)">⚠ 이 코드를 꼭 저장하세요. 비밀번호를 잊었을 때 계정을 되찾는 <b>유일한 방법</b>이에요. (다시 볼 수 없어요)</div>
    <div class="reccode" id="recCode">${code}</div>
    <div id="recCopyMsg" class="authtip" style="text-align:center"></div>
    <div class="authtip">📌 스크린샷을 찍거나 메모장에 적어두세요. 다른 기기에서 로그인할 때도 필요할 수 있어요.</div>
  </div>`;
  setActions([
    {label:"📋 코드 복사",full:true,act:()=>{ const t=code; const done=()=>{ const m=$("recCopyMsg"); if(m){ m.textContent="복사됐어요 ✓"; m.style.color="var(--good)"; } toast("복사됨"); };
        try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,()=>fallbackCopy(t,done)); } else fallbackCopy(t,done); }catch(e){ fallbackCopy(t,done); } }},
    {label:afterRegister?"✅ 저장했어요 — 시작하기":"✅ 저장했어요 — 뒤로",full:true,act:()=> afterRegister?onlineScreen():profileMenu()},
  ]);
}
function fallbackCopy(t, done){ try{ const ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); done&&done(); }catch(e){ toast("코드를 길게 눌러 복사하세요"); } }
/* 🔑 계정 복구 폼 — 이름 + 복구 코드 → 새 비밀번호 */
function recoverForm(){ if(typeof NET==="undefined")return; clearLog(); setScene("🔑","계정 복구");
  const guessName=(()=>{ try{ return localStorage.getItem("nt_reccode_name")||NET.name||""; }catch(e){ return NET.name||""; } })().replace(/[<>"]/g,"");
  const guessCode=(()=>{ try{ return localStorage.getItem("nt_reccode")||""; }catch(e){ return ""; } })().replace(/[<>"]/g,"");
  $("log").innerHTML=`<div class="authbox">
    <div class="authtip">가입할 때 받은 <b>복구 코드</b>로 새 비밀번호를 설정해요.</div>
    <div class="authrow"><label>👤 이름</label><input id="recName" class="authin" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="계정 이름" value="${guessName}"></div>
    <div class="authrow"><label>🔑 복구 코드</label><input id="recCodeIn" class="authin" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="NT-XXXX-XXXX-XXXX" value="${guessCode}"></div>
    <div class="authrow"><label>🔒 새 비밀번호</label>${pwFieldHtml("recNewPw","new-password","4자 이상 (한글 가능)")}</div>
    <div class="authrow"><label>🔒 새 비밀번호 확인</label>${pwFieldHtml("recNewPw2","new-password","같은 비밀번호 다시")}</div>
    <div id="recErr" class="autherr"></div>
  </div>`;
  wirePw("recNewPw"); wirePw("recNewPw2", submitRecover);
  setActions([{label:"🔑 복구하고 로그인",full:true,act:submitRecover},{label:"← 로그인으로",full:true,act:()=>authForm("login")}]);
}
async function submitRecover(){ const err=$("recErr"); const setErr=(m,c)=>{ if(err){ err.textContent=m; err.style.color=c||"var(--danger)"; } };
  const name=($("recName")?$("recName").value:"").trim(), code=($("recCodeIn")?$("recCodeIn").value:"").trim();
  const np=($("recNewPw")?$("recNewPw").value:""), np2=($("recNewPw2")?$("recNewPw2").value:"");
  if(name.length<2){ setErr("이름을 입력하세요"); return; }
  if(!code){ setErr("복구 코드를 입력하세요"); return; }
  if(np.length<4){ setErr("새 비밀번호는 4자 이상이어야 해요"); return; }
  if(np!==np2){ setErr("비밀번호 확인이 일치하지 않아요"); return; }
  setErr("복구 중…","var(--dim)");
  try{ await netRecover(name, code, np); toast("복구 완료 — 로그인됐어요: "+NET.name); onlineScreen(); }
  catch(e){ setErr("복구 실패 — "+e.message); }
}
async function enterOnline(){
  let cloud=null, authErr=false, loadErr=false;
  try{ cloud=await netSaveLoad(); }catch(e){ const m=(e&&e.message)||""; if(/로그인|401/.test(m))authErr=true; else loadErr=true; }
  if(authErr){ netLogout(); toast("세션이 만료됐어요 — 다시 로그인해주세요"); authForm("login"); return; }   // 서버 재시작 등으로 토큰 만료 시
  if(loadErr){ toast("클라우드 세이브를 불러오지 못했어요 — 잠시 후 다시 시도해주세요"); onlineScreen(); return; }   // ⚠ 로드 실패 시 절대 새 캐릭터로 덮어쓰지 않음(세이브 보호)
  const hasCloud=!!(cloud&&cloud.stats);
  if(hasCloud){ P=cloud; normalizeP(); if(typeof netSetNick==="function")netSetNick(P.name, P.avatar).catch(()=>{}); P._online=true; netConnectSSE(); leaveTitle(); render(); clearLog(); toast("클라우드에서 불러옴"); townMenu(); return; }
  // 클라우드에 세이브 없음 — 오프라인 캐릭터가 있으면 온라인으로 가져올지 물어봄(데이터 보존)
  let off=null; try{ off=JSON.parse(localStorage.getItem(SAVE_KEY)||"null"); }catch(e){}
  if(off&&off.stats&&(off.inv&&off.inv.length||off.gold>30||off.floor>1)&&confirm(`온라인 세이브가 없어요.\n오프라인 캐릭터 '${off.name}' (골드 ${off.gold} · ${off.floor||1}층)을(를) 온라인으로 가져올까요?\n\n확인=가져오기 / 취소=새 온라인 캐릭터`)){
    P=off; normalizeP(); P._online=true; netConnectSSE(); leaveTitle(); render(); clearLog();
    if(typeof netSetNick==="function")netSetNick(P.name, P.avatar).catch(()=>{}); save(true); toast("오프라인 캐릭터를 온라인으로 가져왔어요"); townMenu(); return;
  }
  P=freshPlayer(); if(NET.nick&&NET.nick!==NET.name)P.name=NET.nick;   // 아이디는 P.name에 넣지 않음 — 닉네임은 intro에서 정함
  P._online=true; netConnectSSE(); leaveTitle(); render(); clearLog(); toast("새 온라인 캐릭터 — 닉네임을 정하자"); intro();
}
function loadSaveGame(){ try{ P=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!P||!P.stats)throw 0; normalizeP(); }catch(e){ toast("저장을 읽지 못했어요"); leaveTitle(); newGame(); return; } leaveTitle(); render(); townMenu(); }
function confirmNewGame(){ if(hasSave()&&!confirm("새로 시작하면 저장된 캐릭터가 삭제됩니다. 계속할까요?"))return; localStorage.removeItem(SAVE_KEY); leaveTitle(); newGame(); }
function settingsScreen(){ clearLog(); setScene("⚙️","설정");
  line("이 게임은 브라우저에 <b>자동 저장</b>됩니다. HTML 파일 하나로 어디서든 실행돼요.","sys");
  line(hasSave()?"저장된 캐릭터가 있습니다.":"저장된 캐릭터가 없습니다.","sys");
  const A=(typeof AUDIO!=="undefined")?AUDIO:null;
  if(A){ line(`🔊 <b>사운드</b> — 효과음 ${A.on?"켜짐":"꺼짐"} · 배경음 ${A.bgmOn?"켜짐":"꺼짐"}`,"sys");
    const p=document.createElement("p"); p.innerHTML=`<label style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--dim)">🔉 음량 <input id="sfxVol" type="range" min="0" max="1" step="0.05" value="${A.vol}" style="flex:1;accent-color:var(--gold)"><button id="sfxTest" style="background:#0a0d13;border:1px solid var(--line);color:var(--ink);border-radius:7px;padding:4px 10px;cursor:pointer">테스트</button></label>`; $("log").appendChild(p);
    const vs=$("sfxVol"); if(vs)vs.oninput=()=>{ if(typeof sfxSetVol==="function")sfxSetVol(parseFloat(vs.value)); };
    const tb=$("sfxTest"); if(tb)tb.onclick=()=>{ if(typeof sfx==="function")sfx("loot"); };
    line("💡 배경음악은 sounds 폴더에 파일을 넣고 js/audio.js의 BGM.src에 경로만 적으면 자동 재생돼요.","sys"); }
  const acts=[];
  if(A){ acts.push({label:A.on?"🔊 효과음 끄기":"🔈 효과음 켜기",act:()=>{ if(typeof sfxSetOn==="function")sfxSetOn(!A.on); settingsScreen(); }});
    acts.push({label:A.bgmOn?"🎵 배경음 끄기":"🎶 배경음 켜기",act:()=>{ if(typeof bgmSetOn==="function")bgmSetOn(!A.bgmOn); settingsScreen(); }}); }
  acts.push({label:"🗑 저장 데이터 삭제",desc:"모든 진행 삭제 · 되돌릴 수 없음",disabled:!hasSave(),act:()=>{ if(confirm("정말 저장 데이터를 삭제할까요? 되돌릴 수 없습니다.")){ localStorage.removeItem(SAVE_KEY); toast("저장 데이터 삭제됨"); } titleScreen(); }});
  acts.push({label:"← 뒤로",full:true,act:titleScreen});
  setActions(acts); }
function helpScreen(){ clearLog(); setScene("❔","도움말");
  line("🗼 <b>이름 없는 탑</b> — 기억 없는 방랑자가 되어 탑 정상의 진실을 마주하라.");
  line("• <b>거점 마을</b>: 생활 활동으로 스탯을 키우고, 교관에게 스킬을 배우고, 상점·경매장을 이용한다.","sys");
  line("• <b>탑 등반·대륙 개척</b>: 층을 오르며 전투·이벤트·보물을 만난다. 죽어도 마을로 귀환하고 성장은 유지된다.","sys");
  line("• <b>전투</b>: 무기마다 미니게임이 다르다 — 타이밍을 맞춰 치명타! 보스의 <b>충전 궁극기</b>는 그로기 게이지를 채워 파훼하라.","sys");
  line("• 성향(카르마)에 따라 정상의 <b>엔딩</b>이 갈린다.","sys");
  setActions([{label:"← 뒤로",full:true,act:titleScreen}]); }

/* 부팅 → 타이틀 화면 */
titleScreen();
