"use strict";
/* ============================================================
   거점 마을
   ============================================================ */
const TOWN_AB=(typeof ASSET_BASE!=="undefined"?ASSET_BASE:"assets/");
const TOWN_BG=TOWN_AB+"ui/town-bg.png";              // 🖼 배경 레이어(지형)
const TOWN_BUILDINGS=TOWN_AB+"ui/town-buildings.png";// 🏠 건물 레이어(투명 PNG) — 글씨는 코드로
const TOWN_BG_LEGACY=TOWN_AB+"ui/town-map.png";      // (구) 글씨까지 박힌 단일 이미지도 지원
const TOWN_SPR_DIR=TOWN_AB+"ui/buildings/";          // 🏠 개별 건물 스프라이트 폴더(tower.png 등, 투명 PNG)
let townReturn=null;   // 🔙 인벤/스킬창을 어느 상점에서 열었는지 기억 → 거기로 복귀
let invTab="wpn";   // 🎒 인벤 카테고리 탭(wpn/arm/acc/cons/mat/quest)
function setInvTab(t){ invTab=t; inventoryMenu(); }
window.setInvTab=setInvTab;
let whTab="wpn";   // 🏦 창고 카테고리 탭(wpn/arm/acc/cons/mat)
let whView="stash";   // 🏦 창고 화면: stash(창고 보기) / bag(소지품 넣기)
function setWhTab(t){ whTab=t; whRefresh(); }
function whRefresh(){ if(whView==="bag")warehouseBag(); else warehouseMenu(); }
let bsTab="wpn";   // ⚒️ 대장간 카테고리 탭(wpn/arm/acc)
function setBsTab(t){ bsTab=t; blacksmithMenu(); }
window.setBsTab=setBsTab;
let storeTab="pot";   // 🛒 잡화점 구매 탭(pot/mat/etc)
function setStoreTab(t){ storeTab=t; storeBuy(); }
window.setStoreTab=setStoreTab;
let sellTab="gear";   // 💰 잡화점 판매 탭(gear/mat)
function setSellTab(t){ sellTab=t; storeSell(); }
window.setSellTab=setSellTab;
window.setWhTab=setWhTab;
function townMenu(){ mode="town"; enemy=null; B=null; if(P)P._duel=null; stopAuctionTimer(); stopChatTimer(); auction=null; EXP=null; expReturn=null; P.buffs={}; townReturn=null;
  if(window.__fromMap){ window.__fromMap=false; if(typeof bgm==="function")bgm("town"); render(); townMap(); return; }   // 🗺 지도에서 들어간 건물을 나오면 지도로 복귀
  if(typeof bgm==="function")bgm("town"); if(typeof amb==="function")amb("town"); checkTitleUnlocks(); checkQuests();
  if(P._divePotBank){ P.potions+=P._divePotBank; P._divePotBank=0; }   // 다이브 때 마을에 맡겨둔 물약 회수
  P.hp=MAXHP(); P.mp=MAXMP(); render(); clearLog(); setScene("🏘️","거점 마을 — 준비를 갖추고 탑으로.");
  line("거점 마을. 탑에 오를 준비를 하자.","sys"); save(true);
  const contUnlocked = (P.flags.cleared||0)>0 || P.flags.continentUnlocked;
  setActions([
    {label:"🗺 마을 둘러보기 (지도)",desc:"걸어다니며 건물 방문 · 미리보기",full:true,act:townMap},
    {header:true,label:"⚔  모  험"},
    {label:"🗼 탑 등반",desc:(P.flags.contCleared||0)>0?"이름 없는 탑 + 정복한 대륙의 탑 포탈":"이름 없는 탑을 오른다 · 전투로 성장",full:true,act:towerList},
    contUnlocked
      ? {label:"🧭 대륙 개척",desc:"탑 너머의 대륙 · 더 강한 적 · 새로운 탑들",full:true,act:startExpedition}
      : {label:"🔒 대륙 개척",desc:"탑 정상(50층)에 도달하면 열린다",full:true,disabled:true,act:()=>{}},
    {header:true,label:"🏘  거점 마을"},
    {label:"🌲 생활 터전",desc:"채집 · 스탯 단련",act:lifeMenu},
    {label:"📖 수련관",desc:"스킬 습득",act:skillMenu},
    (P.companion&&COMPANIONS[P.companion]) ? (()=>{ const r=compRec(P.companion),d=compDisp(P.companion,r.lv); return {label:`🐾 동료 (${d.emoji} ${d.n})`,desc:`유대 Lv.${r.lv||1}${compTier(r.lv)>0?" ✦각성":""} · 먹이 주고 각성시키기`,act:companionMenu}; })() : {label:"🐾 동료",desc:"함께하는 동료가 없다",disabled:true,act:()=>{}},
    {label:"⚒️ 대장간",desc:"장비 강화 (+1, +2…)",act:blacksmithMenu},
    {label:"🔨 제작소",desc:"재료로 세트 장비·내성 제작",act:workshopMenu},
    {label:"🛒 잡화점",desc:"물약·재료·비약·마나 오브",act:generalStore},
    {label:"🛡 장비 상점",desc:"무기·방어구 구매",act:gearShop},
    {label:"🏦 창고 (은행)",desc:`가방↔창고 보관 · 창고 ${stashCount()}칸`,act:warehouseMenu},
    {label:"📦 통신판매 (캐쉬샵)",desc:P.flags.welcomeClaimed?"💎다이아 상점 · 강화의 축복·물약 꾸러미":"🎁 웰컴 스타터팩 무료!",act:cashShop},
    {label:`📬 우편함${(typeof mailUnread==="function"&&mailUnread()>0)?` (${mailUnread()} NEW)`:""}`,desc:"운영자·이벤트 보상 수령",act:mailboxMenu},
    {label:"🏛 길드하우스",desc:`의뢰 수락 · 진행 ${Object.keys(P.quests).filter(id=>P.quests[id].status==="active").length} · 완료 ${Object.keys(P.quests).filter(id=>P.quests[id].status==="done").length}`,act:guildHouse},
    {label:"🏛 경매장",desc:"재료·유물 거래",act:openAuction},
    contUnlocked
      ? {label:"⛺ 부족 거점",desc:`일꾼 자동 채집 · 슬롯 ${(P.farm&&P.farm.slots.length)||0}칸`,act:farmMenu}
      : {label:"🔒 부족 거점",desc:"대륙 개척을 열면 세울 수 있다 (일꾼 자동 채집)",disabled:true,act:()=>{}},
    {label:`🌌 회귀의 제단`,desc:`메아리 ✦${(P.meta&&P.meta.echoes)||0} · 회귀 ${(P.meta&&P.meta.runs)||0}회 · 영구 강화`,act:altarMenu},
  ]);
  startTownChat();   // 상시 광장 채팅 독
  if(typeof maybeShowNotice==="function")maybeShowNotice(); }   // 📢 접속 후 첫 마을 진입 시 공지 팝업(1회)
/* 🎨 캔버스 타일 마을 렌더러 — 잔디 타일·광장·연못·나무·모닥불·집 스프라이트를 그린다 */
function drawTownCanvas(cv, blds){
  const w=cv.clientWidth||600, h=cv.clientHeight||340, dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const X=p=>p/100*w, Y=p=>p/100*h; let s=20260827>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const greens=["#5aa246","#63ab4e","#549a40","#5ea648"], T=Math.max(20,Math.round(w/22));
  for(let yy=0;yy<h;yy+=T)for(let xx=0;xx<w;xx+=T){ g.fillStyle=greens[(Math.floor(xx/T)*3+Math.floor(yy/T)*5)%greens.length]; g.fillRect(xx,yy,T+1,T+1);
    if(rnd()<0.10){ g.fillStyle="rgba(28,74,28,.18)"; g.fillRect(xx+rnd()*T*0.6,yy+rnd()*T*0.6,T*0.32,T*0.32); }
    if(rnd()<0.05){ g.fillStyle=rnd()<0.5?"#ecd94e":"#ec8fb2"; g.fillRect(xx+rnd()*T,yy+rnd()*T,3,3); } }
  g.fillStyle="#c8b083"; g.globalAlpha=0.55; g.beginPath(); g.ellipse(X(47),Y(72),w*0.17,h*0.13,0,0,7); g.fill(); g.globalAlpha=1;   // 중앙 광장
  g.fillStyle="#3f7fbf"; g.beginPath(); g.ellipse(X(90),Y(66),w*0.07,h*0.10,0,0,7); g.fill(); g.fillStyle="#5b9fd6"; g.beginPath(); g.ellipse(X(89),Y(64),w*0.05,h*0.07,0,0,7); g.fill();   // 연못
  [[26,46],[57,40],[38,74],[8,20],[76,20],[94,86]].forEach(([tx,ty])=>drawTree(g,X(tx),Y(ty)));
  drawFire(g,X(72),Y(60));
  const roofs=["#b8524a","#4a6bb8","#7a4ab8","#b88a4a","#4ab88a","#b84a86","#5a7a4a","#8a6a4a"];
  blds.forEach((b,i)=>drawHouse(g,X(b.x),Y(b.y),b.emo,b.label,roofs[i%roofs.length]));
}
function drawTree(g,x,y){ g.fillStyle="rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(x,y+14,12,4,0,0,7); g.fill();
  g.fillStyle="#6b4a2a"; g.fillRect(x-3,y,6,14); g.fillStyle="#3f8a3a"; [[0,-8,14],[-9,-2,10],[9,-2,10],[0,-16,10]].forEach(([dx,dy,r])=>{ g.beginPath(); g.arc(x+dx,y+dy,r,0,7); g.fill(); });
  g.fillStyle="#4fa347"; g.beginPath(); g.arc(x-4,y-11,7,0,7); g.fill(); }
function drawFire(g,x,y){ g.fillStyle="#5a3a1a"; g.fillRect(x-9,y+6,18,4);
  g.fillStyle="#ff7a1a"; g.beginPath(); g.moveTo(x,y-12); g.quadraticCurveTo(x+9,y,x,y+6); g.quadraticCurveTo(x-9,y,x,y-12); g.fill();
  g.fillStyle="#ffd24a"; g.beginPath(); g.moveTo(x,y-5); g.quadraticCurveTo(x+5,y+1,x,y+5); g.quadraticCurveTo(x-5,y+1,x,y-5); g.fill(); }
function drawHouse(g,x,y,emoji,label,roof){ g.save(); g.textAlign="center"; g.textBaseline="middle"; const bw=46,bh=30;
  g.fillStyle="rgba(0,0,0,.2)"; g.beginPath(); g.ellipse(x,y+bh/2+4,bw*0.55,7,0,0,7); g.fill();
  g.fillStyle="#ecdcb8"; g.fillRect(x-bw/2,y-bh/2,bw,bh); g.fillStyle="rgba(120,90,50,.18)"; g.fillRect(x-bw/2,y+bh/2-7,bw,7);
  g.fillStyle="#7a5230"; g.fillRect(x-7,y+bh/2-14,14,14); g.fillStyle="#ffcf6a"; g.fillRect(x-8,y+bh/2-11,4,9);
  g.fillStyle=roof; g.beginPath(); g.moveTo(x-bw/2-6,y-bh/2); g.lineTo(x+bw/2+6,y-bh/2); g.lineTo(x+bw/2-7,y-bh/2-17); g.lineTo(x-bw/2+7,y-bh/2-17); g.closePath(); g.fill();
  g.fillStyle="rgba(0,0,0,.18)"; g.fillRect(x-bw/2-6,y-bh/2-1,bw+12,3);
  g.font="17px serif"; g.fillText(emoji,x,y-1);
  g.font="bold 11px sans-serif"; g.lineWidth=3; g.strokeStyle="rgba(255,255,255,.85)"; g.strokeText(label,x,y+bh/2+13); g.fillStyle="#10240f"; g.fillText(label,x,y+bh/2+13); g.restore(); }
/* 🗺 마을 지도(걸어다니는 프리뷰) — 건물 클릭 → 캐릭터가 걸어가서 도착하면 해당 메뉴 오픈 */
function townMap(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town"; stopChatTimer();
  render(); clearLog(); setScene("🗺️","거점 마을");
  if(document.body)document.body.classList.add("mapview");   // 상단 씬 숨기고 지도를 크게 (공간 활용)
  const contUnlocked=(P.flags.cleared||0)>0||P.flags.continentUnlocked;
  const blds=[
    {emo:"🗼",label:"탑",x:50,y:14,w:16,spr:null,act:towerList,hi:"탑에 오른다…"},   // 배경 동굴 입구 사용(스프라이트 없음) · 정복 대륙 탑 포탈 목록
    {emo:"🛡️",label:"장비상점",x:15,y:34,w:15,spr:"gearshop",act:gearShop,hi:"어서오세요, 손님!"},
    {emo:"⚒️",label:"대장간",x:33,y:28,w:17,spr:"blacksmith",act:blacksmithMenu,hi:"강화해 줄까?"},
    {emo:"🔨",label:"제작소",x:18,y:60,w:14,spr:"workshop",act:workshopMenu,hi:"뭘 만들어볼까?"},
    {emo:"🛒",label:"잡화점",x:40,y:56,w:20,spr:"store",act:generalStore,hi:"물약 필요해요?"},
    {emo:"🏦",label:"창고",x:67,y:32,w:15,spr:"warehouse",act:warehouseMenu,hi:"맡기실 건가요?"},
    {emo:"🏛️",label:"경매장",x:82,y:52,w:14,spr:"auction",act:openAuction,hi:"좋은 매물 많아요"},
    {emo:"🛖",label:"길드",x:63,y:70,w:14,spr:"guild",act:guildHouse,hi:"의뢰 보러 왔나?"},
    {emo:"🌲",label:"생활터전",x:88,y:26,w:13,spr:null,act:lifeMenu,hi:"오늘도 수고!"},   // 배경 동굴 입구 사용
    {emo:"📖",label:"수련관",x:10,y:78,w:14,spr:"dojo",act:skillMenu,hi:"수련하러 왔군"},
    {emo:"🌌",label:"제단",x:44,y:82,w:13,spr:"altar",act:altarMenu,hi:"돌아왔는가…"},
  ];
  if(contUnlocked)blds.push({emo:"🧭",label:"개척·부족거점",x:72,y:80,w:14,spr:null,act:outpostMenu,hi:"개척 나갈 준비 됐나?"});   // 왼쪽 배경 동굴 입구 사용 · 개척 출발지 겸 부족거점
  const glyph=(P.avatar&&typeof isImgAvatar==="function"&&isImgAvatar(P.avatar))?`<img src="${P.avatar}" alt="">`:(P.avatar||"🧝");
  $("log").innerHTML=`<div class="townmap" id="townmap">
    <canvas class="tmcanvas" id="tmcanvas"></canvas>
    <img class="tmbuildings" id="tmbuildings" alt="" hidden>
    ${blds.map((b,i)=> b.spr ? `<img class="tmbld3" data-i="${i}" alt="" hidden src="${TOWN_SPR_DIR}${b.spr}.png" style="left:${b.x}%;top:${b.y}%;width:${b.w||15}%;z-index:${Math.round(b.y)}">` : "").join("")}
    ${blds.map((b,i)=>`<button type="button" class="tmhit" data-i="${i}" tabindex="-1" aria-label="${b.label}" style="left:${b.x}%;top:${b.y}%"></button>`).join("")}
    ${blds.map(b=>`<div class="tmlabel" style="left:${b.x}%;top:${(b.y+9)}%">${b.emo} ${b.label}</div>`).join("")}
    <div class="tmothers" id="tmothers"></div>
    <div class="tmplayer" id="tmplayer" style="left:47%;top:70%">${glyph}</div>
    <div class="tmhint">🖱 건물을 누르면 걸어가서 이용해요</div></div>`;
  const map=$("townmap"), pl=$("tmplayer"), cv=$("tmcanvas"); let walking=false;
  pl.style.zIndex=Math.round(parseFloat(pl.style.top)||70);   // 캐릭터 초기 깊이(y 기준)
  // 🏠 개별 건물 스프라이트 로드(있으면 표시·클릭·바운스). 하나라도 뜨면 통합 이미지 대신 개별 사용
  map.querySelectorAll(".tmbld3").forEach(im=>{ im.onload=()=>{ im.hidden=false; map.classList.add("hasspr"); }; im.onerror=()=>{ im.hidden=true; };
    im.onclick=(e)=>{ e.stopPropagation(); goTo(blds[+im.dataset.i], im); }; });
  // 🚶 건물로 걸어가서 이용 (히트박스·스프라이트 공용) + 클릭한 건물 바운스 + 깊이(뒤로 가림)
  function goTo(b, srcEl){ if(walking||!pl||!b)return;
    if(srcEl){ srcEl.classList.remove("bounce"); void srcEl.offsetWidth; srcEl.classList.add("bounce"); if(typeof sfx==="function")sfx("click"); }
    const px=parseFloat(pl.style.left)||47, py=parseFloat(pl.style.top)||70, tx=b.x, ty=b.y+9;   // 문 앞까지
    const dist=Math.hypot(tx-px,ty-py), dur=Math.max(260,Math.round(dist*24)); walking=true;
    pl.classList.toggle("faceleft", tx<px-0.5);   // 🔄 걷는 방향 좌우 뒤집기
    pl.style.transition=`left ${dur}ms ease-in-out, top ${dur}ms ease-in-out`; pl.classList.add("walking");
    pl.style.left=tx+"%"; pl.style.top=ty+"%";
    const depth=()=>{ pl.style.zIndex=Math.round(parseFloat(pl.style.top)||ty); };   // 캐릭터 깊이(y) → 위 건물 뒤로 가림
    let df=0; const dloop=()=>{ depth(); if(df++<40&&walking)requestAnimationFrame(dloop); }; if(typeof requestAnimationFrame==="function")dloop(); else depth();
    if(P._online&&typeof netTownPos==="function")netTownPos(tx,ty).catch(()=>{});   // 👥 내 이동을 다른 유저에게 브로드캐스트
    const stepT=setInterval(()=>{ if(typeof sfx==="function")sfx("step"); }, 260);   // 🚶 발소리
    setTimeout(()=>{ clearInterval(stepT); pl.classList.remove("walking"); walking=false; depth();
      const bub=document.createElement("div"); bub.className="tmbubble"; bub.textContent=b.hi||(b.label+" 도착!"); bub.style.left=tx+"%"; bub.style.top=(ty-7)+"%"; map.appendChild(bub);   // 💬 도착 인사말
      setTimeout(()=>{ try{ bub.remove(); }catch(e){} }, 900);
      window.__fromMap = (b.act!==startDive);   // 상점류는 나갈 때 지도로 복귀(탑 등반은 예외)
      if(typeof stopTownPresence==="function")stopTownPresence();
      if(typeof sfx==="function")sfx("click"); setTimeout(()=>b.act(), 260); }, dur+60); }
  // 🖼 배경 레이어(town-bg.png, 없으면 구 town-map.png) → 성공 시 캔버스 대신 이미지 사용
  try{ const bg=new Image(); bg.onload=()=>{ if(!map)return; map.classList.add("hasbg"); map.style.backgroundImage=`url("${bg.src}")`; if(bg.naturalWidth&&bg.naturalHeight)map.style.aspectRatio=bg.naturalWidth+" / "+bg.naturalHeight; };
    bg.onerror=()=>{ const bg2=new Image(); bg2.onload=()=>{ if(!map)return; map.classList.add("hasbg","baked"); map.style.backgroundImage=`url("${bg2.src}")`; if(bg2.naturalWidth&&bg2.naturalHeight)map.style.aspectRatio=bg2.naturalWidth+" / "+bg2.naturalHeight; }; bg2.src=TOWN_BG_LEGACY; };   // 폴백: 글씨 박힌 단일 이미지
    bg.src=TOWN_BG; }catch(e){}
  // 🏠 건물 레이어(투명 PNG) — 있으면 배경 위에 얹음
  try{ const bd=$("tmbuildings"); if(bd){ bd.onload=()=>{ bd.hidden=false; }; bd.onerror=()=>{ bd.hidden=true; }; bd.src=TOWN_BUILDINGS; } }catch(e){}
  const drawIt=()=>{ try{ drawTownCanvas(cv, blds); }catch(e){} };
  drawIt(); setTimeout(drawIt,0); if(typeof requestAnimationFrame==="function")requestAnimationFrame(drawIt);   // 즉시+다음틱+rAF
  if(typeof ResizeObserver==="function"){ try{ const ro=new ResizeObserver(()=>drawIt()); ro.observe(cv); }catch(e){} }   // 🔧 크기 바뀔 때마다 재그리기(히트박스와 항상 정렬)
  if(typeof startTownPresence==="function")startTownPresence(map, blds);   // 👥 다른 온라인 유저 표시(온라인일 때)
  map.querySelectorAll(".tmhit").forEach(btn=>{ btn.onmousedown=(e)=>e.preventDefault();   // 포커스 훔쳐 페이지 스크롤되는 것 방지
    btn.onclick=(e)=>{ e.stopPropagation(); goTo(blds[+btn.dataset.i], null); }; });   // 스프라이트 없을 때(캔버스 폴백)용 히트박스
  setActions([{label:"📋 메뉴(목록)로 보기",full:true,act:()=>{ window.__fromMap=false; if(typeof stopTownPresence==="function")stopTownPresence(); townMenu(); }},{label:"🗼 탑 등반",full:true,act:startDive}]); }
