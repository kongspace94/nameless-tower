"use strict";
/* ---------- 상태 ---------- */
let P, mode="town", enemy=null, B=null, awaiting=null, auction=null, auctionTimer=null;
function freshPlayer(){ return {
  name:"방랑자", avatar:null, gems:5, gold:30, potions:3, companion:"light", comps:{light:{bond:0,lv:1,awk:0,runes:[]}}, runes:{}, karma:0, kills:0,
  stats:{str:5,int:5,dex:5,vit:5,luk:3}, train:{str:0,int:0,dex:0,vit:0,luk:0}, lifeStat:{str:0,int:0,dex:0,vit:0,luk:0},
  life:{logging:{lv:1,xp:0},mining:{lv:1,xp:0},herbing:{lv:1,xp:0},fishing:{lv:1,xp:0},arcana:{lv:1,xp:0}},
  mats:{}, skills:[], skillProf:{}, chants:{}, skillSlots:SLOT_BASE, loadout:[], passives:[], inv:[], uidc:0, equip:{weapon:null,offhand:null,armor:null,ring:null,amulet:null,boots:null}, consumables:{}, buffs:{}, questItems:[],
  stash:{inv:[],mats:{},consumables:{},potions:0,gold:0},
  title:null, titles:[], codex:{}, codexWeak:{}, tamed:[], portals:[1], quests:{}, flags:{maxFloor:0}, hp:0, mp:0, floor:1, dives:0, stamina:STAM_MAX, staminaTs:Date.now(),
  shopDay:"", shopBought:{},
  meta:{echoes:0,spent:{},runs:0,bestFloor:0,bestCont:0}, runPeakFloor:0, runContClears:0, runKills:0,   // 🌌 회귀 메타성장 + 이번 런 추적
  expProg:{},   // 🧭 대륙 개척 구역 진행 저장(대륙별 {ai,step}) — 마을 갔다 와도 이어짐
  bestiary:{},   // 📖 몬스터 도감(처치수·약점·시그니처 드랍 기록)
  farm:{unlocked:false,slots:[],lastTs:Date.now()},   // ⛺ 자동 파밍(부족 거점)
};}
/* 🌌 회귀 강화 중 '시작 보너스'(스탯/골드/물약)를 갓 리셋된 P에 적용 */
function applyMetaStart(){ if(!P)return; const e=metaEff();
  if(e.statAll){ for(const k in P.stats)P.stats[k]+=e.statAll; }
  P.gold=(P.gold||0)+(e.gold||0); P.potions=(P.potions||0)+(e.potions||0);
  P.hp=MAXHP(); P.mp=MAXMP(); }
