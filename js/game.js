"use strict";
/* ============================================================
   죽음 / 승리 (로그라이트: 마을 귀환, 캐릭터 유지)
   ============================================================ */
function die(){ if(P&&P._duel){ if(typeof pvpLoss==="function")return pvpLoss(P._duel); P._duel=null; }   // ⚔ PvP 결투 패배는 완전 사망이 아니라 손실만
  stopAuctionTimer();
  let lastLog=[]; try{ const lg=$("log"); if(lg){ lastLog=[...lg.querySelectorAll("p")].slice(-4).map(p=>(p.textContent||"").trim()).filter(Boolean); } }catch(e){}   // 죽기 직전 로그(맥락) 보존 — 전투 중 #log는 display:none이라 innerText가 줄바꿈을 잃음 → <p>별 textContent로 안전하게
  const cause=(typeof deathCause==="string"&&deathCause)?deathCause:"";
  enemy=null; B=null; if(typeof sfx==="function")sfx("defeat"); if(typeof bgm==="function")bgm("town"); clearLog(); setScene("💀","");   // 🎵 패배 즉시 전투/보스 BGM 종료 → 마을 테마(마을로 귀환하므로)
  let place=`탑 ${P.floor}층`;   // 🧭 개척(대륙) 중 사망이면 '탑 N층'이 아니라 대륙·구역명으로
  try{ if(typeof EXP!=="undefined" && EXP && typeof CONT==="function"){ const c=CONT(); if(c){ place = EXP.tower ? `${(typeof towerName==="function"?towerName(EXP.ci):c.name)} ${EXP.floor||1}층` : `${c.name}${(c.areas&&c.areas[EXP.ai])?` · ${c.areas[EXP.ai].n}`:""}`; } } }catch(e){}   // 🗼 탑=탑이름+층 · 🧭 개척=대륙+구역
  line(`<b style="color:var(--danger)">${place}에서 정신을 잃었다…</b>`);
  if(cause)line(`<b>사인:</b> ${cause}`,"dmg");   // 💀 무엇에 쓰러졌는지 명확히
  if(lastLog.length)line(`<div style="font-size:11.5px;color:var(--dim);margin-top:2px">— 마지막 순간 —<br>${lastLog.map(s=>s.replace(/</g,"&lt;")).join("<br>")}</div>`,"quote");
  line("눈을 떠보니 마을 어귀였다. 누군가 당신을 옮겨준 모양이다.","quote");
  const loss=Math.floor(P.gold*0.1); if(loss>0){ P.gold-=loss; line(`정신없는 사이 금화 ${loss}를 잃었다.`,"dmg"); }
  line("얻은 재료와 스킬, 스탯은 그대로다.","sys");
  if(typeof deathCause!=="undefined")deathCause="";   // 초기화
  render(); setActions([{label:"🏘 마을로 돌아간다",full:true,act:townMenu}]); }
/* 🔓 기능 해금 안내 — 눈에 띄게 알림 */
function unlockAnnounce(icon, title, desc){ if(typeof toast==="function")toast(icon+" "+title+" 잠금해제!");
  line(`🔓 <b style="color:var(--gold)">${icon} ${title}</b> — <b style="color:var(--gold)">잠금 해제!</b> ${desc}`,"loot"); if(typeof sfx==="function")sfx("victory"); }