/* 👥 마을 지도 실시간 접속자 표시(온라인) — 내 위치 브로드캐스트 + 다른 유저를 걸어다니게 렌더 */
let townPresenceTimer=null, townOthers={};
function tmOtherAv(av){ return (typeof av==="string"&&av.slice(0,5)==="data:")?`<img src="${av}" alt="">`:((av&&[...String(av)].length<=4)?av:"🧑"); }
function upsertOther(layer, m){ if(!layer||!m||!m.id)return; let el=townOthers[m.id];
  if(!el){ el=document.createElement("div"); el.className="tmother"; el.style.left=m.x+"%"; el.style.top=m.y+"%";
    el.innerHTML=`<span class="tmoav"></span><span class="tmonm"></span>`; layer.appendChild(el); townOthers[m.id]=el; }
  el.querySelector(".tmoav").innerHTML=tmOtherAv(m.av); el.querySelector(".tmonm").textContent=m.name||"?"; el.dataset.ts=Date.now();
  el.style.left=m.x+"%"; el.style.top=m.y+"%";   // CSS transition(.5s)으로 걸어가듯 이동
}
function removeOther(id){ const el=townOthers[id]; if(el){ try{ el.remove(); }catch(e){} delete townOthers[id]; } }
function startTownPresence(map, blds){ if(!(P&&P._online)||typeof netTownRoster!=="function")return;
  const layer=map.querySelector("#tmothers"); if(!layer)return; townOthers={};
  NET.onTownPos=(m)=>{ if(!m||m.id===NET.userId)return; const lay=document.getElementById("tmothers"); if(lay)upsertOther(lay,m); };
  NET.onTownLeave=(m)=>{ if(m)removeOther(m.id); };
  netTownRoster().then(list=>{ const lay=document.getElementById("tmothers"); if(!lay)return; list.forEach(m=>{ if(m.id!==NET.userId)upsertOther(lay,m); }); }).catch(()=>{});
  const sendMe=()=>{ if(!document.getElementById("townmap")){ stopTownPresence(); return; } const pl=document.getElementById("tmplayer"); const x=pl?parseFloat(pl.style.left)||47:47, y=pl?parseFloat(pl.style.top)||70:70;
    if(typeof netTownPos==="function")netTownPos(x,y).catch(()=>{});
    const now=Date.now(); for(const id in townOthers){ if(now-(+townOthers[id].dataset.ts||now)>20000)removeOther(id); } };   // 오래된 유저 정리
  sendMe(); clearInterval(townPresenceTimer); townPresenceTimer=setInterval(sendMe, 3500);   // 하트비트
}
function stopTownPresence(){ clearInterval(townPresenceTimer); townPresenceTimer=null;
  if(typeof NET!=="undefined"){ NET.onTownPos=null; NET.onTownLeave=null; }
  for(const id in townOthers)removeOther(id); townOthers={};
  if(P&&P._online&&typeof netTownLeave==="function")netTownLeave(); }
/* 🐾 동료 — 유대(먹이/전투)로 성장·각성. 효과가 레벨·각성 비례로 강해진다 */
const COMP_FEED={ mana:14 };   // 재료 1개당 유대치(기본 6, 마나결정 등 희귀 재료는 ↑)
function compFeedBond(mk){ return COMP_FEED[mk]||6; }
function compEffectText(key,lv,tier){ const role=COMPANIONS[key].role;
  if(role==="heal")return `매 턴 회복 <b>${Math.round((0.04+lv*0.005+tier*0.02)*100)}%</b> · 특수 대회복 <b>${Math.round((0.35+lv*0.01+tier*0.06)*100)}%</b>${tier>=2?" + 보호막":""}`;
  if(role==="dps")return `매 턴 딜 <b>공격의 ${Math.round((0.12+lv*0.015+tier*0.06)*100)}%</b> · 특수 대폭발 <b>${Math.round((1.5+lv*0.03+tier*0.4)*100)}%</b>`;
  return `받는 피해 <b>-${Math.round(Math.min(0.42,0.18+lv*0.004+tier*0.04)*100)}%</b> · 특수 방패+반사${tier>=1?" + 회복":""}`; }
function companionMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town"; stopAuctionTimer(); auction=null; townReturn=companionMenu;
  render(); clearLog(); setScene("🐾","동료 — 유대를 쌓아 각성시킨다.");
  const key=P.companion; if(!key||!COMPANIONS[key]){ line("함께하는 동료가 없다.","sys"); setActions([{label:"🏘 마을로",full:true,act:townMenu}]); return; }
  const rec=compRec(key), lv=rec.lv||1, tier=compTier(lv), d=compDisp(key,lv);
  const maxed=lv>=COMP_LV_CAP, need=compBondNeed(lv), prog=maxed?1:clamp((rec.bond||0)/need,0,1);
  const nextAwk=AWAKEN_LV.find(a=>a>lv);
  line(`${tier>0?d.emoji:ico(d.ic,26)} <b>${d.n}</b> · 유대 <b>Lv.${lv}</b>${tier>0?` <span style="color:var(--gold)">✦각성 ${tier}</span>`:""}`,"sys");
  line(`<div style="margin:4px 0 2px">${compEffectText(key,lv,tier)}</div>`,"sys");
  line(`<div class="cbondbar"><i style="width:${Math.round(prog*100)}%"></i></div><div style="font-size:11.5px;color:var(--dim)">${maxed?"최대 성장 완료":`유대 ${Math.floor(rec.bond||0)}/${need} → 다음 레벨`}${nextAwk?` · 다음 각성 Lv.${nextAwk}`:tier>=2?"":" · 각성 완료"}</div>`,"quote");
  { const slots=compRuneSlots(key), eq=(rec.runes||[]); const chips=Array.from({length:slots},(_,i)=>{ const rk=eq[i]; return rk&&RUNES[rk]?`<span class="runechip">${RUNES[rk].emoji}${RUNES[rk].n}</span>`:`<span class="runechip empty">빈 슬롯</span>`; }).join(" ");
    line(`<div style="font-size:11.5px;color:var(--dim);margin-top:2px">🔩 룬 ${eq.length}/${slots} ${chips}</div>`,"sys"); }
  const role=COMPANIONS[key].role, roleFood=FOOD_BY_ROLE[role];
  { const rf=FOODS[roleFood]; line(`먹이로 유대가 오른다 — <b>${rf.emoji} ${rf.n}</b>(전용, 효율 최고) 또는 <b>🥫 공용 사료</b>. 전투 승리로도 쌓인다.`,"quote"); }
  const acts=[{label:"🔩 룬 장착·해제",full:true,desc:`슬롯 ${(rec.runes||[]).length}/${compRuneSlots(key)} · 각성할수록 슬롯 개방`,act:()=>companionRuneMenu(key)},{header:true,label:"🍖  먹이 주기 (전용먹이/공용사료 → 유대)"}];
  const feedList=[roleFood,"food_any"];   // 이 동료에게 줄 수 있는 먹이(역할 전용 + 공용)
  const ownedFood=feedList.filter(fk=>(P.food[fk]||0)>0);
  if(maxed)acts.push({label:"이미 최대 성장",disabled:true,act:()=>{}});
  else if(!ownedFood.length)acts.push({label:"줄 먹이가 없다",desc:"던전 몬스터가 먹이를 떨궈요 · 공용사료는 📦통신판매",disabled:true,act:()=>{}});
  else ownedFood.forEach(fk=>{ const f=FOODS[fk], have=P.food[fk]||0, per=foodBond(fk,role), batch=Math.min(have,5), match=(fk===roleFood);
    acts.push({label:`${f.emoji} ${f.n} 먹이기 (보유 ${have})${match?" ⭐전용":""}`,desc:`${batch}개 → 유대 +${batch*per}${fk==="food_any"?" · 공용":""}`,act:()=>feedCompanionFood(fk,batch)}); });
  // 🔁 보유 동료 교체
  const ownedKeys=Object.keys(P.comps||{}).filter(k=>COMPANIONS[k]);
  acts.push({header:true,label:`🔁  동료 교체  (보유 ${ownedKeys.length}/${Object.keys(COMPANIONS).length})`});
  ownedKeys.forEach(k=>{ const r=compRec(k), dd=compDisp(k,r.lv), active=(k===P.companion), roleLab=({heal:"회복",dps:"공격",tank:"방어"})[COMPANIONS[k].role]||"";
    acts.push({label:`${dd.emoji} ${dd.n}  Lv.${r.lv||1}`, desc:`${roleLab}형${compTier(r.lv)>0?" · ✦각성":""}${active?" · 현재 동행 중":""}`, disabled:active, act:()=>setActiveCompanion(k)}); });
  // ✨ 영입 (스타터: 크리스탈 / 희귀: 보스 드랍)
  const recruitable=STARTER_COMPS.filter(k=>!compOwned(k));
  if(recruitable.length){ acts.push({header:true,label:`✨  영입  (💎${STARTER_RECRUIT_GEMS})`});
    recruitable.forEach(k=>{ const c=COMPANIONS[k]; acts.push({label:`${c.emoji} ${c.n} 영입`, desc:`${c.note} · 💎${STARTER_RECRUIT_GEMS}`, disabled:(P.gems||0)<STARTER_RECRUIT_GEMS, act:()=>recruitCompanion(k)}); }); }
  const rareLeft=RARE_COMPS.filter(k=>!compOwned(k)).length;
  if(rareLeft)acts.push({header:true,label:`💀 희귀 동료 ${rareLeft}종 — 보스 처치로 영입`});
  const pionLeft=(typeof PION_COMPS!=="undefined"?PION_COMPS:[]).filter(k=>!compOwned(k)).length;
  if(pionLeft)acts.push({header:true,label:`🧭 개척지 동료 ${pionLeft}종 — 대륙 개척 중 발견`});
  const questLeft=(typeof QUEST_COMPS!=="undefined"?QUEST_COMPS:[]).filter(k=>!compOwned(k)).length;
  if(questLeft)acts.push({header:true,label:`📜 퀘스트 동료 ${questLeft}종 — 전용 의뢰 보상`});
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function feedCompanionFood(fk,n){ const key=P.companion; if(!key||!COMPANIONS[key])return; const role=COMPANIONS[key].role;
  n=Math.min(n,P.food[fk]||0); if(n<=0){ toast("먹이 부족"); return; }
  P.food[fk]-=n; if(P.food[fk]<=0)delete P.food[fk]; const gain=n*foodBond(fk,role); const f=FOODS[fk];
  line(`🍖 ${f.emoji} ${f.n} ${n}개를 주었다. 유대 +${gain}${f.role===role?" <b>(전용먹이 보너스!)</b>":""}`,"loot");
  gainCompBond(gain); if(typeof sfx==="function")sfx("heal"); render(); save(true); companionMenu(); }
function setActiveCompanion(key){ if(!compOwned(key)){ toast("보유하지 않은 동료"); return; } if(key===P.companion){ companionMenu(); return; }
  P.companion=key; const d=compDisp(key,compRec(key).lv); line(`🔁 <b>${d.emoji} ${d.n}</b>와(과) 동행한다.`,"sys"); toast("동행 동료: "+d.n);
  if(typeof sfx==="function")sfx("click"); render(); save(true); companionMenu(); }
function recruitCompanion(key){ const c=COMPANIONS[key]; if(!c||c.rare){ toast("영입할 수 없어요"); return; } if(compOwned(key)){ toast("이미 보유 중"); return; }
  if((P.gems||0)<STARTER_RECRUIT_GEMS){ toast("크리스탈 부족"); return; }
  P.gems-=STARTER_RECRUIT_GEMS; ensureComp(key); line(`✨ <b>${c.emoji} ${c.n}</b>을(를) 영입했다! (💎-${STARTER_RECRUIT_GEMS})`,"loot"); toast("영입: "+c.n);
  if(typeof sfx==="function")sfx("loot"); render(); save(true); companionMenu(); }
/* 🔩 룬 장착·해제 — 동료 슬롯(각성 티어만큼)에 보유 룬을 끼운다 */
function companionRuneMenu(key){ if(enemy){ toast("전투 중엔 안 돼요"); return; } key=key||P.companion; const c=COMPANIONS[key]; if(!c){ companionMenu(); return; }
  mode="town"; render(); clearLog(); const rec=compRec(key), d=compDisp(key,rec.lv), slots=compRuneSlots(key), eq=rec.runes||(rec.runes=[]);
  setScene("🔩",`${d.n} — 룬 장착`);
  line(`${compTier(rec.lv)>0?d.emoji:ico(d.ic,26)} <b>${d.n}</b> · 룬 슬롯 <b>${eq.length}/${slots}</b> <span style="color:var(--dim);font-size:11.5px">(각성할수록 개방: Lv.1→1 · Lv.12→2 · Lv.24→3)</span>`,"sys");
  const acts=[{header:true,label:"장착된 룬 (눌러서 해제)"}];
  if(!eq.length)acts.push({label:"— 비어 있음 —",disabled:true,act:()=>{}});
  else eq.forEach((rk,i)=>{ const r=RUNES[rk]; acts.push({label:`${r?r.emoji+" "+r.n:rk}`,desc:(r?r.note:"")+" · 눌러서 해제",act:()=>runeUnequip(key,i)}); });
  const poolKeys=Object.keys(RUNES).filter(rk=>(P.runes[rk]||0)>0);
  acts.push({header:true,label:"보유 룬 (눌러서 장착)"});
  if(!poolKeys.length)acts.push({label:"보유한 룬이 없다",desc:"제작소에서 룬을 제작하자",disabled:true,act:()=>{}});
  else poolKeys.forEach(rk=>{ const r=RUNES[rk]; acts.push({label:`${r.emoji} ${r.n} ×${P.runes[rk]}`,desc:r.note,disabled:eq.length>=slots,act:()=>runeEquip(key,rk)}); });
  acts.push({label:"← 동료로",full:true,act:()=>companionMenu()}); setActions(acts); }
function runeEquip(key,rk){ const rec=compRec(key); if(!rec.runes)rec.runes=[]; if(rec.runes.length>=compRuneSlots(key)){ toast("슬롯이 가득 찼다"); return; }
  if((P.runes[rk]||0)<=0){ toast("보유한 룬이 없다"); return; } P.runes[rk]--; if(P.runes[rk]<=0)delete P.runes[rk]; rec.runes.push(rk);
  const r=RUNES[rk]; line(`🔩 ${r.emoji} ${r.n}을(를) 장착했다.`,"loot"); if(typeof sfx==="function")sfx("click"); render(); save(true); companionRuneMenu(key); }
function runeUnequip(key,i){ const rec=compRec(key); if(!rec.runes||!rec.runes[i])return; const rk=rec.runes.splice(i,1)[0]; P.runes[rk]=(P.runes[rk]||0)+1;
  const r=RUNES[rk]; line(`🔩 ${r?r.n:rk}을(를) 해제했다.`,"sys"); if(typeof sfx==="function")sfx("click"); render(); save(true); companionRuneMenu(key); }
function craftRune(rk){ const r=RUNES[rk]; if(!r){ toast("알 수 없는 룬"); return; } const cost=r.cost||{gold:150,mats:{}};
  if(!canAfford(cost)){ toast("재료·금화 부족"); return; } payCost(cost); P.runes[rk]=(P.runes[rk]||0)+1;
  line(`🔩 <b>${r.emoji} ${r.n}</b> 제작 완료!`,"loot"); toast("제작: "+r.n); if(typeof sfx==="function")sfx("loot"); render(); save(true); workshopMenu(); }
/* 🧭 개척·부족거점 허브 — 지도 부족거점 입구에서 진입. 개척 출발 + 거점 관리 */
function outpostMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town";
  render(); clearLog(); setScene("🧭","대륙 개척 거점 — 탑 너머로 나설 준비.");
  line("여기서 대륙으로 <b>개척</b>을 떠나거나, 데려온 일꾼들의 <b>부족 거점</b>을 관리한다.","sys");
  line("⚠ 개척지 몬스터는 탑과 <b>비교도 안 되게</b> 강하다 — 지역 <b>내성 물약</b> 꼭 챙길 것.","quote");
  setActions([
    {label:"🧭 대륙 개척 나가기",full:true,desc:"탑 너머의 대륙 · 더 강한 적 · 새로운 탑들",act:startExpedition},
    {label:"⛺ 부족 거점 관리",full:true,desc:`일꾼 자동 채집 · 슬롯 ${(P.farm&&P.farm.slots&&P.farm.slots.length)||0}칸`,act:farmMenu},
    {label:"🏘 마을로",full:true,act:townMenu},
  ]); }