/* 구버전 세이브 호환 + 필드 보정 */
function normalizeP(){ if(!P)return;
  if(!P.equip)P.equip={};
  for(const s of SLOTS){ if(!(s[0] in P.equip))P.equip[s[0]]=null; }   // 새 슬롯 보정
  if("accessory" in P.equip){ const accId=P.equip.accessory;   // 구버전 장신구 → 아이템의 새 슬롯으로 이관
    if(accId){ const it=(P.inv||[]).find(x=>x.id===accId); const g=it&&RELICS[it.k]; if(g&&g.slot&&P.equip[g.slot]==null)P.equip[g.slot]=accId; }
    delete P.equip.accessory; }
  if(!P.consumables)P.consumables={}; if(!P.buffs)P.buffs={}; if(!P.questItems)P.questItems=[];
  if(!P.mats)P.mats={}; if(!Array.isArray(P.inv))P.inv=[];
  if(P.uidc==null)P.uidc=0; if(!P.skillProf)P.skillProf={};
  if(!P.chants||typeof P.chants!=="object")P.chants={};   // ✨ 커스텀 주문 영창(주문별, 미설정 시 기본 영창)
  if(!P.lifeStat)P.lifeStat={str:0,int:0,dex:0,vit:0,luk:0};
  if(!P.shopBought||typeof P.shopBought!=="object")P.shopBought={}; if(P.shopDay==null)P.shopDay="";
  if(!P.stash||typeof P.stash!=="object")P.stash={};
  if(!Array.isArray(P.stash.inv))P.stash.inv=[]; if(!P.stash.mats)P.stash.mats={}; if(!P.stash.consumables)P.stash.consumables={}; if(P.stash.potions==null)P.stash.potions=0; if(P.stash.gold==null)P.stash.gold=0;
  P.stash.inv=P.stash.inv.map(it=>(it&&typeof it==="object")?it:{k:it,id:newId(),up:0}); for(const it of P.stash.inv){ if(it.up==null)it.up=0; }
  if(P.skillSlots==null)P.skillSlots=Math.max(SLOT_BASE, Math.min(SLOT_MAX, (P.loadout||[]).length||SLOT_BASE)); // 구세이브: 기존 로드아웃 크기 보존
  P.skillSlots=clamp(P.skillSlots,SLOT_BASE,SLOT_MAX);
  if(!Array.isArray(P.loadout))P.loadout=[]; if(!Array.isArray(P.passives))P.passives=[]; if(!Array.isArray(P.titles))P.titles=[];
  if(!Array.isArray(P.portals)||!P.portals.length)P.portals=[1];
  if(!P.quests||typeof P.quests!=="object")P.quests={}; if(!P.flags)P.flags={}; if(P.flags.maxFloor==null)P.flags.maxFloor=P.floor||0;
  if(!P.flags.storySeen||typeof P.flags.storySeen!=="object")P.flags.storySeen={};   // 📖 본 스토리 비트(체크포인트 1회 재생용)
  if(!P.codex||typeof P.codex!=="object")P.codex={};   // 도감: 발견한 장비 기록
  if(!P.codexWeak||typeof P.codexWeak!=="object")P.codexWeak={};   // 🔥 발견한 몬스터 약점 속성
  if(!P.bestiary||typeof P.bestiary!=="object")P.bestiary={};   // 📖 몬스터 도감
  if(P.gems==null)P.gems=5; if(P.avatar===undefined)P.avatar=null;   // 🎭 프로필: 크리스탈 · 아바타
  if(!Array.isArray(P.tamed))P.tamed=[];   // 계약(테이밍)한 소환수 로스터
  if(!P.comps||typeof P.comps!=="object")P.comps={};   // 🐾 동료 성장(유대/각성) 기록
  if(P.companion&&!P.comps[P.companion])P.comps[P.companion]={bond:0,lv:1,awk:0};
  for(const k in P.comps){ const r=P.comps[k]; if(r.lv==null)r.lv=1; if(r.bond==null)r.bond=0; if(r.awk==null)r.awk=compTier(r.lv); if(!Array.isArray(r.runes))r.runes=[]; }
  if(!P.runes||typeof P.runes!=="object")P.runes={};   // 🔩 보유 룬(미장착 풀)
  if(!P.meta||typeof P.meta!=="object")P.meta={echoes:0,spent:{},runs:0,bestFloor:0,bestCont:0};   // 🌌 회귀 메타
  if(!P.meta.spent||typeof P.meta.spent!=="object")P.meta.spent={}; if(P.meta.echoes==null)P.meta.echoes=0;
  if(P.runPeakFloor==null)P.runPeakFloor=P.floor||0; if(P.runContClears==null)P.runContClears=0; if(P.runKills==null)P.runKills=0;
  if(!P.expProg||typeof P.expProg!=="object")P.expProg={};   // 🧭 개척 구역 진행 저장
  if(!P.farm||typeof P.farm!=="object")P.farm={unlocked:false,slots:[],lastTs:Date.now()};   // ⛺ 자동 파밍
  if(!Array.isArray(P.farm.slots))P.farm.slots=[]; if(!P.farm.lastTs)P.farm.lastTs=Date.now();
  for(const s of P.farm.slots){ if(s.lv==null)s.lv=1; if(s.acc==null)s.acc=0; }
  [...P.inv, ...(P.stash.inv||[])].forEach(it=>{ if(it&&it.k&&RELICS[it.k])P.codex[it.k]=true; });   // 보유 장비 소급 등록
  autoActivateQuests();
  // 구버전 직업(P.job) → 칭호(P.title)로 이관
  if(P.title===undefined)P.title=null; if(P.job){ if(!P.titles.includes(P.job))P.titles.push(P.job); if(!P.title)P.title=P.job; delete P.job; }
  // P.inv 문자열 → 인스턴스 {k,id,up} 로 마이그레이션
  P.inv = P.inv.map(it=> (it&&typeof it==="object") ? it : {k:it, id:newId()});
  for(const it of P.inv){ if(it.up==null)it.up=0; }
  // 이름 없는 열쇠 인스턴스 → 퀘스트 아이템
  P.inv = P.inv.filter(it=>{ if(it.k==="이름 없는 열쇠"){ if(!P.questItems.includes(it.k))P.questItems.push(it.k); return false; } return true; });
  // 구버전 P.equip(이름 문자열) → 인스턴스 id 로 변환
  for(const s of SLOTS){ const v=P.equip[s[0]]; if(typeof v==="string"){ const it=P.inv.find(x=>x.k===v); P.equip[s[0]]=it?it.id:null; } }
  // 빈 슬롯 자동 착용
  for(const it of P.inv){ const g=RELICS[it.k]; if(g&&g.slot&&P.equip[g.slot]==null)P.equip[g.slot]=it.id; }
  // 배운 액티브 스킬 숙련도 초기화 + 로드아웃 자동 채우기
  for(const k of P.skills){ if(!SKILLS[k])continue;
    if(SKILLS[k].type==="active"){ if(!P.skillProf[k])P.skillProf[k]={lv:1,xp:0}; if(!P.loadout.includes(k)&&P.loadout.length<activeCap())P.loadout.push(k); }
    else { if(!P.passives.includes(k)&&P.passives.length<MAX_PASSIVE)P.passives.push(k); } }
  // 장착됐지만 더 이상 안 배운 스킬 정리
  P.loadout=P.loadout.filter(k=>P.skills.includes(k)); P.passives=P.passives.filter(k=>P.skills.includes(k));
  checkTitleUnlocks(true); }
/* ---------- 칭호 ---------- */
function checkTitleUnlocks(silent){ if(!P.titles)P.titles=[]; let got=[];
  for(const [k,t] of Object.entries(TITLES)){ if(!P.titles.includes(k) && t.unlock && t.unlock(P)){ P.titles.push(k); got.push(t); } }
  if(!silent) got.forEach(t=>{ line(`🎖️ <b>칭호 획득: ${t.emoji} ${t.n}</b> — ${t.how}. 칭호소에서 장착 가능!`,"loot"); toast("칭호 획득: "+t.n); });
  return got.length; }
/* ---------- 퀘스트 ---------- */
function questCur(id){ const q=P.quests[id]; const g=QUESTS[id].goal; if(!q)return 0;
  if(g.type==="kills")return Math.max(0,P.kills-(q.base||0));
  if(g.type==="floor")return P.flags.maxFloor||0;
  if(g.type==="mat")return P.mats[g.mat]||0;
  if(g.type==="gold")return P.gold;
  if(g.type==="skill")return hasSkill(g.skill)?1:0;
  return 0; }
function questGoalN(id){ return QUESTS[id].goal.n||1; }
function questPct(id){ return clamp(Math.round(questCur(id)/questGoalN(id)*100),0,100); }
function rewardText(r){ const p=[]; if(r.gold)p.push(`💰${r.gold}`); if(r.mats)for(const m in r.mats)p.push(`${MATS[m][0]}${r.mats[m]}`);
  if(r.item)p.push(`🎁 ${r.item}`); if(r.book&&CONS[r.book])p.push(`${CONS[r.book].emoji} ${CONS[r.book].n}`); if(r.title&&TITLES[r.title])p.push(`🎖️ ${TITLES[r.title].n} 칭호`); return p.join(" · "); }