/* 🌍 탑의 진실 — 50층 첫 정복 시 세계의 비밀을 마주하는 VN 시퀀스 */
function towerTruthReveal(done){
  const steps=[
    {who:"narr", text:"이름 없는 신이 스러지자, 옥좌 뒤의 벽이 굉음과 함께 갈라진다."},
    {who:"narr", text:"틈으로 <b>바깥</b>이 보인다. 탑은 세계의 끝이 아니었다 — 세계를 가두는 <b>말뚝</b>이었을 뿐."},
    {who:"comp", text:"…이게 진실이었구나. 탑은 '끝까지 오른 자'를 골라내는 시험이었어."},
    {who:"narr", text:"오른 자에게만 열리는 문. 그 너머엔 <b>수많은 탑</b>이 박힌 <b>광대한 대륙</b>이 지평선까지 펼쳐져 있었다."},
    {who:"me", text:"…그럼 내가 오른 이 탑은, 그중 가장 낮은 하나였다는 건가."},
    {who:"comp", text:"응. 세계를 봉인한 탑들을 하나씩 무너뜨리는 것 — <b>진짜 여정</b>은 이제부터야."},
  ];
  if(typeof vnScene==="function")vnScene(steps, done); else if(done)done();
}
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
  const firstClear = !(P.flags.cleared>0); const rmul = firstClear?1:0.8;   // 🔁 2회차부터 보상 80%(무한 파밍 방지)
  line("정상의 보물을 쓸어담아 마을로 돌아왔다.","sys"); const vg=Math.round(300*rmul); P.gold+=vg; const vm=Math.max(1,Math.round(5*rmul)); Object.keys(MATS).forEach(m=>addMat(m,vm)); gainStamina(STAM_MAX);
  line(`💰 금화 +${vg}, 재료 +${vm}씩 획득!${firstClear?" 생활력도 가득 찼다.":' <span style="color:var(--dim)">(재정복 보상 80%)</span>'}`,"loot");
  P.flags.cleared=(P.flags.cleared||0)+1; checkTitleUnlocks();
  if(firstClear){ P.flags.continentUnlocked=true;   // 정상 도달 → 대륙 개척 해금
    render();
    setActions([{label:"▶ 옥좌 뒤를 본다",full:true,act:()=>{
      towerTruthReveal(()=>{   // 🌍 세상의 진실 리빌
        unlockAnnounce("🧭","대륙 개척","탑 너머 광대한 대륙으로 — 개척에서 새로운 탑들을 찾아 오르세요!");
        vnScene(vnTowerToContinent(), ()=>{   // 🎭 탑→개척 전환 대화
          clearLog(); setScene("🧭","새로운 여정 — 대륙이 열렸다.");
          line("끝이라 믿었던 곳 너머로, <b>광대한 대륙</b>과 <b>수많은 탑</b>이 펼쳐졌다.","loot");
          line("진짜 여정은 이제부터 — <b>🧭 대륙 개척</b>으로 새로운 탑들을 찾아 오르자!","loot");
          line(`— 탑 정복 ${P.flags.cleared}회. 탑은, 다시 당신을 부를 것이다. —`,"sys");
          render(); setActions([{label:"🏘 마을로 (대륙 개척 가능)",full:true,act:townMenu}]);
        });
      });
    }}]);
    return;
  }
  line(`— 탑 정복 ${P.flags.cleared}회. 탑은, 다시 당신을 부를 것이다. —`,"sys");   // 탑 정복 횟수(회귀와 별개 — 실제 회귀는 🌌제단에서만)
  render(); setActions([{label:"🏘 마을로 (다시 도전 가능)",full:true,act:townMenu}]); }

