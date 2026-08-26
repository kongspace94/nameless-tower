"use strict";
/* ============================================================
   거점 마을
   ============================================================ */
function townMenu(){ mode="town"; enemy=null; B=null; stopAuctionTimer(); stopChatTimer(); auction=null; EXP=null; expReturn=null; P.buffs={};
  if(window.__fromMap){ window.__fromMap=false; if(typeof bgm==="function")bgm("town"); render(); townMap(); return; }   // 🗺 지도에서 들어간 건물을 나오면 지도로 복귀
  if(typeof bgm==="function")bgm("town"); if(typeof amb==="function")amb("town"); checkTitleUnlocks(); checkQuests();
  if(P._divePotBank){ P.potions+=P._divePotBank; P._divePotBank=0; }   // 다이브 때 마을에 맡겨둔 물약 회수
  P.hp=MAXHP(); P.mp=MAXMP(); render(); clearLog(); setScene("🏘️","거점 마을 — 준비를 갖추고 탑으로.");
  line("거점 마을. 탑에 오를 준비를 하자.","sys"); save(true);
  const contUnlocked = (P.flags.cleared||0)>0 || P.flags.continentUnlocked;
  setActions([
    {label:"🗺 마을 둘러보기 (지도)",desc:"걸어다니며 건물 방문 · 미리보기",full:true,act:townMap},
    {header:true,label:"⚔  모  험"},
    {label:"🗼 탑 등반",desc:"이름 없는 탑을 오른다 · 전투로 성장",full:true,act:startDive},
    contUnlocked
      ? {label:"🧭 대륙 개척",desc:"탑 너머의 대륙 · 더 강한 적 · 새로운 탑들",full:true,act:startExpedition}
      : {label:"🔒 대륙 개척",desc:"탑 정상(50층)에 도달하면 열린다",full:true,disabled:true,act:()=>{}},
    {header:true,label:"🏘  거점 마을"},
    {label:"🌲 생활 터전",desc:"채집 · 스탯 단련",act:lifeMenu},
    {label:"📖 수련관",desc:"스킬 습득",act:skillMenu},
    {label:"⚒️ 대장간",desc:"장비 강화 (+1, +2…)",act:blacksmithMenu},
    {label:"🔨 제작소",desc:"재료로 세트 장비·내성 제작",act:workshopMenu},
    {label:"🛒 잡화점",desc:"물약·재료·비약·마나 오브",act:generalStore},
    {label:"🛡 장비 상점",desc:"무기·방어구 구매",act:gearShop},
    {label:"🏦 창고 (은행)",desc:`가방↔창고 보관 · 창고 ${stashCount()}칸`,act:warehouseMenu},
    {label:"📦 통신판매 (캐쉬샵)",desc:P.flags.welcomeClaimed?"특별 상품 (준비 중)":"🎁 웰컴 스타터팩 무료!",act:cashShop},
    {label:"🏛 길드하우스",desc:`의뢰 수락 · 진행 ${Object.keys(P.quests).filter(id=>P.quests[id].status==="active").length} · 완료 ${Object.keys(P.quests).filter(id=>P.quests[id].status==="done").length}`,act:guildHouse},
    {label:"🏛 경매장",desc:"재료·유물 거래",act:openAuction},
    contUnlocked
      ? {label:"⛺ 부족 거점",desc:`일꾼 자동 채집 · 슬롯 ${(P.farm&&P.farm.slots.length)||0}칸`,act:farmMenu}
      : {label:"🔒 부족 거점",desc:"대륙 개척을 열면 세울 수 있다 (일꾼 자동 채집)",disabled:true,act:()=>{}},
    {label:`🌌 회귀의 제단`,desc:`메아리 ✦${(P.meta&&P.meta.echoes)||0} · 회귀 ${(P.meta&&P.meta.runs)||0}회 · 영구 강화`,act:altarMenu},
  ]);
  startTownChat(); }   // 상시 광장 채팅 독
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
  render(); clearLog(); setScene("🗺️","거점 마을 — 가고 싶은 곳을 누르면 걸어가요.");
  const contUnlocked=(P.flags.cleared||0)>0||P.flags.continentUnlocked;
  const blds=[
    {emo:"🗼",label:"탑",x:50,y:14,act:startDive,hi:"탑에 오른다…"},
    {emo:"🛡️",label:"장비상점",x:15,y:34,act:gearShop,hi:"어서오세요, 손님!"},
    {emo:"⚒️",label:"대장간",x:33,y:28,act:blacksmithMenu,hi:"강화해 줄까?"},
    {emo:"🔨",label:"제작소",x:18,y:60,act:workshopMenu,hi:"뭘 만들어볼까?"},
    {emo:"🛒",label:"잡화점",x:40,y:56,act:generalStore,hi:"물약 필요해요?"},
    {emo:"🏦",label:"창고",x:67,y:32,act:warehouseMenu,hi:"맡기실 건가요?"},
    {emo:"🏛️",label:"경매장",x:82,y:52,act:openAuction,hi:"좋은 매물 많아요"},
    {emo:"🛖",label:"길드",x:63,y:70,act:guildHouse,hi:"의뢰 보러 왔나?"},
    {emo:"🌲",label:"생활터전",x:88,y:26,act:lifeMenu,hi:"오늘도 수고!"},
    {emo:"📖",label:"수련관",x:10,y:78,act:skillMenu,hi:"수련하러 왔군"},
    {emo:"🌌",label:"제단",x:44,y:82,act:altarMenu,hi:"돌아왔는가…"},
  ];
  if(contUnlocked)blds.push({emo:"⛺",label:"부족거점",x:72,y:80,act:farmMenu,hi:"일꾼들이 반겨요"});
  const glyph=(P.avatar&&typeof isImgAvatar==="function"&&isImgAvatar(P.avatar))?`<img src="${P.avatar}" alt="">`:(P.avatar||"🧝");
  $("log").innerHTML=`<div class="townmap" id="townmap">
    <canvas class="tmcanvas" id="tmcanvas"></canvas>
    ${blds.map((b,i)=>`<button type="button" class="tmhit" data-i="${i}" tabindex="-1" title="${b.label}" style="left:${b.x}%;top:${b.y}%"></button>`).join("")}
    <div class="tmothers" id="tmothers"></div>
    <div class="tmplayer" id="tmplayer" style="left:47%;top:70%">${glyph}</div>
    <div class="tmhint">🖱 건물을 누르면 걸어가서 이용해요</div></div>`;
  const map=$("townmap"), pl=$("tmplayer"), cv=$("tmcanvas"); let walking=false;
  const drawIt=()=>{ try{ drawTownCanvas(cv, blds); }catch(e){} };
  drawIt(); setTimeout(drawIt,0); if(typeof requestAnimationFrame==="function")requestAnimationFrame(drawIt);   // 즉시+다음틱+rAF (레이아웃 준비 시점 어디서든 확실히 그려지게)
  if(typeof startTownPresence==="function")startTownPresence(map, blds);   // 👥 다른 온라인 유저 표시(온라인일 때)
  map.querySelectorAll(".tmhit").forEach(btn=>{ btn.onmousedown=(e)=>e.preventDefault();   // 포커스 훔쳐 페이지 스크롤되는 것 방지
    btn.onclick=(e)=>{ e.stopPropagation(); if(walking||!pl)return; const b=blds[+btn.dataset.i];
    const px=parseFloat(pl.style.left)||47, py=parseFloat(pl.style.top)||70, tx=b.x, ty=b.y+9;   // 문 앞까지
    const dist=Math.hypot(tx-px,ty-py), dur=Math.max(260,Math.round(dist*24)); walking=true;
    pl.classList.toggle("faceleft", tx<px-0.5);   // 🔄 걷는 방향 좌우 뒤집기
    pl.style.transition=`left ${dur}ms ease-in-out, top ${dur}ms ease-in-out`; pl.classList.add("walking");
    pl.style.left=tx+"%"; pl.style.top=ty+"%";
    if(P._online&&typeof netTownPos==="function")netTownPos(tx,ty).catch(()=>{});   // 👥 내 이동을 다른 유저에게 브로드캐스트
    const stepT=setInterval(()=>{ if(typeof sfx==="function")sfx("step"); }, 260);   // 🚶 발소리
    setTimeout(()=>{ clearInterval(stepT); pl.classList.remove("walking"); walking=false;
      const bub=document.createElement("div"); bub.className="tmbubble"; bub.textContent=b.hi||(b.label+" 도착!"); bub.style.left=tx+"%"; bub.style.top=(ty-7)+"%"; map.appendChild(bub);   // 💬 도착 인사말
      setTimeout(()=>{ try{ bub.remove(); }catch(e){} }, 900);
      window.__fromMap = (b.act!==startDive);   // 상점류는 나갈 때 지도로 복귀(탑 등반은 예외)
      if(typeof stopTownPresence==="function")stopTownPresence();
      if(typeof sfx==="function")sfx("click"); setTimeout(()=>b.act(), 260); }, dur+60); }; });
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
    <div class="cropbtns"><button type="button" class="cropbtn cropcancel">취소</button><button type="button" class="cropbtn cropok">✅ 적용</button></div>
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
const UP_MAX=10;
function upCostGold(up){ return 25 + up*20; }
function upCostMat(it){ const g=RELICS[it.k]; return (g.slot==="ring"||g.slot==="amulet")?"mana":"ore"; }
function upCostMatN(up){ return 2 + up; }
function upChance(up){ return clamp(0.90 - up*0.09, 0.30, 0.90); }
function upStatText(it){ const st=gearMainStat(RELICS[it.k]); return st==="atk"?"공격":st==="def"?"방어":"행운"; }
function itemStatVal(it,extra){ const g=RELICS[it.k]; const up=(it.up||0)+(extra||0); const st=gearMainStat(g); return (g[st]||0)+up; }
function bsFind(id){ let it=P.inv.find(x=>x.id===id); if(it)return it; it=((P.stash&&P.stash.inv)||[]).find(x=>x.id===id); return it||null; }
function bsGearList(){ const bag=P.inv.filter(it=>RELICS[it.k]&&RELICS[it.k].slot).map(it=>({it,loc:"bag"}));
  const stash=((P.stash&&P.stash.inv)||[]).filter(it=>RELICS[it.k]&&RELICS[it.k].slot).map(it=>({it,loc:"stash"})); return [...bag,...stash]; }