function acceptQuest(id){ if(!QUESTS[id]||P.quests[id])return;
  P.quests[id]={status:"active", base:0};   // 누적 기준(총 처치/보유 등)
  line(`📜 퀘스트 개시: <b>${QUESTS[id].n}</b> — ${QUESTS[id].desc}`,"loot"); toast("새 퀘스트"); checkQuests(); }
/* 마을(비-탑) 퀘스트는 자동으로 진행 중 상태가 됨 — 별도 수락 불필요 */
/* 메인(스토리) 퀘스트만 기본 진행 · 서브(마을/추천/토벌)는 길드하우스에서 수락 */
function autoActivateQuests(){ if(!P.quests)P.quests={};
  for(const id of Object.keys(QUESTS)){ const q=QUESTS[id]; if(q.tower)continue; if(q.type==="main"&&!P.quests[id])P.quests[id]={status:"active",base:0}; } }
function completeQuest(id){ const def=QUESTS[id]; if(!def||!P.quests[id]||P.quests[id].status==="done")return; P.quests[id].status="done";
  const r=def.reward||{};
  if(r.gold)P.gold+=r.gold; if(r.mats)for(const m in r.mats)addMat(m,r.mats[m]);
  if(r.item)addRelic(r.item); if(r.book)gainCons(r.book); if(r.title&&!P.titles.includes(r.title))P.titles.push(r.title);
  line(`✅ <b>퀘스트 완료: ${def.n}</b> — 보상: ${rewardText(r)}`,"loot"); toast("퀘스트 완료: "+def.n); checkTitleUnlocks(); render(); }
function checkQuests(){ if(!P.quests)return; for(const id of Object.keys(P.quests)){ const q=P.quests[id]; if(!q||q.status!=="active"||!QUESTS[id])continue;
  if(questCur(id)>=questGoalN(id)) completeQuest(id); } }
/* ---------- 스킬 로드아웃 ---------- */
function equipSkill(k){ const s=SKILLS[k]; if(!s||!hasSkill(k))return;
  if(s.type==="active"){ if(P.loadout.includes(k))return; if(P.loadout.length>=activeCap()){ toast(`액티브 슬롯 가득 (${activeCap()}칸) · 마나 오브로 확장`); return; } P.loadout.push(k); }
  else { if(P.passives.includes(k))return; if(P.passives.length>=MAX_PASSIVE){ toast(`패시브 슬롯 가득 (최대 ${MAX_PASSIVE})`); return; } P.passives.push(k); }
  toast(`${s.n} 장착`); render(); }
function unequipSkill(k){ const s=SKILLS[k]; if(!s)return;
  if(s.type==="active")P.loadout=P.loadout.filter(x=>x!==k); else P.passives=P.passives.filter(x=>x!==k);
  render(); }
function newId(){ P.uidc=(P.uidc||0)+1; return P.uidc; }
function equippedItem(slot){ const id=P.equip?P.equip[slot]:null; return id==null?null:(P.inv.find(x=>x.id===id)||null); }
function isEquippedItem(it){ const g=RELICS[it.k]; return !!(g&&g.slot&&P.equip[g.slot]===it.id); }
function equipByIndex(i){ const it=P.inv[i]; if(!it)return; const g=RELICS[it.k]; if(!g||!g.slot)return; P.equip[g.slot]=it.id; toast(`${it.k} 착용`); render(); inventoryMenu(); }
function unequipSlot(slot){ P.equip[slot]=null; render(); inventoryMenu(); }
function dropByIndex(i){ const it=P.inv[i]; if(!it)return; if(!confirm(`${it.k}을(를) 버릴까요?`))return;
  const g=RELICS[it.k]; if(g&&g.slot&&P.equip[g.slot]===it.id)P.equip[g.slot]=null; P.inv.splice(i,1); toast(`${it.k} 버림`); render(); inventoryMenu(); }
function gainCons(key,n){ P.consumables[key]=(P.consumables[key]||0)+(n||1); }
function learnFromBook(skillKey){ if(!SKILLS[skillKey])return false; if(hasSkill(skillKey)){ toast("이미 배운 스킬"); return false; }
  P.skills.push(skillKey); const s=SKILLS[skillKey];
  if(s.type==="active"){ if(!P.skillProf[skillKey])P.skillProf[skillKey]={lv:1,xp:0}; if(P.loadout.length<activeCap())P.loadout.push(skillKey); }
  else if(P.passives.length<MAX_PASSIVE)P.passives.push(skillKey);
  line(`📖 스킬북으로 <b>${s.n}</b> 습득!`,"loot"); toast("스킬 습득: "+s.n); checkQuests(); return true; }
function useConsumable(key){ if((P.consumables[key]||0)<=0)return; const c=CONS[key];
  if(c.use==="learn"){ if(!learnFromBook(c.skill))return; }
  else if(c.use==="stat"){ P.stats[c.stat]++; line(`${c.emoji} ${c.n}을(를) 마셨다. ${STAT_NAME[c.stat]} +1!`,"loot"); checkTitleUnlocks(); }
  else if(c.use==="buff"){ P.buffs[c.buff]=(P.buffs[c.buff]||0)+c.amount; line(`${c.emoji} ${c.n}을(를) 마셨다. ${c.note}`,"heal"); }
  else if(c.use==="resist"){ P.buffs.regionResist=c.resKey; line(`${c.emoji} ${c.n}을(를) 마셨다. ${c.note}`,"heal"); toast("지역 내성 획득"); }
  else if(c.use==="slot"){ if((P.skillSlots||SLOT_BASE)>=SLOT_MAX){ toast(`이미 최대 슬롯 (${SLOT_MAX}칸)`); return; } P.skillSlots=clamp((P.skillSlots||SLOT_BASE)+1,SLOT_BASE,SLOT_MAX); line(`${c.emoji} ${c.n}을(를) 흡수했다. 액티브 스킬 슬롯 <b>+1 → ${P.skillSlots}/${SLOT_MAX}</b>`,"loot"); toast("스킬 슬롯 +1"); }
  else if(c.use==="stamina"){ const g=gainStamina(c.amount||50); if(g<=0){ toast("생활력이 이미 가득"); return; } line(`${c.emoji} ${c.n}을(를) 마셨다. 생활력 +${g}`,"heal"); toast("생활력 +"+g); }
  else if(c.use==="enchant"){ P.buffs.weaponElem=c.elem; const el=ELEMENTS[c.elem]; line(`${c.emoji} 무기에 ${el.ic} <b>${el.n}</b>을(를) 둘렀다. 이번 다이브 동안 기본 공격에 ${el.n} 부여!`,"loot"); toast(el.n+" 부여"); }
  else if(c.use==="heal"){ heal(c.amount||25); }
  P.consumables[key]--; if(P.consumables[key]<=0)delete P.consumables[key]; render(); inventoryMenu(); }