/* 🎭 VN(미연시식) 대화 장면 — steps: [{who:"me"|"comp"|"narr", text, name?}] · 클릭/스페이스로 진행 */
function vnScene(steps, onDone){
  if(!P||!Array.isArray(steps)||!steps.length){ if(typeof onDone==="function")onDone(); return; }
  const rec=(typeof compRec==="function"&&P.companion)?compRec(P.companion):{lv:1};
  const cd=(typeof compDisp==="function"&&P.companion)?compDisp(P.companion,rec.lv):{n:"동료",emoji:"🧚",ic:null,tier:0};
  const meName=P.name||"방랑자";
  const portMe=(typeof playerIco==="function")?playerIco(160):`<span class="vnemo">🧝</span>`;
  const portComp=(cd.tier>0||!cd.ic)?`<span class="vnemo">${cd.emoji}</span>`:(typeof ico==="function"?ico(cd.ic,160):`<span class="vnemo">${cd.emoji}</span>`);
  const ov=document.createElement("div"); ov.className="vn"; ov.id="vnbox";
  ov.innerHTML=`<div class="vnstage"><div class="vnchar left" id="vnleft">${portMe}</div><div class="vnchar right" id="vnright">${portComp}</div></div>`
    +`<div class="vnbox"><div class="vnname" id="vnname"></div><div class="vntext" id="vntext"></div><div class="vnhint">▶ 클릭 / 스페이스</div></div>`;
  document.body.appendChild(ov);
  const L=ov.querySelector("#vnleft"), R=ov.querySelector("#vnright"), NM=ov.querySelector("#vnname"), TX=ov.querySelector("#vntext");
  let i=-1, closed=false;
  const draw=()=>{ const s=steps[i]; if(!s)return; const who=s.who||"narr";
    NM.textContent = s.name || (who==="me"?meName : who==="comp"?cd.n : "");
    TX.innerHTML = s.text||"";
    L.classList.toggle("speaking", who==="me"); R.classList.toggle("speaking", who==="comp");
    ov.classList.toggle("narr", who==="narr");
    if(typeof sfx==="function")sfx("click"); };
  const next=()=>{ if(closed)return; i++; if(i>=steps.length){ close(); return; } draw(); };
  const close=()=>{ if(closed)return; closed=true; try{ document.removeEventListener("keydown",key); ov.remove(); }catch(e){} if(typeof onDone==="function")onDone(); };
  const key=(e)=>{ if(e.code==="Space"||e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); next(); } };
  ov.addEventListener("click",next); document.addEventListener("keydown",key,true);
  next();
}
/* 📖 오프닝 — 새 게임 시작(동료 선택 직후). 기억 잃은 방랑자 + 동료 합류 */
const STORY_OPENING=[
  {who:"narr", text:"눈을 떴을 때, 당신은 이름 없는 탑의 발치에 쓰러져 있었다. 왜 이곳에 왔는지, 당신이 누구인지 — 아무것도 기억나지 않는다."},
  {who:"narr", text:"머리 위로, 하늘을 찌르는 검은 탑이 끝없이 솟아 있다."},
  {who:"comp", text:"…어? 정신 차렸네요? 다행이다, 죽은 줄 알았어요."},
  {who:"me",   text:"넌… 누구지."},
  {who:"comp", text:"글쎄요, 저도 잘 몰라요. 눈 떠보니 당신 곁에 있었거든요. 왠지 당신을 도와야 할 것 같아서요."},
  {who:"comp", text:"이 탑… 오르면 뭔가 알 수 있을지도 몰라요. 잃어버린 기억도, 당신이 누군지도."},
  {who:"me",   text:"…오른다. 다른 길도 없으니."},
  {who:"comp", text:"좋아요. 그럼 저랑 같이 가요. 끝까지."},
];
/* 🧭 포탈(체크포인트)마다 스토리 비트 — 첫 도착 1회. 6층=파밍 루프 안내 */
const CHECKPOINT_STORY={
  6:[ {who:"narr", text:"돌계단을 오르자, 허공에 푸른 포탈이 열린다."},
      {who:"comp", text:"포탈이에요! 이런 거점에 닿으면 열려요. 여기서 마을로 돌아갔다가, 다시 이 자리로 곧장 올 수 있어요."},
      {who:"comp", text:"무리해서 계속 오르지 말고 — 마을에서 재료 모으고, 장비 맞추고, 준비되면 여기로 돌아와요. 그게 오래 사는 비결이에요."},
      {who:"me",   text:"…쉬어갈 곳이 생겼군."} ],
  11:[ {who:"narr", text:"층이 깊어질수록 공기가 무거워진다."},
      {who:"comp", text:"여기서부턴 진짜예요. 방심하면 순식간에 당해요. 조심해요, 우리."} ],
  16:[ {who:"narr", text:"어둠의 미궁이 끝나고, 눈부신 빛이 쏟아진다. 부서진 천상 — 천공의 성역이 열린다."},
      {who:"comp", text:"여긴… 천상이에요. 타락한 천사들이 잠든 곳. 아래와는 차원이 달라요."},
      {who:"me",   text:"탑 하나에 이렇게 다른 세계가."},
      {who:"comp", text:"탑은 그냥 돌무더기가 아니에요. 오를수록, 당신이 잊은 무언가에 가까워지는 것 같아요."} ],
  21:[ {who:"comp", text:"빛이 너무 눈부셔서… 오히려 무서워요. 여긴 뭔가 잘못됐어요."} ],
  26:[ {who:"comp", text:"정상이 가까워요. 저 위에서 뭔가가… 우릴 기다리는 게 느껴져요."} ],
  31:[ {who:"narr", text:"천공마저 발아래로 멀어진다. 별과 어둠이 뒤섞인 균열 — 시공의 균열이 입을 벌린다."},
      {who:"comp", text:"여긴… 시간도 공간도 뒤틀려 있어요. 인간이 있을 곳이 아니에요."},
      {who:"me",   text:"그런데도, 이상하게 낯익어."},
      {who:"comp", text:"…당신, 정말 여기 처음 온 거 맞아요? 어쩐지 이 탑이 당신을 아는 것 같은데."} ],
  36:[ {who:"comp", text:"기억이… 조금씩 떠오르는 것 같지 않아요? 아니면 제 착각일까요."} ],
  41:[ {who:"me",   text:"이 위에 있는 게 뭔지, 이제 알 것 같아."},
      {who:"comp", text:"…말하지 않아도 돼요. 끝까지 함께 갈게요."} ],
  46:[ {who:"narr", text:"정상이 코앞이다. 마지막 문 너머, 압도적인 존재감이 당신을 응시한다."},
      {who:"comp", text:"저 문 너머예요. 준비됐어요? …아니, 준비 안 됐어도 가야겠죠."} ],
};
/* 체크포인트 첫 도착 시 스토리 비트 재생(1회) → done 콜백 */
function checkpointStory(f, done){ if(!P)return done&&done();
  if(!P.flags)P.flags={}; if(!P.flags.storySeen)P.flags.storySeen={};
  const steps=CHECKPOINT_STORY[f];
  if(steps && !P.flags.storySeen[f]){ P.flags.storySeen[f]=true; if(typeof save==="function")save(true); vnScene(steps, done); return; }
  if(done)done(); }
