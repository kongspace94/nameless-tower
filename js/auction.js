"use strict";
/* ============================================================
   경매장 (봇 마켓) — 메이플식: 다수 매물 · 검색 · 카테고리 · 페이지
   유저가 즉시구매가/입찰가를 정해 위탁 · 공급량 기반 적정가(인플레 억제)
   추후 서버로 유저간 확장.
   ============================================================ */
const AUC_CATS=[["all","전체","🗂"],["weapon","무기","🗡"],["armor","방어구","🛡"],["accessory","장신구","💍"],["mat","재료","🪵"],["book","스킬북","📘"]];
const AUC_POOL_RELICS=["녹슨 단검","이 빠진 롱소드","가죽 갑옷","판금 흉갑","토끼발 부적","흡혈의 반지","월광 세이버","사냥꾼의 활","입문자의 장검","입문자의 갑옷","입문자의 반지"];
const AUC_POOL_BOOKS=["book_heavy","book_power","book_heal","book_fireball","book_crit"];
const AUC_POOL_MATS=["wood","ore","herb","fish","mana"];
const MAT_UNIT={wood:8,ore:10,herb:8,fish:8,mana:18};
const AUC_PER=10;   // 페이지당 매물 수

/* ---------- 매물 식별/표시 ---------- */
function lItemName(l){ if(l.kind==="relic")return l.relicKey; if(l.kind==="mat")return `${MATS[l.mat][1]} ×${l.amt}`; if(l.kind==="cons")return (CONS[l.consKey]||{}).n||l.consKey; return "?"; }
function lIcon(l,size){ if(l.kind==="relic")return ico(relicIco(l.relicKey),size); if(l.kind==="mat")return spanEmo(MATS[l.mat][0],size); if(l.kind==="cons")return spanEmo((CONS[l.consKey]||{}).emoji||"📘",size); return spanEmo("❔",size); }
function lNote(l){ if(l.kind==="relic")return (RELICS[l.relicKey]||{}).note||""; if(l.kind==="mat")return "제작 재료"; if(l.kind==="cons")return "스킬북"; return ""; }
function lCat(l){ if(l.kind==="relic"){ const g=RELICS[l.relicKey]; return (g&&g.slot)||"accessory"; } if(l.kind==="mat")return "mat"; if(l.kind==="cons")return "book"; return "all"; }
function lIdent(l){ return l.kind==="relic"?("r:"+l.relicKey):l.kind==="mat"?("m:"+l.mat):l.kind==="cons"?("c:"+l.consKey):"?"; }
function lBaseVal(l){ if(l.kind==="relic")return (RELICS[l.relicKey]||{}).val||40; if(l.kind==="mat")return (MAT_UNIT[l.mat]||10)*(l.amt||5); if(l.kind==="cons")return (CONS[l.consKey]||{}).val||60; return 40; }
/* 적정가: 같은 물품 공급이 많을수록 하락, 적을수록 상승 (기준가 대비) */
function supplyOf(l){ if(!auction)return 1; const id=lIdent(l); return auction.listings.filter(x=>lIdent(x)===id).length||1; }
function fairPrice(l){ const base=lBaseVal(l); const factor=clamp(1.4-(supplyOf(l)-1)*0.15, 0.55, 1.4); return Math.max(5,Math.round(base*factor)); }
function bidInc(l){ return Math.max(2,Math.round(l.base*0.08)); }

/* ---------- 매물 생성 ---------- */
function mkListing(o,ex){ const l={id:++auction._idc, kind:o.kind, mine:!!(ex&&ex.mine), leader:"—", leaderName:"—"};
  if(o.kind==="relic"){ l.relicKey=o.relicKey; l.up=o.up||0; }
  else if(o.kind==="mat"){ l.mat=o.mat; l.amt=o.amt||5; }
  else if(o.kind==="cons"){ l.consKey=o.consKey; }
  l.base=lBaseVal(l);
  if(ex){ l.buynow=ex.buynow; l.bid=ex.bid; l.time=ex.time; }
  return l; }
function botListing(){ const r=Math.random(); let o;
  if(r<0.42) o={kind:"relic",relicKey:pick(AUC_POOL_RELICS)};
  else if(r<0.72) o={kind:"mat",mat:pick(AUC_POOL_MATS),amt:pick([3,5,5,8])};
  else o={kind:"cons",consKey:pick(AUC_POOL_BOOKS)};
  const l=mkListing(o,null); const fair=fairPrice(l);
  l.buynow=Math.max(6,Math.round(fair*(0.92+Math.random()*0.4)));
  l.bid=Math.max(1,Math.round(l.buynow*0.4)); l.time=200+rnd(400); return l; }