function useBasicPotion(){ if(P.potions<=0)return; if(P.hp>=MAXHP()){ toast("이미 가득"); return; } P.potions--; heal(25); render(); inventoryMenu(); }
window.invEquip=i=>equipByIndex(i);
window.invUnequip=slot=>unequipSlot(slot);
window.invDrop=i=>dropByIndex(i);
window.invUse=key=>useConsumable(key);
window.invPotion=()=>useBasicPotion();
/* ⛺ 자동 파밍 누적 — 마지막 방문 이후 실시간(오프라인 포함) 생산량을 슬롯에 적립 */
function farmTick(){ if(!P||!P.farm||!P.farm.unlocked)return; const now=Date.now(); if(!P.farm.lastTs)P.farm.lastTs=now;
  const hours=(now-P.farm.lastTs)/3600000; if(hours<=0){ P.farm.lastTs=now; return; }
  for(const s of P.farm.slots){ if(s.res)s.acc=Math.min(farmCap(s.lv), (s.acc||0)+farmRate(s.lv)*hours); }
  P.farm.lastTs=now; }
function stamRegenMs(){ return Math.round(STAM_REGEN_MS/(1+estat("vit")*0.012)); }   // 체력(vit)이 높을수록 생활력 회복↑
function regenStamina(){ if(P.stamina==null){ P.stamina=STAM_MAX; P.staminaTs=Date.now(); return; }
  const now=Date.now(); if(!P.staminaTs)P.staminaTs=now;
  if(P.stamina>=STAM_MAX){ P.staminaTs=now; return; }
  const per=stamRegenMs(); const elapsed=now-P.staminaTs, gained=Math.floor(elapsed/per);
  if(gained>0){ P.stamina=Math.min(STAM_MAX,P.stamina+gained); P.staminaTs=now-(elapsed-gained*per); } }
function stamEta(){ if(P.stamina>=STAM_MAX)return "가득"; const per=stamRegenMs(); const now=Date.now(); const rem=per-((now-(P.staminaTs||now))%per);
  const mins=Math.round(per/60000*10)/10; return `다음 +1: ${Math.ceil(rem/60000)}분 (칸당 ~${mins}분 · 체력↑ 가속)`; }
function gainStamina(n){ if(P.stamina==null)P.stamina=0; const b=Math.min(n,STAM_MAX-P.stamina); if(b>0){ P.stamina+=b; return b; } return 0; }

/* ---------- 로그 / 무대 / 이펙트 ---------- */
function line(html,cls){ const p=document.createElement("p"); if(cls)p.className=cls; p.innerHTML=html; $("log").appendChild(p); $("log").scrollTop=$("log").scrollHeight;
  if(cls==="loot"&&typeof sfx==="function")sfx("loot"); }   // 🔊 획득 라인엔 루팅 사운드
function clearLog(){ $("log").innerHTML=""; }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),1600); }
function setFloorTag(){ if(!P){ $("floortag").textContent=""; return; }
  const turn=(enemy&&B&&B.turn)?` · ${B.turn}턴`:"";
  if(EXP){ const c=(typeof CONTINENTS!=="undefined")&&CONTINENTS[EXP.ci]; const a=c&&c.areas[EXP.ai]; $("floortag").textContent=`🗺 ${a?a.n:"개척"}${turn}`; return; }
  $("floortag").textContent = mode==="dive"?(`탑 ${P.floor}/${TOP}층`+turn):"거점 마을"; }