/* 탑 정상 → 대륙 개척 전환 대화 (방랑자 + 동료 요정) */
function vnTowerToContinent(){ const me=P.name||"방랑자";
  return [
    {who:"narr", text:"이름 없는 신이 재가 되어 흩어지고, 탑 전체가 숨을 멈춘다. 정상의 창이 천천히 열린다."},
    {who:"comp", text:"…해냈어요. 정말로, 탑의 끝까지 올라왔네요."},
    {who:"me",   text:"이게… 끝인가."},
    {who:"comp", text:"글쎄요. 저 창밖을 한번 보세요."},
    {who:"narr", text:"창 너머로 광대한 대륙이 펼쳐진다. 그 위에 점점이 — 헤아릴 수 없는 탑들이 솟아 있다."},
    {who:"me",   text:"탑이… 이 하나가 아니었어."},
    {who:"comp", text:"우린 겨우 가장 낮은 탑 하나를 오른 거예요. 진짜 이야기는 저 바깥에 있어요."},
    {who:"me",   text:"…내가 왜 이 탑을 올랐는지, 그 답도 저기 있을까."},
    {who:"comp", text:`함께 찾으러 가요, ${me}. 당신이라면 저 대륙의 탑들도 오를 수 있어요.`},
    {who:"me",   text:"…그래. 여기서 멈출 순 없지."},
    {who:"narr", text:"탑을 등지고, 둘은 대륙으로 향하는 문 앞에 선다. — 새로운 여정이 시작된다."},
  ]; }
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
/* 즉시 저장 — 디바운스 무시하고 클라우드에 바로 반영 (우편 수령·리로드·페이지 이탈 시 유실 방지) */
function saveNow(){ const key=(P&&P._online)?CLOUD_KEY:SAVE_KEY;
  try{ localStorage.setItem(key,JSON.stringify(P)); }catch(e){}
  if(P&&P._online&&typeof netSaveFlush==="function")netSaveFlush(P);
}
/* 페이지 이탈/숨김 시 저장 플러시 — 디바운스 저장이 날아가지 않게 */
if(typeof window!=="undefined"){
  window.addEventListener("pagehide",()=>{ try{ if(P)saveNow(); }catch(e){} });
  window.addEventListener("beforeunload",()=>{ try{ if(P)saveNow(); }catch(e){} });
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ try{ if(P)saveNow(); }catch(e){} } });
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
  const starters=Object.entries(COMPANIONS).filter(([k,c])=>!c.rare);
  starters.forEach(([k,c])=>line(`${c.emoji} <b>${c.n}</b> — ${c.note}`,"sys"));
  setActions(starters.map(([k,c])=>({ label:`${c.emoji} ${c.n}`, desc:c.note, act:()=>{ P.companion=k; ensureComp(k); render(); vnScene(STORY_OPENING, tutorial); } }))); }
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
{ const bn=$("btnNotice"); if(bn)bn.onclick=()=>{ if(typeof showNotice==="function")showNotice(); }; }   // 📢 언제든 공지 다시 보기
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
    {label:afterRegister?"저장했어요 — 시작하기":"저장했어요 — 뒤로",full:true,act:()=> afterRegister?onlineScreen():profileMenu()},
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
/* 🚫 다른 기기에서 로그인되어 이 세션이 강제 종료됨 (net.js kicked 이벤트) */
function onKicked(reason){
  try{ if(typeof stopTownPresence==="function")stopTownPresence(); }catch(e){}
  try{ if(typeof stopChatTimer==="function")stopChatTimer(); }catch(e){}
  enemy=null; B=null; auction=null;
  try{ localStorage.removeItem("nt_token"); }catch(e){}
  if(typeof NET!=="undefined"){ NET.online=false; NET.token=null; }
  clearLog(); setScene("🚫","다른 기기에서 접속했습니다");
  line(`<b style="color:var(--danger)">${reason||"다른 기기에서 로그인"}</b> — 이 기기의 접속이 종료되었습니다.`,"dmg");
  line("한 계정은 한 곳에서만 플레이할 수 있어요. 계속하려면 이 기기에서 다시 로그인하세요.","quote");
  line("진행 상황은 클라우드에 저장돼 있어요.","sys");
  setActions([{label:"🔑 다시 로그인",full:true,act:()=>{ if(typeof authForm==="function")authForm("login"); else titleScreen(); }},{label:"🏠 타이틀로",full:true,act:titleScreen}]);
}
/* 🔄 서버 재배포 감지 시 업데이트 배너 (net.js checkServerBoot → onServerUpdated) */
function onServerUpdated(){
  if(document.getElementById("updbanner"))return;   // 중복 방지
  const b=document.createElement("div"); b.id="updbanner"; b.className="updbanner";
  b.innerHTML=`<span class="updmsg">🔄 <b>새 버전이 배포됐어요.</b> 새로고침하면 최신으로 이어집니다. <span class="upddim">진행상황은 저장돼 있어요 (재로그인이 필요할 수 있어요).</span></span>`
    +`<button type="button" class="updbtn" id="updReload">새로고침</button>`
    +`<button type="button" class="updx" id="updX" aria-label="나중에">✕</button>`;
  document.body.appendChild(b);
  document.getElementById("updReload").onclick=()=>{ try{ if(P&&typeof saveNow==="function")saveNow(); else if(P&&typeof save==="function")save(true); }catch(e){} setTimeout(()=>location.reload(),350); };   // 즉시 클라우드 플러시 후 리로드(진행·우편 유실 방지)
  document.getElementById("updX").onclick=()=>{ try{ b.remove(); }catch(e){} };
}
/* ===================== 📢 공지사항 팝업 ===================== */
/* ⚙️ 운영자 사용법:
   · 새 패치 → PATCH_NOTES 맨 위에 항목 하나 추가(기존 기록은 그대로 남아 히스토리로 쌓임)
   · 공지/이벤트 내용은 NOTICE.tabs 의 notice/event 탭 html 수정
   · 자동 팝업을 다시 띄우려면 NOTICE.id 를 새 값으로 변경 ('오늘 안 보기' 무시하고 재노출) */