function blacksmithMenu(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
  setScene("⚒️","대장간 — 대장장이 고르드가 망치를 든다.");
  line('고르드: <span class="quote">"강화할 장비를 고르게. 가방이든 창고든, 착용 여부와 상관없이 다 강화해주지. 강화 전·후 능력치를 보여주겠네."</span>');
  const gear=bsGearList();
  if(gear.length===0){ line("강화할 장비가 없다. (탑·경매장에서 얻는다)","sys"); setActions([{label:"🏘 마을로",full:true,act:townMenu}]); return; }
  line("강화할 장비 선택 — 🎒 가방 / 🏦 창고로 구분돼 있어요.","sys");
  const bag=gear.filter(o=>o.loc==="bag"), stash=gear.filter(o=>o.loc==="stash");
  const mk=({it,loc})=>{ const up=it.up||0, maxed=up>=UP_MAX; const where=isEquippedItem(it)?"착용중":loc==="stash"?"창고":"가방";
    return { label:`${it.k} +${up}`, desc:`📍${where}${maxed?" · 최대 강화":` · ${upStatText(it)} · 성공 ${Math.round(upChance(up)*100)}%`}`, act:()=>upgradePreview(it.id) }; };
  const acts=[];
  if(bag.length){ acts.push({label:"🎒 ─ 가방 ─",disabled:true,act:()=>{}}); bag.forEach(o=>acts.push(mk(o))); }
  if(stash.length){ acts.push({label:"🏦 ─ 창고 ─",disabled:true,act:()=>{}}); stash.forEach(o=>acts.push(mk(o))); }
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
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
  const mat=upCostMat(it), matN=upCostMatN(up), gold=upCostGold(up), ch=Math.round(upChance(up)*100), haveMat=P.mats[mat]||0;
  const itemNow=itemStatVal(it,0), itemNext=itemStatVal(it,1);
  const tag=equippedNow?'<span style="color:var(--good);font-size:11px">착용중</span>':'<span style="color:var(--dim);font-size:11px">미착용</span>';
  $("log").innerHTML=`<div class="invv">
    <div class="grow"><span>${ico(relicIco(it.k),42)}</span><div class="gmeta"><div class="gn">${it.k} <span style="color:var(--gold)">+${up}${maxed?'':` → +${up+1}`}</span> ${tag}</div><div class="ge">${g.note||''} · 이 장비 ${stat} <b>${itemNow}${maxed?'':` → ${itemNext}`}</b></div></div></div>
    <div><div class="ih"><span>강화 전 → 후 (이 장비 착용 기준)</span></div><div class="glist">${cmp("⚔ 공격",b.atk,a.atk)}${cmp("🛡 방어",b.def,a.def)}${cmp("🍀 행운",b.luk,a.luk)}</div></div>
    ${equippedNow?'':'<div class="ge" style="color:var(--mp)">※ 미착용 장비 — 착용해야 실제 능력치에 반영됩니다.</div>'}
    <div class="ge" style="margin-top:4px">${maxed?`<b>최대 강화(+${UP_MAX}) 도달</b>`:`성공 확률 <b>${ch}%</b> · 비용 ${MATS[mat][0]}${MATS[mat][1]} ${matN}<span style="color:${haveMat<matN?'var(--danger)':'var(--dim)'}">(보유 ${haveMat})</span> · 💰${gold}<span style="color:${P.gold<gold?'var(--danger)':'var(--dim)'}">(보유 ${P.gold})</span>`}</div>
    ${maxed?'':'<div class="ge" style="color:var(--danger)">⚠ 실패 시 재료·골드를 잃고 레벨은 유지됩니다.</div>'}
  </div>`;
  const can=!maxed && P.gold>=gold && haveMat>=matN;
  const reason= maxed?"": P.gold<gold?" · 골드 부족": haveMat<matN?` · ${MATS[mat][1]} 부족`:"";
  setActions([
    {label:maxed?"최대 강화 도달":`⚒️ 강화하기 (성공 ${ch}%)`, desc:maxed?"":`${MATS[mat][0]}${matN} · 💰${gold}${reason}`, disabled:!can, act:()=>doUpgradeSel(id)},
    {label:"← 다른 장비",act:blacksmithMenu},
    {label:"🏘 마을로",full:true,act:townMenu},
  ]); }