/* ⛺ 부족 거점 — 일꾼이 시간 기반으로 자원 자동 생산 */
function farmMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town";
  if(!P.farm.unlocked){ P.farm.unlocked=true; P.farm.lastTs=Date.now();
    if(P.farm.slots.length===0)for(let i=0;i<FARM_START_SLOTS;i++)P.farm.slots.push({res:i===0?"ore":"wood",lv:1,acc:0}); }
  farmTick(); render(); clearLog(); setScene("⛺","부족 거점 — 일꾼들이 일하고 있다.");
  const totalReady=Math.floor(P.farm.slots.reduce((a,s)=>a+(s.res?s.acc:0),0));
  line(`일꾼들이 알아서 자원을 모은다. 수확할 자원 <b>${totalReady}</b>개 대기 중.`,"sys");
  line("💡 자원은 접속하지 않아도 시간에 따라 쌓이고, 슬롯마다 저장 한도가 있다.","quote");
  const acts=[{header:true,label:`⛺  부족 거점  ·  일꾼 ${P.farm.slots.length}/${FARM_MAX_SLOTS}`}];
  acts.push({label:`🌾 전체 수확 (+${totalReady})`,full:true,desc:totalReady>0?"모인 자원을 모두 회수":"아직 모인 자원이 없다",disabled:totalReady<=0,act:farmHarvestAll});
  P.farm.slots.forEach((s,i)=>{ const r=s.res?MATS[s.res]:null; const rdy=Math.floor(s.acc||0), cap=farmCap(s.lv), full=rdy>=cap;
    acts.push({label:`${r?r[0]+" "+r[1]:"➕ 빈 슬롯"} · Lv.${s.lv}`, desc: s.res?`저장 ${rdy}/${cap}${full?" (가득!)":""} · 시간당 +${farmRate(s.lv)} · 눌러서 관리`:"자원을 지정하세요", act:()=>farmSlotMenu(i)}); });
  const hireN=P.farm.slots.length; if(hireN<FARM_MAX_SLOTS){ const cost=farmHireCost(hireN);
    acts.push({label:`👷 일꾼 고용 (슬롯 +1)`,desc:`빈 생산 슬롯 추가 · ${cost}G`,disabled:P.gold<cost,act:()=>farmHire()}); }
  else acts.push({label:"👷 일꾼 최대 (6/6)",disabled:true,act:()=>{}});
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function farmHarvestAll(){ farmTick(); let total=0; const got={};
  for(const s of P.farm.slots){ if(!s.res)continue; const n=Math.floor(s.acc||0); if(n>0){ addMat(s.res,n); got[s.res]=(got[s.res]||0)+n; total+=n; s.acc=0; } }
  if(total<=0){ toast("수확할 자원이 없다"); return; }
  const txt=Object.entries(got).map(([k,n])=>`${MATS[k][0]} ${MATS[k][1]} +${n}`).join(" · ");
  line(`🌾 <b>수확!</b> ${txt}`,"loot"); toast(`수확 +${total}`); render(); save(true); farmMenu(); }
function farmHire(){ const n=P.farm.slots.length; if(n>=FARM_MAX_SLOTS){ toast("일꾼 최대"); return; } const cost=farmHireCost(n);
  if(P.gold<cost){ toast("금화 부족"); return; } P.gold-=cost; P.farm.slots.push({res:null,lv:1,acc:0});
  line(`👷 일꾼을 고용했다! 생산 슬롯 +1 (총 ${P.farm.slots.length}) · -${cost}G`,"loot"); toast("일꾼 고용"); render(); save(true); farmMenu(); }
function farmSlotMenu(i){ const s=P.farm.slots[i]; if(!s)return; farmTick(); const r=s.res?MATS[s.res]:null; const acts=[];
  acts.push({header:true,label:`${r?r[0]+" "+r[1]:"빈 슬롯"} · Lv.${s.lv}`});
  if(s.res){ const rdy=Math.floor(s.acc||0);
    acts.push({label:`🌾 이 슬롯 수확 (+${rdy})`,desc:`${rdy}/${farmCap(s.lv)}`,disabled:rdy<=0,act:()=>{ addMat(s.res,rdy); s.acc=0; line(`🌾 ${r[0]} ${r[1]} +${rdy} 수확.`,"loot"); render(); save(true); farmSlotMenu(i); }}); }
  { const gcost=farmUpCostGold(s.lv), mcost=2+s.lv, mk="wood"; const can=P.gold>=gcost&&(P.mats[mk]||0)>=mcost;
    acts.push({label:`🔧 시설 강화 Lv.${s.lv}→${s.lv+1}`,desc:`시간당 +${farmRate(s.lv)}→+${farmRate(s.lv+1)} · 상한 ${farmCap(s.lv)}→${farmCap(s.lv+1)} · ${gcost}G + ${MATS[mk][0]}${mcost}`,disabled:!can,act:()=>{ P.gold-=gcost; P.mats[mk]=(P.mats[mk]||0)-mcost; s.lv++; line(`🔧 슬롯 강화! Lv.${s.lv} (시간당 +${farmRate(s.lv)})`,"loot"); toast("강화 완료"); render(); save(true); farmSlotMenu(i); }}); }
  acts.push({label:"🔄 자원 변경",desc:"이 슬롯이 생산할 자원 선택 (모인 건 자동 수확)",act:()=>farmResPick(i)});
  acts.push({label:"← 뒤로",full:true,act:farmMenu}); setActions(acts); }
function farmResPick(i){ const s=P.farm.slots[i]; if(!s)return; const acts=[{header:true,label:"생산할 자원 선택"}];
  for(const [mk,[e,nm]] of Object.entries(MATS)){ acts.push({label:`${e} ${nm}`,desc:s.res===mk?"현재 생산 중":"이 자원을 생산",disabled:s.res===mk,act:()=>{
    if(s.res&&Math.floor(s.acc||0)>0){ const n=Math.floor(s.acc); addMat(s.res,n); line(`🌾 교체 전 ${MATS[s.res][0]} ${MATS[s.res][1]} +${n} 수확.`,"loot"); }
    s.res=mk; s.acc=0; line(`🔄 이 슬롯이 ${e} ${nm}을(를) 생산한다.`,"sys"); render(); save(true); farmSlotMenu(i); }}); }
  acts.push({label:"← 뒤로",full:true,act:()=>farmSlotMenu(i)}); setActions(acts); }
/* 🌌 회귀의 제단 — 메아리로 영구 강화 구매 · 회귀 실행 */
function altarMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } const m=P.meta||{echoes:0,spent:{},runs:0};
  mode="town"; render(); clearLog(); setScene("🌌","회귀의 제단 — 잔향이 감도는 곳.");
  line(`이전 생의 <b>메아리 ✦${m.echoes||0}</b>가 남아 있다. 회귀 ${m.runs||0}회 · 최고 ${m.bestFloor||0}층.`,"sys");
  line("영구 강화를 새기면 모든 다음 생에 적용된다.","quote");
  const acts=[{header:true,label:`✦  메아리 ${m.echoes||0}  —  영구 강화`}];
  for(const k in META_UP){ const u=META_UP[k]; const lv=(m.spent&&m.spent[k])||0; const maxed=lv>=u.max; const cost=metaCost(k);
    acts.push({label:`${u.emoji} ${u.n} ${lv}/${u.max}`, desc: maxed?"최대 강화 완료":`${u.desc(lv+1)} · 비용 ✦${cost}`, disabled:maxed||(m.echoes||0)<cost, act:()=>buyMeta(k)}); }
  acts.push({header:true,label:"♻  회 귀"});
  const gain=echoesEarned();
  acts.push({label:`♻ 회귀하기 (✦${gain} 획득)`,full:true,desc:"스탯·스킬만 리셋 · 장비·가방·골드·창고 전부 유지 · NG+ 난이도↑",act:confirmReincarnate});
  acts.push({label:"← 마을로",full:true,act:townMenu}); setActions(acts); }
function buyMeta(k){ const u=META_UP[k]; if(!u)return; const m=P.meta; const lv=(m.spent[k]||0); if(lv>=u.max){ toast("이미 최대"); return; }
  const cost=metaCost(k); if((m.echoes||0)<cost){ toast("메아리 부족"); return; }
  m.echoes-=cost; m.spent[k]=lv+1; P.hp=Math.min(P.hp,MAXHP()); P.mp=Math.min(P.mp,MAXMP()); toast(`${u.n} Lv.${lv+1}`); save(true); render(); altarMenu(); }
function confirmReincarnate(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } const gain=echoesEarned();
  if(!confirm(`회귀하시겠습니까?\n\n· 메아리 ✦${gain} 획득\n· 리셋: 스탯(→5)·배운 스킬  ← 이 둘만!\n· 유지: 장비·가방·💰골드·🏦창고·계약·재료·💎크리스탈·📖도감·강화\n· 적이 강해집니다 (NG+, 회귀당 +12%)`))return;
  const g=reincarnate(); clearLog(); setScene("🌌","회귀 — 다시, 처음으로.");
  line(`✦ <b>메아리 ${g}</b>을(를) 거두었다. 회귀 강화로 더 멀리 나아가라.`,"loot");
  line("모든 것이 초기화됐지만, 새겨둔 잔향은 남아 있다.","quote"); render();
  setActions([{label:"🌌 제단에서 강화하기",full:true,act:altarMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 🎭 프로필 — 아바타/닉네임 (첫 변경 무료, 이후 💎크리스탈) */
function profileMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town"; render(); clearLog();
  setScene(isImgAvatar(P.avatar)?playerIco(72):(P.avatar||"🧑"),"프로필 — 나를 꾸미자.");
  line(`이름 <b>${P.name}</b> · 💎 크리스탈 <b>${P.gems||0}</b>`,"sys");
  line("💎 크리스탈은 유료 재화 — 첫 변경은 무료, 이후 변경마다 소모돼요. (보스 처치·통신판매로 획득)","quote");
  const nameFree=!P.flags.nameChanged, avaFree=!P.flags.avatarChanged;
  setActions([
    {label:`🎭 프로필 아이콘 변경 ${avaFree?"— 첫 회 무료":`— 💎${AVATAR_COST}`}`,desc:P.avatar?(isImgAvatar(P.avatar)?"현재 내 사진":`현재 ${P.avatar}`):"현재 기본 아이콘",disabled:!avaFree&&(P.gems||0)<AVATAR_COST,act:avatarPick},
    {label:`✏️ 닉네임 변경 ${nameFree?"— 첫 회 무료":`— 💎${NAME_COST}`}`,desc:`현재 ${P.name}`,disabled:!nameFree&&(P.gems||0)<NAME_COST,act:renameChar},
    ...(P._online&&typeof netRecoveryRegen==="function"?[{label:"🔑 복구 코드 재발급",desc:"비번 분실 대비 · 새 코드 발급(이전 코드는 무효)",act:regenRecovery}]:[]),
    {label:"🏘 마을로",full:true,act:townMenu},
  ]); }
async function regenRecovery(){ if(typeof netRecoveryRegen!=="function"){ toast("온라인 전용"); return; }
  if(!confirm("새 복구 코드를 발급할까요? 이전 코드는 더 이상 쓸 수 없어요."))return;
  try{ const code=await netRecoveryRegen(); if(typeof recoveryCodeScreen==="function")recoveryCodeScreen(code,false); else toast("복구 코드: "+code); }
  catch(e){ toast("발급 실패 — "+(e&&e.message||"")); } }
function avatarPick(){ if(enemy)return; const free=!P.flags.avatarChanged;
  if(!free&&(P.gems||0)<AVATAR_COST){ toast("크리스탈 부족"); return; }
  const acts=[{header:true,label:free?"아이콘 선택 — 첫 회 무료":`아이콘 선택 — 💎${AVATAR_COST}`}];
  acts.push({label:"📷 내 사진 업로드",full:true,desc:isImgAvatar(P.avatar)?"현재 내 사진 사용 중 · 다시 고르기":"기기에서 이미지를 골라 프로필로",act:avatarUpload});
  AVATARS.forEach(a=>acts.push({label:a,desc:P.avatar===a?"현재 사용 중":"",disabled:P.avatar===a,act:()=>setAvatar(a)}));
  acts.push({label:"↺ 기본 아이콘으로",full:true,desc:P.avatar==null?"현재 사용 중":"",disabled:P.avatar==null,act:()=>setAvatar(null)});
  acts.push({label:"← 뒤로",full:true,act:profileMenu}); setActions(acts); }
/* 📷 기기 이미지 → canvas로 128px 정사각 크롭 → JPEG data URL(수 KB)로 저장. 클라우드 세이브에 그대로 실림 */
function avatarUpload(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } const free=!P.flags.avatarChanged;
  if(!free&&(P.gems||0)<AVATAR_COST){ toast("크리스탈 부족"); return; }
  const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f)return;
    if(!/^image\//.test(f.type||"")){ toast("이미지 파일만 가능해요"); return; }
    toast("이미지 처리 중…"); const rd=new FileReader();
    rd.onload=()=>{ const img=new Image();
      img.onload=()=>{ try{ avatarCropModal(img, (url)=>setAvatar(url)); }catch(e){ toast("이미지 처리 실패 — 다른 파일로 시도해줘"); } };
      img.onerror=()=>toast("이미지를 열 수 없어요"); img.src=rd.result; };
    rd.onerror=()=>toast("파일을 읽지 못했어요"); rd.readAsDataURL(f); };
  inp.click(); }
/* 🖼 프로필 사진 크롭 미리보기 — 드래그로 위치·슬라이더로 확대. 원 안이 실제 프로필(128px)로 들어감 */
function avatarCropModal(img, onDone){
  const PREVIEW=240, OUT=128, iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, minSide=Math.min(iw,ih);
  let zoom=1, cx=iw/2, cy=ih/2;
  const ov=document.createElement("div"); ov.className="cropmodal";
  ov.innerHTML=`<div class="cropbox">
    <div class="croptitle">🖼 사진 위치·크기 맞추기</div>
    <div class="cropstage" style="width:${PREVIEW}px;height:${PREVIEW}px"><canvas class="cropcanvas" width="${PREVIEW}" height="${PREVIEW}"></canvas><div class="cropring"></div></div>
    <div class="croprow"><span>🔍</span><input type="range" class="cropzoom" min="1" max="3" step="0.01" value="1"></div>
    <div class="crophint">드래그해 위치 이동 · 원 안이 프로필로 들어가요</div>
    <div class="cropbtns"><button type="button" class="cropbtn cropcancel">취소</button><button type="button" class="cropbtn cropok">적용</button></div>
  </div>`;
  document.body.appendChild(ov);
  const cv=ov.querySelector(".cropcanvas"), ctx=cv.getContext("2d"), zoomEl=ov.querySelector(".cropzoom"), stage=ov.querySelector(".cropstage");
  const clampC=()=>{ const half=(minSide/zoom)/2; cx=Math.max(half,Math.min(iw-half,cx)); cy=Math.max(half,Math.min(ih-half,cy)); };
  const draw=()=>{ clampC(); const src=minSide/zoom; ctx.clearRect(0,0,PREVIEW,PREVIEW); ctx.drawImage(img, cx-src/2, cy-src/2, src, src, 0,0, PREVIEW,PREVIEW); };
  draw();
  zoomEl.oninput=()=>{ zoom=parseFloat(zoomEl.value)||1; draw(); };
  let drag=null;
  stage.addEventListener("pointerdown",e=>{ try{stage.setPointerCapture(e.pointerId);}catch(x){} drag={x:e.clientX,y:e.clientY}; });
  stage.addEventListener("pointermove",e=>{ if(!drag)return; const k=(minSide/zoom)/PREVIEW; cx-=(e.clientX-drag.x)*k; cy-=(e.clientY-drag.y)*k; drag={x:e.clientX,y:e.clientY}; draw(); });
  const endDrag=()=>{ drag=null; }; stage.addEventListener("pointerup",endDrag); stage.addEventListener("pointercancel",endDrag);
  const close=()=>{ try{ document.body.removeChild(ov); }catch(e){} };
  ov.querySelector(".cropcancel").onclick=close;
  ov.querySelector(".cropok").onclick=()=>{ clampC(); const src=minSide/zoom; const oc=document.createElement("canvas"); oc.width=OUT; oc.height=OUT;
    const octx=oc.getContext("2d"); octx.drawImage(img, cx-src/2, cy-src/2, src, src, 0,0, OUT,OUT);
    let url; try{ url=oc.toDataURL("image/jpeg",0.72); if(url.length>180000)url=oc.toDataURL("image/jpeg",0.5); }catch(e){ toast("이미지 처리 실패"); close(); return; }
    close(); if(typeof onDone==="function")onDone(url); }; }
function setAvatar(a){ const free=!P.flags.avatarChanged;
  if(!free){ if((P.gems||0)<AVATAR_COST){ toast("크리스탈 부족"); return; } P.gems-=AVATAR_COST; }
  P.avatar=a; P.flags.avatarChanged=true; render();
  if(typeof syncNick==="function")syncNick();   // 🖼 아바타를 서버에 반영(광장 채팅에 표시)
  const lbl = a==null?"기본 아이콘" : (isImgAvatar(a)?"내 사진":a);
  toast("프로필: "+lbl);
  line(`🎭 프로필 아이콘을 ${lbl}(으)로 바꿨다.${free?" (첫 회 무료)":` (💎${AVATAR_COST} 소모)`}`,"loot"); save(true); profileMenu(); }
function renameChar(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } const free=!P.flags.nameChanged;
  if(!free && (P.gems||0)<NAME_COST){ toast("크리스탈 부족"); return; }
  const n=prompt(`새 닉네임을 입력하세요 (${free?"첫 회 무료":`💎${NAME_COST} 소모`}):`, P.name); if(n==null)return;
  const nm=(n.trim()).slice(0,12); if(!nm){ toast("닉네임이 비었어요"); return; } if(nm===P.name)return;
  const old=P.name; if(!free)P.gems-=NAME_COST; P.name=nm; P.flags.nameChanged=true; render(); toast("개명 완료: "+nm);
  if(typeof syncNick==="function")syncNick();   // 🏷 닉네임 서버 반영(채팅 표시명)
  line(`✏️ '${old}' → <b>${nm}</b>${free?" (첫 회 무료)":` (💎${NAME_COST} 소모)`}`,"sys"); save(true);
  if(!enemy)profileMenu(); }
/* ⚒️ 대장간 — 장비 강화 (+N) */
const UP_MAX=20, UP_SAFE=10;   // +10까지 안전(실패해도 유지) · +11부터 실패 시 파괴 위험
function upCostGold(up){ return 25 + up*up*8; }                  // 고강일수록 급증
function upCostMat(it){ const g=RELICS[it.k]; return (g.slot==="ring"||g.slot==="amulet")?"mana":"ore"; }
function upCostMatN(up){ return 2 + Math.floor(up*1.6); }
function upChance(up){ if(up<5)return clamp(0.92-up*0.05,0.6,0.92); if(up<UP_SAFE)return clamp(0.72-(up-5)*0.06,0.4,0.72); return clamp(0.48-(up-UP_SAFE)*0.032,0.12,0.48); }
function upDestroyChance(up){ return up<UP_SAFE?0:clamp((up-(UP_SAFE-1))*0.07,0,0.55); }   // 실패 시 파괴 확률(+11부터)
function upRandStat(){ const pool=[["atk",1+rnd(3)],["def",1+rnd(3)],["luck",1+rnd(2)]]; return pool[rnd(pool.length)]; }   // 🎲 강화 랜덤 추가스탯
function upStatText(it){ const st=gearMainStat(RELICS[it.k]); return st==="atk"?"공격":st==="def"?"방어":"행운"; }
function itemStatVal(it,extra){ const g=RELICS[it.k]; const up=(it.up||0)+(extra||0); const st=gearMainStat(g); return (g[st]||0)+up; }
function bsFind(id){ let it=P.inv.find(x=>x.id===id); if(it)return it; it=((P.stash&&P.stash.inv)||[]).find(x=>x.id===id); return it||null; }
function bsGearList(){ const bag=P.inv.filter(it=>RELICS[it.k]&&RELICS[it.k].slot).map(it=>({it,loc:"bag"}));
  const stash=((P.stash&&P.stash.inv)||[]).filter(it=>RELICS[it.k]&&RELICS[it.k].slot).map(it=>({it,loc:"stash"})); return [...bag,...stash]; }