const PATCH_NOTES=[   // ⬆ 최신이 위. 새 패치 때 이 배열 맨 위에 추가만 하면 기록이 누적된다.
  { ver:"v2.3 · 8/28", title:"전투 화면 포켓몬 감성 업", items:[
      "🟢 <b>스프라이트 발판(그림자)</b> 추가 — 공중에 뜬 느낌 제거, 배틀 화면 느낌↑",
      "❤️ <b>HP바 색 변화</b> — 초록→노랑→빨강 (위험도 한눈에)",
      "🖼 <b>전투 스프라이트가 까만 박스에 갇히던 문제 수정</b> — 아이콘 박스 벗기고 필드에 얹은 느낌으로 (전체가 보이게)",
      "🧩 <b>하단 통합 패널</b> — [메시지창 | 커맨드] 좌우 배치(데스크탑) · 모바일은 위아래 스택으로 버튼 크기 유지",
      "💬 메시지 최신 줄 <b>살짝 등장 연출</b>",
    ]},
  { ver:"v2.2 · 8/28", title:"대륙 개척 원복 · 대륙 탑 분리", items:[
      "🧭 <b>대륙 개척(구역 시스템)을 원래대로 복구</b> — 개척은 그대로, 80층 탑은 '탑 등반' 목록 전용으로 분리",
      "🗼 <b>대륙 탑에 이름</b> 부여 (석화의 탑·용암의 탑·빙하의 탑·창궁의 탑·근원의 탑) · 관문(포탈) 개수 표시",
      "⚔️ <b>패링 타이밍 조정</b> — 뜬 뒤 0.1~0.5초 반응 창(중앙 0.25~0.4초=완벽)으로 넉넉하게",
      "💫 <b>그로기 상태에서 '강력한 일격 준비' 예고 버그 수정</b> (회복 후 평타)",
      "📜 전투 메시지 박스 <b>⤢ 확대 버튼</b> 추가 — 전체 전투 로그를 넓게 스크롤로 볼 수 있음",
    ]},
  { ver:"v2.1 · 8/28", title:"전투 진행·전리품 정리", items:[
      "🖱️ <b>전투 중 자동 진행 제거</b> — 적 행동·전리품 전환은 클릭/스페이스로 직접 넘깁니다 (단, 패링 QTE는 그대로 반응형)",
      "📦 <b>재료 전리품을 한 줄로 통합</b> — 같은 재료가 여러 줄로 나뉘던 것 합산 표시",
      "🥾 장비 획득 표기 간결화 — 중복되던 '…을(를) 손에 넣었다!' 제거 (장비 획득 + NEW만)",
      "🧪 <b>물약은 인간형 몬스터만 드랍</b> — 골렘·슬라임·정령 등에서 물약이 나오지 않습니다",
    ]},
  { ver:"v2.0 · 8/28", title:"대륙이 80층 탑으로!", items:[
      "🗼 <b>대륙 개척을 80층 탑 등반으로 전면 개편</b> — 구역 시스템 대신 '이름 없는 탑'처럼 층을 오릅니다",
      "👹 대륙 환경에 맞는 <b>지역 몬스터·지역 디버프</b>, <b>10층마다 지역 보스</b>, <b>80층 대륙 수호체</b>",
      "🌀 지역 보스를 잡으면 그 층이 <b>관문(체크포인트)</b> — 다음엔 도달한 관문에서 재시작",
      "⚖ (밸런스는 계속 다듬는 중 — 층당 난도·보스 체력 등 피드백 환영!)",
    ]},
  { ver:"v1.9 · 8/28", title:"드랍 위치·파밍 밸런스", items:[
      "🎁 <b>전리품 상자가 쓰러진 몬스터 자리에 떨어지게</b> 수정 (보스 선물상자·반짝이도 그 위치에)",
      "🔁 <b>이미 정복한 탑 재도전 시 2회차부터 보상 80%</b> — 무한 파밍 방지 (대륙 개척·탑 정상 모두)",
    ]},
  { ver:"v1.8 · 8/28", title:"전투 UI·BGM 수정", items:[
      "🎮 <b>타이밍 게이지·미니게임이 메시지 박스에 가려지던 문제 수정</b> — 이제 위로 올라와 온전히 보임(검·둔기·창·활·단검·세이버·주사위 전부 확인)",
      "🎵 <b>승리/패배 시 BGM 전환</b> — 이기면 탐험 앰비언트로, 지면 마을 테마로 즉시 바뀜",
      "🎵 <b>보스 BGM이 전투 후에도 계속 흐르던 문제 수정</b> — 격파하면 바로 탐험 음악으로",
      "💀 <b>사망 화면 '마지막 순간' 로그가 뭉개져 도배되던 버그 수정</b> — 마지막 4줄만 깔끔하게",
      "🧭 개척(대륙)에서 죽으면 '탑 N층' 대신 <b>대륙·구역명</b> 표시",
    ]},
  { ver:"v1.7 · 8/28", title:"처치 연출 강화", items:[
      "💥 <b>마지막 일격 표시</b> — 어떤 공격으로 몇 피해에 쓰러졌는지 전리품 전에 보여줌",
      "🎁 처치 시 <b>상자/장비 드랍 연출</b> — 보스는 큰 선물상자+반짝이, 일반 몬스터는 나무상자 (클릭/스페이스로 전리품 확인)",
      "🗡️ <b>공격 모션</b> — 때릴 때 플레이어·몬스터가 앞으로 치고 나가는 런지 동작 추가",
    ]},
  { ver:"v1.6 · 8/31", title:"전투 연출·밸런스", items:[
      "🌋 <b>용암 골렘</b> 보스(GIF) 등장 · 전투 스프라이트 확대 + 통통 튀는 모션 완화",
      "🎁 승리 시 <b>전리품 패널</b>을 화면 위에 크게 (스크롤 없이) · '내 턴' 텍스트 제거·글씨 짤림 수정",
      "⚖ <b>보스 보상 하향</b>(퍼주기 방지) · 재료 표기 구체화 · 상위 장비 확정→60%",
      "💎 <b>크리스탈은 전투 중 지급 중단</b>(과금 재화 — 통신판매/우편으로만)",
      "🔨 무기 <b>강화 파괴</b> 시 명확한 확인 화면 표시",
    ]},
  { ver:"v1.5 · 8/31", title:"전투 대격변", items:[
      "💬 <b>포켓몬식 전투 메시지 박스</b> — 적 행동을 위 박스로 예고 + 클릭 진행 (최근 4줄 누적)",
      "🎁 승리 시 <b>전리품 패널</b>로 획득물 정리 (전투/아이템 분리)",
      "🗡️ <b>무기별 스킬 게이팅</b> — 물리 스킬은 맞는 무기 필요(마법은 자유) · 스킬도 무기별 미니게임 적용",
      "🦅 <b>비행 몬스터 + Miss</b> — 근접은 빗나가고 활·마법은 명중",
      "🔥 <b>몬스터 속성공격</b>(화상·감전·빙결 지속피해) 추가",
      "📖 몬스터 <b>약점을 도감에 처치수만큼 공개</b> (전투 중 표시 제거)",
      "🌍 <b>50층 '세상의 진실'</b> 스토리 + 🔓 기능 해금 안내",
      "📊 상세 스탯 뷰 · 🔀 던전 무기교체 UI · 드랍 밸런스(재료 최대 3개·장비/스킬북 하향) · 🌋 용암 골렘 보스",
    ]},
  { ver:"v1.4 · 8/30", title:"스킬 개성 기믹", items:[
      "⚔️ <b>검(장검) 전용 '연속 베기 콤보'</b> 미니게임 (활과 차별화)",
      "🎯 강력 스킬 13종에 <b>타이밍 게이지</b> — 완벽 타이밍=위력 1.4배",
      "📋 <b>스킬창 탭 개편</b>(장착/액티브/패시브/생활) + 장착 스킬 마우스오버 툴팁",
    ]},
  { ver:"v1.3 · 8/30", title:"스킬·전투·개척", items:[
      "🗡️ <b>도적 교관</b> + 단검 스킬 · 🌟 <b>희귀 스킬 20종</b>(보스·파밍 드랍)",
      "🐾 <b>동료 먹이 시스템</b> 개편 + 동료 10마리로 확장",
      "🗼 대륙 정복 시 <b>탑 포탈</b> 해금 · <b>개척 진행 버그 수정</b>",
      "💥 강타·연속공격 <b>타격감 강화</b>",
    ]},
  { ver:"v1.2 · 8/29", title:"공지·우편·저장", items:[
      "📢 <b>공지 팝업</b>(탭 구분) + 하단 상시 공지 버튼",
      "📬 <b>우편함</b> 신설 + 반복 도착 버그 수정(즉시 저장)",
      "💎 통신판매 <b>다이아 결제</b> 전환",
    ]},
  { ver:"v1.1 · 8/28", title:"UI·개척 개편", items:[
      "🧳 인벤/창고/대장간/잡화점 <b>UI 개편</b>(무기·방어구·악세 분리)",
      "🧭 개척 몬스터 강화 · 지도 개척 출발지",
      "💬 전투 텍스트 가독성 개선 · 기력 물약 추가",
    ]},
  { ver:"v1.0 · 8/27", title:"오픈", items:["🗼 이름 없는 탑 정식 오픈!"] },
];
function patchNotesHtml(){ return PATCH_NOTES.map(p=>`<div class="ntc-sec"><b>🆕 ${p.ver} — ${p.title}</b><ul>${p.items.map(i=>`<li>${i}</li>`).join("")}</ul></div>`).join("")
  + `<p class="ntc-foot">지난 패치 기록도 여기에 계속 쌓여요.</p>`; }
