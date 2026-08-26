"use strict";
/* ============================================================
   경매장 — 온라인 유저 간 실거래(서버 백엔드). 봇/가짜 매물 없음.
   오프라인은 안내만 표시. 즉시구매(buynow)만 지원(입찰 없음).
   ============================================================ */
const AUC_CATS=[["all","전체","🗂"],["weapon","무기","🗡"],["armor","방어구","🛡"],["accessory","장신구","💍"],["mat","재료","🪵"],["book","스킬북","📘"]];
const MAT_UNIT={wood:8,ore:10,herb:8,fish:8,mana:18};
const AUC_PER=10;   // 페이지당 매물 수

/* ---------- 서버 매물 item 문자열 인코딩/디코딩 ---------- */
function encodeAucItem(o){ if(o.kind==="mat")return "mat:"+o.mat+":"+(o.amt||1); if(o.kind==="cons")return "cons:"+o.consKey; return o.relicKey; }
function parseAucItem(item,up){ item=String(item||""); if(item.slice(0,4)==="mat:"){ const p=item.split(":"); return {kind:"mat",mat:p[1],amt:+p[2]||1}; } if(item.slice(0,5)==="cons:")return {kind:"cons",consKey:item.slice(5)}; return {kind:"relic",relicKey:item,up:+up||0}; }
function srvToListing(a){ const base=parseAucItem(a.item,a.up); const l=Object.assign({id:a.id,sid:a.sellerId,sellerName:a.sellerName||"모험가",buynow:Math.max(1,+a.price||1),mine:!!(typeof NET!=="undefined"&&NET.userId&&a.sellerId===NET.userId)},base); l.base=lBaseVal(l); return l; }

/* ---------- 매물 식별/표시 ---------- */
function lItemName(l){ if(l.kind==="relic")return l.relicKey; if(l.kind==="mat")return `${MATS[l.mat]?MATS[l.mat][1]:l.mat} ×${l.amt}`; if(l.kind==="cons")return (CONS[l.consKey]||{}).n||l.consKey; return "?"; }
function lIcon(l,size){ if(l.kind==="relic")return ico(relicIco(l.relicKey),size); if(l.kind==="mat")return spanEmo(MATS[l.mat]?MATS[l.mat][0]:"🪵",size); if(l.kind==="cons")return spanEmo((CONS[l.consKey]||{}).emoji||"📘",size); return spanEmo("❔",size); }
function lNote(l){ if(l.kind==="relic")return (RELICS[l.relicKey]||{}).note||""; if(l.kind==="mat")return "제작 재료"; if(l.kind==="cons")return "스킬북"; return ""; }
function lCat(l){ if(l.kind==="relic"){ const g=RELICS[l.relicKey]; return (g&&g.slot)||"accessory"; } if(l.kind==="mat")return "mat"; if(l.kind==="cons")return "book"; return "all"; }
function lBaseVal(l){ if(l.kind==="relic")return (RELICS[l.relicKey]||{}).val||40; if(l.kind==="mat")return (MAT_UNIT[l.mat]||10)*(l.amt||5); if(l.kind==="cons")return (CONS[l.consKey]||{}).val||60; return 40; }
function fairPrice(l){ return Math.max(5, lBaseVal(l)); }   // 위탁 시 참고용 적정가

/* ---------- 열기/닫기 ---------- */
function openAuction(){ if(enemy){ toast("전투 중엔 갈 수 없다"); return; } stopAuctionTimer(); mode="auction";
  auction={listings:[],cat:"all",q:"",page:0,online:!!(P&&P._online)};
  setScene("🏛","경매장 — 모험가들의 장터");
  if(!auction.online){
    $("log").innerHTML=`<div class="aucwrap"><div class="inv-empty" style="padding:26px 14px;line-height:1.8">🏛 경매장은 <b>온라인</b>에서 다른 모험가들과 실시간으로 거래돼요.<br>타이틀의 <b>🌐 온라인 플레이</b>로 접속하면 매물을 사고팔 수 있어요.</div></div>`;
    setActions([{label:"🏘 마을로 나가기",full:true,act:leaveAuction}]); return; }
  if(typeof NET!=="undefined")NET.onAuction=handleAucEvent;
  line("매물을 불러오는 중…","sys");
  if(typeof netAuctionList==="function")netAuctionList().then(list=>{ if(!auction)return; auction.listings=(list||[]).map(srvToListing); renderAuctionList(); }).catch(()=>{ if(auction)renderAuctionList(); });
  renderAuction(); }