function porMini(){ $("porMini").innerHTML = (P&&!enemy) ? playerIco(22)+`<span>${P.name}</span>` : ""; }
function setSceneFoe(){ if(!enemy)return;
  const ew=clamp(enemy.hp/enemy.hpMax*100,0,100), mhp=MAXHP(), mmp=MAXMP();
  const intentHtml="";   // 몬스터 행동 미리보기 패널 제거 — 강한 공격은 로그 텍스트로만 예고(긴장감↑)
  const chg=B&&B.charge;
  const gw = chg ? clamp((B.charge.filled||0)/B.charge.need*100,0,100) : (enemy.groggyMax?clamp(enemy.groggy/enemy.groggyMax*100,0,100):0);
  const gRow = chg
    ? `<div class="hprow"><span class="tag" style="color:#8fd0ff">파훼</span><div class="hpbar2 brk"><i id="ebar-g" style="width:${gw}%"></i></div></div>`
    : `<div class="hprow"><span class="tag">그로기</span><div class="hpbar2 grog${enemy.staggered?' stag':''}"><i id="ebar-g" style="width:${gw}%"></i></div></div>`;
  let ailHtml=""; if(enemy.ail){ for(const k of ["fire","venom","frost","shock"]){ const a=enemy.ail[k]; if(a&&a.t>0){ const el=ELEMENTS[k]; ailHtml+=`<span class="ailb" style="color:${el.col}">${el.ic}${a.t}</span>`; } } }
  const weakHtml = (enemy._weakShown&&enemy.weak) ? `<span class="weakb" style="color:${ELEMENTS[enemy.weak].col}">약점 ${ELEMENTS[enemy.weak].ic}</span>` : "";
  const mech = enemy.mech&&typeof MECH_INFO!=="undefined"&&MECH_INFO[enemy.mech] ? MECH_INFO[enemy.mech] : null;
  const mechHtml = mech ? `<span class="mechb${enemy.enraged?' hot':''}">${mech.ic}${mech.n}</span>` : "";
  const shieldRow = (enemy.shieldHp>0) ? `<div class="hprow"><span class="tag" style="color:#8fd0ff">보호막</span><div class="hpbar2 shd"><i style="width:${clamp(enemy.shieldHp/(enemy.shieldMax||enemy.shieldHp)*100,0,100)}%"></i></div><span class="hpnum">${enemy.shieldHp}</span></div>` : "";
  const foe = `<div class="bunit bfoe"><div class="bart${chg?' charging':''}" id="foeArt">${ico(enemy.ic,96)}</div>`+
    `<div class="ubox"><div class="un">${enemy.n}${chg?` <span style="color:#8fd0ff">🔮충전 ${B.charge.left}</span>`:(enemy.staggered?' <span style="color:#ffd36a">💫</span>':'')}${weakHtml}${mechHtml}</div>`+
    (ailHtml?`<div class="ailrow">${ailHtml}</div>`:"")+
    `<div class="hprow"><span class="tag">HP</span><div class="hpbar2 hp"><i id="ebar" style="width:${ew}%"></i></div><span class="hpnum" id="ehpnum">${Math.max(0,enemy.hp)}/${enemy.hpMax}</span></div>`+
    shieldRow+gRow+`</div></div>`;
  const me = `<div class="bunit bme"><div class="bart" id="meArt">${playerIco(84)}</div>`+
    `<div class="ubox"><div class="un">${P.name}${B&&B.disarmed?' <span style="color:var(--danger)">🗡️❌ 무장해제</span>':''}</div>`+
    `<div class="hprow"><span class="tag">HP</span><div class="hpbar2 hp"><i id="meHpBar" style="width:${clamp(P.hp/mhp*100,0,100)}%"></i></div><span class="hpnum" id="meHpNum">${Math.max(0,P.hp)}/${mhp}</span></div>`+
    `<div class="hprow"><span class="tag">기력</span><div class="hpbar2 mp"><i id="meMpBar" style="width:${clamp(P.mp/mmp*100,0,100)}%"></i></div><span class="hpnum" id="meMpNum">${P.mp}/${mmp}</span></div>`+
    `<div class="hprow"><span class="tag">기세</span><div class="hpbar2 mom${(B&&(B.momentum||0)>=MOM_MAX)?' full':''}"><i id="meMomBar" style="width:${clamp((B&&B.momentum||0)/MOM_MAX*100,0,100)}%"></i></div><span class="hpnum" id="meMomNum">${(B&&(B.momentum||0)>=MOM_MAX)?'🌟':Math.floor((B&&B.momentum)||0)}</span></div></div></div>`;
  let compHtml=""; if(B&&B.comp){ const c=B.comp; const pips=Array.from({length:c.max},(_,i)=>`<span class="pip ${i<c.energy?'on':''}"></span>`).join("");
    const cpor=(c.tier>0)?`<span class="compemo">${c.emoji}</span>`:ico(c.ic,30);
    compHtml=`<div class="comp">${cpor}<div class="cn">${c.n} <span class="clv">Lv${c.lv||1}</span></div><div class="pips">${pips}</div></div>`; }
  let sumHtml=""; if(B&&B.summon){ const S=B.summon; const tr=(S.trait&&typeof SUMMON_TRAITS!=="undefined"&&SUMMON_TRAITS[S.trait])?SUMMON_TRAITS[S.trait]:null;
    sumHtml=`<div class="summ${S.guard?' guarding':''}"><span class="se">${S.emoji}</span><div><div class="sn">${S.n}${tr?` ${tr.ic}`:""}</div>`+
      `<div class="smeta">⚔${S.dmg} · ${S.turns}턴${S.guard?" · 🛡방어":""}</div></div></div>`; }
  $("stageContent").innerHTML = intentHtml + foe + me + compHtml + sumHtml;
  setFloorTag(); $("porMini").innerHTML=""; }
function updateBattleBars(){ if(!enemy)return;
  const eb=$("ebar"); if(eb)eb.style.width=clamp(enemy.hp/enemy.hpMax*100,0,100)+"%";
  const en=$("ehpnum"); if(en)en.textContent=`${Math.max(0,enemy.hp)}/${enemy.hpMax}`;
  const mhp=MAXHP(),mmp=MAXMP();
  const hb=$("meHpBar"); if(hb)hb.style.width=clamp(P.hp/mhp*100,0,100)+"%"; const hn=$("meHpNum"); if(hn)hn.textContent=`${Math.max(0,P.hp)}/${mhp}`;
  const mb=$("meMpBar"); if(mb)mb.style.width=clamp(P.mp/mmp*100,0,100)+"%"; const mn=$("meMpNum"); if(mn)mn.textContent=`${P.mp}/${mmp}`;
  const om=$("meMomBar"); if(om){ const full=(B&&(B.momentum||0)>=MOM_MAX); om.style.width=clamp((B&&B.momentum||0)/MOM_MAX*100,0,100)+"%"; om.parentElement.classList.toggle("full",full); const onn=$("meMomNum"); if(onn)onn.textContent=full?'🌟':Math.floor((B&&B.momentum)||0); }
  updateGroggyBar(); }
function updateFoeBar(){ updateBattleBars(); }
function setScene(emoji,caption){ if(document.body)document.body.classList.remove("mapview");   // 지도 뷰 이탈 시 상단 씬 복구(townMap이 자기 setScene 직후 다시 켬)
  $("stageContent").innerHTML=`<div><div class="scene-ico">${emoji}</div>`+(caption?`<div class="scene-cap">${caption}</div>`:"")+`</div>`; setFloorTag(); porMini(); }