/* ---------- 열기/닫기/틱 ---------- */
function openAuction(){ if(enemy){ toast("전투 중엔 갈 수 없다"); return; } stopAuctionTimer(); mode="auction";
  auction={listings:[], _idc:0, cat:"all", q:"", page:0, _paused:false};
  for(let i=0;i<28;i++)auction.listings.push(botListing());
  setScene("🏛","지하 경매장 — 온갖 물건이 오간다."); renderAuction();
  auctionTimer=setInterval(auctionTick,3000); }
function stopAuctionTimer(){ if(auctionTimer){ clearInterval(auctionTimer); auctionTimer=null; } if(typeof stopChatTimer==="function")stopChatTimer(); }
function leaveAuction(){ stopAuctionTimer();
  if(auction){ for(const l of auction.listings){ if(l.mine&&!l.sold)returnListing(l); } }   // 미판매 위탁품 회수
  auction=null; townMenu(); }
function auctionTick(){ if(!auction||auction._paused)return; let changed=false;
  for(const l of auction.listings){ if(l.sold)continue; l.time--;
    if(l.mine){ const fair=fairPrice(l);
      if(l.buynow<=Math.round(fair*1.05)&&chance(0.06)){ l.sold=true; P.gold+=l.buynow; line(`🏛 위탁한 <b>${lItemName(l)}</b>이(가) ${l.buynow}G에 즉시 판매됐다!`,"loot"); toast("판매 완료 +"+l.buynow+"G"); render(); changed=true; }
      else if(chance(0.10)&&l.bid+bidInc(l)<=Math.round(fair*1.2)){ l.bid+=bidInc(l); l.leader="bot"; l.leaderName="입찰 경쟁"; changed=true; } }
    if(l.time<=0){ resolveListing(l); changed=true; } }
  auction.listings=auction.listings.filter(l=>!l._gone);
  if(chance(0.20)&&auction.listings.length<40){ auction.listings.push(botListing()); changed=true; }
  if(changed)renderAuctionList(); }
function resolveListing(l){ l._gone=true;
  if(l.mine){ if(l.leader==="bot"&&l.leaderName!=="—"){ P.gold+=l.bid; line(`🏛 위탁한 <b>${lItemName(l)}</b> 낙찰! +${l.bid}G`,"loot"); render(); }
    else { returnListing(l); line(`🏛 위탁한 ${lItemName(l)} 유찰 — 돌려받았다.`,"sys"); render(); } return; }
  if(l.leader==="you"){ if(P.gold>=l.bid){ P.gold-=l.bid; grantListing(l); line(`🎉 <b>${lItemName(l)}</b> 낙찰! -${l.bid}G`,"loot"); toast("낙찰! "+lItemName(l)); render(); } } }
function grantListing(l){ if(l.kind==="relic")addRelicSilent(l.relicKey); else if(l.kind==="mat")addMat(l.mat,l.amt); else if(l.kind==="cons")gainCons(l.consKey); }
function returnListing(l){ if(l.kind==="relic")P.inv.push({k:l.relicKey,id:newId(),up:l.up||0}); else if(l.kind==="mat")addMat(l.mat,l.amt); else if(l.kind==="cons")gainCons(l.consKey); }
function addRelicSilent(name){ const g=RELICS[name]; if(g&&g.key){ if(!P.questItems.includes(name))P.questItems.push(name); return; } const it={k:name,id:newId(),up:0}; P.inv.push(it); if(P.codex)P.codex[name]=true; if(g&&g.slot&&P.equip[g.slot]==null)P.equip[g.slot]=it.id; }

/* ---------- 구매 / 입찰 ---------- */
function aucBuyNow(id){ const l=auction&&auction.listings.find(x=>x.id===id); if(!l||l.mine){ toast("구매할 수 없어요"); return; } if(P.gold<l.buynow){ toast("금화 부족"); return; }
  P.gold-=l.buynow; grantListing(l); line(`💰 즉시구매: <b>${lItemName(l)}</b> -${l.buynow}G`,"loot"); toast("구매 완료"); l._gone=true; auction.listings=auction.listings.filter(x=>x!==l); render(); renderAuctionList(); }