function blacksmithMenu(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; townReturn=blacksmithMenu; render(); clearLog();
  setScene("⚒️","대장간 — 대장장이 고르드가 망치를 든다.");
  line('고르드: <span class="quote">"강화할 장비를 고르게. 가방이든 창고든, 착용 여부와 상관없이 다 강화해주지. 강화 전·후 능력치를 보여주겠네."</span>');
  const gear=bsGearList();
  if(gear.length===0){ line("강화할 장비가 없다. (탑·경매장에서 얻는다)","sys"); setActions([{label:"🏘 마을로",full:true,act:townMenu}]); return; }
  const tab=["wpn","arm","acc"].includes(bsTab)?bsTab:"wpn";
  const byCat={wpn:[],arm:[],acc:[]}; gear.forEach(o=>{ byCat[gearCat3(RELICS[o.it.k])].push(o); });
  const tabBar=`<div class="invtabs">`+[["wpn","🗡 무기"],["arm","🛡 방어구"],["acc","💍 악세"]].map(([t,lab])=>`<button type="button" class="invtab ${tab===t?'on':''}" onclick="setBsTab('${t}')">${lab}${byCat[t].length?` <i>${byCat[t].length}</i>`:''}</button>`).join("")+`</div>`;
  const mkRow=({it,loc})=>{ const g=RELICS[it.k], up=it.up||0, maxed=up>=UP_MAX; const eq=isEquippedItem(it);
    const where=eq?'<span style="color:var(--good)">착용중</span>':loc==="stash"?'🏦 창고':'🎒 가방';
    const right=maxed?`<b style="color:var(--gold)">최대 +${UP_MAX}</b>`:`<button class="ibtn on" onclick="upgradePreview(${it.id})">강화</button>`;
    return `<div class="grow ${maxed?'':'eq'}"><span onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${ico(relicIco(it.k),34)}</span>`+
      `<div class="gmeta"><div class="gn">${it.k} <span style="color:var(--gold)">+${up}</span></div>`+
      `<div class="ge"><span class="gtype">${gearTypeLabel(g)}</span> · ${where}${maxed?'':` · ${upStatText(it)}`}</div></div>`+
      `<div class="gbtns">${right}</div></div>`; };
  const list=byCat[tab]; const emptyMsg={wpn:"강화할 무기가 없다.",arm:"강화할 방어구가 없다.",acc:"강화할 악세사리가 없다."};
  const rowsHtml = list.length ? `<div class="glist">${list.map(mkRow).join("")}</div>` : `<div class="inv-empty">${emptyMsg[tab]}</div>`;
  $("log").innerHTML=`<div class="invv">
    <div class="ge" style="color:var(--dim);margin-bottom:2px">⚒️ 강화할 장비를 골라요 · 🎒 가방/🏦 창고 · 착용 여부 상관없이 강화 가능</div>
    ${tabBar}
    <div class="invtabbody">${rowsHtml}</div>
  </div>`;
  setActions([{label:"🎒 소지품 열기",act:inventoryMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 선택한 장비 1개의 강화 전→후 능력치 비교 화면 (이 장비를 착용했다고 가정하고 계산) */
function upgradePreview(id){ const it=bsFind(id); if(!it||!RELICS[it.k]||!RELICS[it.k].slot){ blacksmithMenu(); return; }
  const g=RELICS[it.k], up=it.up||0, maxed=up>=UP_MAX, stat=upStatText(it), slot=g.slot;
  const equippedNow=isEquippedItem(it);
  render(); clearLog(); setScene("⚒️",`${it.k} 강화`);
  const oldEq=P.equip[slot]; P.equip[slot]=it.id;   // 이 장비 착용 가정으로 파생스탯 계산
  const b={atk:ATK(),def:DEF(),luk:LUKv()}; let a=b;
  if(!maxed){ it.up=up+1; a={atk:ATK(),def:DEF(),luk:LUKv()}; it.up=up; }
  P.equip[slot]=oldEq;   // 원복
  const cmp=(nm,bv,av)=>`<div class="grow" style="padding:6px 10px"><div class="gmeta"><div class="gn">${nm}</div></div><div style="font-family:var(--mono);font-size:14px">${bv} <span style="color:var(--dim)">→</span> <b style="color:${av>bv?'var(--good)':'var(--ink)'}">${av}</b>${av>bv?` <span style="color:var(--good)">(+${av-bv})</span>`:''}</div></div>`;
  const mat=upCostMat(it), matN=upCostMatN(up), gold=upCostGold(up), ch=Math.round(upChance(up)*100), haveMat=P.mats[mat]||0, charmN=(P.consumables&&P.consumables.enhance_charm)||0;
  const itemNow=itemStatVal(it,0), itemNext=itemStatVal(it,1);
  const tag=equippedNow?'<span style="color:var(--good);font-size:11px">착용중</span>':'<span style="color:var(--dim);font-size:11px">미착용</span>';
  $("log").innerHTML=`<div class="invv">
    <div class="grow"><span>${ico(relicIco(it.k),42)}</span><div class="gmeta"><div class="gn">${it.k} <span style="color:var(--gold)">+${up}${maxed?'':` → +${up+1}`}</span> ${tag}</div><div class="ge">${g.note||''} · 이 장비 ${stat} <b>${itemNow}${maxed?'':` → ${itemNext}`}</b></div></div></div>
    <div><div class="ih"><span>강화 전 → 후 (이 장비 착용 기준)</span></div><div class="glist">${cmp("⚔ 공격",b.atk,a.atk)}${cmp("🛡 방어",b.def,a.def)}${cmp("🍀 행운",b.luk,a.luk)}</div></div>
    ${equippedNow?'':'<div class="ge" style="color:var(--mp)">※ 미착용 장비 — 착용해야 실제 능력치에 반영됩니다.</div>'}
    <div class="ge" style="margin-top:4px">${maxed?`<b>최대 강화(+${UP_MAX}) 도달</b>`:`성공 확률 <b>${ch}%</b> · 비용 ${MATS[mat][0]}${MATS[mat][1]} ${matN}<span style="color:${haveMat<matN?'var(--danger)':'var(--dim)'}">(보유 ${haveMat})</span> · 💰${gold}<span style="color:${P.gold<gold?'var(--danger)':'var(--dim)'}">(보유 ${P.gold})</span>`}</div>
    ${it.extra?`<div class="ge" style="color:#c9a9ff">✨ 추가 옵션: ${Object.entries(it.extra).map(([s,v])=>`${s==="atk"?"공격":s==="def"?"방어":"행운"} +${v}`).join(" · ")}</div>`:''}
    ${maxed?'':(up>=UP_SAFE?`<div class="ge" style="color:var(--danger)">💥 실패 시 <b>${Math.round(upDestroyChance(up)*100)}%</b> 확률로 <b>파괴</b>! (축복 사용 시 방지)</div>`:'<div class="ge" style="color:var(--danger)">⚠ 실패 시 재료·골드를 잃고 레벨은 유지됩니다.</div>')}
    ${charmN>0?`<div class="ge" style="color:var(--gold)">⚜️ 강화의 축복 ${charmN}개 보유 — 성공 +25%p·파괴 방지</div>`:''}
  </div>`;
  const can=!maxed && P.gold>=gold && haveMat>=matN;
  const reason= maxed?"": P.gold<gold?" · 골드 부족": haveMat<matN?` · ${MATS[mat][1]} 부족`:"";
  const bacts=[{label:maxed?"최대 강화 도달":`⚒️ 강화하기 (성공 ${ch}%)`, desc:maxed?"":`${MATS[mat][0]}${matN} · 💰${gold}${reason}`, disabled:!can, act:()=>doUpgradeSel(id,false)}];
  if(!maxed && charmN>0)bacts.push({label:`⚜️ 축복 쓰고 강화 (성공 ${Math.min(99,ch+25)}%·파괴X)`, desc:`축복 1 소모 · ${MATS[mat][0]}${matN} · 💰${gold}`, disabled:!can, act:()=>doUpgradeSel(id,true)});
  bacts.push({label:"← 다른 장비",act:blacksmithMenu},{label:"🏘 마을로",full:true,act:townMenu});
  setActions(bacts); }
function removeUpgItem(it){ for(const s of SLOTS){ if(P.equip[s[0]]===it.id)P.equip[s[0]]=null; }   // 파괴: 장착 해제 + 가방/창고에서 제거
  P.inv=(P.inv||[]).filter(x=>x.id!==it.id); if(P.stash&&P.stash.inv)P.stash.inv=P.stash.inv.filter(x=>x.id!==it.id); }
function doUpgradeSel(id, useCharm){ const it=bsFind(id); if(!it||!RELICS[it.k]||!RELICS[it.k].slot)return; const up=it.up||0;
  if(up>=UP_MAX){ toast("이미 최대 강화"); return; }
  const mat=upCostMat(it), matN=upCostMatN(up), gold=upCostGold(up);
  if(P.gold<gold||(P.mats[mat]||0)<matN){ toast("비용 부족"); return; }
  const charm = !!useCharm && (P.consumables.enhance_charm||0)>0;
  P.gold-=gold; P.mats[mat]-=matN; if(charm){ P.consumables.enhance_charm--; if(P.consumables.enhance_charm<=0)delete P.consumables.enhance_charm; line("⚜️ 강화의 축복을 사용했다 (성공률↑·파괴 방지).","sys"); }
  const succ=clamp(upChance(up)+(charm?0.25:0),0,0.99);
  if(chance(succ)){ it.up=up+1; line(`⚒️ <b>${it.k}</b> 강화 성공! → <b>+${it.up}</b> (${upStatText(it)} 대폭↑)`,"loot"); toast("강화 성공! +"+it.up); fxOk();
    if(it.up%5===0 || chance(0.22)){ const r=upRandStat(); if(!it.extra)it.extra={}; it.extra[r[0]]=(it.extra[r[0]]||0)+r[1]; const nm=r[0]==="atk"?"공격":r[0]==="def"?"방어":"행운"; line(`✨ <b>추가 옵션!</b> ${nm} +${r[1]} (랜덤)`,"loot"); }   // 🎲 랜덤 추가스탯(5강마다 확정)
  } else {
    if(!charm && chance(upDestroyChance(up))){ line(`💥 강화 실패 — <b style="color:var(--danger)">${it.k}이(가) 파괴됐다!</b>`,"dmg"); toast("장비 파괴…"); removeUpgItem(it); if(typeof bumpFeat==="function")bumpFeat("destroyed"); render(); save(true); blacksmithMenu(); return; }
    line(`⚒️ ${it.k} 강화 실패… 재료가 날아갔다.${charm?" (축복이 파괴를 막았다)":" (레벨 유지)"}`,"dmg"); toast("강화 실패");
  }
  render(); save(true); upgradePreview(id); }   // 같은 장비 상세로 복귀 → 연속 강화 가능
function fxOk(){ const s=$("stage"); if(s){ s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash"); } }
/* 🛒 잡화점 — 즉시 구매/판매 (경매장과 달리 고정가) */
/* 🛡 장비 상점 — 무기/방어구 구매 (기본 아이템 확보용) */
function gearShop(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; townReturn=gearShop; render(); clearLog();
  setScene("🛡","장비 상점 — 무기와 방어구를 판다.");
  line(`상점주: <span class="quote">"무기와 방어구는 여기서. 처음엔 기본 장비부터 갖추게."</span>`);
  setActions([
    {label:"🗡 무기 상점",desc:"무기 타입별 기본 무기 (미니게임 다름)",act:weaponShop},
    {label:"🛡 방어구 상점",desc:"방어구·장신구",act:armorShop},
    {label:"🏘 마을로",full:true,act:townMenu},
  ]); }
function buyGear(name,price,back){ const g=RELICS[name]; if(!g)return; if(P.gold<price){ toast("금화 부족"); return; }
  P.gold-=price; addRelic(name); toast("구매: "+name); render(); if(back)back(); }
function weaponShop(){ if(enemy)return; render(); clearLog(); setScene("🗡","무기 상점");
  line(`보유 금화 💰 <b>${P.gold}</b> · 무기마다 전투 방식(미니게임)이 달라요.`,"sys");
  const list=Object.entries(RELICS).filter(([n,g])=>g.shop==="weapon").sort((a,b)=>(a[1].val||0)-(b[1].val||0));
  const acts=list.map(([n,g])=>{ const w=WEAPONS[g.wt]; const price=g.val||50;
    return {label:`${n} — ${price}G`,desc:`${g.note}${w?` · ${MG_NAME[w.mg]}`:""}`,disabled:P.gold<price,act:()=>buyGear(n,price,weaponShop)}; });
  acts.push({label:"← 장비 상점",act:gearShop},{label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function armorShop(){ if(enemy)return; render(); clearLog(); setScene("🛡","방어구 상점");
  line(`보유 금화 💰 <b>${P.gold}</b>`,"sys");
  const list=Object.entries(RELICS).filter(([n,g])=>g.shop==="armor").sort((a,b)=>(a[1].val||0)-(b[1].val||0));
  const acts=list.map(([n,g])=>{ const price=g.val||50; const slot=SLOT_LABEL[g.slot]||"장비";
    return {label:`${n} — ${price}G`,desc:`${slot} · ${g.note}`,disabled:P.gold<price,act:()=>buyGear(n,price,armorShop)}; });
  acts.push({label:"← 장비 상점",act:gearShop},{label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function generalStore(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; townReturn=generalStore; render(); clearLog();
  setScene("🛒","잡화점 — 상점주 미나가 반긴다.");
  line('미나: <span class="quote">"어서 와요! 물약이든 재료든, 사고파는 건 여기서."</span>');
  setActions([{label:"🛒 구매",desc:"물약·재료·비약·마나 오브",act:storeBuy},{label:"💰 판매 (즉시)",desc:"장비·재료를 바로 현금화",act:storeSell},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 📬 우편함 — 운영자·이벤트 보상함. 시드 우편을 지급함에 넣고, 수령하면 보상 지급 (운영자가 새 시드 추가 가능) */
const MAIL_SEED=[
  {id:"welcome_2026", from:"운영자", subj:"🎉 이름 없는 탑에 오신 걸 환영합니다", body:"모험을 시작한 당신께 작은 선물을 보냅니다. 탑 꼭대기에서 만나요!", reward:{gems:5,gold:300,potions:3}},
  {id:"update_inv_2026", from:"운영자", subj:"🧳 인벤·개척 개편 & 기력 물약 추가 안내", body:"장비를 무기/방어구/악세로 정리하고 개척지 난이도를 상향했어요. 기력(MP) 물약도 새로 추가! 개편 기념 보상을 드립니다.", reward:{gold:800,gems:3,cons:{mp_60:3,enhance_charm:1}}},
];
function seedMail(){ if(!P)return; if(!Array.isArray(P.mail))P.mail=[]; if(!P.mailInit)P.mailInit={}; let added=false;
  for(const m of MAIL_SEED){ if(P.mailInit[m.id])continue; P.mailInit[m.id]=true;
    if(P.mail.some(x=>x.id===m.id))continue;   // 중복 가드(혹시 mail엔 있는데 init 누락된 경우)
    P.mail.push({id:m.id,from:m.from,subj:m.subj,body:m.body,reward:m.reward,claimed:false,ts:Date.now()}); added=true; }
  if(added && typeof saveNow==="function")saveNow();   // 새 우편 시드 즉시 저장 → 새로고침해도 '한 번만' 도착
}
function mailUnread(){ return (P&&Array.isArray(P.mail))?P.mail.filter(m=>!m.claimed).length:0; }
function rewardText2(r){ if(!r)return ""; const parts=[];
  if(r.gold)parts.push(`💰${r.gold}`); if(r.gems)parts.push(`💎${r.gems}`); if(r.potions)parts.push(`🧪물약×${r.potions}`);
  if(r.mats)for(const m in r.mats){ if(MATS[m])parts.push(`${MATS[m][0]}${MATS[m][1]}×${r.mats[m]}`); }
  if(r.cons)for(const k in r.cons){ if(CONS[k])parts.push(`${CONS[k].emoji}${CONS[k].n}×${r.cons[k]}`); }
  if(r.items)for(const it of r.items)parts.push(`🎁${it}`);
  return parts.join(" · "); }
function grantReward(r){ if(!r)return;
  if(r.gold)P.gold+=r.gold; if(r.gems)P.gems=(P.gems||0)+r.gems; if(r.potions)P.potions+=r.potions;
  if(r.mats)for(const m in r.mats)addMat(m,r.mats[m]);
  if(r.cons)for(const k in r.cons)gainCons(k,r.cons[k]);
  if(r.items)for(const it of r.items)addRelic(it); }
function mailboxMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
  setScene("📬","우편함 — 배달부가 편지를 건넨다."); seedMail();
  if(!P.mail.length){ line("우편함이 비어 있다.","sys"); setActions([{label:"🏘 마을로",full:true,act:townMenu}]); return; }
  line("운영자·이벤트 보상이 도착하면 여기로 와요. 수령 버튼으로 보상을 받으세요.","sys");
  const rows=P.mail.slice().reverse().map(m=>{ const rt=rewardText2(m.reward);
    return `<div class="grow ${m.claimed?'mailread':'eq'}"><span class="emo" style="width:34px;height:34px;font-size:19px">${m.claimed?'📭':'📬'}</span>`+
      `<div class="gmeta"><div class="gn">${m.subj} ${m.claimed?'<span style="color:var(--dim);font-size:11px">읽음 · 수령완료</span>':'<span style="color:var(--gold);font-size:11px">● NEW</span>'}</div>`+
      `<div class="ge">✉ ${m.from} — ${m.body}</div>${rt?`<div class="ge" style="color:var(--gold)">🎁 ${rt}</div>`:''}</div>`+
      `<div class="gbtns">${m.claimed?'':`<button class="ibtn on" onclick="claimMail('${m.id}')">수령</button>`}</div></div>`; }).join("");
  $("log").innerHTML=`<div class="invv"><div class="glist">${rows}</div></div>`;
  const readN=(P.mail||[]).filter(m=>m.claimed).length;
  const acts=[]; if(mailUnread()>0)acts.push({label:`📬 모두 수령 (${mailUnread()})`,full:true,act:claimAllMail});
  if(readN>0)acts.push({label:`🗑 읽은 우편 지우기 (${readN})`,act:clearReadMail});
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function clearReadMail(){ const before=(P.mail||[]).length; P.mail=(P.mail||[]).filter(m=>!m.claimed); const removed=before-P.mail.length;
  if(removed>0){ toast(`읽은 우편 ${removed}개 삭제`); if(typeof sfx==="function")sfx("click"); if(typeof saveNow==="function")saveNow(); else save(true); } mailboxMenu(); }
window.clearReadMail=clearReadMail;
function claimMail(id){ const m=(P.mail||[]).find(x=>x.id===id); if(!m||m.claimed)return; grantReward(m.reward); m.claimed=true;
  const rt=rewardText2(m.reward); line(`📬 <b>${m.subj}</b> 수령! ${rt?`획득: ${rt}`:''}`,"loot"); toast("우편 수령"); if(typeof sfx==="function")sfx("loot"); render(); if(typeof saveNow==="function")saveNow(); else save(true); mailboxMenu(); }
function claimAllMail(){ let any=false; for(const m of (P.mail||[])){ if(!m.claimed){ grantReward(m.reward); m.claimed=true; any=true; } } if(any){ line("📬 모든 우편을 수령했다!","loot"); toast("전체 수령"); if(typeof sfx==="function")sfx("loot"); render(); if(typeof saveNow==="function")saveNow(); else save(true); } mailboxMenu(); }
window.claimMail=claimMail; window.claimAllMail=claimAllMail; window.mailboxMenu=mailboxMenu;
/* 📦 통신판매 (캐쉬샵) — 💎다이아(크리스탈)로 결제 · 무료 웰컴 스타터팩 */
const CASH_CHARM_GEMS=6, CASH_POTPACK_GEMS=4, CASH_MPPACK_GEMS=4, CASH_FEED_GEMS=3;
function cashShop(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
  setScene("📦","통신판매 — 캐쉬샵 배송함.");
  line('안내원: <span class="quote">"통신판매는 💎다이아로 결제돼요. 신규 모험가님껜 웰컴 스타터팩을 무료로 배송해 드립니다!"</span>');
  line(`보유 💎 다이아 <b>${P.gems||0}</b> — 모든 상품은 다이아로 결제해요. (다이아는 보스 처치로도 획득)`,"sys");
  const claimed=!!P.flags.welcomeClaimed, gems=P.gems||0;
  const acts=[
    {label:`🎁 웰컴 스타터팩 ${claimed?"(수령 완료)":"— 무료"}`,desc:"입문자 장검·갑옷·반지 + 💎10 (난이도 완화)",disabled:claimed,act:claimWelcome},
    {header:true,label:"🛍  다이아 상점"},
    {label:`⚜️ 강화의 축복 (💎${CASH_CHARM_GEMS})`,desc:`강화 성공↑·파괴 방지 · 보유 ${(P.consumables&&P.consumables.enhance_charm)||0}`,disabled:gems<CASH_CHARM_GEMS,act:()=>buyCash("charm")},
    {label:`🧪 물약 꾸러미 ×10 (💎${CASH_POTPACK_GEMS})`,desc:"HP 물약 10개 즉시 배송",disabled:gems<CASH_POTPACK_GEMS,act:()=>buyCash("potpack")},
    {label:`🫙 기력 물약 꾸러미 ×5 (💎${CASH_MPPACK_GEMS})`,desc:"고급 기력 물약 5개 (MP 60씩)",disabled:gems<CASH_MPPACK_GEMS,act:()=>buyCash("mppack")},
    {label:`🥫 공용 사료 ×12 (💎${CASH_FEED_GEMS})`,desc:`아무 동료나 먹는 먹이 · 보유 ${(P.food&&P.food.food_any)||0}`,disabled:gems<CASH_FEED_GEMS,act:()=>buyCash("feed")},
    {header:true,label:"💎  다이아 충전  (100다이아 = 1,000원)"},
  ];
  DIA_PACKS.forEach(p=>acts.push({label:`💎 ${p.amt.toLocaleString()} 다이아 — ₩${p.won.toLocaleString()}${p.bonus?` (+${p.bonus}% 보너스)`:""}`,desc:"결제 연동 준비 중 — 곧 충전 가능해요",act:()=>diaChargeInfo(p)}));
  acts.push({label:"🏘 마을로",full:true,act:townMenu});
  setActions(acts); }
/* 💎 다이아 충전 패키지 — 기준 100다이아=1,000원 (실제 결제 연동은 추후) */
const DIA_PACKS=[
  {amt:100, won:1000, bonus:0}, {amt:300, won:3000, bonus:0},
  {amt:550, won:5000, bonus:10}, {amt:1200, won:10000, bonus:20}, {amt:2600, won:20000, bonus:30},
];
function diaChargeInfo(p){ toast("결제 연동 준비 중입니다"); line(`💳 <b>${p.amt.toLocaleString()} 다이아</b> 충전은 <b>₩${p.won.toLocaleString()}</b> — 결제 연동을 준비 중이에요. (기준: 100다이아 = 1,000원)`,"sys"); }
window.diaChargeInfo=diaChargeInfo;
function buyCash(kind){ const price={charm:CASH_CHARM_GEMS,potpack:CASH_POTPACK_GEMS,mppack:CASH_MPPACK_GEMS,feed:CASH_FEED_GEMS}[kind]; if((P.gems||0)<price){ toast("다이아 부족"); return; }
  P.gems-=price;
  if(kind==="charm"){ gainCons("enhance_charm"); line("⚜️ <b>강화의 축복</b>을 구매했다. (대장간 강화 시 성공↑·파괴 방지)","loot"); }
  else if(kind==="potpack"){ P.potions+=10; line("🧪 <b>물약 꾸러미</b> 도착! HP 물약 ×10","loot"); }
  else if(kind==="mppack"){ gainCons("mp_60",5); line("🫙 <b>기력 물약 꾸러미</b> 도착! 고급 기력 물약 ×5","loot"); }
  else if(kind==="feed"){ gainFood("food_any",12); line("🥫 <b>공용 사료 꾸러미</b> 도착! 아무 동료나 주는 먹이 ×12","loot"); }
  toast(`구매 완료 (💎-${price})`); if(typeof sfx==="function")sfx("loot"); render(); save(true); cashShop(); }
window.buyCash=buyCash;
function claimWelcome(){ if(P.flags.welcomeClaimed)return; P.flags.welcomeClaimed=true;
  clearLog(); setScene("🎁","웰컴 스타터팩 개봉!");
  ["입문자의 장검","입문자의 갑옷","입문자의 반지"].forEach(n=>addRelic(n));
  P.gems=(P.gems||0)+10;
  line("📦 웰컴 스타터팩 도착! 입문자 장비 3종 + 💎 크리스탈 10을 받았다. (빈 슬롯은 자동 착용)","loot"); toast("웰컴팩 수령");
  save(true);
  setActions([{label:"📦 통신판매로",act:cashShop},{label:"🏘 마을로",full:true,act:townMenu}]); }
function shopReset(){ const d=new Date().toDateString(); if(P.shopDay!==d){ P.shopDay=d; P.shopBought={}; } }
function shopLeft(key,cap){ shopReset(); return Math.max(0, cap-(P.shopBought[key]||0)); }
/* 🛒 구매 아이템 목록 — 카테고리(pot 물약 / mat 재료 / etc 비약·기타)로 분류 */
function storeItems(){ const items=[{key:"potion",emoji:"🧪",label:"물약",price:60,cap:20,cat:"pot",desc:"HP 25 회복",buy:()=>{P.potions++;}}];
  for(const [mk,[e,nm]] of Object.entries(MATS)) items.push({key:"mat_"+mk,emoji:e,label:nm,price:45,cap:99,cat:"mat",desc:"제작·강화 재료",buy:()=>addMat(mk,1)});
  for(const [k,c] of Object.entries(CONS)){ if(c.use==="learn"||c.use==="slot")continue;
    const cat=(c.use==="heal"||c.use==="mana"||c.use==="stamina")?"pot":"etc";
    items.push({key:k,emoji:c.emoji,label:c.n,price:c.val||100,cap:3,cat,desc:c.note,buy:()=>gainCons(k)}); }
  return items; }
function storeBuy(){ shopReset(); clearLog(); setScene("🛒","무엇을 살까?");
  const items=storeItems(), tab=["pot","mat","etc"].includes(storeTab)?storeTab:"pot", cnt=c=>items.filter(i=>i.cat===c).length;
  const tabBar=`<div class="invtabs">`+[["pot","🧪 물약"],["mat","🪵 재료"],["etc","✨ 비약·기타"]].map(([t,lab])=>`<button type="button" class="invtab ${tab===t?'on':''}" onclick="setStoreTab('${t}')">${lab}${cnt(t)?` <i>${cnt(t)}</i>`:''}</button>`).join("")+`</div>`;
  const rows=items.filter(i=>i.cat===tab).map(o=>{ const left=shopLeft(o.key,o.cap), soldOut=left<=0, canBuy=P.gold>=o.price&&!soldOut;
    return `<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">${o.emoji}</span>`+
      `<div class="gmeta"><div class="gn">${o.label} <span style="color:var(--gold)">${o.price}G</span></div><div class="ge">${o.desc} · 오늘 ${soldOut?'<span style="color:var(--danger)">소진</span>':`${left}개 남음`}</div></div>`+
      `<div class="gbtns"><button class="ibtn ${canBuy?'on':''}" ${canBuy?'':'disabled'} onclick="storeDoBuy('${o.key}')">구매</button></div></div>`; }).join("");
  $("log").innerHTML=`<div class="invv"><div class="ge" style="color:var(--dim);margin-bottom:2px">💰 보유 <b>${P.gold}G</b> · 구매엔 하루 제한 (날짜 바뀌면 초기화)</div>${tabBar}<div class="invtabbody"><div class="glist">${rows||'<div class="inv-empty">이 분류에 살 물건이 없다</div>'}</div></div></div>`;
  setActions([{label:"💰 팔기로 전환",act:storeSell},{label:"← 뒤로",full:true,act:generalStore}]); }
function storeDoBuy(key){ const o=storeItems().find(i=>i.key===key); if(!o)return; if(shopLeft(o.key,o.cap)<=0){ toast("오늘 구매 한도 초과"); return; } if(P.gold<o.price){ toast("금화 부족"); return; }
  P.gold-=o.price; o.buy(); P.shopBought[o.key]=(P.shopBought[o.key]||0)+1; render(); toast("구매: "+o.label); if(typeof sfx==="function")sfx("loot"); storeBuy(); }
window.storeDoBuy=storeDoBuy;
function storeSell(){ clearLog(); setScene("💰","무엇을 팔까? (즉시 현금화)");
  const gearList=P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key&&!isEquippedItem(it));
  const matList=Object.entries(MATS).filter(([mk])=>(P.mats[mk]||0)>0);
  const tab=["gear","mat"].includes(sellTab)?sellTab:(gearList.length?"gear":"mat");
  const tabBar=`<div class="invtabs">`+[["gear","🗡 장비",gearList.length],["mat","🪵 재료",matList.length]].map(([t,lab,n])=>`<button type="button" class="invtab ${tab===t?'on':''}" onclick="setSellTab('${t}')">${lab}${n?` <i>${n}</i>`:''}</button>`).join("")+`</div>`;
  let rows;
  if(tab==="gear"){ rows = gearList.length ? gearList.map(it=>{ const g=RELICS[it.k], price=Math.round((g.val||40)*0.5)+(it.up||0)*15;
      return `<div class="grow"><span>${ico(relicIco(it.k),34)}</span><div class="gmeta"><div class="gn">${it.k}${it.up?` <span style="color:var(--gold)">+${it.up}</span>`:''}</div><div class="ge">${gearTypeLabel(g)} · 미착용</div></div><div class="gbtns"><button class="ibtn on" onclick="sellGear(${it.id})">팔기 +${price}G</button></div></div>`; }).join("") : `<div class="inv-empty">팔 미착용 장비가 없다</div>`; }
  else { rows = matList.length ? matList.map(([mk,[e,nm]])=>{ const n=P.mats[mk]||0, price=n*4;
      return `<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">${e}</span><div class="gmeta"><div class="gn">${nm} <b>×${n}</b></div><div class="ge">개당 4G · 전량 판매</div></div><div class="gbtns"><button class="ibtn on" onclick="sellMat('${mk}')">팔기 +${price}G</button></div></div>`; }).join("") : `<div class="inv-empty">팔 재료가 없다</div>`; }
  $("log").innerHTML=`<div class="invv"><div class="ge" style="color:var(--dim);margin-bottom:2px">💰 보유 <b>${P.gold}G</b> · 파는 즉시 현금화 (착용 중 장비는 안 보임)</div>${tabBar}<div class="invtabbody"><div class="glist">${rows}</div></div></div>`;
  setActions([{label:"🛒 사기로 전환",act:storeBuy},{label:"← 뒤로",full:true,act:generalStore}]); }
function sellGear(id){ const j=P.inv.findIndex(x=>x.id===id); if(j<0)return; const it=P.inv[j]; if(isEquippedItem(it)){ toast("착용 중은 못 팜"); return; }
  const g=RELICS[it.k], price=Math.round((g.val||40)*0.5)+(it.up||0)*15; P.inv.splice(j,1); P.gold+=price; render(); checkQuests(); toast("판매 +"+price+"G"); if(typeof sfx==="function")sfx("loot"); storeSell(); }
function sellMat(mk){ const n=P.mats[mk]||0; if(n<=0)return; P.gold+=n*4; P.mats[mk]=0; render(); checkQuests(); toast("재료 판매 +"+(n*4)+"G"); storeSell(); }
window.sellGear=sellGear; window.sellMat=sellMat;
/* 🏛 길드하우스 — 메인은 스토리로 자동 진행 · 서브는 여기서 길드마스터가 카테고리로 준다 */
const GUILD_CATS={ reco:{n:"추천 의뢰",emoji:"⭐"}, village:{n:"마을 의뢰",emoji:"🏘"}, hunt:{n:"토벌 의뢰",emoji:"⚔"} };
function guildAvail(cat){ return Object.keys(QUESTS).filter(id=>{ const q=QUESTS[id]; return q.type==="sub"&&!q.tower&&q.cat===cat&&!P.quests[id]; }); }
function guildHouse(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } stopAuctionTimer(); auction=null; mode="town"; checkQuests(); render(); clearLog();
  setScene("🏛","길드하우스 — 모험가들이 북적인다.");
  line('접수원: <span class="quote">"어서 오세요. 스토리 의뢰는 자동으로 진행되고, 그 밖의 일감은 길드마스터가 소개해 드려요."</span>');
  const active=Object.keys(P.quests).filter(id=>P.quests[id].status==="active"&&QUESTS[id]).length;
  const done=Object.keys(P.quests).filter(id=>P.quests[id].status==="done"&&QUESTS[id]).length;
  const openN=Object.keys(GUILD_CATS).reduce((s,c)=>s+guildAvail(c).length,0);
  setActions([
    {label:"🗣 길드마스터와 대화",desc:`추천·마을·토벌 의뢰 받기 · 받을 수 있는 의뢰 ${openN}`,act:guildMasterMenu},
    {label:"📋 의뢰 현황",desc:`진행 ${active} · 완료 ${done}`,act:questBoard},
    {label:"🏘 마을로",full:true,act:townMenu},
  ]); }
function guildMasterMenu(){ if(enemy)return; clearLog(); setScene("🧔","길드마스터 — 팔짱을 낀 노련한 전사.");
  line('길드마스터: <span class="quote">"어떤 종류의 일을 찾나? 골라보게."</span>');
  const acts=Object.entries(GUILD_CATS).map(([c,g])=>({ label:`${g.emoji} ${g.n}`, desc:`받을 수 있는 의뢰 ${guildAvail(c).length}`, act:()=>guildCategory(c) }));
  acts.push({label:"← 뒤로",full:true,act:guildHouse}); setActions(acts); }
function guildCategory(cat){ if(enemy)return; const g=GUILD_CATS[cat]; clearLog(); setScene(g.emoji,`${g.n} — 게시된 일감`);
  const avail=guildAvail(cat);
  if(avail.length===0) line("지금 받을 수 있는 의뢰가 없다. (이미 받았거나 완료함)","sys");
  else line(`길드마스터: <span class="quote">"${g.n} 목록이네. 맡을 걸 고르게."</span>`);
  const acts=avail.map(id=>{ const q=QUESTS[id];
    return { label:`📜 ${q.n}`, desc:`${q.desc} → 보상 ${rewardText(q.reward)}`, act:()=>questScroll(id,cat) }; });
  acts.push({label:"← 다른 종류",act:guildMasterMenu},{label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
/* 📜 의뢰서(양피지) — 읽어보고 '수락' 누르면 도장이 쾅 찍힌다 */
function questScroll(id,cat){ if(enemy)return; const q=QUESTS[id]; if(!q){ guildCategory(cat); return; }
  clearLog(); setScene("📜","의뢰서 — 양피지를 펼친다.");
  const rt=rewardText(q.reward)||"—", giver=q.giver||"길드", typ=q.type==="main"?"주 의뢰":"의뢰";
  $("log").innerHTML=`<div class="scrollwrap"><div class="parchment">
    <div class="pttl">✦  ${typ}  ✦</div>
    <div class="pquestn">${q.n}</div>
    <div class="pmeta">의뢰인 · ${giver}</div>
    <div class="pdesc">"${q.desc}"</div>
    <div class="preward"><span>보상</span>${rt}</div>
    <div class="psign">— 수락하면 이 자리에 승인 도장을 찍는다 —</div>
    <div class="pstamp" id="pstamp">승인<small>APPROVED</small></div>
  </div></div>`;
  setActions([
    {label:"🖋 수락하고 도장 찍기",full:true,act:()=>stampQuest(id,cat)},
    {label:"← 의뢰 목록",act:()=>guildCategory(cat)},
    {label:"🏘 마을로",act:townMenu},
  ]); }
function stampQuest(id,cat){ const q=QUESTS[id]; if(!q||P.quests[id]){ guildCategory(cat); return; }
  const st=$("pstamp"); if(st){ st.classList.remove("show"); void st.offsetWidth; st.classList.add("show"); }
  if(typeof sfx==="function")sfx("loot"); if(typeof fxShake==="function")fxShake();
  setActions([{label:"⏳ 도장 찍는 중…",full:true,disabled:true,act:()=>{}}]);
  setTimeout(()=>{ acceptQuest(id); toast("의뢰 수락: "+q.n);
    setActions([{label:"✅ 수락 완료 — 의뢰 목록으로",full:true,act:()=>guildCategory(cat)},{label:"🏘 마을로",act:townMenu}]); }, 480); }
window.questScroll=questScroll; window.stampQuest=stampQuest;
/* 💬 광장 채팅 — 오프라인 NPC 시뮬레이션 (추후 서버 채팅으로 교체 가능하도록 chatFetch/chatPost로 분리) */
let chatTimer=null, chatLog=[], _lastChatSend=0;
const CHAT_NAMES=["강철나비","달빛사냥꾼","탑돌이","고인물","야간모드","용사김밥","무빙장인","광부왕","초보환영","힐러구함","포션과부하","1등할끄야","은둔고수","길잃은요정","세이버장인"];
const CHAT_LINES=["탑 20층 보스 왜케 아파요 ㅠㅠ","월광 세이버 파실 분 계신가요?","같이 등반하실 분~ 30층대 구함","경매장 마정석 값 실화냐","단검 2연타 개꿀이네요","방금 정예몹한테 털림 ㅋㅋ","마나 오브 어디서 떨궈요?","길드하우스 토벌 의뢰 보상 좋음","주문 영창 오타나서 파이어볼 불발 ㅋㅋㅋ","50층 최종보스 잡은 사람?","힐러 없이 딜찍누 가능?","칭호 '부호' 조건 빡세네","입문자 세트로 15층까지 옴","이 게임 은근 중독되네","다들 무슨 무기 쓰세요?","천공존 배경 이쁨","함정 해체하다 죽을 뻔"];
function chatFetch(){ return {name:pick(CHAT_NAMES), text:pick(CHAT_LINES), ts:Date.now()}; }
function chatPost(text){ chatLog.push({name:P.name, text, me:true, ts:Date.now()}); }
function fmtChatTime(ts){ if(!ts)return ""; const d=new Date(ts); const h=d.getHours(), m=d.getMinutes(); return (h<10?"0":"")+h+":"+(m<10?"0":"")+m; }
/* 💬 채팅 프로필 사진: data:image → 원형 img, 이모지 → 그대로, 없으면 기본 🧑 */
function chatAvatarHtml(av){ if(av&&typeof av==="string"&&av.slice(0,5)==="data:")return `<span class="cav"><img src="${av}" alt=""></span>`;
  if(av&&typeof av==="string"&&[...av].length<=4&&av.slice(0,5)!=="data:")return `<span class="cav cavemo">${av.replace(/</g,"&lt;")}</span>`;
  return `<span class="cav cavemo">🧑</span>`; }
function stopChatTimer(){ if(chatTimer){ clearInterval(chatTimer); chatTimer=null; } }
function chatSeed(){ if(chatLog.length)return; for(let i=0;i<7;i++)chatLog.push(chatFetch()); }
/* 상시 광장 채팅 독 — 마을에서 항상 떠서 실시간 갱신 */
function startTownChat(){ if(!P||enemy||mode!=="town")return; const d=$("chatdock"); if(!d)return; d.hidden=false;
  if((window.innerWidth||999)<=640 && !d.dataset.userToggled)d.classList.add("collapsed");   // 모바일: 기본 접힘
  stopChatTimer();
  if(P._online){   // 🌐 온라인: 실시간 광장 채팅(SSE) — 접속 세션 동안 유지, 지난 기록은 미로드(로그인 시 enterOnline에서 초기화)
    const myNick=()=>NET.nick||NET.name;   // 채팅 표시명은 닉네임 기준으로 '나' 판별
    NET.onChat=(m)=>{ chatLog.push({name:m.name,av:m.av,text:m.text,me:(m.name===myNick()),ts:m.ts}); if(chatLog.length>60)chatLog=chatLog.slice(-60); renderChatDock(); };
    NET.onPresence=(n)=>{ const el=$("cdonline"); if(el)el.textContent=n+"명 접속"; };
    renderChatDock(); return;
  }
  chatSeed(); renderChatDock();   // 오프라인: 로컬 시뮬
  chatTimer=setInterval(()=>{ if(mode!=="town"||enemy){ stopChatTimer(); return; } chatLog.push(chatFetch()); if(chatLog.length>60)chatLog=chatLog.slice(-60); renderChatDock(); }, 4500); }
function renderChatDock(){ const body=$("chatmsgs"); if(!body)return;
  const sc=body.parentElement||body;   // 실제 스크롤 컨테이너는 .cdbody(부모)
  const atBottom = (sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 40;   // 이미 위로 올려봤으면 강제 스크롤 안 함
  body.innerHTML=chatLog.slice(-40).map(m=>`<div class="cmsg ${m.me?'me':''}">${chatAvatarHtml(m.me?(P&&P.avatar):m.av)}<span class="cnm">${m.me?'나':m.name}</span><span class="ctx">${(m.text||"").replace(/</g,"&lt;")}</span>${m.ts?`<span class="cts">${fmtChatTime(m.ts)}</span>`:""}</div>`).join("");
  if(atBottom) sc.scrollTop=sc.scrollHeight; }   // 맨 아래에 있을 때만 자동 스크롤(대화 읽는 중이면 방해 안 함)
function toggleChatDock(){ const d=$("chatdock"); if(d){ d.classList.toggle("collapsed"); d.dataset.userToggled="1"; } }
function chatSend(){ if(!P)return; const inp=$("cdinput"); const msg=((inp?inp.value:"")||"").trim(); if(!msg)return;
  if(P._online && typeof netChatSend==="function"){   // 🌐 온라인: 서버로 전송(SSE로 되돌아옴)
    const now=Date.now(); if(now-_lastChatSend<1200){ toast("너무 빨라요 — 잠깐만요"); return; }   // 클라 도배 방지(입력 유지)
    _lastChatSend=now; if(inp){ inp.value=""; try{ inp.focus(); }catch(e){} }
    netChatSend(msg.slice(0,200)).catch(e=>toast((e&&e.message)?e.message:"전송 실패 (연결 확인)")); return;
  }
  if(inp){ inp.value=""; try{ inp.focus(); }catch(e){} }
  chatPost(msg.slice(0,60)); renderChatDock();   // 오프라인: 로컬 시뮬
  if(chance(0.6))setTimeout(()=>{ if(mode==="town"&&chatTimer){ chatLog.push({name:pick(CHAT_NAMES), text:pick(["ㅇㅋㅇㅋ","오 반가워요","화이팅!","저도요 ㅋㅋ","굿굿","같이해요~","ㄹㅇ"]), ts:Date.now()}); renderChatDock(); } }, 1200); }
/* 📜 의뢰 현황 (진행중·완료) */
function questBoard(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } stopAuctionTimer(); auction=null; mode="town"; checkQuests();
  render(); clearLog(); setScene("📋","의뢰 현황 — 진행 중과 완료.");
  const allActive=Object.keys(P.quests).filter(id=>P.quests[id].status==="active"&&QUESTS[id]);
  const active=allActive.sort((a,b)=>(QUESTS[a].type==="main"?0:1)-(QUESTS[b].type==="main"?0:1));
  const done=Object.keys(P.quests).filter(id=>P.quests[id].status==="done"&&QUESTS[id]);
  const badge=t=>t==="main"?'<span style="color:var(--gold)">★메인</span>':'<span style="color:var(--dim)">•서브</span>';
  const qcard=(id)=>{ const def=QUESTS[id]; const cur=questCur(id),goal=questGoalN(id),pct=questPct(id);
    return `<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:18px">📜</span><div class="gmeta"><div class="gn">${def.n} ${badge(def.type)} <span style="color:var(--dim);font-size:11px">· ${def.giver}</span></div><div class="ge">${def.desc} — <b>${cur}/${goal}</b></div><div class="hpbar2 mp" style="height:6px;margin-top:3px"><i style="width:${pct}%"></i></div><div class="ge" style="color:var(--gold)">보상 ${rewardText(def.reward)}</div></div></div>`; };
  const doneRow=(id)=>`<span class="chip" style="color:var(--good);border-color:#3a5a3f">✅ ${QUESTS[id].n}</span>`;
  $("log").innerHTML=`<div class="invv">
    <div><div class="ih"><span>📋 진행 중</span><span class="cnt">${active.length}</span></div><div class="glist">${active.length?active.map(qcard).join(""):`<div class="inv-empty">진행 중인 퀘스트가 없다.</div>`}</div></div>
    <div><div class="ih"><span>✅ 완료</span><span class="cnt">${done.length}</span></div><div class="statchips">${done.length?done.map(doneRow).join(""):`<div class="inv-empty">아직 완료한 퀘스트가 없다.</div>`}</div></div>
  </div>`;
  setActions([{label:"🏛 길드하우스로",act:()=>{ if(mode==="town")guildHouse(); else townMenu(); }},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 🎖️ 칭호소 (구 전직소) — 조건 달성한 칭호를 하나 장착 */
function titleMenu(){ if(enemy)return; checkTitleUnlocks(true); clearLog(); setScene("🎖️","칭호소 — 명예의 전당.");
  line('관리인: <span class="quote">"업적을 쌓으면 칭호가 열리네. 하나 골라 몸에 새기게."</span>');
  if(P.title) line(`장착 중: <b>${jobEmoji()} ${jobName()}</b> — ${TITLES[P.title].note}`,"loot");
  else line("장착한 칭호가 없다 (방랑자).","sys");
  const acts=Object.entries(TITLES).map(([k,t])=>{ const owned=P.titles.includes(k); const on=P.title===k;
    return { label:`${owned?t.emoji:"🔒"} ${t.n}${on?" ✔장착":""}`, desc: owned?`${t.note}${on?"":" · 장착하기"}`:`잠김 — ${t.how}`,
      disabled:!owned, act:()=> on?unequipTitle():equipTitle(k) }; });
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function equipTitle(k){ if(!P.titles.includes(k))return; P.title=k; render(); line(`🎖️ <b>${TITLES[k].n}</b> 칭호를 장착했다. (${TITLES[k].note})`,"loot"); toast("칭호: "+TITLES[k].n); titleMenu(); }
function unequipTitle(){ P.title=null; render(); line("칭호를 해제했다.","sys"); titleMenu(); }
/* 📖 아이템 도감 — 발견한 장비 수집 (희귀도·출처 표기) */
function itemRarity(g){ const v=(g&&g.val)||0; return v>=1500?{n:"신화",c:"#ff8f3c"}:v>=700?{n:"전설",c:"#e8c56a"}:v>=300?{n:"희귀",c:"#a98bff"}:v>=80?{n:"고급",c:"#8fd0ff"}:{n:"일반",c:"#9aa4b8"}; }
function itemSource(name){ const g=RELICS[name]||{}; if(typeof GEAR_TIERS!=="undefined"){ if(GEAR_TIERS.myth.includes(name))return "정점 보스(45층+)"; if(GEAR_TIERS.rift.includes(name))return "시공 균열(31~45층)"; if(GEAR_TIERS.sky.includes(name))return "천공(16~30층)"; } if(g.shop==="weapon")return "무기 상점"; if(g.shop==="armor")return "장비 상점"; return "탐험·보스 드랍"; }
let dexTab="gear";   // 📖 도감 탭(gear=장비 / mon=몬스터)
function setDexTab(t){ dexTab=t; codexMenu(); }
window.setDexTab=setDexTab;
/* 도감 통계(장비/몬스터 수집률) */
function dexGearStat(){ const all=Object.keys(RELICS).filter(k=>RELICS[k].slot); const got=all.filter(k=>!!(P.codex&&P.codex[k])).length; return {got,all:all.length}; }
function dexMonList(){ return [].concat(ENEMIES,ENEMIES2,ENEMIES3,Object.values(BOSSES)); }
const DEX_WEAK_KILLS=3, DEX_MECH_KILLS=6, DEX_DROP_KILLS=10;   // 🔓 도감 정보 공개 처치수(약점/기믹/드랍)
function dexMonStat(){ const list=dexMonList(); const got=list.filter(e=>{ const b=P.bestiary&&P.bestiary[e.n]; return b&&b.kills>0; }).length; return {got,all:list.length}; }
function codexMenu(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } const inDive=(mode==="dive"); if(!inDive){ stopAuctionTimer(); auction=null; mode="town"; } render(); clearLog();
  setScene("📖", dexTab==="mon"?"도감 — 몬스터":"도감 — 수집한 장비");
  const gs=dexGearStat(), ms=dexMonStat();
  const tabs=`<div class="invtabs">`
    +`<button type="button" class="invtab ${dexTab==='gear'?'on':''}" onclick="setDexTab('gear')">🗡 장비 <i>${gs.got}/${gs.all}</i></button>`
    +`<button type="button" class="invtab ${dexTab==='mon'?'on':''}" onclick="setDexTab('mon')">👹 몬스터 <i>${ms.got}/${ms.all}</i></button>`
    +`</div>`;
  const body = dexTab==="mon" ? dexMonsterHtml() : dexGearHtml();
  $("log").innerHTML=tabs+`<div class="dexwrap">${body}</div>`; const lg=$("log"); if(lg)lg.scrollTop=0;
  setActions([{label:"← 닫기",full:true,act:()=> inDive?backToClimb():townMenu()}]); }
/* 📖 장비 도감 본문 */
function dexGearHtml(){
  const all=Object.keys(RELICS).filter(k=>RELICS[k].slot); const seen=k=>!!(P.codex&&P.codex[k]);
  const got=all.filter(seen).length; const order=["신화","전설","희귀","고급","일반"];
  const groups={}; order.forEach(o=>groups[o]=[]); all.forEach(k=>groups[itemRarity(RELICS[k]).n].push(k));
  const rcol={"신화":"#ff8f3c","전설":"#e8c56a","희귀":"#a98bff","고급":"#8fd0ff","일반":"#9aa4b8"};
  let html=`<div class="dexhead">🗡 수집 <b>${got}</b> / ${all.length} <span class="dexpct">(${Math.round(got/all.length*100)}%)</span></div>`;
  order.forEach(o=>{ const list=groups[o]; if(!list.length)return;
    html+=`<div class="dexgrp" style="color:${rcol[o]}">${o} <span>${list.filter(seen).length}/${list.length}</span></div><div class="dexlist">`;
    list.sort((a,b)=>(RELICS[b].val||0)-(RELICS[a].val||0)).forEach(k=>{ const g=RELICS[k];
      html+= seen(k)
        ? `<div class="dexrow"><span class="dxic">${ico(relicIco(k),26)}</span><div class="dxm"><div class="dxn">${k} <span class="dxslot">${SLOT_LABEL[g.slot]||""}</span></div><div class="dxd">${g.note||""}</div><div class="dxsrc">📍 ${itemSource(k)} · 판매가 ${g.val||0}G</div></div></div>`
        : `<div class="dexrow lock"><span class="dxic">🔒</span><div class="dxm"><div class="dxn">??? <span class="dxslot">${SLOT_LABEL[g.slot]||""}</span></div><div class="dxd">미발견</div><div class="dxsrc">📍 ${itemSource(k)}</div></div></div>`;
    }); html+=`</div>`; });
  return html; }
/* 👹 몬스터 도감 본문 — 처치수·약점·기믹·시그니처 드랍 기록 */
function dexMonsterHtml(){
  const zones=[
    {t:"🗼 시련의 탑 · 1~15층", list:ENEMIES},
    {t:"☁️ 천공의 성역 · 16~30층", list:ENEMIES2},
    {t:"🌌 시공의 균열 · 31~50층", list:ENEMIES3},
    {t:"👑 층 보스", list:Object.values(BOSSES)},
  ];
  const ms=dexMonStat();
  let html=`<div class="dexhead">👹 발견 <b>${ms.got}</b> / ${ms.all} <span class="dexpct">(${Math.round(ms.got/ms.all*100)}%)</span></div>`;
  zones.forEach(z=>{
    const seenN=z.list.filter(e=>{ const b=P.bestiary&&P.bestiary[e.n]; return b&&b.kills>0; }).length;
    html+=`<div class="dexgrp" style="color:#c9b48a">${z.t} <span>${seenN}/${z.list.length}</span></div><div class="dexlist">`;
    z.list.forEach(e=>{ const b=P.bestiary&&P.bestiary[e.n]; const seen=b&&b.kills>0;
      if(!seen){ html+=`<div class="dexrow lock"><span class="dxic">🔒</span><div class="dxm"><div class="dxn">??? <span class="dxslot">미발견</span></div><div class="dxd">쓰러뜨리면 기록된다</div></div></div>`; return; }
      const kills=b.kills||0;
      // 🔓 처치수에 따라 정보 공개: 약점(3) · 기믹(6) · 드랍(10)
      const weakHtml = kills>=DEX_WEAK_KILLS
        ? (b.weak&&ELEMENTS[b.weak] ? `<span style="color:${ELEMENTS[b.weak].col}">${ELEMENTS[b.weak].ic} ${ELEMENTS[b.weak].n} 약점</span>` : `<span style="color:var(--dim)">약점 없음</span>`)
        : `<span style="color:var(--dim)">약점 🔒 <span style="font-size:10px">(${DEX_WEAK_KILLS}처치)</span></span>`;
      const mk=MONSTER_MECH[e.n];
      const mechHtml = mk&&MECH_INFO[mk] ? (kills>=DEX_MECH_KILLS ? ` · <span style="color:#e0b0ff">${MECH_INFO[mk].ic} ${MECH_INFO[mk].n}</span>` : ` · <span style="color:var(--dim)">기믹 🔒 <span style="font-size:10px">(${DEX_MECH_KILLS})</span></span>`) : "";
      const sig=MONSTER_SIG[e.n]||[];
      const dropHtml = sig.length ? (kills>=DEX_DROP_KILLS
        ? `<div class="dxsrc">🎁 ${sig.map(it=> (b.drops&&b.drops[it])?`<b style="color:var(--good)">✔ ${it}</b>`:`<span style="color:var(--dim)">${it}</span>`).join(" · ")}</div>`
        : `<div class="dxsrc" style="color:var(--dim)">🎁 고유 드랍 🔒 (${DEX_DROP_KILLS}마리 처치 시 공개)</div>`) : "";
      html+=`<div class="dexrow"><span class="dxic">${ico(e.ic,26)}</span><div class="dxm"><div class="dxn">${e.n} <span class="dxslot">⚔ ${b.kills}</span></div><div class="dxd">${weakHtml}${mechHtml}</div>${dropHtml}</div></div>`;
    }); html+=`</div>`; });
  return html; }
/* 🔨 제작소 — 재료+금화로 세트 장비·내성 아이템 제작 */
function craftGearCost(k){ const v=RELICS[k].val||300; return {gold:Math.round(v*0.7), mats:{ore:Math.max(3,Math.round(v/130)), mana:Math.max(2,Math.round(v/220))}}; }
function craftConsCost(k){ const v=CONS[k].val||150; return {gold:Math.round(v*0.6), mats:{herb:Math.max(2,Math.round(v/90))}}; }
function canAfford(cost){ if(P.gold<cost.gold)return false; for(const m in cost.mats){ if((P.mats[m]||0)<cost.mats[m])return false; } return true; }
function payCost(cost){ P.gold-=cost.gold; for(const m in cost.mats)P.mats[m]=Math.max(0,(P.mats[m]||0)-cost.mats[m]); }
function craftCostText(cost){ let s=`💰${cost.gold}`; for(const m in cost.mats)s+=` ${MATS[m][0]}${cost.mats[m]}`; return s; }
function workshopMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; townReturn=workshopMenu; render(); clearLog(); setScene("🔨","제작소 — 재료로 장비를 만든다");
  line(`보유 💰 <b>${P.gold}</b> · 재료 ${Object.entries(MATS).map(([k,[e]])=>`${e}${P.mats[k]||0}`).join(" ")}`,"sys");
  const acts=[];
  for(const sk in SETS){ acts.push({header:true,label:`✦ ${SETS[sk].n}`});
    Object.keys(RELICS).filter(k=>RELICS[k].set===sk).forEach(k=>{ const cost=craftGearCost(k); const owned=P.inv.some(x=>x.k===k)||((P.stash&&P.stash.inv)||[]).some(x=>x.k===k);
      acts.push({label:k,desc:`${RELICS[k].note} · ${craftCostText(cost)}${owned?" · 보유 중":""}`,disabled:!canAfford(cost),act:()=>craftGear(k)}); }); }
  acts.push({header:true,label:"🧪 지역 내성 아이템"});
  Object.keys(CONS).filter(k=>CONS[k].use==="resist").forEach(k=>{ const cost=craftConsCost(k);
    acts.push({label:`${CONS[k].emoji} ${CONS[k].n}`,desc:`${CONS[k].note} · ${craftCostText(cost)}`,disabled:!canAfford(cost),act:()=>craftCons(k)}); });
  if(typeof RUNES!=="undefined"){ acts.push({header:true,label:"🔩 동료 룬 (동료 슬롯에 장착)"});
    Object.keys(RUNES).forEach(rk=>{ const r=RUNES[rk], cost=r.cost||{gold:150,mats:{}};
      acts.push({label:`${r.emoji} ${r.n}${(P.runes&&P.runes[rk])?` (보유 ${P.runes[rk]})`:""}`,desc:`${r.note} · ${craftCostText(cost)}`,disabled:!canAfford(cost),act:()=>craftRune(rk)}); }); }
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function craftGear(k){ const cost=craftGearCost(k); if(!canAfford(cost)){ toast("재료·금화 부족"); return; } payCost(cost); addRelic(k); toast("제작: "+k); render(); workshopMenu(); }
function craftCons(k){ const cost=craftConsCost(k); if(!canAfford(cost)){ toast("재료·금화 부족"); return; } payCost(cost); gainCons(k); line(`🔨 <b>${CONS[k].n}</b> 제작 완료!`,"loot"); toast("제작: "+CONS[k].n); render(); workshopMenu(); }
function inventoryMenu(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } const inDive=(mode==="dive"); if(!inDive){ stopAuctionTimer(); auction=null; mode="town"; }
  regenStamina(); render(); clearLog(); setScene("🎒", inDive?"소지품 — 드랍 장비를 착용하자.":"소지품을 정리한다.");
  const b=relicBonus();
  const sc=setCounts(); let setHtml=""; for(const k in sc){ const s=SETS[k]; if(!s)continue; const n=sc[k];
    const active=Object.keys(s.bonus).filter(th=>n>=+th).map(th=>s.bonus[th].note); const next=Object.keys(s.bonus).map(Number).filter(th=>n<th).sort((a,b)=>a-b)[0];
    setHtml+=`<div class="grow eq"><span class="emo" style="width:34px;height:34px;font-size:18px;color:var(--gold)">✦</span><div class="gmeta"><div class="gn">${s.n} <b>${n}피스</b></div><div class="ge">${active.length?active.map(a=>'<span style="color:var(--good)">✔ '+a+'</span>').join(' · '):''}${next?`<span style="color:var(--dim)">${active.length?' · ':''}${next}피스: ${s.bonus[next].note}</span>`:''}</div></div></div>`; }
  // 착용 슬롯
  const slotRow = SLOTS.map(([s,e,nm])=>{ const it=equippedItem(s); const k=it?it.k:null;
    return `<div class="grow ${k?'eq':''}"><span class="emo" style="width:34px;height:34px;font-size:19px">${e}</span>`+
      `<div class="gmeta"><div class="gn">${nm}</div><div class="ge">${k?k+' — '+(RELICS[k]?RELICS[k].note:''):'비어 있음'}</div></div>`+
      (k?`<div class="gbtns"><button class="ibtn" onclick="invUnequip('${s}')">해제</button></div>`:"")+`</div>`; }).join("");
  // 보유 장비
  const owned = P.inv.map((it,i)=>({it,i})).filter(o=>RELICS[o.it.k])
    .sort((a,b)=>(isEquippedItem(b.it)?1:0)-(isEquippedItem(a.it)?1:0));   // 착용 중을 위로
  const mkGearRow=({it,i})=>{ const g=RELICS[it.k]; const equipped=isEquippedItem(it);
    const tip=`${it.k}${it.up?' +'+it.up:''} — ${gearTypeLabel(g)} · ${(g.note||'').replace(/"/g,'')} · 판매 ${g.val}G${equipped?' · 착용중':''}`;
    return `<div class="grow ${equipped?'eq':''}" title="${tip}"><span onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${ico(relicIco(it.k),34)}</span><div class="gmeta"><div class="gn" onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${it.k}${it.up?` <span style="color:var(--gold)">+${it.up}</span>`:''}${equipped?' <span style="color:var(--good);font-size:11px">착용중</span>':''} <span style="color:var(--dim);font-size:11px">ⓘ</span></div><div class="ge"><span class="gtype">${gearTypeLabel(g)}</span> · ${g.note} · ${g.val}G</div></div>`+
      `<div class="gbtns">${equipped?`<button class="ibtn on" onclick="invUnequip('${g.slot}')">해제</button>`:`<button class="ibtn" onclick="invEquip(${i})">착용</button>`}<button class="ibtn del" onclick="invDrop(${i})">버리기</button></div></div>`; };
  const gearByCat={wpn:[],arm:[],acc:[]}; owned.forEach(o=>{ gearByCat[gearCat3(RELICS[o.it.k])].push(o); });
  // 소비품
  const consRows = [`<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">🧪</span><div class="gmeta"><div class="gn">물약 <b>×${P.potions}</b></div><div class="ge">HP 25 회복</div></div><div class="gbtns"><button class="ibtn" ${P.potions<=0?'disabled':''} onclick="invPotion()">사용</button></div></div>`]
    .concat(Object.entries(P.consumables||{}).filter(([,q])=>q>0).map(([key,q])=>{ const c=CONS[key]; if(!c)return"";
      return `<div class="grow" title="${c.n} — ${(c.note||'').replace(/"/g,'')}"><span class="emo" onclick="itemInfo('cons','${key}')" style="width:34px;height:34px;font-size:19px;cursor:pointer">${c.emoji}</span><div class="gmeta"><div class="gn" onclick="itemInfo('cons','${key}')" style="cursor:pointer">${c.n} <b>×${q}</b> <span style="color:var(--dim);font-size:11px">ⓘ</span></div><div class="ge">${c.note}</div></div><div class="gbtns"><button class="ibtn" onclick="invUse('${key}')">사용</button></div></div>`; })).join("");
  // 재료
  const mats = Object.entries(MATS).map(([k,[e,nm]])=>`<div class="mcell"><div class="me">${e}</div><div class="mq">${P.mats[k]||0}</div><div class="mn">${nm}</div></div>`).join("")
    + (typeof FOODS!=="undefined"?Object.entries(FOODS).filter(([k])=>((P.food&&P.food[k])||0)>0).map(([k,f])=>`<div class="mcell" title="🍖 동료 먹이"><div class="me">${f.emoji}</div><div class="mq">${P.food[k]}</div><div class="mn">${f.n}</div></div>`).join(""):"");
  // 퀘스트 아이템
  const quest = (P.questItems&&P.questItems.length) ? P.questItems.map(n=>`<span class="chip" style="cursor:pointer" onclick="itemInfo('quest','${n}')">🗝 ${n} ⓘ</span>`).join("") : `<div class="inv-empty">없음</div>`;
  const buffLine = (P.buffs&&Object.keys(P.buffs).some(k=>P.buffs[k])) ? `<div class="ge" style="margin-top:6px;color:var(--mp)">활성 버프: ${P.buffs.atkPct?`공격 +${Math.round(P.buffs.atkPct*100)}% `:''}${P.buffs.magicPct?`마법 +${Math.round(P.buffs.magicPct*100)}% `:''}${P.buffs.critBonus?`치명 +${Math.round(P.buffs.critBonus*100)}% `:''}${P.buffs.defBonus?`방어 +${P.buffs.defBonus}`:''}</div>`:"";
  const consN=1+Object.values(P.consumables||{}).filter(q=>q>0).length, matN=Object.values(P.mats||{}).filter(n=>n>0).length, qN=(P.questItems||[]).length;
  const tab=["wpn","arm","acc","cons","mat","quest"].includes(invTab)?invTab:"wpn";
  const tabBar=`<div class="invtabs">`+
    [["wpn","🗡 무기",gearByCat.wpn.length],["arm","🛡 방어구",gearByCat.arm.length],["acc","💍 악세",gearByCat.acc.length],["cons","🧪 소비품",consN],["mat","🪵 재료",matN],["quest","🗝 퀘스트",qN]]
      .map(([t,lab,n])=>`<button type="button" class="invtab ${tab===t?'on':''}" onclick="setInvTab('${t}')">${lab}${n?` <i>${n}</i>`:''}</button>`).join("")+`</div>`;
  const gearCatEmpty={wpn:"보유한 무기가 없다. 탑·상점·경매장에서 얻는다.",arm:"보유한 방어구가 없다.",acc:"보유한 악세사리가 없다."};
  const body = tab==="cons" ? `<div class="glist">${consRows}</div>${buffLine}`
    : tab==="mat" ? `<div class="mgrid">${mats}</div>`
    : tab==="quest" ? `<div class="statchips">${quest}</div>`
    : (gearByCat[tab].length?`<div class="glist">${gearByCat[tab].map(mkGearRow).join("")}</div>`:`<div class="inv-empty">${gearCatEmpty[tab]}</div>`);
  // 📊 상세 스탯 — 강화·장비·버프가 반영된 실제 파생 스탯
  const _sp=(()=>{ const atk=ATK(),def=DEF(),hp=MAXHP(),mp=MAXMP(),luk=LUKv();
    const wep=equippedItem("weapon"); const wUp=wep?upBonus(wep).atk:0;
    const cell=(ic,lab,val,sub)=>`<div class="scell"><div class="scv">${ic} <b>${val}</b></div><div class="scl">${lab}${sub?`<br><span style="color:var(--gold)">${sub}</span>`:""}</div></div>`;
    return `<div><div class="ih"><span>📊 상세 스탯</span><span class="cnt">강화·장비 반영</span></div><div class="statgrid">`+
      cell("⚔","공격력",atk, wUp?`무기강화 +${wUp}`:"")+cell("🛡","방어",def,"")+cell("❤","최대 HP",hp,"")+cell("🔵","최대 기력",mp,"")+cell("🍀","행운",luk,"")+
      `</div></div>`; })();
  $("log").innerHTML = `<div class="invv">
    ${_sp}
    <div><div class="ih"><span>착용 중</span><span class="cnt">⚔+${b.atk} 🛡+${b.def} 🍀+${b.luck}${b.vamp?' 🩸':''}</span></div><div class="glist">${slotRow}</div></div>
    ${setHtml?`<div><div class="ih"><span>✦ 세트 효과</span></div><div class="glist">${setHtml}</div></div>`:""}
    ${tabBar}
    <div class="invtabbody">${body}</div>
  </div>`;
  setActions(inDive
    ? [{label:"← 탑으로 돌아가기",full:true,act:backToClimb}]
    : (typeof townReturn==="function"
        ? [{label:"← 돌아가기",full:true,act:townReturn},{label:"🏛 경매장에서 팔기",act:openAuction},{label:"🏘 마을로",act:townMenu}]
        : [{label:"🏛 경매장에서 팔기",act:openAuction},{label:"🏘 마을로",full:true,act:townMenu}])); }
/* 🏦 창고 (은행) — 마을 보관함. 가방(개인 소지품)↔창고 이동. 탑에서는 접근 불가(추후 캐쉬 아이템으로 원격 개방 예정). */
function stashCount(){ if(!P||!P.stash)return 0; const s=P.stash; let n=(Array.isArray(s.inv)?s.inv.length:0)+(s.potions||0);
  for(const m in (s.mats||{}))n+=s.mats[m]||0; for(const k in (s.consumables||{}))n+=s.consumables[k]||0; return n; }
/* 🏦 창고 공용 행 빌더 */
function whGearRow(it,where){ const g=RELICS[it.k]||{}; const eq=(where==="bag")&&isEquippedItem(it);
  const btn = where==="bag" ? `<button class="ibtn" onclick="whDep(${it.id})">창고에 넣기${eq?' (해제)':''}</button>` : `<button class="ibtn on" onclick="whWd(${it.id})">꺼내기</button>`;
  return `<div class="grow"><span onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${ico(relicIco(it.k),30)}</span><div class="gmeta"><div class="gn">${it.k}${it.up?` <span style="color:var(--gold)">+${it.up}</span>`:''}</div><div class="ge">${g.note||''}</div></div><div class="gbtns">${btn}</div></div>`; }
function whStackRow(emoji,name,q,where,fn){ return `<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">${emoji}</span><div class="gmeta"><div class="gn">${name} <b>×${q}</b></div></div><div class="gbtns"><button class="ibtn ${where==='bag'?'':'on'}" onclick="${fn}">${where==='bag'?'창고에 넣기':'꺼내기'}</button></div></div>`; }
function whBagItems(){ const arr=[];
  P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key).forEach(it=>arr.push({cat:gearCat3(RELICS[it.k]),html:whGearRow(it,"bag")}));
  if(P.potions>0)arr.push({cat:"cons",html:whStackRow("🧪","물약",P.potions,"bag","whDepPot()")});
  Object.entries(P.consumables||{}).filter(([,q])=>q>0).forEach(([k,q])=>{ const c=CONS[k]; if(c)arr.push({cat:"cons",html:whStackRow(c.emoji,c.n,q,"bag",`whDepCons('${k}')`)}); });
  Object.entries(MATS).forEach(([m,[e,nm]])=>{ const q=P.mats[m]||0; if(q>0)arr.push({cat:"mat",html:whStackRow(e,nm,q,"bag",`whDepMat('${m}')`)}); });
  return arr; }
function whStashItems(){ const st=P.stash, arr=[];
  st.inv.filter(it=>RELICS[it.k]).forEach(it=>arr.push({cat:gearCat3(RELICS[it.k]),html:whGearRow(it,"stash")}));
  if((st.potions||0)>0)arr.push({cat:"cons",html:whStackRow("🧪","물약",st.potions,"stash","whWdPot()")});
  Object.entries(st.consumables||{}).filter(([,q])=>q>0).forEach(([k,q])=>{ const c=CONS[k]; if(c)arr.push({cat:"cons",html:whStackRow(c.emoji,c.n,q,"stash",`whWdCons('${k}')`)}); });
  Object.entries(MATS).forEach(([m,[e,nm]])=>{ const q=st.mats[m]||0; if(q>0)arr.push({cat:"mat",html:whStackRow(e,nm,q,"stash",`whWdMat('${m}')`)}); });
  return arr; }
function whTabBarHtml(items){ const wt=["wpn","arm","acc","cons","mat"].includes(whTab)?whTab:"wpn", cnt=c=>items.filter(r=>r.cat===c).length;
  return `<div class="invtabs">`+[["wpn","🗡 무기"],["arm","🛡 방어구"],["acc","💍 악세"],["cons","🧪 소비품"],["mat","🪵 재료"]].map(([t,lab])=>`<button type="button" class="invtab ${wt===t?'on':''}" onclick="setWhTab('${t}')">${lab}${cnt(t)?` <i>${cnt(t)}</i>`:''}</button>`).join("")+`</div>`; }
/* 🏦 창고 보기 — 창고에 보관 중인 물건만 (꺼내기). 넣으려면 '소지품 열기' */
function warehouseMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; townReturn=warehouseMenu; whView="stash"; render(); setScene("🏦","창고 — 마을 보관함");
  const st=P.stash, items=whStashItems(), wt=["wpn","arm","acc","cons","mat"].includes(whTab)?whTab:"wpn";
  const rows=items.filter(r=>r.cat===wt).map(r=>r.html).join("");
  const goldStash=`<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">🪙</span><div class="gmeta"><div class="gn">보관 골드 <b>${st.gold||0}G</b></div></div><div class="gbtns"><button class="ibtn on" ${(st.gold||0)<=0?'disabled':''} onclick="whWdGold()">꺼내기</button><button class="ibtn" ${P.gold<=0?'disabled':''} onclick="whDepGold()">넣기</button></div></div>`;
  $("log").innerHTML=`<div class="invv">
    <div class="ge" style="color:var(--dim);margin-bottom:2px">🏦 창고에 보관 중인 물건 · 넣으려면 아래 <b>소지품 열기</b></div>
    <div class="glist" style="margin-bottom:4px">${goldStash}</div>
    ${whTabBarHtml(items)}
    <div><div class="ih"><span>🏦 창고 보관함</span><span class="cnt">${stashCount()}칸</span></div><div class="glist">${rows||`<div class="inv-empty">이 분류에 창고 아이템이 없다</div>`}</div></div>
  </div>`;
  setActions([{label:"🎒 소지품 열기 (창고에 넣기)",full:true,act:warehouseBag},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 🎒 창고-소지품 화면 — 가방 물건만 (창고에 넣기) */
function warehouseBag(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town"; townReturn=warehouseBag; whView="bag"; render(); setScene("🎒","소지품 — 창고에 넣을 물건");
  const items=whBagItems(), wt=["wpn","arm","acc","cons","mat"].includes(whTab)?whTab:"wpn";
  const rows=items.filter(r=>r.cat===wt).map(r=>r.html).join("");
  const goldBag=`<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">🪙</span><div class="gmeta"><div class="gn">보유 골드 <b>${P.gold}G</b></div></div><div class="gbtns"><button class="ibtn" ${P.gold<=0?'disabled':''} onclick="whDepGold()">창고에 넣기</button></div></div>`;
  $("log").innerHTML=`<div class="invv">
    <div class="ge" style="color:var(--dim);margin-bottom:2px">🎒 내 소지품 · <b>창고에 넣기</b>로 보관함으로 옮겨요 (착용 중이면 자동 해제)</div>
    <div class="glist" style="margin-bottom:4px">${goldBag}</div>
    ${whTabBarHtml(items)}
    <div><div class="ih"><span>🎒 내 소지품</span></div><div class="glist">${rows||`<div class="inv-empty">이 분류에 가방 아이템이 없다</div>`}</div></div>
  </div>`;
  setActions([{label:"🏦 창고 보기",full:true,act:warehouseMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }
window.warehouseBag=warehouseBag;
function whDep(id){ const i=P.inv.findIndex(x=>x.id===id); if(i<0)return; const it=P.inv[i];
  const g=RELICS[it.k]; const wasEq=g&&g.slot&&P.equip[g.slot]===it.id; if(wasEq)P.equip[g.slot]=null;   // 착용 중이면 해제 후 보관
  P.inv.splice(i,1); P.stash.inv.push(it); toast(wasEq?"해제 후 창고에 넣음":"창고에 넣음"); render(); whRefresh(); }
function whWd(id){ const i=P.stash.inv.findIndex(x=>x.id===id); if(i<0)return; const it=P.stash.inv[i]; P.stash.inv.splice(i,1); P.inv.push(it); toast("가방으로 꺼냄"); whRefresh(); }
function whDepPot(){ if(P.potions<=0)return; P.stash.potions=(P.stash.potions||0)+P.potions; P.potions=0; toast("물약 넣음"); whRefresh(); }
function whWdPot(){ if((P.stash.potions||0)<=0)return; P.potions+=P.stash.potions; P.stash.potions=0; toast("물약 꺼냄"); whRefresh(); }
function whDepCons(k){ const q=P.consumables[k]||0; if(q<=0)return; P.stash.consumables[k]=(P.stash.consumables[k]||0)+q; delete P.consumables[k]; toast("넣음"); whRefresh(); }
function whWdCons(k){ const q=P.stash.consumables[k]||0; if(q<=0)return; P.consumables[k]=(P.consumables[k]||0)+q; delete P.stash.consumables[k]; toast("꺼냄"); whRefresh(); }
function whDepMat(m){ const q=P.mats[m]||0; if(q<=0)return; P.stash.mats[m]=(P.stash.mats[m]||0)+q; P.mats[m]=0; toast("재료 넣음"); whRefresh(); }
function whWdMat(m){ const q=P.stash.mats[m]||0; if(q<=0)return; P.mats[m]=(P.mats[m]||0)+q; P.stash.mats[m]=0; toast("재료 꺼냄"); whRefresh(); }
function whDepGold(){ if(P.gold<=0)return; const raw=prompt(`창고에 넣을 골드 (보유 ${P.gold}G):`, String(P.gold)); if(raw==null)return; const n=clamp(parseInt(raw,10)||0,0,P.gold); if(n<=0)return; P.gold-=n; P.stash.gold=(P.stash.gold||0)+n; toast(`골드 ${n} 넣음`); render(); whRefresh(); }
function whWdGold(){ const have=P.stash.gold||0; if(have<=0)return; const raw=prompt(`꺼낼 골드 (창고 ${have}G):`, String(have)); if(raw==null)return; const n=clamp(parseInt(raw,10)||0,0,have); if(n<=0)return; P.stash.gold-=n; P.gold+=n; toast(`골드 ${n} 꺼냄`); render(); whRefresh(); }
window.whDep=whDep; window.whWd=whWd; window.whDepPot=whDepPot; window.whWdPot=whWdPot;
window.whDepCons=whDepCons; window.whWdCons=whWdCons; window.whDepMat=whDepMat; window.whWdMat=whWdMat;
window.whDepGold=whDepGold; window.whWdGold=whWdGold;
function lifeMenu(){ regenStamina(); render(); clearLog(); setScene("🌲","생활의 터전 — 무엇을 단련할까.");
  line(`🌿 생활력 <b>${Math.floor(P.stamina)}/${STAM_MAX}</b> — 활동마다 ${STAM_COST} 소모 · ${stamEta()}`,"sys");
  line("숙련 <b>레벨이 오를 때마다</b> 정해진 스탯이 +1 오른다 (무작위 없음).","sys");
  if(P.stamina<STAM_COST) line("생활력이 부족하다. 시간이 지나면 서서히 회복된다.","dmg");
  Object.entries(LIFE).forEach(([k,a])=>{ const ls=P.life[k]; const got=(P.lifeStat&&P.lifeStat[a.stat])||0;
    line(`${a.emoji} <b>${a.n}</b> (Lv.${ls.lv}) — ${a.note}${got?` · 이 단련으로 ${STAT_NAME[a.stat]} <b>+${got}</b>`:""}`,"sys"); });
  const acts=Object.entries(LIFE).map(([k,a])=>({ label:`${a.emoji} ${a.n}`, desc:`Lv↑마다 ${STAT_NAME[a.stat]}+1 · ${MATS[a.mat][1]} · 🌿-${STAM_COST}`, disabled:P.stamina<STAM_COST, act:()=>doLife(k) }));
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function doLife(key){ const a=LIFE[key]; const ls=P.life[key];
  regenStamina(); if(P.stamina<STAM_COST){ toast("생활력이 부족하다"); lifeMenu(); return; } P.stamina-=STAM_COST;
  clearLog(); setScene(a.emoji, a.n+" 중…");
  ls.xp += 10+rnd(6); let lvups=0; while(ls.xp >= ls.lv*20){ ls.xp-=ls.lv*20; ls.lv++; lvups++; }
  const amt = 1 + rnd(1+Math.floor(ls.lv/2)) + (chance(0.10+LUKv()*0.01)?1:0);
  addMat(a.mat, amt);
  line(`${a.emoji} ${a.n}을(를) 했다. ${MATS[a.mat][0]} <b>${MATS[a.mat][1]} +${amt}</b>`,"loot");
  // 숙련도(레벨)가 오를 때마다 정해진 스탯이 확정 상승 — 무작위 없음
  if(lvups>0){ if(!P.lifeStat)P.lifeStat={}; P.stats[a.stat]+=lvups; P.lifeStat[a.stat]=(P.lifeStat[a.stat]||0)+lvups;
    line(`🔧 ${a.n} 숙련 <b>Lv.${ls.lv}</b> 달성! <b>${STAT_NAME[a.stat]} +${lvups}</b> (숙련 보상) · 채집량↑`,"heal"); checkTitleUnlocks(); }
  if(chance(0.05)){ P.gold+=5+rnd(10); line("작업 중 낡은 동전을 주웠다.","loot"); }
  render();
  setActions([{label:`${a.emoji} 한 번 더 (🌿-${STAM_COST})`,disabled:P.stamina<STAM_COST,act:()=>doLife(key)},{label:"🌲 다른 활동",act:lifeMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }

function canLearn(k){ const s=SKILLS[k]; if(hasSkill(k))return "owned";
  if(s.req.skill && !hasSkill(s.req.skill)) return "prereq";
  for(const st in s.req){ if(st==="skill")continue; if(P.stats[st] < s.req[st]) return "stat"; }
  if(P.gold < (s.cost.gold||0)) return "gold";
  for(const m in s.cost){ if(m==="gold")continue; if((P.mats[m]||0) < s.cost[m]) return "mat"; }
  return "ok"; }
function costText(s){ const parts=[]; if(s.cost.gold)parts.push(`💰${s.cost.gold}`);
  for(const m in s.cost){ if(m==="gold")continue; parts.push(`${MATS[m][0]}${s.cost[m]}`); } return parts.join(" "); }
function reqText(s){ const parts=Object.entries(s.req).filter(([k])=>k!=="skill").map(([st,v])=>`${STAT_NAME[st]} ${v}`);
  if(s.req.skill)parts.push(`선행: ${SKILLS[s.req.skill].n}`); return parts.join(", "); }
function skillMenu(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; render(); clearLog(); setScene("📖","수련관 — 전직 교관들이 기다린다.");
  line("배우고 싶은 계열의 <b>교관</b>을 찾아가자. 교관마다 전수하는 기술이 다르다.","sys");
  const acts=Object.entries(INSTRUCTORS).map(([key,ins])=>{ const learnable=ins.skills.filter(k=>canLearn(k)==="ok").length; const owned=ins.skills.filter(k=>hasSkill(k)).length;
    return { label:`${ins.emoji} ${ins.n}`, desc:`${ins.note} · 습득 ${owned}/${ins.skills.length}${learnable?` · 지금 배우기 ${learnable}`:""}`, act:()=>instructorMenu(key) }; });
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function instructorMenu(key){ if(enemy)return; const ins=INSTRUCTORS[key]; if(!ins){ skillMenu(); return; } clearLog(); setScene(ins.emoji, ins.n);
  line(`${ins.n}: <span class="quote">"${ins.note}. 조건을 갖췄다면 전수해 주지."</span>`);
  const acts=ins.skills.map(k=>{ const s=SKILLS[k]; const st=canLearn(k);
    const tag = st==="owned"?"✔ 보유": st==="ok"?"배우기 가능": st==="prereq"?"선행 필요": st==="stat"?"스탯 부족": st==="gold"?"골드 부족":"재료 부족";
    return { label:`${s.emoji} ${s.n} — ${tag}`, desc:`${s.desc} | 요구: ${reqText(s)} | 비용: ${costText(s)}`,
      disabled: st!=="ok", act:()=>{ learnSkill(k); instructorMenu(key); } }; });
  acts.push({label:"← 다른 교관",act:skillMenu},{label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
/* ✨ 커스텀 주문 영창 설정 — 한글만(숫자·기호·영어 X), 2~40자. 숙련 레벨↑ → 앞부분만 쳐도 발동 */
function editChant(k){ if(!SKILLS[k]){ return; }
  const cur=(typeof spellChant==="function")?spellChant(k):(SKILLS[k].chant||"");
  const v=prompt(`${SKILLS[k].n} 주문 영창을 정하세요.\n· 한글만 (숫자·기호·영어 X) · 2~40자\n· 숙련도가 오를수록 앞부분만 쳐도 발동해요.`, cur);
  if(v==null)return; const t=v.trim().replace(/\s+/g," "); const bare=t.replace(/\s/g,"");
  if(!/^[가-힣ㄱ-ㅎㅏ-ㅣ][가-힣ㄱ-ㅎㅏ-ㅣ\s]*$/.test(t) || bare.length<2 || bare.length>40){ toast("한글만 · 2~40자 (숫자·기호·영어 안 돼요)"); return; }
  if(!P.chants)P.chants={}; P.chants[k]=t; toast("영창 저장: "+SKILLS[k].n); if(typeof sfx==="function")sfx("loot"); save(true); skillWindow(); }
window.editChant=editChant;
/* 🏷 스킬→클래스 매핑 (수련관 교관 기준) · 스킬창 클래스별 정리에 사용 */
function skillClassOf(k){ if(typeof SKILLS!=="undefined"&&SKILLS[k]&&SKILLS[k].rare)return "rare";
  if(typeof INSTRUCTORS!=="undefined"){ for(const c in INSTRUCTORS){ if((INSTRUCTORS[c].skills||[]).includes(k))return c; } } return "etc"; }
const SKILL_CLASS_LABEL={warrior:"⚔️ 전사",hunter:"🏹 사냥꾼",rogue:"🗡️ 도적",mage:"🔮 마법",tamer:"🐺 조련",gambler:"🎲 도박",bard:"🎵 음유",rare:"🌟 희귀",etc:"✨ 기타"};
const SKILL_CLASS_ORDER=["warrior","hunter","rogue","mage","tamer","gambler","bard","rare","etc"];
let skillTab="equip";   // 📋 스킬창 탭(equip/active/passive/life)
function setSkillTab(t){ skillTab=t; skillWindow(); }
window.setSkillTab=setSkillTab;
/* 📋 스킬 창 (인벤 옆 버튼) — 상단 장착요약(툴팁) + 카테고리 탭 */
function skillWindow(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } const inDive=(mode==="dive"); if(!inDive){ stopAuctionTimer(); auction=null; mode="town"; }
  regenStamina(); render(); clearLog(); setScene("📋", inDive?"스킬 — 계단에서 장착 변경":"스킬 — 전투 스킬과 생활 스킬");
  const actives=P.skills.filter(k=>SKILLS[k]&&SKILLS[k].type==="active");
  const passives=P.skills.filter(k=>SKILLS[k]&&SKILLS[k].type==="passive");
  const skillCard=(k)=>{ const s=SKILLS[k]; const active=s.type==="active"; let eff="", xpbar="";
    const on = active ? P.loadout.includes(k) : true;   // 패시브는 배우면 항상 적용(슬롯 불필요)
    if(active){ const p=skillProf(k); const need=p.lv*30; eff=`Lv.${p.lv} · 효과 +${Math.round((skillMul(k)-1)*100)}% · 기력 ${s.mp}`;
      xpbar=`<div class="hpbar2 hp" style="height:6px;margin-top:3px"><i style="width:${Math.round(p.xp/need*100)}%"></i></div>`; }
    else eff="패시브 · 배우면 자동 적용";
    const btn = active
      ? (on ? `<button class="ibtn on" onclick="skillUnequip('${k}')">해제</button>` : `<button class="ibtn" onclick="skillEquip('${k}')">장착</button>`)
      : `<span class="chip" style="color:var(--good);border-color:#3a5a3f">자동</span>`;
    const badge = active ? (on?' <span style="color:var(--good);font-size:11px;font-weight:700">✔ 장착 중</span>':' <span style="color:var(--dim);font-size:11px">미장착</span>') : ' <span style="color:var(--good);font-size:11px">적용 중</span>';
    const isCast = active && typeof CAST_SPELLS!=="undefined" && CAST_SPELLS.includes(k);
    const chantRow = isCast ? `<div class="ge" style="color:#c9a9ff">✨ 영창: "${spellChant(k)}" <span style="color:var(--dim)">(앞 ${chantReqLen(k)}자~전체 아무 길이나 발동)</span></div>` : "";
    const chantBtn = isCast ? `<button class="ibtn" onclick="editChant('${k}')">✏️ 영창</button>` : "";
    const rowCls = !active ? 'eq' : (on ? 'eq' : 'skoff');
    return `<div class="grow ${rowCls}"><span class="emo" onclick="itemInfo('skill','${k}')" style="width:34px;height:34px;font-size:19px;cursor:pointer">${s.emoji}</span><div class="gmeta"><div class="gn">${s.n}${badge}</div><div class="ge">${s.desc}</div><div class="ge" style="color:var(--gold)">${eff}</div>${chantRow}${xpbar}</div><div class="gbtns">${btn}${chantBtn}</div></div>`; };
  const groupByClass=(arr)=>{ const g={}; arr.forEach(k=>{ const c=skillClassOf(k); (g[c]=g[c]||[]).push(k); }); return g; };
  const classSec=(title,arr,empty,cnt)=>{
    if(!arr.length)return `<div><div class="ih"><span>${title}</span><span class="cnt">${cnt}</span></div><div class="glist"><div class="inv-empty">${empty}</div></div></div>`;
    const g=groupByClass(arr);
    const inner=SKILL_CLASS_ORDER.filter(c=>g[c]&&g[c].length).map(c=>{
      const list=g[c].slice().sort((a,b)=>(P.loadout.includes(b)?1:0)-(P.loadout.includes(a)?1:0));   // 장착된 것 먼저
      return `<div class="skclass"><div class="skclabel">${SKILL_CLASS_LABEL[c]||"✨"} <i>${g[c].length}</i></div><div class="glist">${list.map(skillCard).join("")}</div></div>`;
    }).join("");
    return `<div><div class="ih"><span>${title}</span><span class="cnt">${cnt}</span></div>${inner}</div>`; };
  const sec=classSec;
  const lifeRows=Object.entries(LIFE).map(([key,a])=>{ const ls=P.life[key]; const need=ls.lv*20; const pct=Math.round(ls.xp/need*100); const got=(P.lifeStat&&P.lifeStat[a.stat])||0;
    return `<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">${a.emoji}</span><div class="gmeta"><div class="gn">${a.n} <span style="color:var(--dim);font-size:11px">Lv.${ls.lv}</span>${got?` <span style="color:var(--good);font-size:11px">${STAT_NAME[a.stat]} +${got}</span>`:""}</div><div class="ge">Lv↑마다 ${STAT_NAME[a.stat]}+1 · ${MATS[a.mat][1]} · 숙련 ${ls.xp}/${need}</div><div class="hpbar2 mp" style="height:6px;margin-top:3px"><i style="width:${pct}%"></i></div></div></div>`; }).join("");
  const cap=activeCap(); const lifeSum=["str","int","dex","vit","luk"].map(s=>{ const v=(P.lifeStat&&P.lifeStat[s])||0; return v?`${STAT_NAME[s]}+${v}`:null; }).filter(Boolean).join(" · ");
  // 🎯 장착 스킬 칩 — 마우스 오버 시 정보 툴팁(무기처럼)
  const chipTip=(k)=>{ const s=SKILLS[k]; const pv=skillProf(k); return `${s.n} — ${(s.desc||'').replace(/"/g,'')} · Lv.${pv.lv} · 효과 +${Math.round((skillMul(k)-1)*100)}% · 기력 ${s.mp}`; };
  const eqChips=P.loadout.filter(k=>SKILLS[k]).map(k=>`<span class="buffchip skchip" title="${chipTip(k)}" onclick="itemInfo('skill','${k}')">${SKILLS[k].emoji} ${SKILLS[k].n} <span style="opacity:.6;font-size:10px">ⓘ</span></span>`).join("");
  const eqBar=`<div class="ih"><span>🎯 지금 장착한 스킬 <span style="color:var(--dim);font-size:11px;font-weight:400">(칩에 마우스 올리면 정보)</span></span><span class="cnt">${P.loadout.length}/${cap}</span></div><div class="ecbuffrow" style="margin:3px 0 9px">${eqChips||'<span style="color:var(--dim);font-size:12px">장착한 액티브 스킬이 없다 — 아래 탭에서 장착하세요</span>'}</div>`;
  // 클래스별 그룹(탭 본문용)
  const classGroups=(arr,empty)=>{ if(!arr.length)return `<div class="inv-empty">${empty}</div>`; const g=groupByClass(arr);
    return SKILL_CLASS_ORDER.filter(c=>g[c]&&g[c].length).map(c=>{ const list=g[c].slice().sort((a,b)=>(P.loadout.includes(b)?1:0)-(P.loadout.includes(a)?1:0));
      return `<div class="skclass"><div class="skclabel">${SKILL_CLASS_LABEL[c]||"✨"} <i>${g[c].length}</i></div><div class="glist">${list.map(skillCard).join("")}</div></div>`; }).join(""); };
  const st=["equip","active","passive","life"].includes(skillTab)?skillTab:"equip";
  const tabBar=`<div class="invtabs">`+[["equip","🎯 장착",P.loadout.length],["active","⚔️ 액티브",actives.length],["passive","🛡 패시브",passives.length],["life","🌲 생활",Object.keys(LIFE).length]]
    .map(([t,lab,n])=>`<button type="button" class="invtab ${st===t?'on':''}" onclick="setSkillTab('${t}')">${lab}${n?` <i>${n}</i>`:''}</button>`).join("")+`</div>`;
  const body = st==="equip" ? (P.loadout.filter(k=>SKILLS[k]).length?`<div class="glist">${P.loadout.filter(k=>SKILLS[k]).map(skillCard).join("")}</div>`:`<div class="inv-empty">장착한 액티브 스킬이 없다 — '⚔️ 액티브' 탭에서 장착하세요</div>`)
    : st==="active" ? `<div class="ge" style="color:var(--dim);margin-bottom:4px">액티브 슬롯 ${P.loadout.length}/${cap}${cap<SLOT_MAX?` · 🔵 마나 오브로 최대 ${SLOT_MAX}`:" (최대)"}</div>${classGroups(actives,"배운 액티브 스킬이 없다. 수련관·스킬북에서 배운다.")}`
    : st==="passive" ? `<div class="ge" style="color:var(--dim);margin-bottom:4px">패시브는 배우면 자동 적용 (슬롯 불필요)</div>${classGroups(passives,"배운 패시브 스킬이 없다.")}`
    : `<div class="ge" style="color:var(--dim);margin-bottom:4px">${lifeSum?"생활 누적 "+lifeSum:"채집할수록 Lv↑ · 정해진 스탯 상승"}</div><div class="glist">${lifeRows}</div>`;
  $("log").innerHTML=`<div class="invv">
    ${eqBar}
    ${tabBar}
    <div class="invtabbody">${body}</div>
  </div>`;
  setActions(inDive
    ? [{label:"← 탑으로 돌아가기",full:true,act:backToClimb}]
    : (typeof townReturn==="function"
        ? [{label:"← 돌아가기",full:true,act:townReturn},{label:"📖 수련관 (스킬 습득)",act:skillMenu},{label:"🏘 마을로",act:townMenu}]
        : [{label:"📖 수련관 (스킬 습득)",act:skillMenu},{label:"🏘 마을로",full:true,act:townMenu}])); }
window.skillEquip=k=>{ equipSkill(k); skillWindow(); };
window.skillUnequip=k=>{ unequipSkill(k); skillWindow(); };
function learnSkill(k){ if(canLearn(k)!=="ok"){ toast("조건이 부족하다"); return; } const s=SKILLS[k];
  P.gold-=s.cost.gold||0; for(const m in s.cost){ if(m==="gold")continue; P.mats[m]-=s.cost[m]; }
  P.skills.push(k);
  if(s.type==="active"){ skillProf(k); if(P.loadout.length<activeCap())P.loadout.push(k); }
  else if(P.passives.length<MAX_PASSIVE)P.passives.push(k);
  render(); line(`📖 <b>${s.n}</b> 습득! ${s.type==="active"?"전투에서 사용 · 쓸수록 숙련도↑.":"패시브 효과 적용."}${(s.type==="active"?P.loadout:P.passives).includes(k)?" (자동 장착)":" (슬롯 가득 — 스킬창에서 교체)"}`,"loot"); toast("스킬 습득: "+s.n); checkQuests(); }