let _floatActive={me:0,foe:0,mid:0};   // 같은 위치에 동시에 뜬 플로트 수 → 세로로 어긋나게 쌓아 겹침 방지
function spawnFloat(text,color,side){ const s=$("stage"); const f=document.createElement("div"); f.className="float"; f.style.color=color; f.textContent=text;
  const key=(side==="me"||side==="foe")?side:"mid"; const stack=_floatActive[key]++; const up=Math.min(stack,4)*22;   // 활성 개수만큼 위로 어긋남(최대 4단, 화면 이탈 방지)
  const jit=b=>b+(rnd(9)-4);
  if(side==="me"){ f.style.left=jit(20)+"%"; f.style.top=`calc(56% - ${up}px)`; }
  else if(side==="foe"){ f.style.left=jit(68)+"%"; f.style.top=`calc(22% - ${up}px)`; }
  else { f.style.left=(38+rnd(24))+"%"; f.style.top=`calc(46% - ${up}px)`; }
  s.appendChild(f); setTimeout(()=>{ f.remove(); _floatActive[key]=Math.max(0,_floatActive[key]-1); },1000); }
function fxHit(){ const el=$("foeArt"); if(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }
function fxShake(){ const s=$("stage"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
function fxPlayerHurt(){ const c=$("meArt")||$("por").firstElementChild; if(c){ c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); } if(typeof sfx==="function")sfx("hurt"); }

/* ---------- HUD ---------- */
function render(){ if(!P)return; $("hud").hidden=false; { const ub=$("uibar"); if(ub)ub.hidden=false; } regenStamina();
  if(document.body){ document.body.classList.toggle("combat",!!enemy);
    document.body.classList.toggle("intower", !!enemy || mode==="dive" || (typeof EXP!=="undefined"&&!!EXP)); }   // 탑/전투/개척 중엔 상단 타이틀 숨김
  if(enemy){ const lg=$("log"); if(lg)requestAnimationFrame(()=>{ try{ lg.scrollTop=lg.scrollHeight; }catch(e){} }); }   // 전투 로그(고정 높이)에서 마지막 줄이 잘리지 않게 항상 맨 아래로
  { const cd=$("chatdock"); if(cd && (mode!=="town"||enemy)){ cd.hidden=true; if(typeof stopChatTimer==="function")stopChatTimer(); } }   // 마을 밖에선 채팅 독 숨김
  const stg=$("stage"); if(stg){ const f=P.floor||0, dv=(mode==="dive"); stg.classList.toggle("zoneSky", dv&&f>=16&&f<=30); stg.classList.toggle("zoneVoid", dv&&f>=31); }   // 존별 배경
  $("por").innerHTML=playerIco(56); $("pname").textContent=P.name;
  $("ptitle").textContent = `${jobEmoji()} ${jobName()} · ${mode==="dive"?`탑 ${P.floor}층`:"마을"}`;
  const mhp=MAXHP(),mmp=MAXMP();
  $("hpTxt").textContent=`${Math.max(0,P.hp)}/${mhp}`; $("hpBar").style.width=clamp(P.hp/mhp*100,0,100)+"%";
  $("mpTxt").textContent=`${P.mp}/${mmp}`; $("mpBar").style.width=clamp(P.mp/mmp*100,0,100)+"%";
  const sb=k=>{ const b=titleStatBonus(k); return b?` <span style="color:var(--good)">+${b}</span>`:""; };
  $("stats5").innerHTML = `<span title="힘→공격">💪 힘 <b>${P.stats.str}</b>${sb("str")}</span><span title="지능→마법/기력">🔮 지능 <b>${P.stats.int}</b>${sb("int")}</span>`+
    `<span title="민첩→치명">🏹 민첩 <b>${P.stats.dex}</b>${sb("dex")}</span><span title="체력→HP">❤ 체력 <b>${P.stats.vit}</b>${sb("vit")}</span><span title="행운">🍀 행운 <b>${P.stats.luk}</b>${sb("luk")}</span>`;
  $("sgold").textContent=P.gold; { const sg=$("sgems"); if(sg)sg.textContent=P.gems||0; } $("spot").textContent=P.potions;
  { const sc=$("scomp"); if(sc){ if(P.companion&&COMPANIONS[P.companion]){ const r=compRec(P.companion); const d=compDisp(P.companion,r.lv); sc.textContent=`${d.emoji} Lv${r.lv||1}`; } else sc.textContent="—"; } }
  $("skarma").textContent = P.karma>2?"선 😇":P.karma<-2?"악 😈":"중립";
  $("stamTxt").textContent=`${Math.floor(P.stamina)}/${STAM_MAX}`; $("stamBar").style.width=clamp(P.stamina/STAM_MAX*100,0,100)+"%";
  $("sinv").innerHTML = SLOTS.map(([s,e,nm])=>{ const it=equippedItem(s);
    return it
      ? `<span class="eqic" title="${nm}: ${it.k}${it.up?' +'+it.up:''} — ${RELICS[it.k]?RELICS[it.k].note:''}">${ico(relicIco(it.k),36)}${it.up?`<i class="uplv">+${it.up}</i>`:''}</span>`
      : `<span class="emo" title="${nm} 비어 있음" style="width:36px;height:36px;font-size:17px;opacity:.35">${e}</span>`; }).join("");
  { const hs=$("hudstatus"); if(hs){ const html=activeStatusHtml(); hs.innerHTML=html; hs.hidden=!html; }   // ✨ 버프·세트 (장착장비 아래)
    const hm=$("hudmats"); if(hm){ const mh=matsStatusHtml(); hm.innerHTML=mh; hm.hidden=!mh; } }              // 🎒 재료 (생활력 위)
  setFloorTag(); porMini(); renderQuestTrack(); if(enemy)updateBattleBars(); }
/* 상시 상태줄: 활성 버프 + 세트 효과 + 보유 재료 (인벤 안 열어도 보이게) */
function activeStatusHtml(){ if(!P)return ""; const parts=[];
  const b=P.buffs||{}, bf=[];
  if(b.atkPct)bf.push(`⚔공+${Math.round(b.atkPct*100)}%`);
  if(b.magicPct)bf.push(`🔮마+${Math.round(b.magicPct*100)}%`);
  if(b.critBonus)bf.push(`🎯치+${Math.round(b.critBonus*100)}%`);
  if(b.defBonus)bf.push(`🛡방+${b.defBonus}`);
  if(b.luck)bf.push(`🍀운+${b.luck}`);
  if(b.weaponElem&&typeof ELEMENTS!=="undefined"&&ELEMENTS[b.weaponElem])bf.push(`${ELEMENTS[b.weaponElem].ic}${ELEMENTS[b.weaponElem].n}`);
  if(b.regionResist)bf.push(`🧿내성`);
  if(bf.length)parts.push(`<span class="hs-lab">✨버프</span>${bf.join(" ")}`);
  if(typeof setCounts==="function"){ const sc=setCounts(); const sets=Object.entries(sc).filter(([k,n])=>n>=2&&SETS[k]).map(([k,n])=>{ const tier=n>=4?4:2; const note=(SETS[k].bonus[tier]||{}).note||""; return `${SETS[k].n}(${n})${note?" "+note:""}`; });
    if(sets.length)parts.push(`<span class="hs-lab">🧩세트</span>${sets.join(" · ")}`); }
  return parts.length?parts.join(`<span class="hs-sep">|</span>`):""; }
/* 보유 재료 상태줄 (생활력 위에 별도 표시) */
function matsStatusHtml(){ if(!P)return "";
  const mats=Object.entries(P.mats||{}).filter(([m,n])=>n>0&&MATS[m]).sort((a,c)=>c[1]-a[1]);
  if(!mats.length)return "";
  return `<span class="hs-lab">🎒재료</span>${mats.map(([m,n])=>`${MATS[m][0]}${n}`).join(" ")}`; }
/* 항상 표시되는 퀘스트 추적기 */
function renderQuestTrack(){ const el=$("qtrack"); if(!el)return;
  const active=P&&P.quests?Object.keys(P.quests).filter(id=>P.quests[id].status==="active"&&QUESTS[id]):[];
  if(active.length===0){ el.hidden=true; el.innerHTML=""; return; } el.hidden=false;
  el.innerHTML=`<span class="qhdr">📜</span>`+active.slice(0,3).map(id=>{ const def=QUESTS[id]; const cur=questCur(id),goal=questGoalN(id),pct=questPct(id);
    return `<span class="qc ${pct>=100?'done':''}"><b>${def.n}</b> ${cur}/${goal}<span class="qbar"><i style="width:${pct}%"></i></span></span>`; }).join("")
    + (active.length>3?`<span class="qhdr">+${active.length-3}</span>`:""); }
window.openQuestBoard=()=>{ if(P&&mode==="town"&&typeof questBoard==="function")questBoard(); else toast("탑 안에서는 추적기로 진행도만 확인돼요"); };
/* 탭하면 뜨는 아이템/스킬 정보 팝업 */
function infoModal(html){ closeModal(); const d=document.createElement("div"); d.className="modal"; d.id="__modal";
  d.innerHTML=`<div class="box">${html}<div class="mclose"><button onclick="closeModal()">닫기</button></div></div>`;
  d.onclick=(e)=>{ if(e.target===d)closeModal(); }; document.body.appendChild(d); }
function closeModal(){ const d=$("__modal"); if(d)d.remove(); }
/* 📊 상세 스탯 — HUD 스탯 클릭 시 실효 전투 수치 표시 */
function statsDetail(){ if(!P)return; const rb=(typeof relicBonus==="function")?relicBonus():{atk:0,def:0,luck:0,vamp:false}; const sb=(typeof setBonus==="function")?setBonus():{vamp:false};
  const row=(l,v,sub)=>`<div class="sdrow"><span>${l}</span><b>${v}</b></div>${sub?`<div class="sdsub">${sub}</div>`:""}`;
  const html=`<h3 style="margin:0 0 8px">📊 상세 스탯 — ${P.name}</h3>`+
    row("⚔ 공격력 (ATK)", ATK(), `힘 ${P.stats.str} · 장비 +${rb.atk}${P.buffs&&P.buffs.atkPct?` · 버프 +${Math.round(P.buffs.atkPct*100)}%`:""}`)+
    row("🛡 방어력 (DEF)", DEF(), `장비 +${rb.def}${P.buffs&&P.buffs.defBonus?` · 버프 +${P.buffs.defBonus}`:""}`)+
    row("🔮 마법력", magicPow(), `지능 ${P.stats.int}`)+
    row("🎯 치명타 확률", Math.round(critChance()*100)+"%", "민첩·행운 기반")+
    row("🍀 실효 행운", LUKv(), `행운 ${P.stats.luk} · 장비 +${rb.luck}`)+
    row("❤ 최대 HP", MAXHP())+
    row("💧 최대 기력", MAXMP())+
    ((rb.vamp||sb.vamp)?row("🩸 흡혈","보유 (피해의 일부 회복)"):"")+
    `<div class="sdbase">기본 스탯 · 💪힘 ${P.stats.str} · 🔮지능 ${P.stats.int} · 🏹민첩 ${P.stats.dex} · ❤체력 ${P.stats.vit} · 🍀행운 ${P.stats.luk}</div>`;
  infoModal(html); }
function itemInfo(kind,key){ let emoji="❔",name=key,tag="",rows=[];
  if(kind==="gear"){ const g=RELICS[key]||{}; emoji=(IX[relicIco(key)]||["",""])[1]; name=key; tag="장비 · "+(SLOT_LABEL[g.slot]||""); rows.push(g.note||""); if(g.slot==="weapon"&&g.wt)rows.push(`🎯 공격 패턴: ${weaponPatternText(g.wt)}`); rows.push(`판매가 ~${g.val||0}G`); const _st=gearMainStat(g); rows.push(`⚒️ 대장간에서 강화 가능 (레벨당 ${_st==="atk"?"공격":_st==="def"?"방어":"행운"} +1)`); }
  else if(kind==="cons"){ const c=CONS[key]; if(!c)return; emoji=c.emoji; name=c.n; tag=c.use==="learn"?"스킬북":c.use==="buff"?"버프 물약":c.use==="stat"?"능력치 비약":c.use==="slot"?"스킬 슬롯 확장":"소비품"; rows.push(c.note); if(c.use==="learn"&&SKILLS[c.skill])rows.push(`→ <b>${SKILLS[c.skill].n}</b>: ${SKILLS[c.skill].desc}`); }
  else if(kind==="quest"){ emoji="🗝"; name=key; tag="퀘스트 아이템"; rows.push(RELICS[key]?RELICS[key].note:"탑의 비밀에 관련된 특별한 물건."); }
  else if(kind==="skill"){ const s=SKILLS[key]; if(!s)return; emoji=s.emoji; name=s.n; tag=s.type==="active"?"액티브 스킬":"패시브 스킬"; rows.push(s.desc); if(s.type==="active")rows.push(`기력 ${s.mp} · 숙련 Lv.${skillProf(key).lv} · 효과 +${Math.round((skillMul(key)-1)*100)}%`); }
  const body=`<div class="mh"><span class="emo" style="width:40px;height:40px;font-size:24px">${emoji}</span><div><div class="mt">${name}</div><div class="mtag">${tag}</div></div></div>`+rows.filter(Boolean).map(r=>`<div class="mrow">${r}</div>`).join("");
  infoModal(body); }
window.closeModal=closeModal; window.itemInfo=itemInfo;

/* ---------- 액션 버튼 ---------- */
const ACT_GUARD_MS=420;   // 버튼이 새로 뜬 직후엔 클릭 무시(연타로 안 읽고 넘기는 것 방지 · 읽을 틈) — 빠르면 줄이기
let _actTime=0;   // 마지막 setActions 시각(클릭·키보드 가드 공용)
function setActions(list){ awaiting=list; const box=$("actions"); box.innerHTML=""; const t=Date.now(); _actTime=t; let n=0;
  list.forEach((a)=>{
    if(a.header){ const h=document.createElement("div"); h.className="acthdr full"; h.innerHTML=`<span>${a.label}</span>`; box.appendChild(h); return; }   // 섹션 헤더
    n++; const num=n; const b=document.createElement("button"); if(a.full)b.className="full";
    b.style.animationDelay=Math.min((num-1)*0.05,0.28)+"s";   // 🎬 버튼 순차 등장(띠리리리 캐스케이드)
    b.innerHTML=`<span class="k">${a.key||num}</span>${a.label}`+(a.desc?`<span class="desc">${a.desc}</span>`:"");
    b.disabled=!!a.disabled; b.onclick=()=>{ if(a.disabled)return; if(Date.now()-t<ACT_GUARD_MS)return; if(typeof sfx==="function")sfx("click"); a.act(); }; box.appendChild(b); });
  if(n&&typeof uiCascade==="function")uiCascade(n); }   // 🎵 메뉴 등장 상승음
document.addEventListener("keydown",e=>{ if(!awaiting)return;
  const ae=document.activeElement; if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName||""))return;   // 입력칸 타이핑 중엔 메뉴 숫자키 무시(비번/이름/채팅 입력 보호)
  if(e.code==="Space"){ if(ae&&ae.tagName==="BUTTON"&&ae.blur)ae.blur(); e.preventDefault(); return; }   // Space는 QTE 전용 — 포커스된 버튼으로 새거나 스크롤되는 것 방지(가끔 안 눌리는 문제)
  const n=parseInt(e.key,10);
  if(Date.now()-_actTime<ACT_GUARD_MS)return;   // 방금 뜬 메뉴는 잠깐 무시(연타 방지·읽을 틈)
  const acts=awaiting.filter(a=>!a.header);   // 번호는 헤더 제외하고 매김
  if(n>=1&&n<=acts.length){ const a=acts[n-1]; if(a&&!a.disabled)a.act(); } });