function aucBidUp(id){ const l=auction&&auction.listings.find(x=>x.id===id); if(!l||l.mine){ toast("내 물건이다"); return; } if(l.leader==="you"){ toast("이미 최고 입찰"); return; }
  const need=l.bid+bidInc(l); if(P.gold<need){ toast("금화 부족"); return; } l.bid=need; l.leader="you"; l.leaderName=P.name; l.time=Math.max(l.time,20); toast("입찰 "+need+"G"); renderAuctionList(); }

/* ---------- 필터/검색/페이지 ---------- */
function filteredListings(){ let arr=auction.listings.filter(l=>!l.sold&&!l._gone);
  if(auction.cat&&auction.cat!=="all")arr=arr.filter(l=>lCat(l)===auction.cat);
  if(auction.q){ const q=auction.q.toLowerCase(); arr=arr.filter(l=>lItemName(l).toLowerCase().includes(q)); }
  arr.sort((a,b)=>((b.mine?1:0)-(a.mine?1:0))||(a.buynow-b.buynow)); return arr; }
function aucCat(c){ auction.cat=c; auction.page=0; renderAuctionList(); }
function aucSearch(){ const q=prompt("검색어 (아이템 이름):", auction.q||""); if(q==null)return; auction.q=(q||"").trim(); auction.page=0; renderAuctionList(); }
function aucClear(){ auction.q=""; auction.page=0; renderAuctionList(); }
function aucPage(d){ const total=filteredListings().length; const maxp=Math.max(0,Math.ceil(total/AUC_PER)-1); auction.page=clamp((auction.page||0)+d,0,maxp); renderAuctionList(); }

/* ---------- 렌더 ---------- */
function cardHtml(l){ const name=lItemName(l), fair=fairPrice(l); const pc=l.buynow>Math.round(fair*1.2)?"hi":l.buynow<Math.round(fair*0.85)?"lo":"";
  const leadTxt=l.mine?"내 매물":(l.leader==="you"?'<span class="lead-you">나 최고입찰</span>':l.leaderName==="—"?"응찰 없음":"입찰 경쟁 중");
  const btns=l.mine
    ? `<div class="lmeta">위탁 중 · 현재 입찰 ${l.bid}G · 낙찰 시 골드 수령</div>`
    : `<div class="lotbtns"><button class="lb" ${P.gold<l.bid+bidInc(l)?"disabled":""} onclick="aucBidUp(${l.id})">입찰 ${l.bid+bidInc(l)}G</button><button class="lb buy" ${P.gold<l.buynow?"disabled":""} onclick="aucBuyNow(${l.id})">⚡ 즉구 ${l.buynow}G</button></div>`;
  return `<div class="lot ${l.mine?'mine':''}"><div>${lIcon(l,42)}</div><div class="li">`+
    `<div class="ln">${name}${l.up?` <span style="color:var(--gold)">+${l.up}</span>`:''}</div>`+
    `<div class="lmeta">${lNote(l)} · 적정가 ~${fair}G · <span class="ltime">⏱${l.time}s</span></div>`+
    `<div class="lbid"><span class="lprice ${pc}">즉구 <b>${l.buynow}G</b></span> · ${leadTxt}</div>${btns}</div></div>`; }
function renderAuctionList(){ if(!auction)return; const all=filteredListings();
  const maxp=Math.max(0,Math.ceil(all.length/AUC_PER)-1); if((auction.page||0)>maxp)auction.page=maxp; const page=auction.page||0;
  const rows=all.slice(page*AUC_PER,page*AUC_PER+AUC_PER).map(cardHtml).join("")||`<div class="inv-empty">조건에 맞는 매물이 없다.</div>`;
  const cats=AUC_CATS.map(([c,nm,e])=>`<button class="aucchip ${auction.cat===c?'on':''}" onclick="aucCat('${c}')">${e} ${nm}</button>`).join("");
  const qline=auction.q?`<span class="aucq">검색 "<b>${auction.q}</b>" <button class="aucx" onclick="aucClear()">✕</button></span>`:"";
  $("log").innerHTML=`<div class="aucwrap">`+
    `<div class="aucbar">${cats}</div>`+
    `<div class="aucbar2"><button class="aucchip" onclick="aucSearch()">🔎 검색</button>${qline}<span class="auccount">${all.length}개 매물</span></div>`+
    `<div class="auclist">${rows}</div>`+
    `<div class="aucpage"><button class="aucchip" ${page<=0?"disabled":""} onclick="aucPage(-1)">◀ 이전</button><span>${page+1} / ${maxp+1}</span><button class="aucchip" ${page>=maxp?"disabled":""} onclick="aucPage(1)">다음 ▶</button></div>`+
  `</div>`; }