const NOTICE={
  id:"2026-08-28l",
  title:"📢 공지사항",
  tabs:[
    {key:"notice", label:"📢 공지", html:`
      <p class="ntc-lead">이름 없는 탑에 오신 걸 환영합니다! 🗼</p>
      <div class="ntc-sec"><b>📢 안내</b>
        <ul>
          <li>이 게임은 브라우저에 <b>자동 저장</b>돼요. (온라인은 클라우드 동기화)</li>
          <li>진행이 막히거나 버그를 발견하면 언제든 알려주세요 — 바로 고칩니다.</li>
          <li>📬 <b>우편함</b>으로 운영자 보상·소식이 도착하니 종종 확인하세요.</li>
        </ul>
      </div>
      <p class="ntc-foot">즐거운 등반 되세요! 문의·건의 환영합니다. 🙌</p>`},
    {key:"update", label:"🆕 업데이트", html:patchNotesHtml()},
    {key:"event", label:"🎁 이벤트", html:`
      <div class="ntc-sec"><b>🎁 진행 중 이벤트</b>
        <ul>
          <li>📬 <b>개편 기념 보상</b> — 우편함에서 잊지 말고 받아가세요!</li>
          <li>💎 <b>통신판매 다이아 상점</b> 오픈 (100다이아 = 1,000원 기준)</li>
          <li>🐔 신규 <b>예능 스킬</b>(고무 치킨·아재개그 등) 파밍 도전!</li>
        </ul>
      </div>
      <p class="ntc-foot">새 이벤트는 여기에서 공지됩니다.</p>`},
  ]
};
let _noticeSeen=false, _noticeTab="notice";
function noticeHiddenToday(){ try{ return localStorage.getItem("nt_notice_hide")===new Date().toDateString()+"|"+NOTICE.id; }catch(e){ return false; } }
function hideNoticeToday(){ try{ localStorage.setItem("nt_notice_hide", new Date().toDateString()+"|"+NOTICE.id); }catch(e){} closeNotice(); }
function closeNotice(){ const o=document.getElementById("noticeoverlay"); if(o)o.remove(); }
function noticeTabs(){ return (NOTICE.tabs&&NOTICE.tabs.length)?NOTICE.tabs:[{key:"notice",label:NOTICE.title||"공지",html:NOTICE.html||""}]; }
function noticeTab(key){ _noticeTab=key; const tabs=noticeTabs();
  const bar=document.getElementById("noticetabs"), body=document.getElementById("noticebody");
  if(bar)bar.querySelectorAll(".noticetab").forEach(b=>b.classList.toggle("on", b.dataset.k===key));
  const t=tabs.find(x=>x.key===key)||tabs[0]; if(body){ body.innerHTML=t.html; body.scrollTop=0; }
  if(typeof sfx==="function")sfx("click"); }