/* ---------- 공용 성장/보상 ---------- */
function trainStat(stat,pts){ pts=Math.round(pts*(1+metaEff().growth));   // 🌌 숙달의 잔향: 성장 가속
  P.train[stat]=(P.train[stat]||0)+pts; const need=P.stats[stat]*12+20; let up=0;
  while(P.train[stat]>=need){ P.train[stat]-=need; P.stats[stat]++; up++; }
  if(up>0){ line(`✦ <b>${STAT_NAME[stat]}</b>이(가) ${up} 올랐다! (현재 ${P.stats[stat]})`,"heal"); checkTitleUnlocks(); }
  return up; }
function addMat(mat,n){ P.mats[mat]=(P.mats[mat]||0)+n; if(typeof checkQuests==="function")checkQuests(); }
function heal(n){ n=Math.round(n*(1+(jobMods().healPct||0))); const mhp=MAXHP(); const b=Math.min(n,mhp-P.hp); if(b>0){ P.hp+=b; line(`체력을 ${b} 회복했다.`,"heal"); spawnFloat("+"+b,"#6bcf8a","me"); if(typeof sfx==="function")sfx("heal"); } render(); }
function addRelic(name){ const g=RELICS[name];
  if(g&&g.key){ if(!P.questItems.includes(name))P.questItems.push(name); line(`🗝 <b>퀘스트 아이템</b> 획득: <b>${name}</b>`,"loot"); render(); return; }
  const it={k:name,id:newId(),up:0}; P.inv.push(it); let auto="";
  const isNew=P.codex&&!P.codex[name]; if(P.codex)P.codex[name]=true;   // 도감 등록
  if(g&&g.slot&&P.equip[g.slot]==null){ P.equip[g.slot]=it.id; auto=" (자동 착용)"; }
  line(`${ico(relicIco(name),18)} 장비 획득: <b>${name}</b> — ${g?g.note:''}${auto}${isNew?' <span style="color:#a98bff">📖NEW</span>':''}`,"loot");
  if(isNew)toast("📖 도감 등록: "+name); render(); }
function karma(n,why){ P.karma+=n; if(why)line(why,"sys"); }