function stopAuctionTimer(){ if(auctionTimer){ clearInterval(auctionTimer); auctionTimer=null; } if(typeof stopChatTimer==="function")stopChatTimer(); }
function leaveAuction(){ stopAuctionTimer(); if(typeof NET!=="undefined")NET.onAuction=null; auction=null; townMenu(); }

/* ---------- SSE 이벤트(다른 유저 등록/판매) ---------- */
function handleAucEvent(evt){ if(!auction||!evt)return;
  if(evt.type==="list"&&evt.a){ const l=srvToListing(evt.a); if(!auction.listings.some(x=>x.id===l.id)){ auction.listings.unshift(l); renderAuctionList(); } }
  else if(evt.type==="sold"&&evt.id){ const l=auction.listings.find(x=>x.id===evt.id);
    if(l){ if(l.mine){ P.gold+=l.buynow; line(`🏛 위탁한 <b>${lItemName(l)}</b>이(가) ${l.buynow}G에 팔렸어요!`,"loot"); toast("판매 +"+l.buynow+"G"); render(); }
      auction.listings=auction.listings.filter(x=>x.id!==evt.id); renderAuctionList(); } } }

/* ---------- 구매 ---------- */
function aucBuyNow(id){ const l=auction&&auction.listings.find(x=>x.id===id); if(!l){ toast("없는 매물"); return; } if(l.mine){ toast("내 매물이에요"); return; } if(P.gold<l.buynow){ toast("금화 부족"); return; }
  if(typeof netAuctionBuy!=="function"){ toast("온라인 전용"); return; }
  netAuctionBuy(id).then(d=>{ P.gold-=l.buynow; const base=parseAucItem(d.item,d.up); grantListing(base); line(`💰 구매: <b>${lItemName(base)}</b> -${l.buynow}G (판매자 ${d.sellerName||l.sellerName})`,"loot"); toast("구매 완료"); if(auction)auction.listings=auction.listings.filter(x=>x.id!==id); render(); renderAuctionList(); })
    .catch(e=>{ toast((e&&e.message)||"구매 실패(이미 팔렸을 수 있어요)"); if(auction){ auction.listings=auction.listings.filter(x=>x.id!==id); renderAuctionList(); } }); }
function grantListing(l){ if(l.kind==="relic")addRelicSilent(l.relicKey,l.up); else if(l.kind==="mat")addMat(l.mat,l.amt); else if(l.kind==="cons")gainCons(l.consKey); }
function addRelicSilent(name,up){ const g=RELICS[name]; if(g&&g.key){ if(!P.questItems.includes(name))P.questItems.push(name); return; } const it={k:name,id:newId(),up:+up||0}; P.inv.push(it); if(P.codex)P.codex[name]=true; if(g&&g.slot&&P.equip[g.slot]==null)P.equip[g.slot]=it.id; }

/* ---------- 필터/검색/페이지 ---------- */
function filteredListings(){ let arr=auction.listings.slice();
  if(auction.cat&&auction.cat!=="all")arr=arr.filter(l=>lCat(l)===auction.cat);
  if(auction.q){ const q=auction.q.toLowerCase(); arr=arr.filter(l=>lItemName(l).toLowerCase().includes(q)); }
  arr.sort((a,b)=>((b.mine?1:0)-(a.mine?1:0))||(a.buynow-b.buynow)); return arr; }