function showNotice(){ if(document.getElementById("noticeoverlay"))return;
  const tabs=noticeTabs(); if(!tabs.some(t=>t.key===_noticeTab))_noticeTab=tabs[0].key;
  const cur=tabs.find(t=>t.key===_noticeTab)||tabs[0];
  const tabBar=tabs.length>1?`<div class="noticetabs" id="noticetabs">`+tabs.map(t=>`<button type="button" class="noticetab ${t.key===_noticeTab?'on':''}" data-k="${t.key}" onclick="noticeTab('${t.key}')">${t.label}</button>`).join("")+`</div>`:"";
  const o=document.createElement("div"); o.id="noticeoverlay"; o.className="noticeoverlay";
  o.innerHTML=`<div class="noticebox" role="dialog" aria-modal="true">
    <div class="noticehd"><span>${NOTICE.title}</span><button class="noticex" onclick="closeNotice()" aria-label="닫기">✕</button></div>
    ${tabBar}
    <div class="noticebody" id="noticebody">${cur.html}</div>
    <div class="noticeft"><button class="noticebtn dim" onclick="hideNoticeToday()">오늘은 보지 않기</button><button class="noticebtn" onclick="closeNotice()">닫기</button></div>
  </div>`;
  o.addEventListener("click",e=>{ if(e.target===o)closeNotice(); });   // 바깥 어두운 곳 클릭 시 닫기
  document.body.appendChild(o); if(typeof sfx==="function")sfx("click"); }
function maybeShowNotice(){ if(_noticeSeen)return; _noticeSeen=true; if(noticeHiddenToday())return; setTimeout(showNotice,450); }
window.closeNotice=closeNotice; window.hideNoticeToday=hideNoticeToday; window.showNotice=showNotice; window.noticeTab=noticeTab;
async function enterOnline(){
  if(typeof chatLog!=="undefined")chatLog=[];   // 🆕 새 로그인 세션 → 광장 채팅 초기화(같은 접속 중엔 유지, 로그인마다 비움)
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