function doUpgradeSel(id){ const it=bsFind(id); if(!it||!RELICS[it.k]||!RELICS[it.k].slot)return; const up=it.up||0;
  if(up>=UP_MAX){ toast("이미 최대 강화"); return; }
  const mat=upCostMat(it), matN=upCostMatN(up), gold=upCostGold(up);
  if(P.gold<gold||(P.mats[mat]||0)<matN){ toast("비용 부족"); return; }
  P.gold-=gold; P.mats[mat]-=matN;
  if(chance(upChance(up))){ it.up=up+1; line(`⚒️ <b>${it.k}</b> 강화 성공! → <b>+${it.up}</b> (${upStatText(it)} +1)`,"loot"); toast("강화 성공! +"+it.up); fxOk(); }
  else { line(`⚒️ ${it.k} 강화 실패… 재료가 날아갔다. (레벨 유지)`,"dmg"); toast("강화 실패"); }
  render(); save(true); upgradePreview(id); }   // 같은 장비 상세로 복귀 → 연속 강화 가능
function fxOk(){ const s=$("stage"); if(s){ s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash"); } }
/* 🛒 잡화점 — 즉시 구매/판매 (경매장과 달리 고정가) */
/* 🛡 장비 상점 — 무기/방어구 구매 (기본 아이템 확보용) */
function gearShop(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
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
function generalStore(){ if(enemy)return; stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
  setScene("🛒","잡화점 — 상점주 미나가 반긴다.");
  line('미나: <span class="quote">"어서 와요! 물약이든 재료든, 사고파는 건 여기서."</span>');
  setActions([{label:"🛒 구매",desc:"물약·재료·비약·마나 오브",act:storeBuy},{label:"💰 판매 (즉시)",desc:"장비·재료를 바로 현금화",act:storeSell},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 📦 통신판매 (캐쉬샵) — 무료 웰컴 스타터팩 + 추후 캐쉬 아이템 */
function cashShop(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; render(); clearLog();
  setScene("📦","통신판매 — 캐쉬샵 배송함.");
  line('안내원: <span class="quote">"신규 모험가님께 웰컴 스타터팩을 무료로 배송해 드려요! 난이도가 버겁다면 꼭 받으세요."</span>');
  const claimed=!!P.flags.welcomeClaimed;
  const acts=[
    {label:`🎁 웰컴 스타터팩 ${claimed?"(수령 완료)":"— 0원"}`,desc:"입문자 장검·갑옷·반지 (성능 준수 · 난이도 완화)",disabled:claimed,act:claimWelcome},
    {label:"🔒 프리미엄 상품 (준비 중)",desc:"추후 캐쉬 아이템 · 원격 창고 소환 등",disabled:true,act:()=>{}},
    {label:"🏘 마을로",full:true,act:townMenu},
  ];
  setActions(acts); }
function claimWelcome(){ if(P.flags.welcomeClaimed)return; P.flags.welcomeClaimed=true;
  clearLog(); setScene("🎁","웰컴 스타터팩 개봉!");
  ["입문자의 장검","입문자의 갑옷","입문자의 반지"].forEach(n=>addRelic(n));
  P.gems=(P.gems||0)+10;
  line("📦 웰컴 스타터팩 도착! 입문자 장비 3종 + 💎 크리스탈 10을 받았다. (빈 슬롯은 자동 착용)","loot"); toast("웰컴팩 수령");
  save(true);
  setActions([{label:"📦 통신판매로",act:cashShop},{label:"🏘 마을로",full:true,act:townMenu}]); }
function shopReset(){ const d=new Date().toDateString(); if(P.shopDay!==d){ P.shopDay=d; P.shopBought={}; } }
function shopLeft(key,cap){ shopReset(); return Math.max(0, cap-(P.shopBought[key]||0)); }
function storeBuy(){ shopReset(); clearLog(); setScene("🛒","무엇을 살까?");
  line(`보유 금화 💰 <b>${P.gold}</b> · 구매엔 <b>하루 제한</b>이 있어요 (날짜 바뀌면 초기화)`,"sys");
  const items=[{key:"potion",label:"🧪 물약",price:60,cap:20,desc:"HP 25 회복",buy:()=>{P.potions++;}}];
  for(const [mk,[e,nm]] of Object.entries(MATS)) items.push({key:"mat_"+mk,label:`${e} ${nm}`,price:45,cap:99,desc:"제작·강화 재료",buy:()=>addMat(mk,1)});
  for(const [k,c] of Object.entries(CONS)){ if(c.use==="learn"||c.use==="slot")continue; items.push({key:k,label:`${c.emoji} ${c.n}`,price:c.val||100,cap:3,desc:c.note,buy:()=>gainCons(k)}); }
  const acts=items.map(o=>{ const left=shopLeft(o.key,o.cap);
    return {label:`${o.label} — ${o.price}G`,desc:`${o.desc} · 오늘 ${left>0?`${left}개 남음`:"소진"}`,disabled:P.gold<o.price||left<=0,
      act:()=>{ if(shopLeft(o.key,o.cap)<=0){ toast("오늘 구매 한도 초과"); return; } if(P.gold<o.price){ toast("금화 부족"); return; }
        P.gold-=o.price; o.buy(); P.shopBought[o.key]=(P.shopBought[o.key]||0)+1; render(); toast("구매: "+o.label); storeBuy(); }}; });
  acts.push({label:"← 뒤로",full:true,act:generalStore}); setActions(acts); }
function storeSell(){ clearLog(); setScene("💰","무엇을 팔까? (즉시 현금화)"); line(`보유 금화 💰 <b>${P.gold}</b>`,"sys");
  const acts=[];
  P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key&&!isEquippedItem(it)).forEach(it=>{
    const price=Math.round((RELICS[it.k].val||40)*0.5)+(it.up||0)*15;
    acts.push({label:`${it.k}${it.up?' +'+it.up:''}`,desc:`+${price}G · 미착용 장비`,
      act:()=>{ const j=P.inv.indexOf(it); if(j<0)return; P.inv.splice(j,1); P.gold+=price; render(); checkQuests(); toast("판매 +"+price+"G"); storeSell(); }}); });
  for(const [mk,[e,nm]] of Object.entries(MATS)){ const n=P.mats[mk]||0; if(n>0)acts.push({label:`${e} ${nm} ×${n}`,desc:`+${n*4}G`,
    act:()=>{ P.gold+=n*4; P.mats[mk]=0; render(); checkQuests(); toast("재료 판매"); storeSell(); }}); }
  if(acts.length===0)acts.push({label:"팔 물건이 없다 (미착용 장비·재료)",disabled:true,act:()=>{}});
  acts.push({label:"← 뒤로",full:true,act:generalStore}); setActions(acts); }
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
    return { label:`📜 ${q.n}`, desc:`${q.desc} → 보상 ${rewardText(q.reward)}`, act:()=>{ acceptQuest(id); toast("의뢰 수락: "+q.n); guildCategory(cat); } }; });
  acts.push({label:"← 다른 종류",act:guildMasterMenu},{label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
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
  if(P._online && typeof netChatHistory==="function"){   // 🌐 온라인: 진짜 광장 채팅(SSE)
    const myNick=()=>NET.nick||NET.name;   // 채팅 표시명은 닉네임 기준으로 '나' 판별
    NET.onChat=(m)=>{ chatLog.push({name:m.name,av:m.av,text:m.text,me:(m.name===myNick()),ts:m.ts}); if(chatLog.length>60)chatLog=chatLog.slice(-60); renderChatDock(); };
    NET.onPresence=(n)=>{ const el=$("cdonline"); if(el)el.textContent=n+"명 접속"; };
    netChatHistory().then(msgs=>{ chatLog=msgs.map(m=>({name:m.name,av:m.av,text:m.text,me:(m.name===myNick()),ts:m.ts})); renderChatDock(); }).catch(()=>{});
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
function codexMenu(){ if(enemy){ toast("전투 중엔 볼 수 없다"); return; } const inDive=(mode==="dive"); if(!inDive){ stopAuctionTimer(); auction=null; mode="town"; } render(); clearLog(); setScene("📖","도감 — 수집한 장비");
  const all=Object.keys(RELICS).filter(k=>RELICS[k].slot); const seen=k=>!!(P.codex&&P.codex[k]);
  const got=all.filter(seen).length; const order=["신화","전설","희귀","고급","일반"];
  const groups={}; order.forEach(o=>groups[o]=[]); all.forEach(k=>groups[itemRarity(RELICS[k]).n].push(k));
  const rcol={"신화":"#ff8f3c","전설":"#e8c56a","희귀":"#a98bff","고급":"#8fd0ff","일반":"#9aa4b8"};
  let html=`<div class="dexhead">📖 수집 <b>${got}</b> / ${all.length} <span class="dexpct">(${Math.round(got/all.length*100)}%)</span></div>`;
  order.forEach(o=>{ const list=groups[o]; if(!list.length)return;
    html+=`<div class="dexgrp" style="color:${rcol[o]}">${o} <span>${list.filter(seen).length}/${list.length}</span></div><div class="dexlist">`;
    list.sort((a,b)=>(RELICS[b].val||0)-(RELICS[a].val||0)).forEach(k=>{ const g=RELICS[k];
      html+= seen(k)
        ? `<div class="dexrow"><span class="dxic">${ico(relicIco(k),26)}</span><div class="dxm"><div class="dxn">${k} <span class="dxslot">${SLOT_LABEL[g.slot]||""}</span></div><div class="dxd">${g.note||""}</div><div class="dxsrc">📍 ${itemSource(k)} · 판매가 ${g.val||0}G</div></div></div>`
        : `<div class="dexrow lock"><span class="dxic">🔒</span><div class="dxm"><div class="dxn">??? <span class="dxslot">${SLOT_LABEL[g.slot]||""}</span></div><div class="dxd">미발견</div><div class="dxsrc">📍 ${itemSource(k)}</div></div></div>`;
    }); html+=`</div>`; });
  $("log").innerHTML=`<div class="dexwrap">${html}</div>`; const lg=$("log"); if(lg)lg.scrollTop=0;
  setActions([{label:"← 닫기",full:true,act:()=> inDive?backToClimb():townMenu()}]); }
/* 🔨 제작소 — 재료+금화로 세트 장비·내성 아이템 제작 */
function craftGearCost(k){ const v=RELICS[k].val||300; return {gold:Math.round(v*0.7), mats:{ore:Math.max(3,Math.round(v/130)), mana:Math.max(2,Math.round(v/220))}}; }
function craftConsCost(k){ const v=CONS[k].val||150; return {gold:Math.round(v*0.6), mats:{herb:Math.max(2,Math.round(v/90))}}; }
function canAfford(cost){ if(P.gold<cost.gold)return false; for(const m in cost.mats){ if((P.mats[m]||0)<cost.mats[m])return false; } return true; }
function payCost(cost){ P.gold-=cost.gold; for(const m in cost.mats)P.mats[m]=Math.max(0,(P.mats[m]||0)-cost.mats[m]); }
function craftCostText(cost){ let s=`💰${cost.gold}`; for(const m in cost.mats)s+=` ${MATS[m][0]}${cost.mats[m]}`; return s; }
function workshopMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; render(); clearLog(); setScene("🔨","제작소 — 재료로 장비를 만든다");
  line(`보유 💰 <b>${P.gold}</b> · 재료 ${Object.entries(MATS).map(([k,[e]])=>`${e}${P.mats[k]||0}`).join(" ")}`,"sys");
  const acts=[];
  for(const sk in SETS){ acts.push({header:true,label:`✦ ${SETS[sk].n}`});
    Object.keys(RELICS).filter(k=>RELICS[k].set===sk).forEach(k=>{ const cost=craftGearCost(k); const owned=P.inv.some(x=>x.k===k)||((P.stash&&P.stash.inv)||[]).some(x=>x.k===k);
      acts.push({label:`${owned?"✅ ":""}${k}`,desc:`${RELICS[k].note} · ${craftCostText(cost)}`,disabled:!canAfford(cost),act:()=>craftGear(k)}); }); }
  acts.push({header:true,label:"🧪 지역 내성 아이템"});
  Object.keys(CONS).filter(k=>CONS[k].use==="resist").forEach(k=>{ const cost=craftConsCost(k);
    acts.push({label:`${CONS[k].emoji} ${CONS[k].n}`,desc:`${CONS[k].note} · ${craftCostText(cost)}`,disabled:!canAfford(cost),act:()=>craftCons(k)}); });
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
  const gearRows = owned.length ? owned.map(({it,i})=>{ const g=RELICS[it.k]; const equipped=isEquippedItem(it);
    return `<div class="grow ${equipped?'eq':''}"><span onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${ico(relicIco(it.k),34)}</span><div class="gmeta"><div class="gn" onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${it.k}${it.up?` <span style="color:var(--gold)">+${it.up}</span>`:''}${equipped?' <span style="color:var(--good);font-size:11px">착용중</span>':''} <span style="color:var(--dim);font-size:11px">ⓘ</span></div><div class="ge"><span class="gtype">${gearTypeLabel(g)}</span> · ${g.note} · ${g.val}G</div></div>`+
      `<div class="gbtns">${equipped?`<button class="ibtn on" onclick="invUnequip('${g.slot}')">해제</button>`:`<button class="ibtn" onclick="invEquip(${i})">착용</button>`}<button class="ibtn del" onclick="invDrop(${i})">버리기</button></div></div>`; }).join("")
    : `<div class="inv-empty">보유한 장비가 없다. 탑·경매장에서 얻는다.</div>`;
  // 소비품
  const consRows = [`<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">🧪</span><div class="gmeta"><div class="gn">물약 <b>×${P.potions}</b></div><div class="ge">HP 25 회복</div></div><div class="gbtns"><button class="ibtn" ${P.potions<=0?'disabled':''} onclick="invPotion()">사용</button></div></div>`]
    .concat(Object.entries(P.consumables||{}).filter(([,q])=>q>0).map(([key,q])=>{ const c=CONS[key]; if(!c)return"";
      return `<div class="grow"><span class="emo" onclick="itemInfo('cons','${key}')" style="width:34px;height:34px;font-size:19px;cursor:pointer">${c.emoji}</span><div class="gmeta"><div class="gn" onclick="itemInfo('cons','${key}')" style="cursor:pointer">${c.n} <b>×${q}</b> <span style="color:var(--dim);font-size:11px">ⓘ</span></div><div class="ge">${c.note}</div></div><div class="gbtns"><button class="ibtn" onclick="invUse('${key}')">사용</button></div></div>`; })).join("");
  // 재료
  const mats = Object.entries(MATS).map(([k,[e,nm]])=>`<div class="mcell"><div class="me">${e}</div><div class="mq">${P.mats[k]||0}</div><div class="mn">${nm}</div></div>`).join("");
  // 퀘스트 아이템
  const quest = (P.questItems&&P.questItems.length) ? P.questItems.map(n=>`<span class="chip" style="cursor:pointer" onclick="itemInfo('quest','${n}')">🗝 ${n} ⓘ</span>`).join("") : `<div class="inv-empty">없음</div>`;
  const buffLine = (P.buffs&&Object.keys(P.buffs).some(k=>P.buffs[k])) ? `<div class="ge" style="margin-top:6px;color:var(--mp)">활성 버프: ${P.buffs.atkPct?`공격 +${Math.round(P.buffs.atkPct*100)}% `:''}${P.buffs.magicPct?`마법 +${Math.round(P.buffs.magicPct*100)}% `:''}${P.buffs.critBonus?`치명 +${Math.round(P.buffs.critBonus*100)}% `:''}${P.buffs.defBonus?`방어 +${P.buffs.defBonus}`:''}</div>`:"";
  $("log").innerHTML = `<div class="invv">
    <div><div class="ih"><span>착용 중</span><span class="cnt">⚔+${b.atk} 🛡+${b.def} 🍀+${b.luck}${b.vamp?' 🩸':''}</span></div><div class="glist">${slotRow}</div></div>
    ${setHtml?`<div><div class="ih"><span>✦ 세트 효과</span></div><div class="glist">${setHtml}</div></div>`:""}
    <div><div class="ih"><span>보유 장비</span><span class="cnt">${owned.length}</span></div><div class="glist">${gearRows}</div></div>
    <div><div class="ih"><span>소비품</span></div><div class="glist">${consRows}</div>${buffLine}</div>
    <div><div class="ih"><span>재료</span></div><div class="mgrid">${mats}</div></div>
    <div><div class="ih"><span>퀘스트 아이템</span></div><div class="statchips">${quest}</div></div>
  </div>`;
  setActions(inDive
    ? [{label:"← 탑으로 돌아가기",full:true,act:backToClimb}]
    : [{label:"🏛 경매장에서 팔기",act:openAuction},{label:"🏘 마을로",full:true,act:townMenu}]); }
/* 🏦 창고 (은행) — 마을 보관함. 가방(개인 소지품)↔창고 이동. 탑에서는 접근 불가(추후 캐쉬 아이템으로 원격 개방 예정). */
function stashCount(){ if(!P||!P.stash)return 0; const s=P.stash; let n=(Array.isArray(s.inv)?s.inv.length:0)+(s.potions||0);
  for(const m in (s.mats||{}))n+=s.mats[m]||0; for(const k in (s.consumables||{}))n+=s.consumables[k]||0; return n; }
function warehouseMenu(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } stopAuctionTimer(); auction=null; mode="town"; render(); setScene("🏦","창고 — 마을 보관함");
  const st=P.stash;
  const gearRow=(it,where)=>{ const g=RELICS[it.k]||{}; const eq=(where==="bag")&&isEquippedItem(it);
    const btn = where==="bag"
      ? `<button class="ibtn" onclick="whDep(${it.id})">맡기기${eq?' (해제)':''}</button>`
      : `<button class="ibtn on" onclick="whWd(${it.id})">찾기</button>`;
    return `<div class="grow"><span onclick="itemInfo('gear','${it.k}')" style="cursor:pointer">${ico(relicIco(it.k),30)}</span><div class="gmeta"><div class="gn">${it.k}${it.up?` <span style="color:var(--gold)">+${it.up}</span>`:''}</div><div class="ge">${g.note||''}</div></div><div class="gbtns">${btn}</div></div>`; };
  const stackRow=(emoji,name,q,where,fn)=>`<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">${emoji}</span><div class="gmeta"><div class="gn">${name} <b>×${q}</b></div></div><div class="gbtns"><button class="ibtn ${where==='bag'?'':'on'}" onclick="${fn}">${where==='bag'?'맡기기':'찾기'}</button></div></div>`;
  const bagRows=[];
  P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key).forEach(it=>bagRows.push(gearRow(it,"bag")));
  if(P.potions>0)bagRows.push(stackRow("🧪","물약",P.potions,"bag","whDepPot()"));
  Object.entries(P.consumables||{}).filter(([,q])=>q>0).forEach(([k,q])=>{ const c=CONS[k]; if(c)bagRows.push(stackRow(c.emoji,c.n,q,"bag",`whDepCons('${k}')`)); });
  Object.entries(MATS).forEach(([m,[e,nm]])=>{ const q=P.mats[m]||0; if(q>0)bagRows.push(stackRow(e,nm,q,"bag",`whDepMat('${m}')`)); });
  const stRows=[];
  st.inv.filter(it=>RELICS[it.k]).forEach(it=>stRows.push(gearRow(it,"stash")));
  if((st.potions||0)>0)stRows.push(stackRow("🧪","물약",st.potions,"stash","whWdPot()"));
  Object.entries(st.consumables||{}).filter(([,q])=>q>0).forEach(([k,q])=>{ const c=CONS[k]; if(c)stRows.push(stackRow(c.emoji,c.n,q,"stash",`whWdCons('${k}')`)); });
  Object.entries(MATS).forEach(([m,[e,nm]])=>{ const q=st.mats[m]||0; if(q>0)stRows.push(stackRow(e,nm,q,"stash",`whWdMat('${m}')`)); });
  const goldBag=`<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">🪙</span><div class="gmeta"><div class="gn">골드 <b>${P.gold}G</b></div></div><div class="gbtns"><button class="ibtn" ${P.gold<=0?'disabled':''} onclick="whDepGold()">맡기기</button></div></div>`;
  const goldStash=`<div class="grow"><span class="emo" style="width:30px;height:30px;font-size:17px">🪙</span><div class="gmeta"><div class="gn">보관 골드 <b>${st.gold||0}G</b></div></div><div class="gbtns"><button class="ibtn on" ${(st.gold||0)<=0?'disabled':''} onclick="whWdGold()">찾기</button></div></div>`;
  $("log").innerHTML=`<div class="invv">
    <div class="ge" style="color:var(--dim);margin-bottom:2px">🎒 가방 = 탑에 들고 가는 개인 소지품 · 🏦 창고 = 마을에서만 꺼내는 보관함 (골드도 보관 가능)</div>
    <div><div class="ih"><span>🎒 가방 → 창고 (맡기기)</span><span class="cnt">${bagRows.length}</span></div><div class="glist">${goldBag}${bagRows.join("")}</div></div>
    <div><div class="ih"><span>🏦 창고 → 가방 (찾기)</span><span class="cnt">${stashCount()}칸 · ${st.gold||0}G</span></div><div class="glist">${goldStash}${stRows.length?stRows.join(""):`<div class="inv-empty">창고에 아이템이 없다.</div>`}</div></div>
  </div>`;
  setActions([{label:"🎒 소지품 열기",act:inventoryMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }
function whDep(id){ const i=P.inv.findIndex(x=>x.id===id); if(i<0)return; const it=P.inv[i];
  const g=RELICS[it.k]; const wasEq=g&&g.slot&&P.equip[g.slot]===it.id; if(wasEq)P.equip[g.slot]=null;   // 착용 중이면 해제 후 보관
  P.inv.splice(i,1); P.stash.inv.push(it); toast(wasEq?"해제 후 창고에 맡김":"창고에 맡김"); render(); warehouseMenu(); }
function whWd(id){ const i=P.stash.inv.findIndex(x=>x.id===id); if(i<0)return; const it=P.stash.inv[i]; P.stash.inv.splice(i,1); P.inv.push(it); toast("가방으로 꺼냄"); warehouseMenu(); }
function whDepPot(){ if(P.potions<=0)return; P.stash.potions=(P.stash.potions||0)+P.potions; P.potions=0; toast("물약 맡김"); warehouseMenu(); }
function whWdPot(){ if((P.stash.potions||0)<=0)return; P.potions+=P.stash.potions; P.stash.potions=0; toast("물약 찾음"); warehouseMenu(); }
function whDepCons(k){ const q=P.consumables[k]||0; if(q<=0)return; P.stash.consumables[k]=(P.stash.consumables[k]||0)+q; delete P.consumables[k]; toast("맡김"); warehouseMenu(); }
function whWdCons(k){ const q=P.stash.consumables[k]||0; if(q<=0)return; P.consumables[k]=(P.consumables[k]||0)+q; delete P.stash.consumables[k]; toast("찾음"); warehouseMenu(); }
function whDepMat(m){ const q=P.mats[m]||0; if(q<=0)return; P.stash.mats[m]=(P.stash.mats[m]||0)+q; P.mats[m]=0; toast("재료 맡김"); warehouseMenu(); }
function whWdMat(m){ const q=P.stash.mats[m]||0; if(q<=0)return; P.mats[m]=(P.mats[m]||0)+q; P.stash.mats[m]=0; toast("재료 찾음"); warehouseMenu(); }
function whDepGold(){ if(P.gold<=0)return; const raw=prompt(`창고에 맡길 골드 (보유 ${P.gold}G):`, String(P.gold)); if(raw==null)return; const n=clamp(parseInt(raw,10)||0,0,P.gold); if(n<=0)return; P.gold-=n; P.stash.gold=(P.stash.gold||0)+n; toast(`골드 ${n} 맡김`); render(); warehouseMenu(); }
function whWdGold(){ const have=P.stash.gold||0; if(have<=0)return; const raw=prompt(`찾을 골드 (창고 ${have}G):`, String(have)); if(raw==null)return; const n=clamp(parseInt(raw,10)||0,0,have); if(n<=0)return; P.stash.gold-=n; P.gold+=n; toast(`골드 ${n} 찾음`); render(); warehouseMenu(); }
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
/* 📋 스킬 창 (인벤 옆 버튼) — 액티브/패시브 + 생활 스킬 카테고리 */
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
    const badge = active ? (on?' <span style="color:var(--good);font-size:11px">장착</span>':'') : ' <span style="color:var(--good);font-size:11px">적용 중</span>';
    return `<div class="grow ${on?'eq':''}"><span class="emo" onclick="itemInfo('skill','${k}')" style="width:34px;height:34px;font-size:19px;cursor:pointer">${s.emoji}</span><div class="gmeta"><div class="gn">${s.n}${badge}</div><div class="ge">${s.desc}</div><div class="ge" style="color:var(--gold)">${eff}</div>${xpbar}</div><div class="gbtns">${btn}</div></div>`; };
  const sec=(title,arr,empty,cnt)=> `<div><div class="ih"><span>${title}</span><span class="cnt">${cnt}</span></div><div class="glist">${arr.length?arr.map(skillCard).join(""):`<div class="inv-empty">${empty}</div>`}</div></div>`;
  const lifeRows=Object.entries(LIFE).map(([key,a])=>{ const ls=P.life[key]; const need=ls.lv*20; const pct=Math.round(ls.xp/need*100); const got=(P.lifeStat&&P.lifeStat[a.stat])||0;
    return `<div class="grow"><span class="emo" style="width:34px;height:34px;font-size:19px">${a.emoji}</span><div class="gmeta"><div class="gn">${a.n} <span style="color:var(--dim);font-size:11px">Lv.${ls.lv}</span>${got?` <span style="color:var(--good);font-size:11px">${STAT_NAME[a.stat]} +${got}</span>`:""}</div><div class="ge">Lv↑마다 ${STAT_NAME[a.stat]}+1 · ${MATS[a.mat][1]} · 숙련 ${ls.xp}/${need}</div><div class="hpbar2 mp" style="height:6px;margin-top:3px"><i style="width:${pct}%"></i></div></div></div>`; }).join("");
  const cap=activeCap(); const lifeSum=["str","int","dex","vit","luk"].map(s=>{ const v=(P.lifeStat&&P.lifeStat[s])||0; return v?`${STAT_NAME[s]}+${v}`:null; }).filter(Boolean).join(" · ");
  $("log").innerHTML=`<div class="invv">
    <div style="font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:2px">액티브만 슬롯에 장착해 사용 · 패시브는 <b>배우면 자동 적용</b>(슬롯 불필요) · 액티브 ${P.loadout.length}/${cap}${cap<SLOT_MAX?` <span style="color:var(--mp)">🔵 마나 오브로 최대 ${SLOT_MAX}까지 확장</span>`:" (최대)"}</div>
    ${sec("⚔️ 액티브 스킬",actives,"배운 액티브 스킬이 없다. 수련관·스킬북에서 배운다.",`장착 ${P.loadout.length}/${cap}`)}
    ${sec("🛡 패시브 스킬",passives,"배운 패시브 스킬이 없다.",`배우면 자동 적용 · ${passives.length}개`)}
    <div><div class="ih"><span>🌲 생활 스킬</span><span class="cnt">${lifeSum?"생활 누적 "+lifeSum:"채집할수록 Lv↑"}</span></div><div class="glist">${lifeRows}</div></div>
  </div>`;
  setActions(inDive
    ? [{label:"← 탑으로 돌아가기",full:true,act:backToClimb}]
    : [{label:"📖 수련관 (스킬 습득)",act:skillMenu},{label:"🏘 마을로",full:true,act:townMenu}]); }
window.skillEquip=k=>{ equipSkill(k); skillWindow(); };
window.skillUnequip=k=>{ unequipSkill(k); skillWindow(); };
function learnSkill(k){ if(canLearn(k)!=="ok"){ toast("조건이 부족하다"); return; } const s=SKILLS[k];
  P.gold-=s.cost.gold||0; for(const m in s.cost){ if(m==="gold")continue; P.mats[m]-=s.cost[m]; }
  P.skills.push(k);
  if(s.type==="active"){ skillProf(k); if(P.loadout.length<activeCap())P.loadout.push(k); }
  else if(P.passives.length<MAX_PASSIVE)P.passives.push(k);
  render(); line(`📖 <b>${s.n}</b> 습득! ${s.type==="active"?"전투에서 사용 · 쓸수록 숙련도↑.":"패시브 효과 적용."}${(s.type==="active"?P.loadout:P.passives).includes(k)?" (자동 장착)":" (슬롯 가득 — 스킬창에서 교체)"}`,"loot"); toast("스킬 습득: "+s.n); checkQuests(); }