function aucCat(c){ auction.cat=c; auction.page=0; renderAuctionList(); }
function aucSearch(){ const q=prompt("검색어 (아이템 이름):", auction.q||""); if(q==null)return; auction.q=(q||"").trim(); auction.page=0; renderAuctionList(); }
function aucClear(){ auction.q=""; auction.page=0; renderAuctionList(); }
function aucPage(d){ const total=filteredListings().length; const maxp=Math.max(0,Math.ceil(total/AUC_PER)-1); auction.page=clamp((auction.page||0)+d,0,maxp); renderAuctionList(); }
function aucRefresh(){ if(!auction||!auction.online||typeof netAuctionList!=="function")return; toast("새로고침"); netAuctionList().then(list=>{ if(!auction)return; auction.listings=(list||[]).map(srvToListing); renderAuctionList(); }).catch(()=>{}); }

/* ---------- 렌더 ---------- */
function cardHtml(l){ const name=lItemName(l);
  const btns=l.mine ? `<div class="lmeta">🏷 내 매물 · 팔리면 골드가 들어와요</div>`
    : `<div class="lotbtns"><button class="lb buy" ${P.gold<l.buynow?"disabled":""} onclick="aucBuyNow('${l.id}')">⚡ 구매 ${l.buynow}G</button></div>`;
  return `<div class="lot ${l.mine?'mine':''}"><div>${lIcon(l,42)}</div><div class="li">`+
    `<div class="ln">${name}${l.up?` <span style="color:var(--gold)">+${l.up}</span>`:''}</div>`+
    `<div class="lmeta">${lNote(l)} · 판매자 <b>${l.mine?'나':(l.sellerName||'모험가')}</b></div>`+
    `<div class="lbid"><span class="lprice">즉시구매 <b>${l.buynow}G</b></span></div>${btns}</div></div>`; }
function renderAuctionList(){ if(!auction)return; if(!auction.online)return; const all=filteredListings();
  const maxp=Math.max(0,Math.ceil(all.length/AUC_PER)-1); if((auction.page||0)>maxp)auction.page=maxp; const page=auction.page||0;
  const rows=all.slice(page*AUC_PER,page*AUC_PER+AUC_PER).map(cardHtml).join("")||`<div class="inv-empty">아직 올라온 매물이 없어요. 첫 판매자가 되어보세요! (💼 위탁 판매)</div>`;
  const cats=AUC_CATS.map(([c,nm,e])=>`<button class="aucchip ${auction.cat===c?'on':''}" onclick="aucCat('${c}')">${e} ${nm}</button>`).join("");
  const qline=auction.q?`<span class="aucq">검색 "<b>${auction.q}</b>" <button class="aucx" onclick="aucClear()">✕</button></span>`:"";
  $("log").innerHTML=`<div class="aucwrap">`+
    `<div class="aucbar">${cats}</div>`+
    `<div class="aucbar2"><button class="aucchip" onclick="aucSearch()">🔎 검색</button>${qline}<span class="auccount">${all.length}개 매물</span></div>`+
    `<div class="auclist">${rows}</div>`+
    `<div class="aucpage"><button class="aucchip" ${page<=0?"disabled":""} onclick="aucPage(-1)">◀ 이전</button><span>${page+1} / ${maxp+1}</span><button class="aucchip" ${page>=maxp?"disabled":""} onclick="aucPage(1)">다음 ▶</button></div>`+
  `</div>`; }
function renderAuction(){ if(!auction)return; renderAuctionList();
  setActions([{label:"💼 위탁 판매",desc:"내 물건을 가격 정해 올리기",act:consignMenu},{label:"🔄 새로고침",desc:"최신 매물 다시 불러오기",act:aucRefresh},{label:"🏘 마을로 나가기",full:true,act:leaveAuction}]); }