function renderAuction(){ if(!auction)return; renderAuctionList();
  setActions([{label:"💼 위탁 판매",desc:"내 물건을 가격 정해 올리기",act:consignMenu},{label:"🏘 마을로 나가기",full:true,act:leaveAuction}]); }

/* ---------- 위탁 판매 (유저가 가격 지정 · 적정가 기준 상한) ---------- */
function consignMenu(){ if(!auction)return; auction._paused=true;
  const relics=P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key&&!isEquippedItem(it)).map(it=>({kind:"relic",relicKey:it.k,ref:it,up:it.up||0,label:`${it.k}${it.up?' +'+it.up:''}`}));
  const books=Object.entries(P.consumables||{}).filter(([k,q])=>q>0&&CONS[k]&&CONS[k].use==="learn").map(([k])=>({kind:"cons",consKey:k,label:`${CONS[k].emoji} ${CONS[k].n}`}));
  const mats=Object.entries(MATS).filter(([m])=>(P.mats[m]||0)>=5).map(([m,[e,nm]])=>({kind:"mat",mat:m,amt:5,label:`${e} ${nm} ×5`}));
  const sellable=[...relics,...books,...mats];
  clearLog(); setScene("💼","위탁 판매 — 무엇을 올릴까?");
  if(sellable.length===0){ line("팔 물건이 없다 (미착용 장비 / 스킬북 / 재료 5개 이상).","sys"); auction._paused=false; setActions([{label:"← 경매장",full:true,act:renderAuction}]); return; }
  line("올릴 물건을 고르면 즉시구매가·입찰 시작가를 직접 정할 수 있어요. (적정가 기준 상한 있음)","sys");
  const acts=sellable.map(o=>{ const fair=fairPrice(mkListing(o,null)); return { label:o.label, desc:`적정가 ~${fair}G`, act:()=>startConsign(o,fair) }; });   // 보유 판매가능 아이템 전부 (미착용 장비·스킬북·재료5+)
  acts.push({label:"취소",full:true,act:()=>{ auction._paused=false; renderAuction(); }}); setActions(acts); }
function startConsign(o,fair){ const capLo=Math.max(3,Math.round(fair*0.5)), capHi=Math.round(fair*1.5);
  const bnRaw=prompt(`즉시구매가를 정하세요\n적정가 ${fair}G · 허용 ${capLo}~${capHi}G (너무 비싸면 안 팔려요):`, String(fair)); if(bnRaw==null){ consignMenu(); return; }
  const buynow=clamp(parseInt(bnRaw,10)||fair, capLo, capHi);
  const bidDef=Math.max(1,Math.round(buynow*0.4));
  const bidRaw=prompt(`입찰 시작가를 정하세요 (1 ~ ${buynow-1}G):`, String(bidDef)); if(bidRaw==null){ consignMenu(); return; }
  const startBid=clamp(parseInt(bidRaw,10)||bidDef, 1, Math.max(1,buynow-1));
  if(o.kind==="relic"){ const j=P.inv.indexOf(o.ref); if(j<0){ toast("이미 없는 물건"); consignMenu(); return; } P.inv.splice(j,1); }
  else if(o.kind==="cons"){ if((P.consumables[o.consKey]||0)<=0){ toast("이미 없는 스킬북"); consignMenu(); return; } P.consumables[o.consKey]--; if(P.consumables[o.consKey]<=0)delete P.consumables[o.consKey]; }
  else if(o.kind==="mat"){ if((P.mats[o.mat]||0)<o.amt){ toast("재료 부족"); consignMenu(); return; } P.mats[o.mat]-=o.amt; }
  const l=mkListing(o,{mine:true,buynow,bid:startBid,time:150}); auction.listings.unshift(l);
  auction._paused=false; auction.cat="all"; auction.q=""; auction.page=0; render();
  line(`🏛 <b>${lItemName(l)}</b> 위탁 등록! 즉구 ${buynow}G · 시작가 ${startBid}G. 경매장에 머무는 동안 봇이 사갈 수 있어요.`,"loot"); toast("위탁 등록");
  renderAuction(); }

/* 인라인 onclick 노출: 반드시 직접 참조(window.X=X). 화살표 self-ref(window.X=()=>X())는 전역에서 무한재귀가 되어 버튼이 먹통이 됨 */
window.aucBuyNow=aucBuyNow; window.aucBidUp=aucBidUp;
window.aucCat=aucCat; window.aucSearch=aucSearch; window.aucClear=aucClear; window.aucPage=aucPage;