/* ---------- 위탁 판매 (서버로 등록) ---------- */
function consignMenu(){ if(!auction)return;
  const relics=P.inv.filter(it=>RELICS[it.k]&&!RELICS[it.k].key&&!isEquippedItem(it)).map(it=>({kind:"relic",relicKey:it.k,ref:it,up:it.up||0,label:`${it.k}${it.up?' +'+it.up:''}`}));
  const books=Object.entries(P.consumables||{}).filter(([k,q])=>q>0&&CONS[k]&&CONS[k].use==="learn").map(([k])=>({kind:"cons",consKey:k,label:`${CONS[k].emoji} ${CONS[k].n}`}));
  const mats=Object.entries(MATS).filter(([m])=>(P.mats[m]||0)>=5).map(([m,[e,nm]])=>({kind:"mat",mat:m,amt:5,label:`${e} ${nm} ×5`}));
  const sellable=[...relics,...books,...mats];
  clearLog(); setScene("💼","위탁 판매 — 무엇을 올릴까?");
  if(sellable.length===0){ line("팔 물건이 없다 (미착용 장비 / 스킬북 / 재료 5개 이상).","sys"); setActions([{label:"← 경매장",full:true,act:renderAuction}]); return; }
  line("올릴 물건을 고르면 즉시구매가를 직접 정할 수 있어요. 다른 유저가 사면 골드가 들어와요.","sys");
  const acts=sellable.map(o=>{ const fair=fairPrice(mkListingLite(o)); return { label:o.label, desc:`적정가 ~${fair}G`, act:()=>startConsign(o,fair) }; });
  acts.push({label:"취소",full:true,act:renderAuction}); setActions(acts); }
function mkListingLite(o){ const l=Object.assign({},o); l.base=lBaseVal(l); return l; }
function startConsign(o,fair){ const capLo=Math.max(3,Math.round(fair*0.4)), capHi=Math.round(fair*4);
  const bnRaw=prompt(`즉시구매가를 정하세요\n적정가 ${fair}G · 허용 ${capLo}~${capHi}G:`, String(fair)); if(bnRaw==null){ consignMenu(); return; }
  const buynow=clamp(parseInt(bnRaw,10)||fair, capLo, capHi);
  // 인벤에서 즉시 차감(등록 실패 시 복구)
  let removed=null;
  if(o.kind==="relic"){ const j=P.inv.indexOf(o.ref); if(j<0){ toast("이미 없는 물건"); consignMenu(); return; } P.inv.splice(j,1); removed=()=>P.inv.push(o.ref); }
  else if(o.kind==="cons"){ if((P.consumables[o.consKey]||0)<=0){ toast("이미 없는 스킬북"); consignMenu(); return; } P.consumables[o.consKey]--; if(P.consumables[o.consKey]<=0)delete P.consumables[o.consKey]; removed=()=>gainCons(o.consKey); }
  else if(o.kind==="mat"){ if((P.mats[o.mat]||0)<o.amt){ toast("재료 부족"); consignMenu(); return; } P.mats[o.mat]-=o.amt; removed=()=>addMat(o.mat,o.amt); }
  render();
  if(typeof netAuctionSell!=="function"){ if(removed)removed(); toast("온라인 전용"); consignMenu(); return; }
  netAuctionSell(encodeAucItem(o), o.up||0, buynow).then(()=>{ line(`🏛 <b>${lItemName(o.kind==="relic"?{kind:"relic",relicKey:o.relicKey,up:o.up}:o)}</b> 위탁 등록! 즉구 ${buynow}G. 다른 유저가 사면 골드가 들어와요.`,"loot"); toast("위탁 등록"); render(); renderAuction(); })
    .catch(e=>{ if(removed)removed(); render(); toast((e&&e.message)||"등록 실패"); consignMenu(); }); }

/* 인라인 onclick 노출: 반드시 직접 참조 */
window.aucBuyNow=aucBuyNow; window.aucCat=aucCat; window.aucSearch=aucSearch; window.aucClear=aucClear; window.aucPage=aucPage;
