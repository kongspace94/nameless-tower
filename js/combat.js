"use strict";
/* ============================================================
   탑 다이브 (전투)
   ============================================================ */
let EXP=null, expReturn=null;   // 대륙 개척(프로토타입) 상태 · 전투 승리/도망 후 복귀 콜백
function startDive(){ if(!P.portals||P.portals.length<=1){ beginDive(1); return; }
  mode="town"; clearLog(); setScene("🌀","포탈 앞 — 어디서부터 오를까?");
  line("탑 곳곳의 거점으로 통하는 포탈이 열려 있다. 시작 지점을 고르자.","sys");
  const acts=P.portals.slice().sort((a,b)=>a-b).map(f=>({ label: f===1?"🚪 1층 (탑 입구)":`🌀 ${f}층 · ${CHECKPOINTS[f]?CHECKPOINTS[f].zone+" "+CHECKPOINTS[f].n:"거점"}`, desc:f===1?"처음부터":"거점에서 시작", act:()=>beginDive(f) }));
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
/* 🗼 탑 목록 — '이름 없는 탑' + 정복한 대륙마다 열린 탑 포탈. 대륙 정복 전엔 그냥 기존 탑으로 직행 */
function towerList(){ if(enemy){ toast("전투 중엔 안 돼요"); return; } mode="town"; stopAuctionTimer(); auction=null;
  const conquered=[]; for(let i=0;i<CONTINENTS.length;i++){ if((P.flags.contCleared||0)>i)conquered.push(i); }
  if(!conquered.length){ startDive(); return; }   // 아직 대륙 정복 전 — 기존 '이름 없는 탑'만
  render(); clearLog(); setScene("🗼","탑 목록 — 열린 포탈들");
  line("정복한 대륙마다 그 <b>탑으로 통하는 포탈</b>이 열렸다. 오를 탑을 고르자.","sys");
  const acts=[{label:"🗼 이름 없는 탑",desc:`시작의 탑 · 포탈 ${(P.portals||[1]).length}개 · 최고 ${P.flags.maxFloor||0}층`,full:true,act:startDive}];
  conquered.forEach(i=>{ const c=CONTINENTS[i]; const d=REGION_DEBUFFS[c.debuff];
    acts.push({label:`🗼 ${c.name}`,desc:`정복한 대륙의 탑 · ${d?d.icon+" "+d.n+" · ":""}포탈 재도전`,full:true,act:()=>beginContinent(i)}); });
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function beginDive(floor){ mode="dive"; P.dives++; P.floor=floor; P.hp=MAXHP(); P.mp=MAXMP(); enemy=null; B=null; if(typeof amb==="function")amb("tower");
  const total=(P.potions||0)+(P._divePotBank||0); P._divePotBank=Math.max(0,total-DIVE_POTION_MAX); P.potions=Math.min(total,DIVE_POTION_MAX);  // 반입 제한
  render(); clearLog(); setScene("🚪","탑의 문이 열린다."); line(`탑 ${floor}층에서 등반을 시작한다. 얻은 것은 마을로 가져갈 수 있다.`,"sys");
  if(P._divePotBank>0)line(`🧪 물약은 최대 ${DIVE_POTION_MAX}개만 반입 — 나머지 ${P._divePotBank}개는 마을에 두고 왔다.`,"sys");
  setActions([{label:`${floor}층 탐험 시작`,full:true,act:enterFloor},
    {label:"🏘 마을로 (준비하고 다시)",full:true,act:townMenu}]); }   // 뒤로 — 깜빡한 준비가 있으면 돌아가기
function returnToTown(){ line("밧줄을 타고 탑을 빠져나왔다. 획득물은 그대로다.","sys"); setTimeout(townMenu,150); }
let deathCause="";   // 💀 마지막으로 플레이어를 쓰러뜨린 원인(사인 표시용)
let _killBlow=null;   // 💥 적을 쓰러뜨린 마지막 일격(스킬/피해) — 승리 연출용
function setDeathCause(c){ deathCause=c; }

const ENEMIES=[
  {n:"동굴 박쥐",ic:"bat",hp:12,atk:4,def:0,g:6,tier:1,taunt:["끼이익—","날개가 얼굴을 스친다."]},
  {n:"뼈 병사",ic:"skeleton",hp:20,atk:6,def:2,g:10,tier:1,taunt:["덜그럭… 녹슨 검을 든다.","텅 빈 눈이 응시한다."]},
  {n:"이끼 슬라임",ic:"slime",hp:26,atk:5,def:1,g:8,tier:1,taunt:["끈적하게 부푼다.","산성 점액이 바닥을 녹인다."]},
  {n:"탑지기 거미",ic:"spider",hp:24,atk:8,def:1,g:14,tier:2,taunt:["여덟 눈이 번득인다.","거미줄이 발목을 조인다."]},
  {n:"저주받은 기사",ic:"knight",hp:38,atk:10,def:4,g:22,tier:2,taunt:['"돌아가라…"',"냉기가 흐른다."]},
  {n:"굶주린 구울",ic:"ghoul",hp:34,atk:11,def:2,g:18,tier:2,taunt:["살점 냄새에 달려든다.","혀를 늘어뜨린다."]},
  {n:"동굴 박쥐떼",ic:"bat",hp:22,atk:9,def:1,g:16,tier:2,fly:true,taunt:["날갯짓 소리가 어둠을 채운다.","박쥐들이 얼굴로 달려든다."]},
  {n:"화염 정령",ic:"fire",hp:30,atk:13,def:1,g:26,tier:3,atkElem:"fire",taunt:["공기가 타오른다.",'"재가 되어라."']},
  {n:"석화의 고르곤",ic:"gorgon",hp:46,atk:12,def:5,g:30,tier:3,taunt:["뱀 머리가 쉭쉭거린다.","시선을 피해야 한다…"]},
];
/* 제2컨셉존(16~30층) — 천공의 성역: 타락한 천상의 존재들 */
const ENEMIES2=[
  {n:"천공 하피",ic:"harpy",hp:64,atk:17,def:4,g:44,tier:4,fly:true,taunt:["날카로운 비명이 귀를 찢는다.","깃털이 칼날처럼 쏟아진다."]},
  {n:"수정 골렘",ic:"crystal",hp:104,atk:15,def:10,g:52,tier:4,taunt:["수정 몸체가 빛을 굴절시킨다.","쩌적— 균열이 번뜩인다."]},
  {n:"빛의 망령",ic:"wraith",hp:78,atk:21,def:5,g:56,tier:5,taunt:["형체가 빛으로 일렁인다.","속삭임이 머릿속을 울린다."]},
  {n:"폭풍 와이번",ic:"wyvern",hp:118,atk:23,def:7,g:70,tier:5,fly:true,atkElem:"shock",taunt:["번개가 비늘을 타고 흐른다.","날개가 폭풍을 부른다."]},
  {n:"타락한 세라핌",ic:"seraph",hp:98,atk:25,def:8,g:78,tier:6,fly:true,taunt:['"타락한 낙원에 온 걸 환영한다."',"여섯 날개가 펼쳐진다."]},
  {n:"천둥새",ic:"thunderbird",hp:88,atk:27,def:4,g:66,tier:6,fly:true,atkElem:"shock",taunt:["대기가 찌릿하게 곤두선다.","방전이 시작된다."]},
];
/* 제3컨셉존(31~50층) — 시공의 균열: 인간의 이해를 벗어난 우주적 존재들 */
const ENEMIES3=[
  {n:"공허 포식자",ic:"voidbeast",hp:150,atk:32,def:10,g:90,tier:7,taunt:["공간이 일그러진다.","허기진 어둠이 다가온다."]},
  {n:"운석 거인",ic:"meteor",hp:210,atk:30,def:16,g:100,tier:7,atkElem:"fire",taunt:["불타는 바위가 굴러온다.","대지가 흔들린다."]},
  {n:"별의 잔영",ic:"starwraith",hp:158,atk:38,def:9,g:110,tier:8,atkElem:"frost",taunt:["별빛이 칼날로 응결된다.","죽은 별의 노래가 들린다."]},
  {n:"시간 파수꾼",ic:"timewarden",hp:186,atk:40,def:12,g:120,tier:8,taunt:["초침 소리가 멈춘다.","시간이 역행한다."]},
  {n:"무형의 관찰자",ic:"watcher",hp:170,atk:44,def:11,g:130,tier:9,taunt:["수천 개의 눈이 뜬다.","존재가 응시당한다."]},
  {n:"균열의 히드라",ic:"rifthydra",hp:236,atk:41,def:14,g:140,tier:9,taunt:["세 머리가 차원을 물어뜯는다.","균열에서 포효가 울린다."]},
];
const BOSSES={
  5:{n:"탑의 문지기 · 용암 골렘",ic:"golem",hp:70,atk:12,def:6,g:60,boss:true,sp:"용암 강타",weak:"frost",atkElem:"fire",taunt:["갈라진 몸에서 용암이 흘러내린다.","룬이 붉게 타오른다.",'"자격 없는 자는 오르지 못한다."']},
  10:{n:"핏빛 여백작",ic:"countess",hp:110,atk:16,def:6,g:120,boss:true,vamp:true,sp:"피의 강타",taunt:['"네 피는 좋은 빈티지겠구나."',"손톱을 세운다."]},
  15:{n:"심연의 촉수",ic:"tentacle",hp:150,atk:20,def:8,g:180,boss:true,sp:"촉수 난타",taunt:["바닥의 어둠이 살아 움직인다.","수십 촉수가 솟는다."]},
  20:{n:"성문의 수호자 · 아르콘",ic:"archon",hp:230,atk:26,def:12,g:260,boss:true,sp:"빛의 심판",taunt:["거대한 빛의 검이 내려온다.",'"여기서부터는 신의 영역이다."']},
  25:{n:"불멸의 대천사",ic:"archangel",hp:300,atk:30,def:12,g:340,boss:true,sp:"천상의 나팔",taunt:["세 쌍의 날개가 하늘을 가린다.","심판의 나팔이 울린다."]},
  30:{n:"천공의 대군주 · 메타트론",ic:"overlord",hp:420,atk:36,def:15,g:520,boss:true,sp:"천벌",taunt:["옥좌에서 눈을 뜬다.",'"천공의 끝에서 무엇을 바라느냐."']},
  35:{n:"차원의 파수꾼 · 크로노스",ic:"riftlord",hp:500,atk:40,def:16,g:620,boss:true,sp:"시간 정지",taunt:["시간이 멈춘 듯 고요하다.",'"네 시간은 여기서 끝난다."']},
  40:{n:"공허의 군주",ic:"voidlord",hp:560,atk:43,def:17,g:720,boss:true,sp:"공허 붕괴",taunt:["모든 빛이 빨려 들어간다.","무(無)가 입을 벌린다."]},
  45:{n:"별을 삼킨 자",ic:"stareater",hp:600,atk:44,def:17,g:820,boss:true,sp:"초신성",taunt:["삼켜진 별들이 뱃속에서 타오른다.","하늘이 텅 비었다."]},
  50:{n:"탑의 창조주 · 이름 없는 신",ic:"godhead",hp:680,atk:47,def:19,g:1200,boss:true,final:true,sp:"창조의 파동",taunt:["탑의 끝. 모든 것의 시작이 당신을 본다.",'"드디어… 나를 마주하러 왔는가."']},
};
/* ✨ 몬스터 시그니처 드랍 — "이 몹 잡으면 이게 나온다"(테마 매칭) · 풀 드랍 위에 낮은 확률로 얹음 */
const MONSTER_SIG={
  "동굴 박쥐":["낡은 장화"], "뼈 병사":["녹슨 단검"], "이끼 슬라임":["가죽 갑옷"], "탑지기 거미":["보조 단검"],
  "저주받은 기사":["병사의 방패"], "굶주린 구울":["흡혈의 반지"], "화염 정령":["화염의 장검"], "석화의 고르곤":["판금 흉갑","나무 부적"],
  "천공 하피":["천공 장화"], "수정 골렘":["천공 판금"], "빛의 망령":["천공 반지"], "폭풍 와이번":["뇌전의 활"],
  "타락한 세라핌":["천사의 깃털"], "천둥새":["천상의 장궁"],
  "공허 포식자":["공허 갑옷"], "운석 거인":["붕괴의 대검"], "별의 잔영":["성좌의 활"], "시간 파수꾼":["역행의 모래시계"],
  "무형의 관찰자":["시공 반지"], "균열의 히드라":["균열 방벽"],
  "탑의 문지기 · 골렘":["무쇠 세이버"], "핏빛 여백작":["흡혈의 반지"], "심연의 촉수":["서리 단검"],
  "성문의 수호자 · 아르콘":["천공 방패"], "불멸의 대천사":["천사의 깃털"], "천공의 대군주 · 메타트론":["천공 기사검"],
  "차원의 파수꾼 · 크로노스":["역행의 모래시계"], "공허의 군주":["공허 목걸이"], "별을 삼킨 자":["별을 꿰는 활"],
  "탑의 창조주 · 이름 없는 신":["창조주의 검"],
};
/* 👹 적 고유 기믹 — 타입별 특수 행동(각 전투를 다르게) */
const MECH_INFO={ thorns:{n:"가시",ic:"🌵"}, shield:{n:"보호막",ic:"🛡"}, enrage:{n:"광폭화",ic:"💢"}, regen:{n:"재생",ic:"💚"}, split:{n:"분열",ic:"🫧"} };
const MONSTER_MECH={
  "이끼 슬라임":"split", "탑지기 거미":"thorns", "화염 정령":"thorns", "굶주린 구울":"regen", "석화의 고르곤":"shield",
  "천공 하피":"enrage", "수정 골렘":"shield", "빛의 망령":"regen", "폭풍 와이번":"enrage", "타락한 세라핌":"regen", "천둥새":"thorns",
  "공허 포식자":"enrage", "운석 거인":"shield", "별의 잔영":"thorns", "시간 파수꾼":"regen", "무형의 관찰자":"thorns", "균열의 히드라":"split",
  "탑의 문지기 · 골렘":"shield", "핏빛 여백작":"enrage", "심연의 촉수":"split", "성문의 수호자 · 아르콘":"shield", "불멸의 대천사":"regen",
  "천공의 대군주 · 메타트론":"enrage", "차원의 파수꾼 · 크로노스":"regen", "공허의 군주":"enrage", "별을 삼킨 자":"shield", "탑의 창조주 · 이름 없는 신":"enrage",
};
function dropSignature(e,wasBoss){ if(!e)return; if(!P.bestiary)P.bestiary={};
  const b=P.bestiary[e.n]||(P.bestiary[e.n]={kills:0,drops:{},weak:null}); b.kills++; if(e.weak)b.weak=e.weak;   // 몬스터 도감 기록(약점·처치수·드랍)
  const sig=MONSTER_SIG[e.n]; if(!sig||!sig.length)return;
  const ch=clamp((wasBoss?0.06:0.012)*(1+metaEff().drop)+LUKv()*0.0005, 0, 0.09);   // 시그니처(고유 장비) 드랍 하향
  if(chance(ch)){ const item=pick(sig); addRelic(item); if(b.drops)b.drops[item]=true; line(`✨ <b>${e.n}</b>의 고유 드랍! <b>${item}</b>`,"loot"); toast("시그니처: "+item); } }
const TOP=50;
function makeEnemy(){ const f=P.floor; const ng=ngMul();
  if(BOSSES[f]){ const b=BOSSES[f]; const hp=Math.round(b.hp*ng); return {...b,hp,atk:Math.round(b.atk*ng),hpMax:hp,groggy:0,groggyMax:Math.round((40+f*2)*2.2),staggered:false,stagUsed:false}; }
  let base,s;
  if(f<=15){ const tierMax=f<4?1:f<8?2:3; base=pick(ENEMIES.filter(e=>e.tier<=tierMax)); s=1+(f-1)*0.14; }
  else if(f<=30){ const tierMax=f<20?4:f<25?5:6; base=pick(ENEMIES2.filter(e=>e.tier<=tierMax)); s=1+(f-16)*0.10; }   // 천공존
  else { const tierMax=f<40?7:f<45?8:9; base=pick(ENEMIES3.filter(e=>e.tier<=tierMax)); s=1+(f-31)*0.08; }             // 시공존
  const e={...base,hp:Math.round(base.hp*s*ng),atk:Math.round(base.atk*s*ng),def:base.def+Math.floor(f/6),g:Math.round(base.g*(1+(f-1)*0.12))};
  e.hpMax=e.hp; e.groggy=0; e.groggyMax=40+f*2; e.staggered=false; e.stagUsed=false; return e; }

function startCombat(e,intro){ if(typeof bgm==="function"){ const _B=(typeof BGM!=="undefined")?BGM:{};
    const _bn=(e&&e.final&&_B.finalboss&&_B.finalboss.src)?"finalboss":(e&&e.boss&&_B.boss&&_B.boss.src)?"boss":"combat"; bgm(_bn); } enemy=e; if(!enemy.weak)enemy.weak=elemForName(enemy.n); enemy.ail={}; enemy._weakShown=!!(P.codexWeak&&P.codexWeak[enemy.n]);   // 속성 약점(몬스터별 고정) + 상태이상 컨테이너
  if(enemy.mech===undefined)enemy.mech=MONSTER_MECH[enemy.n]||null;   // 👹 고유 기믹
  if(enemy.mech==="shield"){ enemy.shieldHp=Math.round(enemy.hpMax*0.28); enemy.shieldMax=enemy.shieldHp; }
  enemy.enraged=false; enemy.splitUsed=false;
  const pre=(B&&B.prebuff)?B:null;   // 🧪 보스 방 앞에서 미리 건 버프 이어받기
  B={comp:buildComp(P.companion),poison:0,diceUsed:false,enemyGuard:0,block:null,parry:null,shield:false,summon:null,quickProcs:0,enemyIntent:null,turn:0,swaps:0,momentum:0};
  if(pre){ B.atkPct=pre.atkPct||0; B.critB=pre.critB||0; B.defB=pre.defB||0; B.nextCrit=!!pre.nextCrit; }
  if(intro)line(intro,"sys"); line(`<b style="color:var(--danger)">⚔ ${enemy.n}</b> 이(가) 나타났다! ${pick(enemy.taunt)}`); if(typeof sfx==="function")sfx("encounter");
  if(enemy.fly)line(`🦅 <b>비행 몬스터</b> — 근접 무기(검·단검)는 <b>빗나갈 수 있다</b>. <b>활·마법</b>은 명중한다!`,"sys");   // 🦅 비행 안내
  if(B.comp){ line(`${B.comp.emoji} ${B.comp.n}이(가) 곁을 지킨다.`,"sys");
    const ru=B.comp.rune; if(ru){ if(ru.pAtk)B.atkPct=(B.atkPct||0)+ru.pAtk; if(ru.pCrit)B.critB=(B.critB||0)+ru.pCrit; if(ru.pDef)B.defB=(B.defB||0)+ru.pDef; } }   // 🔩 동료 룬: 동행 중 플레이어 패시브
  if(EXP)applyRegionDebuff();   // 개척: 지역 디버프 적용
  B.enemyIntent=rollIntent(); startPlayerTurn(); }
/* 🧠 몬스터 적응형 AI — 플레이어 상태를 읽고 반응(위기면 마무리 노림·궁지면 발악) */
function rollIntent(){ const e=enemy; const hpP=P.hp/Math.max(1,MAXHP()), eHpP=e.hp/Math.max(1,e.hpMax||e.hp);
  const lowP=hpP<0.35, critP=hpP<0.2, lowE=eHpP<0.3;
  const prev=(B&&B.enemyIntent)?B.enemyIntent.type:null;
  let w={ attack:1.0, heavy:e.boss?0.9:0.8, guard:0.5, poison:e.boss?0.5:0.45, special:e.boss?0.9:0 };
  if(lowP){ w.heavy*=1.9; w.special*=2.0; w.guard*=0.2; w.poison*=0.4; }   // 플레이어 위기 → 몰아붙임
  if(critP){ w.heavy*=1.3; w.special*=1.4; }                              // 빈사 → 더 세게
  if(lowE){ if(e.boss)w.special*=2.2; else w.guard*=1.9; w.heavy*=1.2; }   // 적 궁지 → 발악/생존
  if((prev==="heavy"||prev==="special")&&!chance(0.22)){ w.heavy*=0.35; w.special*=0.35; }   // 연속 예고 방지(가끔 콤보)
  const ent=Object.entries(w).filter(([,v])=>v>0); const tot=ent.reduce((a,[,v])=>a+v,0)||1; let r=Math.random()*tot, k="attack";
  for(const [kk,v] of ent){ r-=v; if(r<=0){ k=kk; break; } }
  let it;
  if(k==="special") it={type:"special",icon:"✴",label:e.sp||"필살기",preview:Math.round(e.atk*2.4)};
  else if(k==="heavy") it={type:"heavy",icon:"💢",label:"강타 준비",preview:Math.round(e.atk*2.0)};
  else if(k==="guard") it={type:"guard",icon:"🛡️",label:"방어 태세",preview:0};
  else if(k==="poison") it={type:"poison",icon:"☠",label:"맹독",preview:Math.round(e.atk*0.6)};
  else it={type:"attack",icon:"⚔️",label:"공격",preview:e.atk};
  if(it.type==="heavy") line(`⚠️ ${e.n}이(가) <b>강력한 일격</b>을 준비하고 있다…${lowP?" <b>위험!</b>":""}`,"dmg");
  else if(it.type==="special") line(`⚠️ ${e.n}에게서 심상찮은 기운 — <b>${it.label}</b>!${lowP?" <b>막지 못하면 끝이다!</b>":""}`,"dmg");
  return it; }

const POTION_HEAL=25;
const SWAP_MAX=2;   // 전투당 스킬 교체 가능 횟수 (전부는 못 바꾸고 전략적으로만)
/* 🌟 기세(모멘텀) — 잘 싸울수록(퍼펙트·치명·약점·패링) 차오르고, 가득 차면 초월기 발동 */
const MOM_MAX=100;
function gainMomentum(n){ if(!B||!enemy)return; const was=B.momentum||0; B.momentum=clamp(was+n,0,MOM_MAX);
  if(was<MOM_MAX && B.momentum>=MOM_MAX){ line("🌟 <b>기세가 최고조!</b> — 초월기를 사용할 수 있다! (커맨드 상단)","loot"); bigPop("READY!","#ffd36a"); } }
function startPlayerTurn(){ if(!enemy)return; B.turn=(B.turn||0)+1; if(hasSkill("meditate"))P.mp=clamp(P.mp+2,0,MAXMP());
  if(EXP && B.turn>1 && regionTurnTick())return;   // 개척: 지역 디버프 지속 피해(2턴째부터)
  if(B.summon && B.summon.turns>0 && enemy){ summonTick(); if(!enemy)return; }   // 소환수 자동 공격(특성 적용)
  B.quickProcs = 0;   // 턴 쪼개기: 이번 턴 속공 발동 횟수 리셋
  playerPhase(); turnBanner("MY TURN","me"); }   // 🎬 턴 표시는 배너 애니로만 (박스엔 '내 턴' 텍스트 안 넣음)
function playerPhase(){ if(!enemy)return; render(); setSceneFoe();
  const heavy=B.enemyIntent&&(B.enemyIntent.type==="heavy"||B.enemyIntent.type==="special");
  const hasActive=P.skills.some(k=>SKILLS[k]&&SKILLS[k].type==="active");
  const hasBag=Object.entries(P.consumables||{}).some(([k,q])=>q>0 && CONS[k] && CONS[k].use!=="heal" && CONS[k].use!=="slot");
  if(B.disarmed){                                          // 무장 해제: 검 줍기가 우선, 스킬/콤보 불가
    setActions([
      {label:"🏃 검 주우러 가기",desc:"회피하며 떨어진 검을 되찾는다 (완벽 회피 시 반격)",act:retrieveSword},
      {label:"🎒 다른 무기로 교체",desc:"가방 무기 착용 · 떨어진 검은 유실 위험",act:equipInsteadMenu},
      {label:"👊 맨손 공격",desc:"검 없이 약한 주먹",act:()=>startGauge("attack",q=>{ playerHit(q,0.7,q==="perfect"?"👊 정타!":"👊 맨손 공격"); if(enemy&&enemy.hp>0)afterPlayerAction(); })},
      {label:heavy?"🛡 방어 (강공 대비!)":"🛡 방어",desc:"완벽 타이밍 = 거의 무효",act:doGuard},
      {label:"🧪 물약",desc:"HP 회복 · 턴 소모 없음",disabled:!hasAnyPotion(),act:potionCombatMenu},
      {label:"🎒 가방",desc:hasBag?"버프·소비품":"쓸 소비품 없음",disabled:!hasBag,act:bagCombatMenu},
      {label:"🏃 도망치기",desc:fleeText(),full:true,act:playerFlee},
    ]); return;
  }
  // 포켓몬식 커맨드 박스 (2×2) — 패링/속공은 전투 중 '돌발'로 발동 (버튼 아님)
  const momReady=(B.momentum||0)>=MOM_MAX;
  const acts=[
    {label:enemy.staggered?"⚔️ 추격!":(momReady?"⚔️ 싸운다 🌟":"⚔️ 싸운다"),desc:(momReady?"🌟 초월기 준비! · ":"")+(enemy.staggered?"그로기 폭딜":"공격 · 스킬"),act:fightMenu},
    {label:heavy?"🛡 방어 (강공!)":"🛡 방어",desc:"완벽 타이밍 = 거의 무효",act:doGuard},
    {label:"🎒 가방",desc:"물약·소비품·장비·주사위",act:itemMenu},
    {label:"🏃 도망",desc:fleeText(),act:playerFlee},
  ];
  setActions(acts); }
function fightMenu(){ if(!enemy)return; const hasActive=P.skills.some(k=>SKILLS[k]&&SKILLS[k].type==="active"); const acts=[];
  if((B.momentum||0)>=MOM_MAX)acts.push({label:"🌟 초월기",desc:"쌓인 기세를 터뜨려 필살의 일격 (방어 무시 · 파훼) · 골라서 사용",full:true,act:useTranscend});
  if(enemy.staggered){ acts.push({label:"⚔️ 연속 공격",desc:"스페이스 연타 · 그로기 폭딜(2배)",act:comboAttack}); acts.push({label:"🗡 강한 일격",desc:"단발 강한 치명타(2배)",act:heavyHit}); }
  else { acts.push({label:"⚔️ 공격",desc:weaponPatternText(weaponType()),act:basicAttack}); }
  acts.push({label:"✨ 스킬",desc:hasActive?"스킬 사용 · 전투 중 교체":"배운 스킬 없음",disabled:!hasActive,act:skillCombatMenu});
  if(!B.disarmed)acts.push({label:"🔀 무기 교체",desc:`빠른 교체 · 턴 소모 없음 (전투당 ${WSWAP_MAX}회)`,act:weaponSwapMenu});
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
function itemMenu(){ if(!enemy)return; const hasBag=Object.entries(P.consumables||{}).some(([k,q])=>q>0 && CONS[k] && CONS[k].use!=="heal" && CONS[k].use!=="slot");
  setActions([
    {label:"🧪 물약",desc:"HP 회복 · 턴 소모 없음",disabled:!hasAnyPotion(),act:potionCombatMenu},
    {label:"🎒 소비품",desc:hasBag?"버프·스킬북":"쓸 소비품 없음",disabled:!hasBag,act:bagCombatMenu},
    {label:"🛡 장비 교체",desc:"무기·방어구 · 1턴 소모",act:equipCombatMenu},
    {label:B.diceUsed?"🎲 주사위 (소진)":"🎲 운명의 주사위",desc:"턴 소모 없음 · 전투당 1회",disabled:B.diceUsed,act:doDice},
    {label:"← 뒤로",full:true,act:playerPhase},
  ]); }
/* 🃏 카드 — 여러 종류 중 랜덤 3장을 뽑아 하나를 골라 사용 (버프/공격/디버프) */
const CARDS={
  slash:{n:"참격 카드",emoji:"⚔️",kind:"공격",desc:"강한 물리 타격",play:()=>{ playerHit("good",1.7,"⚔️ 참격 카드",false,{groggy:12}); }},
  flame:{n:"화염 카드",emoji:"🔥",kind:"공격",desc:"방어 무시 마법 화염",play:()=>{ const d=Math.max(1,Math.round(magicPow()*1.7+rnd(8))); hitEnemy(d,"🔥 화염 카드","#ff8a3a","fire"); fxShake(); }},
  thunder:{n:"벼락 카드",emoji:"⚡",kind:"공격",desc:"마법 피해 + 그로기",play:()=>{ const d=Math.max(1,Math.round(magicPow()*1.3+rnd(6))); addGroggy(24); hitEnemy(d,"⚡ 벼락 카드","#ffe08a","shock"); }},
  triple:{n:"연격 카드",emoji:"🗡",kind:"공격",desc:"3연타",play:()=>{ for(let i=0;i<3;i++){ if(!enemy||enemy.hp<=0)break; playerHit("good",0.6,`🗡 연격 ${i+1}`); } }},
  pierce:{n:"관통 카드",emoji:"🎯",kind:"공격",desc:"방어 무시 물리",play:()=>{ const d=Math.max(1,Math.round((ATK()+rnd(6))*1.3)); hitEnemy(d,"🎯 관통 카드","#ff8a8a"); }},
  power:{n:"강화 카드",emoji:"💪",kind:"버프",desc:"이번 전투 공격 +30%",play:()=>{ B.atkPct=(B.atkPct||0)+0.3; line("💪 공격력이 올랐다! (+30%)","loot"); }},
  guard:{n:"수호 카드",emoji:"🛡",kind:"버프",desc:"이번 전투 방어 +6",play:()=>{ B.defB=(B.defB||0)+6; line("🛡 방어가 단단해졌다! (+6)","heal"); }},
  focusc:{n:"집중 카드",emoji:"🌀",kind:"버프",desc:"다음 공격 확정 치명",play:()=>{ B.nextCrit=true; B.critB=(B.critB||0)+0.1; line("🌀 다음 공격 확정 치명!","loot"); }},
  healc:{n:"치유 카드",emoji:"✨",kind:"회복",desc:"HP 35% 회복",play:()=>{ heal(Math.round(MAXHP()*0.35)); }},
  drainc:{n:"흡수 카드",emoji:"🧛",kind:"공격",desc:"피해 + 절반 회복",play:()=>{ const d=Math.max(1,Math.round((ATK()+rnd(4))*1.1)); const hp0=enemy.hp; const killed=hitEnemy(d,"🧛 흡수 카드","#c96ad6"); heal(Math.round(Math.min(d,hp0)*0.5)); return killed; }},
  weakc:{n:"약화 카드",emoji:"💀",kind:"디버프",desc:"적 공격 -25%",play:()=>{ B.enemyWeak=Math.min(0.6,(B.enemyWeak||0)+0.25); line("💀 적의 공격이 약해졌다! (-25%)","heal"); }},
  exposec:{n:"노출 카드",emoji:"🎯",kind:"디버프",desc:"적 받는 피해 +30%",play:()=>{ B.enemyVuln=(B.enemyVuln||0)+0.3; line("🎯 적의 약점이 드러났다! (+30% 피해)","loot"); }},
  joker:{n:"조커 카드",emoji:"🃏",kind:"도박",desc:"랜덤 대박/꽝",play:()=>{ const r=Math.random();
    if(r<0.3){ const d=Math.max(1,Math.round((ATK()+rnd(6))*2.6)); hitEnemy(d,"🃏 조커 대박!","#ffd36a"); bigPop("JACKPOT!","#ffd36a"); fxShake(); }
    else if(r<0.55){ B.atkPct=(B.atkPct||0)+0.4; line("🃏 조커 — 공격 +40%!","loot"); }
    else if(r<0.8){ heal(Math.round(MAXHP()*0.4)); }
    else line("🃏 조커 — 꽝… 아무 일도 없었다.","sys"); }},
};
/* 카드 구역: 공격/수비/버프 — 매 공격마다 각 구역에서 1장씩 뽑아 엎어놓고, 뒷면에 구역을 표시(성향은 선택, 카드는 놀람) */
const CARD_ZONES={공격:{ic:"⚔️",col:"#ff8a8a"},수비:{ic:"🛡",col:"#7ad6c0"},버프:{ic:"✨",col:"#c9a9ff"}};
const CARD_BUCKET={ slash:"공격",flame:"공격",thunder:"공격",triple:"공격",pierce:"공격",drainc:"공격",joker:"공격",
  guard:"수비",healc:"수비",weakc:"수비", power:"버프",focusc:"버프",exposec:"버프" };
function drawCards(){ if(!enemy)return;
  const hand=["공격","수비","버프"].map(z=>{ const pool=Object.keys(CARDS).filter(k=>CARD_BUCKET[k]===z); return pick(pool); });
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ playCard(hand[0]); return; }
  awaiting=null; setActions([{label:"🃏 구역을 보고 한 장 선택",full:true,disabled:true,act:()=>{}}]);
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown cardpick";
  box.innerHTML=`<div class="et" style="color:#c9a9ff">🃏 <b>공격 · 수비 · 버프</b> — 성향을 골라 뒤집는다 (어떤 카드일지는 뒤집어야!)</div><div class="cprow">`+
    hand.map((k,i)=>{ const c=CARDS[k]; const z=CARD_BUCKET[k]; const zi=CARD_ZONES[z]; return `<div class="pcard" data-i="${i}"><div class="pcinner">`+
      `<div class="pcback"><span class="pze">${zi.ic}</span><span class="pzn" style="color:${zi.col}">${z}</span></div>`+
      `<div class="pcface"><span class="pce">${c.emoji}</span><span class="pcn">${c.n}</span><span class="pck">${c.kind}</span></div></div></div>`; }).join("")+`</div>`;
  s.appendChild(box); let chosen=false;
  box.querySelectorAll(".pcard").forEach(el=>{ el.onclick=()=>{ if(chosen)return; chosen=true; const i=+el.dataset.i; el.classList.add("flip");
    box.querySelectorAll(".pcard").forEach(o=>{ if(o!==el)o.classList.add("dim"); });
    setTimeout(()=>{ box.remove(); playCard(hand[i]); },640); }; }); }
function playCard(k){ if(!enemy)return; const c=CARDS[k]; line(`🃏 <b>${c.n}</b> 사용!`,"loot"); const killed=c.play(); render();
  if(killed||!enemy)return; if(enemy.hp<=0)return; afterPlayerAction(); }
/* 🔀 무기 빠른 교체 — 턴 소모 없음, 전투당 제한 */
const WSWAP_MAX=3;
/* 🔀 무기 빠른 교체 — 인벤처럼 아이콘 행으로 (스테이지 오버레이 · 전투 로그 유지) */
function weaponSwapMenu(){ if(!enemy)return; if(B.disarmed){ toast("무장 해제 상태"); return; }
  const left=WSWAP_MAX-(B.wswaps||0);
  const weapons=P.inv.filter(it=>RELICS[it.k]&&RELICS[it.k].slot==="weapon");
  const cur=equippedItem("weapon"); const s=$("stage"); if(!s)return;
  const old=s.querySelector(".wswap"); if(old)old.remove();
  const row=(it)=>{ const g=RELICS[it.k], w=g.wt&&WEAPONS[g.wt]; const equipped=cur&&cur.id===it.id; const mg=w?(MG_NAME[w.mg]||""):"";
    return `<div class="wsrow${equipped?' on':''}"><span class="wsic">${ico(relicIco(it.k),30)}</span>`+
      `<div class="wsm"><div class="wsn">${it.k}${it.up?` <b style="color:var(--gold)">+${it.up}</b>`:''}</div><div class="wsd">${gearTypeLabel(g)} · ${mg}</div></div>`+
      `${equipped?'<span class="wstag">착용중</span>':(left>0?`<button class="ibtn on wsbtn" data-id="${it.id}">교체</button>`:'<button class="ibtn" disabled>소진</button>')}</div>`; };
  const box=document.createElement("div"); box.className="wswap";
  box.innerHTML=`<div class="wshead"><span>🔀 무기 교체 <small>남은 ${left}회 · 턴 소모 없음</small></span><button class="wsx" aria-label="닫기">✕</button></div>`+
    `<div class="wslist">${weapons.length?weapons.map(row).join(""):'<div class="wsempty">가방에 무기가 없다</div>'}</div>`;
  s.appendChild(box);
  const close=()=>{ const bx=s.querySelector(".wswap"); if(bx)bx.remove(); };
  box.querySelector(".wsx").onclick=close;
  box.querySelectorAll("button.wsbtn[data-id]").forEach(b=>b.onclick=()=>{ const id=+b.dataset.id; close(); quickSwapWeapon(id); });
  setActions([{label:"← 전투로",full:true,act:()=>{ close(); fightMenu(); }}]); }
function quickSwapWeapon(id){ if(!enemy)return; if((B.wswaps||0)>=WSWAP_MAX){ toast("교체 횟수 소진"); return; } const it=P.inv.find(x=>x.id===id); if(!it)return;
  P.equip.weapon=it.id; B.wswaps=(B.wswaps||0)+1; line(`🔀 <b>${it.k}</b>(으)로 교체! (턴 소모 없음)`,"heal"); toast("무기 교체"); render(); setSceneFoe(); fightMenu(); }
/* 🐾 소환 (영창 길이 = 개체 등급) — 계약 몬스터 또는 무명 정령 */
const SUMMON_VERSE = "태초의 어둠과 빛이 갈라지던 순간의 이름으로 이 땅에 얽힌 계약의 사슬을 풀어 형상을 부여하노니 나의 부름에 응답하여 이 자리에 강림하라";
/* 소환수 고유 특성 — 계약 개체마다 고정 (무명 정령은 특성 없음) */
const SUMMON_TRAITS={
  venom:{n:"맹독",ic:"🩸",note:"공격 시 적에게 2턴 출혈"},
  crush:{n:"분쇄",ic:"🔨",note:"파훼(그로기) 축적 2배"},
  leech:{n:"흡성",ic:"🧛",note:"준 피해의 30% 내 HP 회복"},
  frenzy:{n:"광폭",ic:"🔥",note:"매 턴 피해 누적 +12%"},
};
function creatureTrait(name){ if(!name)return null; const keys=Object.keys(SUMMON_TRAITS); let h=0; for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0; return keys[h%keys.length]; }
/* 소환수 자동 공격 1회 (특성 반영) */
function summonTick(){ if(!B.summon||!enemy)return; const S=B.summon; const tr=S.trait; let sd=S.base||S.dmg;
  if(tr==="frenzy"){ S.stacks=(S.stacks||0)+1; sd=Math.round((S.base||S.dmg)*(1+0.12*S.stacks)); }
  if(tr==="crush")addGroggy(20);   // 분쇄: 추가 파훼
  const hp0=enemy.hp; const label=`${S.emoji} ${S.n}`+(tr?` ${SUMMON_TRAITS[tr].ic}`:"");
  const killed=hitEnemy(sd,label,"#c9a9ff");
  if(!killed&&enemy){
    if(tr==="venom"){ const dd=Math.max(2,Math.round(sd*0.3)); B.enemyDot={dmg:dd,turns:2}; }
    if(tr==="leech"){ const dealt=Math.min(sd,hp0); heal(Math.max(1,Math.round(dealt*0.3))); } }
  S.turns--;
  if(S.turns<=0){ line(`${S.emoji} ${S.n}이(가) 사라졌다.`,"sys"); B.summon=null; } }
function summonGrade(ratio){
  if(ratio<0.15) return null;
  if(ratio<0.40) return {tier:"하급", mult:0.55, turns:2, cls:"sys"};
  if(ratio<0.70) return {tier:"일반", mult:1.00, turns:4, cls:"loot"};
  if(ratio<0.90) return {tier:"상급", mult:1.45, turns:5, cls:"loot"};
  return {tier:"특급", mult:1.9, turns:6, cls:"loot"}; }
function beginSummon(){ if(!enemy)return; if(!P.skills.includes("summon")){ toast("소환술을 배워야 한다 (조련사 교관)"); return; }
  if(P.mp<SKILLS.summon.mp){ toast("기력 부족"); return; } summonMenu(); }
function summonMenu(){ if(!enemy)return; const acts=[];
  acts.push({label:"🌀 무명 정령 (계약 없이)",desc:"영창 완성도로 등급 결정 · 마력 기반",act:()=>doSummon(null)});
  (P.tamed||[]).forEach(c=>{ const tr=(c.trait&&SUMMON_TRAITS[c.trait])?c.trait:creatureTrait(c.n); const tt=SUMMON_TRAITS[tr];
    acts.push({label:`${IX[c.ic]?IX[c.ic][1]:"🐾"} ${c.n} ${tt?tt.ic:""}`,desc:`특성 ${tt?tt.n+" · "+tt.note:"없음"}`,act:()=>doSummon(c)}); });
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
function doSummon(creature){ if(!enemy)return;
  summonChant(ratio=>{ if(!enemy)return; const g=summonGrade(ratio);
    if(P.mp>=SKILLS.summon.mp)P.mp-=SKILLS.summon.mp; gainSkillXp("summon",10); render();
    if(!g){ line("🌫 영창이 흐트러졌다 — 소환에 실패했다. (기력 소모)","dmg"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
    const bond=passiveEquipped("beast_bond");
    const base = creature ? Math.min(creature.atk*0.65, ATK()*0.9) : magicPow()*1.0;
    const dmg=Math.max(4, Math.round(base*g.mult*(bond?1.2:1))); const turns=g.turns+(bond?1:0);
    const n=creature?creature.n:"무명 정령"; const emoji=creature?(IX[creature.ic]?IX[creature.ic][1]:"🐾"):"🌀";
    const trait=creature?(creature.trait&&SUMMON_TRAITS[creature.trait]?creature.trait:creatureTrait(creature.n)):null;
    B.summon={n:`${g.tier} ${n}`,emoji,dmg,base:dmg,turns,trait,stacks:0};
    line(`${emoji} <b>${g.tier} ${n}</b> 소환! ${turns}턴간 매 턴 자동 공격 (피해 ${dmg}) — 영창 완성도 ${Math.round(ratio*100)}%`, g.cls);
    if(trait)line(`　└ 특성 ${SUMMON_TRAITS[trait].ic} <b>${SUMMON_TRAITS[trait].n}</b> — ${SUMMON_TRAITS[trait].note}`,"sys");
    if(g.tier==="특급")bigPop("PERFECT!","#c9a9ff");
    fxShake(); render(); setSceneFoe(); afterPlayerAction(); }); }
/* 소환 영창 — 긴 시구를 제한 시간 안에 최대한 정확히 입력 · 앞에서부터 맞은 비율 = 완성도 */
function summonMatch(typed,phrase){ const a=(typed||"").replace(/\s/g,""), b=(phrase||"").replace(/\s/g,""); if(!b)return 1; if(!a)return 0;
  let match=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i])match++; else break; } return match/b.length; }
function summonChant(cb){ awaiting=null; setActions([]); const phrase=SUMMON_VERSE;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(1); return; }
  const timeMs = 4200 + phrase.replace(/\s/g,"").length*95;   // 길이만큼 시간이 다 늘지 않음 → 길게 갈수록 도박
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown spell";
  box.innerHTML=`<div class="et" style="color:#c9a9ff">🌀 소환 영창! 길게 완성할수록 강한 개체 — [Enter]로 확정</div>`+
    `<div class="chant">${phrase}</div><input class="chantin" id="chantin" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="여기에 최대한 입력…"><div class="ecbar"><i></i></div>`;
  s.appendChild(box); const bar=box.querySelector(".ecbar>i"); const inp=box.querySelector("#chantin"); let closed=false,iv=null;
  const finish=()=>{ if(closed)return; closed=true; if(iv)clearInterval(iv); const r=summonMatch(inp?inp.value:"",phrase); box.remove(); cb(r); };
  if(inp){ inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); finish(); } }); setTimeout(()=>{ try{ inp.focus(); }catch(e){} },30); }
  let t=timeMs; const total=t; iv=setInterval(()=>{ t-=50; if(bar)bar.style.width=Math.max(0,t/total*100)+"%"; if(t<=0)finish(); },50); }
/* 🌀 마법진 영창 — 빛나는 순서대로 룬을 이어 그린다. 이은 비율 = 완성도 (오답=시간 페널티) */
function drawCircle(cb){ awaiting=null; setActions([]);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(1); return; }
  const N=6; let t=4600; const total=t; const s=$("stage"); const box=document.createElement("div"); box.className="ecdown circlecast";
  const nodes=[]; let runes="";
  for(let i=0;i<N;i++){ const ang=-Math.PI/2 + i*(2*Math.PI/N); const x=50+Math.cos(ang)*38, y=50+Math.sin(ang)*38; nodes.push({x,y}); runes+=`<div class="rune" id="rune${i}" style="left:${x}%;top:${y}%">✦</div>`; }
  box.innerHTML=`<div class="et" style="color:#c9a9ff">🌀 마법진 영창! <b>빛나는 순서</b>대로 룬을 이어라 — 빠르고 정확할수록 강함</div>`+
    `<div class="glyph"><svg class="glines" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="gpoly" points=""/></svg>${runes}</div><div class="ecbar"><i></i></div>`;
  s.appendChild(box); const bar=box.querySelector(".ecbar>i"); const poly=box.querySelector("#gpoly");
  let idx=0,closed=false,tiv=null,giv=null; const pts=[];
  const finish=()=>{ if(closed)return; closed=true; if(tiv)clearInterval(tiv); if(giv)clearInterval(giv); box.remove(); cb(idx/N); };
  for(let i=0;i<N;i++){ const el=box.querySelector("#rune"+i); el.onclick=()=>{ if(closed)return;
    if(i===idx){ el.classList.add("lit"); el.classList.remove("next"); pts.push(nodes[i]); if(poly)poly.setAttribute("points",pts.map(p=>p.x+","+p.y).join(" ")); idx++; if(idx>=N)setTimeout(finish,180); }
    else { el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad"); t-=800; }   // 오답=시간 페널티(즉시 종료 아님)
  }; }
  giv=setInterval(()=>{ if(closed){clearInterval(giv);return;} for(let i=0;i<N;i++){ const el=box.querySelector("#rune"+i); if(el)el.classList.toggle("next",i===idx); } },120);
  tiv=setInterval(()=>{ t-=50; if(bar)bar.style.width=Math.max(0,t/total*100)+"%"; if(t<=0)finish(); },50); }
/* 🐾 소환/계약 메뉴 */
function beastMenu(){ if(!enemy)return; const acts=[]; const p=tameChance();
  acts.push({label: enemy.boss?"🪄 계약 (보스는 불가)":`🪄 계약 시도 (성공 ~${Math.round(p*100)}%)`,desc:"적 HP 낮을수록·행운·조련 숙련↑ · 실패 시 1턴",disabled:enemy.boss,act:tryTame});
  if(P.skills.includes("summon"))acts.push({label:"🌀 소환 (영창)",desc:P.mp<SKILLS.summon.mp?"기력 부족":"영창 완성도로 등급 결정",disabled:P.mp<SKILLS.summon.mp,act:beginSummon});
  else acts.push({label:"🌀 소환 (미습득)",desc:"조련사 교관에게 '소환'을 배우면 사용 가능",disabled:true,act:()=>{}});
  if(B.summon)acts.push({label:`📣 소환수 명령 (${B.summon.n})`,desc:"방어 태세 · 희생 폭발",act:beastCommandMenu});
  acts.push({label:"← 뒤로",full:true,act:skillCombatMenu}); setActions(acts); }
/* 소환수 명령 — 방어 태세(다음 적 공격 경감) / 희생 폭발(즉시 큰 피해 후 소멸) */
function beastCommandMenu(){ if(!enemy||!B.summon){ toast("소환수가 없다"); playerPhase(); return; } const S=B.summon; const acts=[];
  acts.push({label:"🛡 방어 태세",desc:S.guard?"이미 태세 중":"다음 적 공격 40% 경감 (자유행동)",disabled:!!S.guard,act:()=>{ S.guard=true; line(`🛡 ${S.emoji} ${S.n}이(가) 앞을 막아설 준비를 한다.`,"heal"); render(); setSceneFoe(); beastMenu(); }});
  const boom=Math.round((S.base||S.dmg)*2.5); acts.push({label:"💥 희생 폭발",desc:`즉시 ${boom} 피해 후 소환수 소멸 (턴 소모)`,act:()=>{ const killed=hitEnemy(boom,`💥 ${S.n} 희생!`,"#ff8f3c"); bigPop("BOOM!","#ff8f3c"); line(`💥 <b>${S.n}</b>이(가) 스스로를 터뜨렸다!`,"loot"); B.summon=null; fxShake(); render(); setSceneFoe(); if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }});
  acts.push({label:"← 뒤로",full:true,act:beastMenu}); setActions(acts); }
function tameChance(){ if(!enemy||enemy.boss)return 0; const hpf=enemy.hp/enemy.hpMax; return clamp((1-hpf)*0.65 + LUKv()*0.02 + (passiveEquipped("tame_mastery")?0.15:0), 0.05, 0.92); }
function tryTame(){ if(!enemy||enemy.boss)return; const p=tameChance();
  line(`🪄 <b>${enemy.n}</b>에게 계약을 시도한다… (성공 ${Math.round(p*100)}%)`,"sys");
  if(chance(p)){ if(!P.tamed)P.tamed=[]; const tr=creatureTrait(enemy.n); const c={n:enemy.n,ic:enemy.ic,atk:enemy.atk,trait:tr};
    if(!P.tamed.some(t=>t.n===c.n))P.tamed.push(c); if(P.tamed.length>12)P.tamed=P.tamed.slice(-12);
    line(`✨ <b>계약 성공!</b> ${enemy.n}이(가) 소환수가 되었다. (특성 ${SUMMON_TRAITS[tr].ic} ${SUMMON_TRAITS[tr].n})`,"loot"); toast("계약 성공: "+enemy.n);
    P.kills++; enemy=null; B=null; save(true);
    if(expReturn){ const r=expReturn; expReturn=null; render(); setScene("🐾","계약 성공!"); setTimeout(r,180); return; }
    render(); setScene("🐾","계약 성공 — 소환수를 얻었다."); showClimb(); return; }
  line("계약 실패! 상대가 저항한다.","dmg"); render(); afterPlayerAction(); }
function hasAnyPotion(){ if(P.potions>0)return true; for(const k in (P.consumables||{})){ const c=CONS[k]; if(c&&c.use==="heal"&&P.consumables[k]>0)return true; } return false; }
function potionCombatMenu(){ if(!enemy)return; const heals=[];
  if(P.potions>0)heals.push({key:"__basic",n:"물약",emoji:"🧪",amount:POTION_HEAL,q:P.potions});
  for(const [k,q] of Object.entries(P.consumables||{})){ const c=CONS[k]; if(c&&c.use==="heal"&&q>0)heals.push({key:k,n:c.n,emoji:c.emoji,amount:c.amount||25,q}); }
  if(heals.length===0){ toast("물약이 없다"); playerPhase(); return; }
  const full=P.hp>=MAXHP();
  const acts=heals.map(h=>({label:`${h.emoji} ${h.n} +${h.amount} ×${h.q}`,desc:full?"이미 가득":"턴 소모 없음 · 즉시 회복",disabled:full,act:()=>drinkAny(h.key)}));
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
function drinkAny(key){ if(!enemy)return; if(P.hp>=MAXHP()){ toast("이미 가득"); potionCombatMenu(); return; }
  if(key==="__basic"){ if(P.potions<=0){ potionCombatMenu(); return; } P.potions--; heal(POTION_HEAL); }
  else { const c=CONS[key]; if(!c||(P.consumables[key]||0)<=0){ potionCombatMenu(); return; } heal(c.amount||25); P.consumables[key]--; if(P.consumables[key]<=0)delete P.consumables[key]; }
  render(); if(enemy&&P.hp>0)potionCombatMenu(); }   // 자유행동(턴 소모 없음) · 메뉴 유지로 연속 사용   /* 자유행동: 턴 소모 없음 */
function weaponType(){ if(typeof B!=="undefined"&&B&&B.disarmed)return "fist"; const it=equippedItem("weapon"); const w=it&&RELICS[it.k]; return (w&&w.wt)?w.wt:(it?"sword":"fist"); }
function basicAttack(){ const w=WEAPONS[weaponType()]||WEAPONS.sword; const lbl=`${w.ic} ${w.n} · 속도 ${gaugeTier()}`;
  if(w.mg==="figure"){ runDagger(w, hits=>{                 // 단검: 급소 주사위 도박
      for(const h of hits){ if(!enemy||enemy.hp<=0)break; playerHit(h.q, w.mult, `${w.ic} 급소 찌르기${h.q==="perfect"?" 💥치명!":""}`, h.q==="perfect", {critBonus:w.crit,groggy:w.groggy}); }
      if(enemy&&enemy.hp>0 && hits.jackpot){ const jm=hits.jackpot==="jackpot"?3.2:1.6;   // 잭팟/대박 추가 일격
        playerHit("perfect", w.mult*jm, hits.jackpot==="jackpot"?"🎰 JACKPOT 일격!":"✨ 대박 추가타!", true, {critBonus:w.crit,groggy:w.groggy*2}); }
      if(enemy&&enemy.hp>0)afterPlayerAction(); }); return; }
  if(w.mg==="twinbar"){ runDaggerBar(q=>{                    // 단검: 2영역 게이지 (둘 다 맞추면 완벽)
      if(q==="perfect")playerHit("perfect", w.mult*1.6, "🗡 완벽한 급소 2연격!", true, {critBonus:w.crit,groggy:w.groggy+8});
      else playerHit(q, w.mult, q==="good"?"🗡 급소 타격":"🗡 빗맞았다", false, {critBonus:w.crit,groggy:w.groggy});
      if(enemy&&enemy.hp>0)afterPlayerAction(); }); return; }
  if(w.mg==="dice"){ rollDice3Anim((d1,d2,d3)=>{ if(!enemy)return; const sum=d1+d2+d3; const trip=(d1===d2&&d2===d3);   // 주사위 3개 (합 3~18)
      let mult=w.mult*(0.45+sum*0.05); let q=sum>=16?"perfect":sum<=6?"weak":"good"; let crit=false; let tag="";
      if(trip){ if(d1===6){ mult=w.mult*3.8; q="perfect"; crit=true; tag=" 🎰 666 잭팟!"; bigPop("JACKPOT!!!","#ffd36a"); fxHit(); }
                else { mult=w.mult*2.2; q="perfect"; crit=true; tag=` ✨ ${d1}${d1}${d1} 트리플!`; bigPop("TRIPLE!","#ff8f3c"); } }
      playerHit(q,mult,`🎲 주사위 (${d1}·${d2}·${d3}=${sum})${tag||(sum<=6?" 꽝…":"")}`,crit,{critBonus:w.crit,groggy:w.groggy});
      if(enemy&&enemy.hp>0)afterPlayerAction(); }); return; }   // 주사위 무기: 트리플=대박, 합이 높을수록↑ (평균은 완만)
  if(w.mg==="card"){ drawCards(); return; }                 // 카드 무기: 3장 뽑아 1장으로 공격/버프
  if(w.mg==="saber"){ runSaber((q,pm)=>{ if(!enemy)return;   // 🌙 세이버: 강격 차지 (강격존=강격+큰 그로기, 과충전=빗나감)
      playerHit(q, w.mult*pm, `🌙 ${w.n}${q==="perfect"?" 강격":""}`, false, {critBonus:(w.crit||0)+(q==="perfect"?0.12:0)});
      if(enemy&&enemy.hp>0){ addGroggy(Math.round((w.groggy||18)*(q==="perfect"?2.2:1))); afterPlayerAction(); } }); return; }
  if(w.mg==="slash"){ runSwordCombo((q,i,combo)=>{ if(!enemy||enemy.hp<=0)return;   // ⚔ 검: 연속 베기 콤보(3연타 리듬)
      const cm=1+Math.max(0,combo-1)*0.2;   // 연속 정타 콤보 가속
      if(combo>=2&&typeof fxSlash==="function")fxSlash(i%2?1:-1);
      playerHit(q, w.mult*0.42*cm, `⚔ 베기 ${i+1}${q==="perfect"?" 정타":""}${combo>=2?` ${combo}콤보`:""}`, false, {critBonus:w.crit,groggy:Math.round((w.groggy||10)*0.5)});
    }, ()=>{ if(enemy&&enemy.hp>0)afterPlayerAction(); }); return; }
  if(w.mg==="charge"){ runCharge(q=>{ playerHit(q,w.mult,weaponLabel(w,q),q==="perfect",{critBonus:w.crit,groggy:w.groggy}); if(enemy&&enemy.hp>0)afterPlayerAction(); }); return; } // 활: 활시위 당기기(가득=치명)
  if(w.mg==="aim"){ aimSeq(w,0); return; }                  // (예비) 접근원 조준
  if(w.hits>1){ weaponMultiHit(w,0,lbl); return; }
  startGauge("attack",q=>{ playerHit(q,w.mult,weaponLabel(w,q),false,{critBonus:w.crit,groggy:w.groggy}); if(enemy&&enemy.hp>0)afterPlayerAction(); }, w.gauge, lbl); } // 검·세이버·맨손: 타이밍 게이지
/* 단검 = 2영역 게이지: 마커가 좌→우로 지나가며, 두 영역에 각각 [클릭/스페이스]로 맞춘다. 둘 다 = 완벽(큰 데미지) */
function runDaggerBar(cb){ awaiting=null;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("good"); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown twinbar";
  const w1=17,w2=17; const z1=6+rnd(22); let z2=z1+24+rnd(20); if(z2+w2>93)z2=93-w2;   // 겹치지 않는 두 영역(넉넉하게)
  box.innerHTML=`<div class="et" style="color:#7fd6c0">🗡 급소 <b>2연격</b>! 마커가 <b>두 영역</b>에 있을 때 [클릭/스페이스] — 우→좌 <b>왕복</b> 동안 둘 다 맞추면 <b style="color:#ffd36a">완벽!</b></div>`+
    `<div class="tbar"><div class="tzone" id="tz0" style="left:${z1}%;width:${w1}%"></div><div class="tzone" id="tz1" style="left:${z2}%;width:${w2}%"></div><div class="tmk" id="tmk"></div></div>`+
    `<div class="et" id="tbres" style="min-height:22px;font-size:16px"></div>`;
  s.appendChild(box); const mk=box.querySelector("#tmk"), res=box.querySelector("#tbres");
  const zones=[{l:z1,r:z1+w1,el:box.querySelector("#tz0"),hit:false},{l:z2,r:z2+w2,el:box.querySelector("#tz1"),hit:false}];
  let pos=0,dir=1,raf=null,done=false,taps=0,hits=0; const speed=1.25*clamp(0.9+(enemy?enemy.atk:6)*0.005,0.9,1.4);   // 완만하게(맞추기 쉽게)
  const finish=()=>{ if(done)return; done=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); box.remove(); cb(hits>=2?"perfect":hits>=1?"good":"weak"); };
  const tap=()=>{ if(done)return; taps++; const z=zones.find(z=>!z.hit && pos>=z.l && pos<=z.r);
    if(z){ z.hit=true; hits++; if(z.el)z.el.classList.add("on"); res.innerHTML=`<span style="color:#ffd36a">명중! (${hits}/2)</span>`; }
    else res.innerHTML=`<span style="color:#8a3b3b">빗나감 (${hits}/2)</span>`;
    if(hits>=2||taps>=2){ setTimeout(finish,180); } };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); tap(); } };
  document.addEventListener("keydown",key); box.onclick=tap; setActions([{label:"🗡 찌르기!",full:true,act:tap}]);
  const step=()=>{ if(done)return; pos+=dir*speed;
    if(pos>=100){ pos=100; dir=-1; }                                   // 우측 끝 → 좌로 되돌아옴
    else if(dir<0 && pos<=0){ pos=0; if(mk)mk.style.left="0%"; finish(); return; }   // 좌측 복귀 = 왕복 끝
    if(mk)mk.style.left=pos+"%"; raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); }
/* (미사용) 단검 주사위 도박 */
function runDagger(w,cb){ awaiting=null;
  const N=(w&&w.hits)||3;
  const rolls=Array.from({length:N},()=>1+rnd(6));
  const qof=v=>v>=5?"perfect":v>=2?"good":"weak";
  const hits=rolls.map(v=>({part:"급소",q:qof(v),roll:v}));
  hits.jackpot = rolls.every(v=>v===6)?"jackpot":(rolls.every(v=>v>=5)?"big":null);   // 잭팟 판정
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(hits); return; }
  setActions([]); const s=$("stage"); const box=document.createElement("div"); box.className="diceov";
  const dhtml=rolls.map((_,i)=>`<span class="dice" id="dg${i}">🎲</span>`).join("");
  box.innerHTML=`<div class="et" style="color:#ffd36a">🎲 급소 <b>도박</b>! <span style="color:#ff8f3c">5~6 = 💥치명</span> · <span style="color:#ffd36a">⚅⚅⚅ = 잭팟</span> · 1 = 빗나감</div>`+
    `<div class="dicewrap">${dhtml}</div><div class="et" id="dgres" style="min-height:24px;font-size:22px"></div>`;
  s.appendChild(box); let n=0;
  const iv=setInterval(()=>{ for(let i=0;i<N;i++){ const el=$("dg"+i); if(el)el.textContent=DICE_FACE[rnd(6)]; }
    if(++n>=13){ clearInterval(iv);
      for(let i=0;i<N;i++){ const el=$("dg"+i); if(el){ el.textContent=DICE_FACE[rolls[i]-1]; el.style.color=rolls[i]>=5?"#ff8f3c":rolls[i]===1?"#8a3b3b":"#e8c56a"; } }
      box.classList.add("done"); const crits=rolls.filter(v=>v>=5).length; const res=$("dgres");
      if(hits.jackpot==="jackpot"){ res.innerHTML=`🎰 <b style="color:#ffd36a">J A C K P O T !!!</b>`; bigPop("🎰 JACKPOT!!!","#ffd36a"); fxShake(); fxHit(); }
      else if(hits.jackpot==="big"){ res.innerHTML=`✨ <b style="color:#ff8f3c">대박! 전부 치명!</b>`; bigPop("대박!","#ff8f3c"); fxShake(); }
      else if(res)res.innerHTML= crits? `💥 <b style="color:#ff8f3c">치명타 ${crits}연격!</b>` : (rolls.every(v=>v===1)?'<span style="color:#8a3b3b">전부 빗나감…</span>':'명중');
      fxShake();
      setTimeout(()=>{ box.remove(); cb(hits); }, hits.jackpot?1050:720); } }, 85); }
/* 접근원 조준: 큰 링이 줄어들어 중앙 표적에 맞을 때 발사 · 정확(perfect)=치명 추가타 */
function aimSeq(w,i){ runAim(q=>{
    const perfect=(q==="perfect"); const lab=`${w.ic} ${w.n}${w.hits>1?` ${i+1}타`:""}${perfect?" ⚡정확!":""}`;
    playerHit(q, w.mult, lab, perfect, {critBonus:w.crit, groggy:w.groggy});   // 정확히 맞으면 강제 치명(추가데미지)
    if(!enemy||enemy.hp<=0)return;
    if(i+1<w.hits){ aimSeq(w,i+1); return; }
    afterPlayerAction(); }); }
/* 🌙 세이버 강격 차지 — 게이지가 차오름, 금색 강격존(72~92%)에서 릴리즈=강격, 너무 끌면(>92%) 과충전=빗나감(양날) */
function runSaber(cb){ awaiting=null; setActions([]);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("perfect",1.55); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown saber";
  box.innerHTML=`<div class="et" style="color:#ffd98a">🌙 <b>강격 차지</b> — <b>금색 강격존</b>에서 [클릭/스페이스]! 너무 끌면 과충전(빗나감)</div>`
    +`<div class="sbar"><div class="szone"></div><div class="sfill" id="sfill"></div></div>`;
  s.appendChild(box); const fill=box.querySelector("#sfill");
  let v=0, raf=null, done=false; const spd=1.7;
  const finish=(q,pm)=>{ if(done)return; done=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); box.remove();
    if(q==="perfect"){ bigPop("강격!","#ffd98a"); fxShake(); fxHit(); } render(); cb(q,pm); };
  const tap=()=>{ if(done)return; let q,pm;
    if(v<40){ q="weak"; pm=0.8; } else if(v<72){ q="good"; pm=1.05; } else if(v<=92){ q="perfect"; pm=1.6; }
    else { q="weak"; pm=0.6; line("🌀 과충전 — 참격이 빗나갔다!","dmg"); } finish(q,pm); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); tap(); } };
  document.addEventListener("keydown",key); box.onclick=tap; setActions([{label:"🌙 강격!",full:true,act:tap}]);
  const step=()=>{ if(done)return; v+=spd; if(v>=100){ v=100; tap(); return; } if(fill)fill.style.width=v+"%"; raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); }
/* 활시위 당기기 (활): 시위를 당길수록 게이지가 차오름 → 가득 당긴 파워존에서 발사 · 과도하게 당기면 놓침 */
/* ⚔ 검 = 연속 베기 콤보: 짧은 왕복 라운드 3회 · 노란 존에서 [탭] · 연속 정타로 콤보 가속(존이 좁아짐) */
function runSwordCombo(hitCb, doneCb){ awaiting=null;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ for(let i=0;i<3;i++)hitCb("good",i,i+1); if(doneCb)doneCb(); return; }
  const ROUNDS=3; let round=0, combo=0, pos=0, dir=1, raf=null, tapped=false, ended=false, zl=0, zw=0;
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown swordcombo";
  box.innerHTML=`<div class="et" id="scmsg" style="color:#ffb060">⚔ <b>연속 베기 1/${ROUNDS}</b> — 마커가 <b style="color:#ffd36a">노란 존</b>에 올 때 [클릭/스페이스]! 연속 정타로 <b>콤보 가속</b></div>`+
    `<div class="tbar"><div class="tzone sc" id="sczone"></div><div class="tmk" id="scmk"></div></div>`+
    `<div class="et" id="scres" style="min-height:22px;font-size:16px"></div>`;
  s.appendChild(box);
  const mk=box.querySelector("#scmk"), zone=box.querySelector("#sczone"), res=box.querySelector("#scres"), msg=box.querySelector("#scmsg");
  const speed=()=>2.3*clamp(0.9+(enemy?enemy.atk:6)*0.008,0.9,1.4)+combo*0.5;
  const finish=()=>{ if(ended)return; ended=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); box.onclick=null; setTimeout(()=>{ box.remove(); if(doneCb)doneCb(); }, 240); };
  const startRound=()=>{ if(ended)return; tapped=false; pos=0; dir=1; zw=Math.max(13, 20-combo*2); zl=12+rnd(58); if(zl+zw>92)zl=92-zw;
    if(zone){ zone.style.left=zl+"%"; zone.style.width=zw+"%"; }
    if(msg)msg.innerHTML=`⚔ <b>연속 베기 ${round+1}/${ROUNDS}</b>${combo>=1?` · <span style="color:#ffd36a">${combo+1}콤보 노림!</span>`:""}`;
    setActions([{label:`⚔ 베기 (${round+1}/${ROUNDS})`,full:true,act:tap}]);
    raf=requestAnimationFrame(step); };
  const judge=(q)=>{ if(ended)return; if(q!=="weak")combo++; else combo=0; hitCb(q, round, combo);
    if(res)res.innerHTML = q==="perfect"?`<span style="color:#ffd36a">정타!${combo>=2?` ${combo}콤보`:""}</span>`:q==="good"?`<span style="color:#7fd6c0">명중</span>`:`<span style="color:#8a3b3b">빗나감 · 콤보 끊김</span>`;
    round++; if(round>=ROUNDS){ finish(); return; } setTimeout(startRound,210); };
  const tap=()=>{ if(ended||tapped)return; tapped=true; cancelAnimationFrame(raf);
    const c=zl+zw/2; const q=(pos>=zl&&pos<=zl+zw)?"perfect":(Math.abs(pos-c)<=zw?"good":"weak"); judge(q); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); tap(); } };
  document.addEventListener("keydown",key); box.onclick=tap;
  const step=()=>{ if(ended||tapped)return; pos+=dir*speed(); if(pos>=100){ pos=100; dir=-1; } else if(pos<=0&&dir<0){ pos=0; if(!tapped){ tapped=true; cancelAnimationFrame(raf); judge("weak"); return; } } if(mk)mk.style.left=pos+"%"; raf=requestAnimationFrame(step); };
  startRound(); }
function runCharge(cb){ awaiting=null;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("good"); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown chg";
  box.innerHTML=`<div class="et" style="color:#8fd0ff">🏹 <b>꾹 눌러</b> 시위를 당기고 <b>파워존</b>에서 손을 떼라! (마우스/스페이스 홀드 · 과하면 놓침)</div>`+
    `<div class="chgbar"><div class="chgzone"></div><div class="chgfill" id="chgfill"></div></div>`;
  s.appendChild(box); const fill=box.querySelector("#chgfill");
  let p=0,raf=null,done=false,holding=false,started=false,idle=0; const speed=1.9*clamp(0.9+(enemy?enemy.atk:6)*0.02,0.9,2.0);
  const cleanup=()=>{ document.removeEventListener("keydown",kd); document.removeEventListener("keyup",ku); box.remove(); };
  const fire=()=>{ if(done)return; done=true; cancelAnimationFrame(raf); cleanup(); const q=(p>=72&&p<=99)?"perfect":(p>=42?"good":"weak"); cb(q); };
  const hold=()=>{ if(done)return; holding=true; started=true; };
  const release=()=>{ if(done)return; if(started)fire(); };
  const kd=(e)=>{ if((e.code==="Space"||e.key===" ")&&!e.repeat){ e.preventDefault(); hold(); } };
  const ku=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); release(); } };
  document.addEventListener("keydown",kd); document.addEventListener("keyup",ku);
  box.onpointerdown=(e)=>{ if(e&&e.preventDefault)e.preventDefault(); hold(); }; box.onpointerup=(e)=>{ if(e&&e.preventDefault)e.preventDefault(); release(); };
  const ab=$("actions"); ab.innerHTML=""; const hb=document.createElement("button"); hb.className="full"; hb.textContent="🏹 꾹 눌러 당기기 → 떼면 발사";
  hb.onpointerdown=(e)=>{ if(e&&e.preventDefault)e.preventDefault(); hold(); }; hb.onpointerup=(e)=>{ if(e&&e.preventDefault)e.preventDefault(); release(); }; hb.onpointerleave=()=>{ if(holding&&!done)release(); }; ab.appendChild(hb);
  const loop=()=>{ if(done)return; if(holding){ p+=speed; if(p>=100){ p=100; if(fill)fill.style.width="100%"; fire(); return; } } else if(!started){ if(++idle>240){ fire(); return; } } if(fill)fill.style.width=p+"%"; raf=requestAnimationFrame(loop); };
  raf=requestAnimationFrame(loop); }
/* 조준 미니게임 (활): 링이 가장 작아졌을 때 발사 = 정중앙 명중 */
function runAim(cb){ awaiting=null; setActions([]);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("good"); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown aim";
  box.innerHTML=`<div class="et" style="color:#8fd0ff">🎯 링이 표적에 딱 맞을 때 [스페이스] 또는 아래 버튼! (정확=추가타)</div>`+
    `<div class="aimwrap"><div class="aimbull">🎯</div><div class="aimring" id="aimring"></div></div>`;
  s.appendChild(box); const ring=box.querySelector("#aimring");
  let r=100,dir=-1,raf=null,done=false; const speed=1.6*clamp(0.9+(enemy?enemy.atk:6)*0.02,0.9,1.9);
  const stop=()=>{ if(done)return; done=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); box.remove();
    const q=r<=24?"perfect":r<=46?"good":"weak"; cb(q); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); stop(); } };
  document.addEventListener("keydown",key); box.onclick=stop; setActions([{label:"🎯 명중!",full:true,act:stop}]);   // 아래 버튼 + 화면 클릭
  const RSZ=150;   // 링을 px로 크기 지정 → 항상 정원(찌그러짐 방지)
  const step=()=>{ r+=dir*speed; if(r<=12){ r=12; dir=1; } if(r>=100){ r=100; dir=-1; } if(ring){ const px=Math.round(r/100*RSZ); ring.style.width=px+"px"; ring.style.height=px+"px"; } raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); }
function weaponMultiHit(w,i,lbl){ startGauge("attack",q=>{
    playerHit(q,w.mult,`${w.ic} ${w.n} ${i+1}타`,false,{critBonus:w.crit,groggy:w.groggy});
    if(!enemy||enemy.hp<=0)return;
    if(i+1<w.hits){ weaponMultiHit(w,i+1,lbl); return; }
    afterPlayerAction();
  }, w.gauge, `${lbl} (연타 ${i+1}/${w.hits})`); }
function weaponLabel(w,q){ return q==="perfect"?`⚡ <b>${w.n} 완벽 타격!</b>`:q==="good"?`${w.n}으로 베어냈다`:"빗맞았다"; }
/* 급소 포인트 미니게임 (단검류): 가운데 인간형 위로 빨간 급소가 뜨면 제한시간 안에 빠르게 클릭 · 반응속도로 판정 */
function skillProf(k){ if(!P.skillProf)P.skillProf={}; if(!P.skillProf[k])P.skillProf[k]={lv:1,xp:0}; return P.skillProf[k]; }
function skillMul(k){ return 1 + (skillProf(k).lv-1)*0.08; }
function gainSkillXp(k,n){ const p=skillProf(k); p.xp+=n; let up=false; while(p.xp>=p.lv*30){ p.xp-=p.lv*30; p.lv++; up=true; }
  if(up)line(`📈 <b>${SKILLS[k].n}</b> 숙련도 상승! Lv.${p.lv} (효과 +${Math.round((skillMul(k)-1)*100)}%)`,"loot"); }
/* 🎯 스킬용 무기별 타이밍 — 장착 무기의 미니게임으로 성공도(quality)를 판정 (가운데 타이밍만이 아니라 다양하게) */
function weaponSkillTiming(cb){ const w=WEAPONS[weaponType()]||WEAPONS.sword;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("good"); return; }
  if(w.mg==="charge"){ runCharge(cb); return; }                          // 🏹 활: 시위 당기기
  if(w.mg==="twinbar"){ runDaggerBar(cb); return; }                      // 🗡 단검: 2영역 급소
  if(w.mg==="saber"){ runSaber((q)=>cb(q)); return; }                    // 🌙 세이버: 강격 차지
  if(w.mg==="dice"){ rollDice3Anim((a,b,c)=>{ const s=a+b+c; cb(s>=14?"perfect":s<=6?"weak":"good"); }); return; }   // 🎲 주사위
  if(w.mg==="slash"){ startGauge("attack",cb,(w.gauge||1)*0.85,"⚔ 베기 타이밍!"); return; }   // ⚔ 검: 빠른 단일 베기
  startGauge("attack",cb,w.gauge||1,"🎯 타이밍!"); }                       // 기본(맨손·카드 등)
function skillCombatMenu(){ const actives=(P.loadout||[]).filter(k=>SKILLS[k]&&SKILLS[k].type==="active");
  const acts=actives.map(k=>{ const s=SKILLS[k]; const wepOk=(typeof weaponOkForSkill==="function")?weaponOkForSkill(k):true;
    return {label:`${s.emoji} ${s.n} Lv.${skillProf(k).lv}${!wepOk?" 🚫":""}`,desc:`기력 ${s.mp}${s.wep?` · ${wepReqLabel(k)}`:""}${!wepOk?" · ⚠무기 교체 필요":""} · ${s.desc}`,disabled:P.mp<s.mp||!wepOk,act:()=>useSkill(k)}; });
  if(actives.length===0)acts.push({label:"(장착한 액티브 스킬 없음 · 아래에서 교체)",disabled:true,act:()=>{}});
  const bench=P.skills.filter(k=>SKILLS[k]&&SKILLS[k].type==="active"&&!P.loadout.includes(k));
  const used=B.swaps||0;
  if(bench.length>0) acts.push({label:`🔄 스킬 교체 (${SWAP_MAX-used}/${SWAP_MAX})`,desc:used>=SWAP_MAX?"이번 전투 교체 소진":"미장착 스킬 장착 · 턴 소모",disabled:used>=SWAP_MAX,act:skillSwapMenu});
  if(P.skills.includes("summon")||P.skills.includes("tame_mastery")||(P.tamed&&P.tamed.length))   // 조련사 계열을 배웠거나 계약한 개체가 있을 때만
    acts.push({label:"🐾 소환 / 계약",desc:"소환수 부르기 · 몬스터 계약(테이밍) · 소환수 명령",full:true,act:beastMenu});
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
/* 전투 중 스킬 스위칭 — 턴을 소모하고 전투당 SWAP_MAX회 제한 (전략적 사용) */
function skillSwapMenu(){ if(!enemy)return; if((B.swaps||0)>=SWAP_MAX){ toast("이번 전투 교체 소진"); skillCombatMenu(); return; }
  const bench=P.skills.filter(k=>SKILLS[k]&&SKILLS[k].type==="active"&&!P.loadout.includes(k));
  const full=P.loadout.length>=activeCap();
  const acts=[{label:`🔄 스킬 교체 · 남은 ${SWAP_MAX-(B.swaps||0)}회 (턴 소모)`,disabled:true,act:()=>{}}];
  bench.forEach(k=>{ const s=SKILLS[k]; acts.push({label:`${s.emoji} ${s.n} Lv.${skillProf(k).lv}`,desc:full?"장착 스킬과 교체":"빈 슬롯에 장착",act:()=> full?swapReplace(k):doSwap(null,k)}); });
  if(bench.length===0)acts.push({label:"(교체할 미장착 스킬 없음)",disabled:true,act:()=>{}});
  acts.push({label:"← 뒤로",full:true,act:skillCombatMenu}); setActions(acts); }
function swapReplace(inK){ if(!enemy)return; const s=SKILLS[inK];
  const acts=[{label:`❌ 어떤 스킬을 빼고 ${s.emoji} ${s.n} 넣을까?`,disabled:true,act:()=>{}}];
  P.loadout.forEach(k=>{ const o=SKILLS[k]; acts.push({label:`❌ ${o.emoji} ${o.n} 빼기`,desc:`→ ${s.emoji} ${s.n} 장착`,act:()=>doSwap(k,inK)}); });
  acts.push({label:"← 뒤로",full:true,act:skillSwapMenu}); setActions(acts); }
function doSwap(outK,inK){ if(!enemy)return; if((B.swaps||0)>=SWAP_MAX){ toast("교체 소진"); return; }
  if(outK)P.loadout=P.loadout.filter(k=>k!==outK);
  if(!P.loadout.includes(inK)&&P.loadout.length<activeCap())P.loadout.push(inK);
  B.swaps=(B.swaps||0)+1;
  line(`🔄 전투 중 스킬 교체! ${outK?`${SKILLS[outK].n} → `:""}<b>${SKILLS[inK].n}</b> 장착 (남은 ${SWAP_MAX-B.swaps}회)`,"loot"); toast("스킬 교체");
  render(); afterPlayerAction(); }   // 턴 소모 → 적이 행동한다
function bagCombatMenu(){ const items=Object.entries(P.consumables||{}).filter(([k,q])=>q>0 && CONS[k] && CONS[k].use!=="heal" && CONS[k].use!=="slot");
  const acts=items.map(([key,q])=>{ const c=CONS[key]; return {label:`${c.emoji} ${c.n} ×${q}`,desc:c.note,act:()=>useConsumableCombat(key)}; });
  if(items.length===0)acts.push({label:"(사용할 소비품 없음)",disabled:true,act:()=>{}});
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
/* 전투 중 장비 교체 — 1턴 소모 */
function equipCombatMenu(){ if(!enemy)return;
  const gear=P.inv.filter(it=>RELICS[it.k]&&RELICS[it.k].slot&&!isEquippedItem(it));
  const acts=[{label:"🛡 전투 중 장비 교체 (1턴 소모)",disabled:true,act:()=>{}}];
  if(gear.length===0)acts.push({label:"(가방에 교체할 장비 없음)",disabled:true,act:()=>{}});
  gear.forEach(it=>{ const g=RELICS[it.k];
    acts.push({label:`${it.k}${it.up?' +'+it.up:''} 착용`,desc:`${gearTypeLabel(g)} · ${g.note||""}`,act:()=>doEquipCombat(it.id)}); });
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
function doEquipCombat(id){ if(!enemy)return; const it=P.inv.find(x=>x.id===id); if(!it)return; const g=RELICS[it.k]; if(!g||!g.slot)return;
  P.equip[g.slot]=it.id; if(g.slot==="weapon")B.disarmed=false;
  line(`🛡 전투 중 <b>${it.k}</b> 착용! (1턴 소모)`,"loot"); toast("장비 교체"); render(); setSceneFoe(); afterPlayerAction(); }
function useConsumableCombat(key){ if((P.consumables[key]||0)<=0)return; const c=CONS[key];
  if(c.use==="learn"){ if(!learnFromBook(c.skill)){ playerPhase(); return; } }
  else if(c.use==="stat"){ P.stats[c.stat]++; line(`${c.emoji} ${c.n} 사용 · ${STAT_NAME[c.stat]} +1!`,"loot"); checkTitleUnlocks(); }
  else if(c.use==="buff"){ P.buffs[c.buff]=(P.buffs[c.buff]||0)+c.amount; line(`${c.emoji} ${c.n} 사용 · ${c.note}`,"heal"); }
  else if(c.use==="resist"){ P.buffs.regionResist=c.resKey; line(`${c.emoji} ${c.n} 사용 · ${c.note}`,"heal"); toast("지역 내성 획득"); if(EXP&&EXP.debuff&&EXP.debuffKey===c.resKey&&B){ /* 이미 걸린 정적 디버프는 다음 전투부터 무효 */ } }
  else if(c.use==="heal"){ heal(c.amount||25); }
  P.consumables[key]--; if(P.consumables[key]<=0)delete P.consumables[key]; render(); afterPlayerAction(); }
/* 그로기 */
function addGroggy(n){ if(!enemy||enemy.staggered||(B&&B.charge))return; enemy.groggy=(enemy.groggy||0)+n;
  if(enemy.groggy>=enemy.groggyMax){ enemy.staggered=true; enemy.groggy=enemy.groggyMax;
    line(`💫 <b>그로기!</b> ${enemy.n}이(가) 휘청인다 — 받는 피해 2배 · 다음 행동 불가!`,"loot"); fxShake(); }
  updateGroggyBar(); }
function updateGroggyBar(){ if(!enemy)return; const b=$("ebar-g"); if(b){ b.style.width=clamp(enemy.groggy/enemy.groggyMax*100,0,100)+"%"; b.parentElement.classList.toggle("stag",!!enemy.staggered); } }
/* 연속 공격 (콤보) */
function comboAttack(){ B.combo=0; comboStep(); }
function comboStep(){ const mul=1+B.combo*0.2, cnt=B.combo+1;
  startGauge("attack",q=>{
    if(q==="weak"){ line(`콤보 ${B.combo}연타에서 끊겼다.`,"sys"); playerComboHit("weak"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
    B.combo++;
    const dir=(B.combo%2===0)?1:-1; if(typeof fxSlash==="function")fxSlash(dir); if(typeof sfx==="function")sfx("combohit");   // 🗡 좌우 번갈아 베기(종횡무진)
    if(B.combo===3)bigPop("연격!","#ffd36a"); else if(B.combo===5)bigPop("난도질!","#ff8f3c"); else if(B.combo===7){ bigPop("종횡무진!","#ff5a5a"); if(typeof fxShakeHard==="function")fxShakeHard(); }
    const killed=playerComboHit(q);
    if(killed||!enemy)return;
    if(B.combo>=8){ line("🔥 <b>종횡무진 — 최대 콤보!</b>","loot"); if(typeof fxShakeHard==="function")fxShakeHard(); if(typeof sfx==="function")sfx("crit"); afterPlayerAction(); return; }
    comboStep();
  }, mul, `연속 공격! ${cnt}타 · 속도 ${gaugeTier()}`); }
function playerComboHit(q){ const qm=q==="perfect"?1.7:q==="good"?1.1:0.5;
  let dmg=Math.max(1,Math.round((ATK()+rnd(3))*0.78*qm*(1+(B.combo||0)*0.07))-enemy.def);   // 콤보가 쌓일수록 가속(썰어버리는 쾌감)
  addGroggy(q==="weak"?4:14+rnd(6)); if(q!=="weak"&&typeof fxHit==="function")fxHit();
  return hitEnemy(dmg, q==="perfect"?"⚡ 콤보 정타":q==="good"?"콤보 타격":"콤보 빗맞음", q==="perfect"?"#ffd36a":"#ffb060"); }
/* 강한 일격 — 뒤질 정도로 묵직한 한 방(뽕맛) */
function heavyHit(){ startGauge("attack",q=>{
    const crit=q!=="weak"; let m=q==="perfect"?3.4:q==="good"?2.1:0.8;   // perfect 2.5→3.4 대폭↑
    let dmg=Math.round((ATK()+rnd(4))*m); if(crit&&q!=="perfect")dmg=Math.round(dmg*1.35);
    dmg=Math.max(1,dmg-enemy.def); addGroggy(12);
    if(q==="perfect"){ if(typeof fxShakeHard==="function")fxShakeHard(); if(typeof fxBigHit==="function")fxBigHit(); if(typeof fxSlash==="function"){ fxSlash(-1); fxSlash(1); } if(typeof sfx==="function"){ sfx("heavy"); sfx("crit"); } bigPop("일격 필살!","#ff5a5a"); }
    else if(crit){ fxShake(); if(typeof fxSlash==="function")fxSlash(-1); if(typeof sfx==="function")sfx("slash"); }
    const killed=hitEnemy(dmg, q==="perfect"?"💥 <b>필살의 일격 — 대격돌!</b>":q==="good"?"🗡 강한 일격":"🗡 빗맞은 일격", crit?"#ffd36a":"#ff8a8a");
    if(!killed&&enemy&&enemy.hp>0)afterPlayerAction();
  }, 1.15); }

/* 무장 해제 → 검 주우러 가기 (회피 QTE 연속) */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const SWORD_SPOTS=["샹들리에에 박혔다","저편 기둥에 꽂혔다","바닥 돌 틈에 박혔다","몬스터 발치까지 날아갔다","벽에 깊이 박혔다"];
const DODGE_EVENTS=[
  {text:"몬스터가 <b>왼쪽</b>에서 발톱을 휘두른다!",opts:[{label:"➡ 오른쪽으로 구른다",safe:true},{label:"⬅ 왼쪽으로 구른다"}]},
  {text:"<b>오른쪽</b>에서 꼬리가 날아온다!",opts:[{label:"⬅ 왼쪽으로 피한다",safe:true},{label:"➡ 오른쪽으로 피한다"}]},
  {text:"머리 위로 이빨이 내리꽂힌다!",opts:[{label:"↩ 옆으로 구른다",safe:true},{label:"🧍 그대로 달린다"}]},
  {text:"앞에 큰 바위가 가로막는다!",opts:[{label:"⤴ 뛰어넘는다",safe:true},{label:"💥 부딪힌다"}]},
  {text:"발밑 바닥이 쩍 갈라진다!",opts:[{label:"⤴ 점프한다",safe:true},{label:"🏃 그냥 달린다"}]},
  {text:"불길이 앞을 덮친다!",opts:[{label:"🛷 미끄러져 빠져나간다",safe:true},{label:"🔥 뚫고 지나간다"}]},
  {text:"촉수가 발목을 노린다!",opts:[{label:"⤴ 뛰어오른다",safe:true},{label:"👟 짓밟는다"}]},
  {text:"천장에서 돌덩이가 쏟아진다!",opts:[{label:"➡ 오른쪽으로 대시",safe:true},{label:"🛑 멈춰 선다"}]},
];
function retrieveSword(){ if(B._retrieving)return; B._retrieving=true; setActions([]);   // 연타 방지: 버튼 즉시 제거
  line(`검이 날아가 ${pick(SWORD_SPOTS)}! 몬스터 공격을 피하며 달려가 되찾아라!`,"sys"); retrieveGauntlet(pick([3,3,4]),0); }
/* 검 줍기 대신 가방의 다른 무기로 교체 — 떨어진 검은 유실 위험(회수 확률 존재) */
function equipInsteadMenu(){ if(!enemy)return; setActions([]);
  const dropped=equippedItem("weapon");
  const weapons=P.inv.filter(it=>RELICS[it.k]&&RELICS[it.k].slot==="weapon"&&(!dropped||it.id!==dropped.id));
  if(weapons.length===0){ toast("가방에 바꿔 낄 무기가 없다"); playerPhase(); return; }
  const rec=Math.round(clamp(0.45+LUKv()*0.03,0.2,0.85)*100);
  line(`떨어진 검 대신 다른 무기를 낀다. 떨어진 검 회수 확률 ~${rec}% (실패 시 유실).`,"sys");
  const acts=weapons.map(it=>{ const g=RELICS[it.k]; return {label:`${it.k}${it.up?' +'+it.up:''} 착용`,desc:`${WEAPONS[g.wt]?WEAPONS[g.wt].n:"무기"} · 회수 ~${rec}%`,act:()=>swapWeaponDisarmed(it.id)}; });
  acts.push({label:"← 뒤로",full:true,act:playerPhase}); setActions(acts); }
function swapWeaponDisarmed(newId){ if(!enemy)return; const dropped=equippedItem("weapon");
  P.equip.weapon=newId; B.disarmed=false; B._retrieving=false;
  if(dropped&&dropped.id!==newId){ if(chance(clamp(0.45+LUKv()*0.03,0.2,0.85))){ line(`무기를 바꾸는 사이 떨어진 <b>${dropped.k}</b>도 재빨리 회수했다!`,"heal"); }
    else { const i=P.inv.findIndex(x=>x.id===dropped.id); if(i>=0)P.inv.splice(i,1); line(`무기를 바꿔 꼈다. 떨어진 <b>${dropped.k}</b>은(는) 몬스터 발치에 남아 유실됐다…`,"dmg"); } }
  const nw=P.inv.find(x=>x.id===newId); line(`🗡️ <b>${nw?nw.k:"새 무기"}</b>(으)로 교체! 무장 해제 해제.`,"loot"); toast("무기 교체"); render(); setSceneFoe(); playerPhase(); }
function retrieveGauntlet(left,hits){ if(!enemy)return;
  if(left<=0){ B.disarmed=false; B._retrieving=false; line("🗡️ <b>검을 되찾았다!</b> 무장 해제 해제.","loot"); render(); setSceneFoe();
    if(hits===0){ line("💨 완벽한 질주! 되찾자마자 반격!","loot"); fxShake(); const dmg=Math.round(ATK()*1.6)+rnd(6); if(hitEnemy(dmg,"⚡ 되찾기 반격!","#ffd36a"))return; }
    else line("숨을 몰아쉬며 검을 다시 움켜쥐었다.","sys");
    if(enemy&&enemy.hp>0&&P.hp>0)playerPhase(); return; }
  const ev=pick(DODGE_EVENTS); const opts=shuffle(ev.opts.slice());
  runDodge(left, ev.text, opts, (safe)=>{
    if(safe){ line(pick(["아슬아슬하게 피했다!","가까스로 넘겼다!","완벽하게 회피!"])+` (검까지 ${left-1>0?left-1+'걸음':'도착!'})`,"heal"); retrieveGauntlet(left-1,hits); }
    else { const d=Math.max(3,Math.round(enemy.atk*0.55)); P.hp-=d; line(`${pick(["제대로 맞았다!","피하지 못했다!","휘청였다!"])} ${d} 피해.`,"dmg"); fxPlayerHurt(); fxShake(); spawnFloat("-"+d,"#ff8a8a","me"); render();
      if(P.hp<=0){ die(); return; } retrieveGauntlet(left-1,hits+1); }
  }); }
function runDodge(left,text,opts,cb){ awaiting=null; setActions([]);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(!!opts.find(o=>o.safe)); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown";
  box.innerHTML=`<div class="et" style="color:#ffd36a">🏃 검까지 ${left}걸음! ${text}</div><div class="ecbar"><i></i></div><div class="ecbtns"></div>`;
  s.appendChild(box); const bar=box.querySelector(".ecbar>i"); const btns=box.querySelector(".ecbtns"); let closed=false,iv=null;
  const finish=(safe)=>{ if(closed)return; closed=true; if(iv)clearInterval(iv); box.remove(); cb(safe); };
  opts.forEach(o=>{ const b=document.createElement("button"); b.innerHTML=o.label; b.onclick=()=>finish(!!o.safe); btns.appendChild(b); });
  let t=2600; const total=t; iv=setInterval(()=>{ t-=100; if(bar)bar.style.width=Math.max(0,t/total*100)+"%"; if(t<=0)finish(false); },100); }
function gaugeSpeed(mode){ const pow=enemy?enemy.atk:6; const diff=clamp(0.85+pow*0.06,0.85,2.6); return (mode==="block"?2.1:1.6)*diff; }
function gaugeTier(){ const pow=enemy?enemy.atk:6; return pow>=18?"★★★★ 극악":pow>=13?"★★★ 빠름":pow>=8?"★★ 보통":"★ 느림"; }
function startGauge(mode,cb,speedMul,labelText){ awaiting=null;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb("good"); return; }
  const s=$("stage"); const g=document.createElement("div"); g.className="gauge";
  const lab = labelText || (mode==="block"?"완벽한 순간에 막아라!":"딱 멈춰 치명타!")+` · 속도 ${gaugeTier()}`;
  g.innerHTML=`<div class="track"><div class="mk"></div></div><div class="lab">${lab} — [스페이스] 또는 아래 버튼</div>`;
  s.appendChild(g); const mk=g.querySelector(".mk"); let pos=rnd(30),dir=1,speed=gaugeSpeed(mode)*(speedMul||1),raf=null,done=false;
  const stop=()=>{ if(done)return; done=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); s.onclick=null; g.remove(); const d=Math.abs(pos-50); cb(d<=6?"perfect":d<=18?"good":"weak"); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); stop(); } };
  document.addEventListener("keydown",key); s.onclick=stop;   // 화면 아무 데나 클릭해도 멈춤
  const step=()=>{ pos+=dir*speed; if(pos>=100){pos=100;dir=-1;} if(pos<=0){pos=0;dir=1;} mk.style.left=pos+"%"; raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); setActions([{label:"■ 멈춰!",full:true,act:stop}]); }

/* ✨ 스킬 콤보 체인 — 특정 스킬을 순서대로 쓰면 연계 발동(턴 쪼개기·교체와 시너지) */
const COMBOS=[
  {seq:["weaken","heavy_strike"], n:"처형 연계", fx:()=>{ const d=Math.round(ATK()*2.5+rnd(8)); hitEnemy(d,"☠️ 처형 연계","#ff5a5a"); }},
  {seq:["expose","double_slash"], n:"약점 연격", fx:()=>{ const d=Math.round(ATK()*1.9+rnd(6)); hitEnemy(d,"🎯 약점 연격","#ff8f3c"); }},
  {seq:["sunder","heavy_strike"], n:"파쇄격",   fx:()=>{ addGroggy(45); const d=Math.round(ATK()*2.0+rnd(6)); hitEnemy(d,"🔨 파쇄격","#ffd36a"); }},
  {seq:["focus","power_shot"],    n:"일점 집중", fx:()=>{ B.critB=(B.critB||0)+0.3; line("🎯 <b>일점 집중</b> — 치명률이 치솟는다! (+30%)","loot"); }},
  {seq:["war_cry","execute"],     n:"최후의 결전", fx:()=>{ B.atkPct=(B.atkPct||0)+0.25; const d=Math.round(ATK()*1.6+rnd(8)); hitEnemy(d,"⚔️ 결전","#ff8f3c"); }},
  {seq:["bleed_blade","expose"],  n:"출혈 격발", fx:()=>{ const dd=(B.enemyDot&&B.enemyDot.dmg)||Math.round(ATK()*0.4); const d=dd*3; hitEnemy(d,"🩸 출혈 격발","#ff5a5a"); }},
];
function checkCombo(){ if(!B||!B.chain||!enemy)return false;
  for(const c of COMBOS){ const n=c.seq.length; if(B.chain.length>=n && c.seq.every((s,i)=>B.chain[B.chain.length-n+i]===s)){
    line(`✨ <b>콤보! ${c.n}</b> — 연계가 폭발한다!`,"loot"); bigPop("COMBO!","#ffd36a"); fxShake(); fxHit(); c.fx(); B.chain=[]; return true; } }
  return false; }
function skillChainStep(k){ if(!B||!enemy)return; if(!B.chain)B.chain=[]; B.chain.push(k); if(B.chain.length>3)B.chain.shift();
  if(checkCombo())return;
  const op=COMBOS.find(c=>c.seq[0]===k); if(op){ const nx=SKILLS[op.seq[1]]; line(`　└ <span style="color:#c9a9ff">연계 가능</span> — 이어서 <b>${nx?nx.n:op.seq[1]}</b> → <b>${op.n}</b>`,"sys"); } }
function useSkill(k){ const s=SKILLS[k]; if(P.mp<s.mp){ toast("기력 부족"); return; }
  if(typeof weaponOkForSkill==="function" && !weaponOkForSkill(k)){ toast(`⚠ ${wepReqLabel(k)} 무기가 필요해요 (가방에서 무기 교체)`); line(`🚫 <b>${s.n}</b>은(는) <b>${wepReqLabel(k)}</b> 무기로만 쓸 수 있다 — 무기를 바꿔야 한다.`,"dmg"); return; }   // 🗡️ 무기별 스킬 게이팅
  if(k==="summon"){ beginSummon(); return; }   // 소환: 메뉴→영창 후 확정 시 기력 차감
  P.mp-=s.mp; const m=skillMul(k); gainSkillXp(k,10); render();
  skillChainStep(k); if(!enemy)return;   // ✨ 콤보 판정(연계 폭발이 적을 처치하면 스킬 본체는 생략)
  if(k==="heavy_strike") weaponSkillTiming(q=>{ if(q==="perfect"){ if(typeof fxShakeHard==="function")fxShakeHard(); if(typeof fxBigHit==="function")fxBigHit(); if(typeof fxSlash==="function"){fxSlash(-1);fxSlash(1);} if(typeof sfx==="function"){sfx("heavy");sfx("crit");} bigPop("완벽 강타!","#ff5a5a"); } else if(typeof fxSlash==="function"){ fxSlash(-1); if(typeof sfx==="function")sfx("slash"); } playerHit(q,(q==="perfect"?2.9:2.1)*m,q==="perfect"?"💥 완벽 강타!":"💥 강타!"); if(enemy&&enemy.hp>0)afterPlayerAction(); });
  else if(k==="power_shot") weaponSkillTiming(q=>{ playerHit(q,1.4*m,"🎯 급소 찌르기",true); if(enemy&&enemy.hp>0)afterPlayerAction(); });
  else if(k==="double_slash") weaponSkillTiming(q=>{ if(typeof fxSlash==="function")fxSlash(-1); if(typeof sfx==="function")sfx("combohit"); playerHit(q,1.05*m,"⚔️ 연속 1타"); if(enemy&&enemy.hp>0){ if(typeof fxSlash==="function")fxSlash(1); if(typeof sfx==="function")sfx("combohit"); playerHit(q,1.05*m,"⚔️ 연속 2타"); } if(enemy&&enemy.hp>0)afterPlayerAction(); });
  else if(k==="execute") weaponSkillTiming(q=>{ const low=enemy.hp/enemy.hpMax<0.3; playerHit(q,(low?4.5:1.5)*m,low?"☠️ 처형!":"☠️ 처형"); if(enemy&&enemy.hp>0)afterPlayerAction(); });
  else if(k==="fireball"){ castSpell(k,(ratio,power)=>{ if(!enemy)return;
      if(ratio<0.3){ line("🌫 영창 실패! 파이어볼이 흩어졌다. (기력 소모)","dmg"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
      line(power>=1.5?"🔥 <b>긴 영창이 완성됐다 — 대폭발!</b>":"🔥 파이어볼을 시전한다!","loot");
      const dmg=Math.max(1,Math.round((magicPow()*2*m+rnd(6))*power)-Math.floor(enemy.def/2)); const killed=hitEnemy(dmg,"🔥 파이어볼","#ff8a3a","fire"); fxShake();
      if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }); }
  else if(k==="heal_spell"){ castSpell(k,(ratio,power)=>{
      if(ratio<0.3){ line("🌫 영창 실패! 회복술이 흩어졌다. (기력 소모)","dmg"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
      line(power>=1.5?"✨ <b>긴 영창이 완성됐다 — 충만한 치유!</b>":"✨ 회복술을 시전한다.","heal"); heal(Math.round((magicPow()*2.2*m+8)*power)); afterPlayerAction(); }); }
  else if(k==="war_cry"){ B.atkPct=(B.atkPct||0)+0.35; line("🗣️ <b>전투 함성!</b> 이번 전투 공격력이 크게 올랐다. (+35%)","loot"); fxShake(); render(); afterPlayerAction(); }
  else if(k==="iron_will"){ B.defB=(B.defB||0)+6; line("🛡️ <b>강철 의지</b> — 이번 전투 방어가 단단해졌다. (방어 +6)","heal"); render(); afterPlayerAction(); }
  else if(k==="barrier"){ B.defB=(B.defB||0)+8; line("🔮 <b>마력 방벽</b>이 몸을 감쌌다. (방어 +8)","heal"); render(); afterPlayerAction(); }
  else if(k==="sunder"){ enemy.def=Math.max(0,enemy.def-4); addGroggy(20); line(`🔨 <b>무장 파괴!</b> ${enemy.n}의 방어가 무너졌다. (방어 -4)`,"loot"); fxShake(); render(); if(enemy&&enemy.hp>0)afterPlayerAction(); }
  else if(k==="expose"){ B.enemyVuln=(B.enemyVuln||0)+0.35; line(`🎯 <b>약점 노출!</b> ${enemy.n}이(가) 받는 피해가 늘었다. (+35%)`,"loot"); render(); afterPlayerAction(); }
  else if(k==="weaken"){ B.enemyWeak=Math.min(0.6,(B.enemyWeak||0)+0.3); line(`💀 <b>약화의 저주</b> — ${enemy.n}의 공격이 약해졌다. (-30%)`,"heal"); render(); afterPlayerAction(); }
  else if(k==="focus"){ B.nextCrit=true; B.critB=(B.critB||0)+0.12; line("🌀 <b>집중</b> — 다음 공격은 확정 치명! (치명률도 ↑)","loot"); render(); afterPlayerAction(); }
  else if(k==="bleed_blade"){ const dd=Math.max(3,Math.round(ATK()*0.35*m)); B.enemyDot={dmg:dd,turns:4}; line(`🩸 <b>맹독 도포!</b> ${enemy.n}이(가) 출혈 상태가 됐다. (4턴 · 턴당 ${dd})`,"loot"); render(); afterPlayerAction(); }
  else if(k==="awaken"){ if(B.awakened){ toast("이미 각성했다"); P.mp+=s.mp; render(); return; } B.awakened=true; B.atkPct=(B.atkPct||0)+0.4; B.critB=(B.critB||0)+0.2; B.defB=(B.defB||0)+5; line("🔥 <b>각성!</b> 모든 힘이 폭발적으로 상승한다! (공격+40% 치명+20% 방어+5)","loot"); fxShake(); fxHit(); render(); afterPlayerAction(); }
  else if(k==="wild_call"){ if(!B.summon){ toast("소환수가 없다"); P.mp+=s.mp; render(); return; }
      const d=Math.max(4,Math.round(B.summon.dmg*1.6)); line(`📣 <b>야성의 부름!</b> ${B.summon.emoji} ${B.summon.n}이(가) 맹공을 퍼붓는다!`,"loot"); bigPop("RUSH!","#c9a9ff");
      const killed=hitEnemy(d,`${B.summon.emoji} 맹공`,"#c9a9ff"); fxShake(); if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }
  else if(k==="lucky_strike"){ startGauge("attack",q=>{ const cb=clamp(0.15+LUKv()*0.02,0.15,0.75); line(`🍀 행운의 일격! (치명 확률 +${Math.round(cb*100)}%p)`,"loot"); playerHit(q,1.5*m,"🍀 행운의 일격",false,{critBonus:cb}); if(enemy&&enemy.hp>0)afterPlayerAction(); }); }
  else if(k==="loaded_dice"){ B.lukB=(B.lukB||0)+8; line("🎯 <b>납주사위</b> — 이번 전투 운이 크게 따른다. (행운 +8)","loot"); render(); afterPlayerAction(); }
  else if(k==="all_in"){ const bet=Math.max(1,Math.round(P.hp*0.15)); P.hp-=bet; fxPlayerHurt(); spawnFloat("-"+bet,"#ff8a8a","me");
      if(P.hp<=0){ render(); die(); return; }
      if(chance(0.7)){ const d=Math.round(ATK()*3.2*m+rnd(8)); line(`💰 <b>올인 — 대박!</b> 판돈을 쓸어담는 일격! (HP ${bet} 소모)`,"loot"); bigPop("JACKPOT!","#ffd36a"); const killed=hitEnemy(Math.max(1,d-enemy.def),"💰 올인","#ffd36a"); fxShake(); if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }
      else { line(`💸 <b>올인 — 헛손질!</b> 판돈만 날렸다. (HP ${bet} 소모)`,"dmg"); render(); if(enemy&&enemy.hp>0)afterPlayerAction(); } }
  else if(k==="wild_card"){ const roll=rnd(4); render();
      if(roll===0){ const d=Math.round(ATK()*2.6*m+rnd(6)); line("🃏 와일드카드 — <b>폭딜!</b>","loot"); bigPop("HIT!","#ff8f3c"); const killed=hitEnemy(Math.max(1,d-enemy.def),"🃏 와일드카드","#ff8f3c"); fxShake(); if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }
      else if(roll===1){ const h=Math.round(MAXHP()*0.35); heal(h); line("🃏 와일드카드 — <b>회복!</b> HP가 차오른다.","heal"); render(); afterPlayerAction(); }
      else if(roll===2){ B.atkPct=(B.atkPct||0)+0.3; B.critB=(B.critB||0)+0.15; line("🃏 와일드카드 — <b>강화!</b> 이번 전투 공격력·치명 상승.","loot"); render(); afterPlayerAction(); }
      else { line("🃏 와일드카드 — <b>꽝…</b> 아무 일도 없었다.","sys"); render(); afterPlayerAction(); } }
  else if(k==="battle_hymn"){ const bm=passiveEquipped("encore")?1.25:1; B.atkPct=(B.atkPct||0)+0.30*bm; B.critB=(B.critB||0)+0.08*bm; line(`🎺 <b>전투 찬가!</b> 사기가 오른다. (공격 +${Math.round(30*bm)}% · 치명 +${Math.round(8*bm)}%)`,"loot"); fxShake(); render(); afterPlayerAction(); }
  else if(k==="dissonance"){ B.enemyWeak=Math.min(0.6,(B.enemyWeak||0)+0.30); B.enemyVuln=(B.enemyVuln||0)+0.20; line(`🎻 <b>불협화음!</b> ${enemy.n}의 균형이 무너진다. (적 공격 -30% · 받는 피해 +20%)`,"loot"); render(); afterPlayerAction(); }
  else if(k==="hymn_valor"){ const bm=passiveEquipped("encore")?1.25:1; heal(Math.round(MAXHP()*0.25*bm)); P.mp=clamp(P.mp+Math.round(5*bm),0,MAXMP()); B.defB=(B.defB||0)+4; line("🎶 <b>용맹의 찬가</b> — 체력·기력이 차오르고 방어가 단단해진다. (방어 +4)","heal"); render(); afterPlayerAction(); }
  else if(k==="lullaby"){ const ch=enemy.boss?0.35:0.7; if(chance(ch)){ B.enemyStun=true; line(`💤 <b>자장가</b> — ${enemy.n}이(가) 잠에 빠져든다… 다음 턴 무력화!`,"loot"); bigPop("SLEEP","#8fd0ff"); } else line(`💤 자장가를 불렀지만 ${enemy.n}은(는) 버텼다.`,"sys"); render(); afterPlayerAction(); }
  else if(k==="rune_blast"){ drawCircle(ratio=>{ if(!enemy)return;
      if(ratio<0.34){ line("🌫 마법진이 무너졌다 — 룬 파열 실패! (기력 소모)","dmg"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
      line(ratio>=1?"🌀 <b>완전한 마법진!</b> 룬이 파열한다!":"🌀 룬 파열을 시전한다!","loot");
      const dmg=Math.max(1,Math.round((magicPow()*2.4*m+rnd(6))*ratio)); const killed=hitEnemy(dmg,"🌀 룬 파열","#c9a9ff"); fxShake();
      if(ratio>=1)bigPop("PERFECT!","#c9a9ff");
      if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }); }
  else if(k==="drain"){ castSpell(k,(ratio,power)=>{ if(!enemy)return;
      if(ratio<0.3){ line("🌫 영창 실패! 흡수가 흩어졌다.","dmg"); if(enemy&&enemy.hp>0)afterPlayerAction(); return; }
      if(power>=1.5)line("🧛 <b>긴 영창 — 생명을 대량으로 빨아들인다!</b>","loot");
      const dmg=Math.max(1,Math.round((magicPow()*1.7*m+rnd(5))*power)-Math.floor(enemy.def/2)); const hp0=enemy.hp;
      const killed=hitEnemy(dmg,"🧛 생명 흡수","#c96ad6"); const dealt=Math.min(dmg,hp0); heal(Math.round(dealt*0.5)); fxShake();
      if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }); }
  else if(s.fx){ runRareSkill(k,s); }   // 🌟 데이터 기반 스킬(도적/희귀 스킬 공용 실행기)
}
/* 🌟 데이터 기반 스킬 실행기 — SKILLS[k].fx 스펙으로 즉발 처리 (도적·보스/파밍 희귀 스킬 공용) */
function runRareSkill(k,s){ if(!enemy){ return; } const m=skillMul(k), fx=s.fx||{};
  if(fx.msg)line(`${s.emoji} <b>${s.n}</b> — ${fx.msg}`,"loot");
  // 자기 HP 소모(양날)
  if(fx.selfHpCost){ const c=Math.max(1,Math.round(P.hp*fx.selfHpCost)); P.hp-=c; if(typeof fxPlayerHurt==="function")fxPlayerHurt(); spawnFloat("-"+c,"#ff8a8a","me"); if(P.hp<=0){ render(); die(); return; } }
  // 버프(수치형 키만)
  if(fx.buff)for(const key in fx.buff){ B[key]=(B[key]||0)+fx.buff[key]; }
  if(fx.nextCrit)B.nextCrit=true;
  if(fx.enemyWeak)B.enemyWeak=Math.min(0.75,(B.enemyWeak||0)+fx.enemyWeak);
  if(fx.enemyVuln)B.enemyVuln=(B.enemyVuln||0)+fx.enemyVuln;
  if(fx.enemyDef&&enemy)enemy.def=Math.max(0,enemy.def-fx.enemyDef);
  if(fx.groggy)addGroggy(fx.groggy);
  if(fx.dot&&enemy){ const dd=Math.max(3,Math.round(ATK()*(fx.dot.atk||0.35)*m)); B.enemyDot={dmg:dd,turns:fx.dot.turns||4}; line(`🩸 ${enemy.n}이(가) 지속 피해 상태! (${B.enemyDot.turns}턴·턴당 ${dd})`,"loot"); }
  if(fx.stun&&enemy){ const ch=enemy.boss?(fx.stunBoss||0.3):fx.stun; if(chance(ch)){ B.enemyStun=true; line(`💫 ${enemy.n}이(가) 무력화됐다 — 다음 턴 행동 불가!`,"loot"); bigPop("STUN","#8fd0ff"); } else line(`${enemy.n}은(는) 버텼다.`,"sys"); }
  if(fx.healFrac)heal(Math.round(MAXHP()*fx.healFrac*m));
  if(fx.mpRestore)P.mp=clamp(P.mp+fx.mpRestore,0,MAXMP());
  if(fx.popup)bigPop(fx.popup,fx.popColor||"#ffd36a");
  if(fx.shake&&typeof fxShakeHard==="function")fxShakeHard(); else if(fx.shake)fxShake();
  const hasDamage=!!(fx.hits||fx.magic||fx.execMult||fx.goldThrow||fx.randMult);
  const doDamage=(tq)=>{ let killed=false, hp0=enemy?enemy.hp:0;
    const dmgOnce=(base,label,color,elem)=>{ let dmg=Math.round(base*tq); dmg = fx.defIgnore? dmg : Math.max(1, dmg-(fx.defHalf?Math.floor(enemy.def/2):enemy.def));
      if(fx.crit&&chance(fx.crit)){ dmg=Math.round(dmg*1.7); line("🎯 <b>치명!</b>","loot"); } return hitEnemy(Math.max(1,dmg), label, color, elem); };
    if(fx.goldThrow){ const spend=Math.min(P.gold, fx.goldThrow); P.gold-=spend; const base=(ATK()*m)+spend*0.5; line(`💰 금화 ${spend}을(를) 흩뿌린다!`,"loot"); killed=dmgOnce(base,`${s.emoji} ${s.n}`,fx.color||"#ffd36a"); }
    else if(fx.randMult){ const mn=fx.randMult[0], mx=fx.randMult[1]; const r=mn+Math.random()*(mx-mn); const base=(ATK()+rnd(4))*r*m; if(r>=mx*0.8)bigPop("대박!","#ff5a5a"); killed=dmgOnce(base,`${s.emoji} ${s.n}`,fx.color||"#ffcf6a",fx.elem); }
    else if(fx.execMult){ const low=enemy.hp/enemy.hpMax < (fx.execThresh||0.3); const mult=low?fx.execMult:(fx.mult||1); const base=(ATK()+rnd(4))*mult*m; if(low)bigPop("처형!","#ff5a5a"); killed=dmgOnce(base,`${s.emoji} ${s.n}${low?"!":""}`,fx.color||"#ff5a5a"); }
    else if(fx.magic){ const base=(magicPow()*(fx.mult||2)*m+rnd(6)); killed=dmgOnce(base,`${s.emoji} ${s.n}`,fx.color||"#c9a9ff",fx.elem); }
    else if(fx.hits){ for(let i=0;i<fx.hits;i++){ if(!enemy||enemy.hp<=0)break; if(i>0&&typeof fxSlash==="function")fxSlash(i%2?1:-1); const base=(ATK()+rnd(4))*(fx.mult||1)*m; killed=dmgOnce(base,`${s.emoji} ${s.n}${fx.hits>1?` ${i+1}`:""}`,fx.color||"#ff8f3c",fx.elem); } }
    if(fx.vamp && enemy){ const dealt=Math.min(hp0-(enemy?enemy.hp:0), hp0); if(dealt>0){ heal(Math.round(dealt*fx.vamp)); line(`🧛 피해의 ${Math.round(fx.vamp*100)}%를 흡수했다.`,"heal"); } }
    render(); if(!killed && enemy && enemy.hp>0)afterPlayerAction(); };
  if(hasDamage && fx.timing){   // 🎯 상호작용: 무기별 미니게임 성공도가 위력에 반영
    render(); weaponSkillTiming(q=>{ if(!enemy)return; const tq=q==="perfect"?1.4:q==="good"?1.0:0.6;
      if(q==="perfect")line("🎯 <b>완벽한 일격 — 위력 최대!</b>","loot"); else if(q==="weak")line("빗맞아 위력이 줄었다…","sys");
      doDamage(tq); });
  } else { render(); if(hasDamage)doDamage(1); else if(enemy&&enemy.hp>0)afterPlayerAction(); } }
/* 주문 영창 — 커스텀 영창(한글). 숙련 레벨이 오를수록 앞부분(reqLen)만 쳐도 발동 (완벽 시 1.15배, 실패 시 소멸) */
const CAST_SPELLS=["fireball","heal_spell","drain"];   // 타이핑 영창 주문
const MIN_CHANT_REQ=1, CHANT_LV_CAP=30;   // 숙련 Lv1→전체, Lv30→1자 (선형, 최대 30레벨 기준)
function spellChant(k){ return (P&&P.chants&&P.chants[k])||(SKILLS[k]&&SKILLS[k].chant)||""; }
function chantReqLen(k){ const full=spellChant(k).replace(/\s/g,"").length||1; const lv=Math.min(CHANT_LV_CAP,(typeof skillProf==="function"?skillProf(k).lv:1)||1);
  const req=Math.round(full - (full-1)*(lv-1)/(CHANT_LV_CAP-1));   // Lv1→full · Lv30→1 (선형)
  return Math.max(MIN_CHANT_REQ, Math.min(full, req)); }
function chantRatio(typed,phrase,reqLen){ const a=(typed||"").replace(/\s/g,""), b=(phrase||"").replace(/\s/g,""); if(!b)return 1;
  const need=(reqLen&&reqLen<b.length)?b.slice(0,reqLen):b; if(!a)return 0; if(a===need)return 1.15;
  let match=0; for(let i=0;i<Math.min(a.length,need.length);i++){ if(a[i]===need[i])match++; else break; }
  return match>=need.length?1.15:match/need.length; }
function chantHighlight(phrase,reqLen){ let cnt=0,out=""; for(const ch of phrase){ const sp=/\s/.test(ch); if(!sp&&cnt<reqLen){ out+=`<span class="creq">${ch}</span>`; cnt++; } else out+=ch; } return out; }
/* 🗡 영창 평가 — ratio(통과판정: 앞 reqLen자) + power(데미지배율: 정확히 친 글자수↑ = 강함, 양날의 검) */
const CHANT_LEN_PER=0.045, CHANT_LEN_CAP=0.85;   // 글자당 +4.5%, 최대 +85%
function chantEval(typed,phrase,reqLen){ const a=(typed||"").replace(/\s/g,""), b=(phrase||"").replace(/\s/g,"");
  if(!b)return {ratio:1.15,power:1.15,correct:0,full:0};
  let correct=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i])correct++; else break; }
  const need=(reqLen&&reqLen<b.length)?reqLen:b.length;
  const ratio=a.length?(correct>=need?1.15:correct/need):0;         // 앞 need자 맞추면 발동
  const power=1+Math.min(CHANT_LEN_CAP, correct*CHANT_LEN_PER);      // 길게 칠수록 데미지↑
  return {ratio,power,correct,full:b.length}; }
function castSpell(k,cb){ awaiting=null; setActions([]); const phrase=spellChant(k); const reqLen=chantReqLen(k); const lv=(typeof skillProf==="function"?skillProf(k).lv:1)||1; const fullLen=phrase.replace(/\s/g,"").length;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(1.15, 1+Math.min(CHANT_LEN_CAP, fullLen*CHANT_LEN_PER)); return; }
  const timeMs = 2000 + fullLen*160;   // 전체 길이 기준 — 길게 치려면 그만큼 시간
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown spell";
  box.innerHTML=`<div class="et" style="color:#c9a9ff">✨ 주문 영창! <b>앞 ${reqLen}자</b>만 쳐도 발동 · <b style="color:#ffd98a">길게 칠수록 강함!</b> · [Enter]${lv>1?` <span style="color:var(--dim)">(숙련 Lv.${lv})</span>`:""}</div>`+
    `<div class="chant">${chantHighlight(phrase,reqLen)}</div><input class="chantin" id="chantin" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="여기에 입력…"><div class="ecbar"><i></i></div>`;
  s.appendChild(box); const bar=box.querySelector(".ecbar>i"); const inp=box.querySelector("#chantin");
  let closed=false,iv=null;
  const finish=(r)=>{ if(closed)return; closed=true; if(iv)clearInterval(iv); box.remove(); cb(r.ratio, r.power, r.correct); };
  const evalNow=()=>finish(chantEval(inp?inp.value:"",phrase,reqLen));
  if(inp){ inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); evalNow(); } }); setTimeout(()=>{ try{ inp.focus(); }catch(e){} },30); }
  let t=timeMs; const total=t; iv=setInterval(()=>{ t-=50; if(bar)bar.style.width=Math.max(0,t/total*100)+"%"; if(t<=0)evalNow(); },50); }
const FLY_MISS_CHANCE=0.4;   // 🦅 비행 몬스터: 근접 무기 공격 빗나갈 확률 (활·마법은 명중)
function playerHit(quality,mult,label,forceCrit,opts){ opts=opts||{};
  if(enemy && enemy.fly && (typeof weaponType!=="function"||weaponType()!=="bow") && !opts._setbonus && chance(FLY_MISS_CHANCE)){   // 🦅 비행 회피 — 근접은 빗나감
    line(`💨 <b>MISS!</b> ${enemy.n}이(가) 날아올라 근접 공격을 피했다! <span style="color:var(--dim)">(활·마법은 명중)</span>`,"sys"); bigPop("MISS","#8fd0ff"); if(typeof spawnFloat==="function")spawnFloat("MISS","#8fd0ff","foe"); return; }
  const qm=quality==="perfect"?1.7:quality==="good"?1.0:0.55;
  if(B&&B.nextCrit){ forceCrit=true; B.nextCrit=false; }   // 집중: 다음 공격 확정 치명
  let dmg=Math.round((ATK()+rnd(4))*mult*qm); let crit=(quality==="perfect")||forceCrit||chance(critChance()+(opts.critBonus||0));
  if(crit&&quality!=="perfect")dmg=Math.round(dmg*1.4);
  if(B.enemyGuard){ dmg=Math.round(dmg*(1-B.enemyGuard)); B.enemyGuard=0; line(`${enemy.n}의 방어를 뚫는다…`,"sys"); }
  dmg=Math.max(1,dmg-enemy.def); if(crit)fxShake(); addGroggy(opts.groggy==null?10:opts.groggy);
  gainMomentum((quality==="perfect"?20:quality==="good"?8:3)+(crit?12:0));   // 🌟 잘 칠수록 기세↑
  hitEnemy(dmg,label,crit?"#ff8f3c":"#ff8a8a", opts.elem||weaponElemNow());   // 치명타=주황 · 무기 속성 전달
  if(!opts._setbonus && enemy && enemy.hp>0 && typeof setGim==="function"){ const g=setGim();   // ✦ 세트 기믹
    if(crit && g.lightning && chance(g.lightning)){ const ld=Math.max(1,Math.round(ATK()*0.5+rnd(6))); line("⚡ <b>흑철 세트 — 번개가 내리친다!</b>","loot"); hitEnemy(ld,"⚡ 번개","#8fd0ff","shock"); }
    if(enemy && enemy.hp>0 && g.doubleHit && chance(g.doubleHit)){ line("🗡 <b>성층 세트 — 2연타!</b>","loot"); playerHit(quality, mult*0.55, "성층 연타", false, {_setbonus:true, elem:opts.elem}); } } }
function useTranscend(){ if(!enemy||(B.momentum||0)<MOM_MAX)return; B.momentum=0;
  line("🌟 <b>초 월 !</b> 쌓인 기세를 모두 실어 필살의 일격을 내리친다!","loot"); bigPop("초월!","#ffd36a"); fxShake(); fxHit(); render();
  const dmg=Math.max(1,Math.round(ATK()*4.5+rnd(20)));   // 방어 무시(대량)
  B.enemyVuln=(B.enemyVuln||0)+0.3; addGroggy(120);      // 약점 노출 + 대량 파훼(대개 그로기)
  const killed=hitEnemy(dmg,"🌟 초월기",'#ffd36a', weaponElemNow());
  if(!killed&&enemy&&enemy.hp>0)afterPlayerAction(); }
/* 현재 타격에 실릴 속성 — 임시 부여(비약) > 장착 무기 고유 속성 */
function weaponElemNow(){ if(B&&B.disarmed)return null; if(P.buffs&&P.buffs.weaponElem)return P.buffs.weaponElem; const it=equippedItem("weapon"); const g=it&&RELICS[it.k]; return (g&&g.elem)||null; }
/* 속성 상태이상 부여 (약점 적중 시 강하게) */
function applyAil(elem,strong){ if(!enemy)return; if(!enemy.ail)enemy.ail={}; const p=strong?1.6:1;
  if(elem==="fire"){ enemy.ail.fire={t:3,dmg:Math.max(2,Math.round(ATK()*0.16*p))}; }
  else if(elem==="venom"){ enemy.ail.venom={t:4,dmg:Math.max(2,Math.round(ATK()*0.12*p))}; }
  else if(elem==="frost"){ enemy.ail.frost={t:strong?3:2}; }
  else if(elem==="shock"){ enemy.ail.shock={t:strong?3:2}; } }
/* 상태이상 틱 — 적 턴 시작 시. 화상/중독=DoT · 빙결=동결(스킵) 판정+지속감소 · 감전=지속감소(피해증폭은 hitEnemy). true=턴 소진 */
function tickAilments(){ if(!enemy||!enemy.ail)return false; const a=enemy.ail;
  ["fire","venom"].forEach(k=>{ if(a[k]&&a[k].t>0){ enemy.hp-=a[k].dmg; a[k].t--;
    line(`${ELEMENTS[k].ic} ${ELEMENTS[k].ail}으로 ${enemy.n}에게 <b>${a[k].dmg}</b> 피해 (남은 ${a[k].t})`,"dmg"); spawnFloat("-"+a[k].dmg,ELEMENTS[k].col,"foe"); if(a[k].t<=0)delete a[k]; } });
  updateFoeBar(); if(enemy.hp<=0){ _killBlow={label:"지속 피해",dmg:null,dot:true}; winCombat(); return true; }
  if(a.shock&&a.shock.t>0){ a.shock.t--; if(a.shock.t<=0)delete a.shock; }
  if(a.frost&&a.frost.t>0){ const froze=chance(0.4); a.frost.t--; if(a.frost.t<=0)delete a.frost;
    if(froze){ line(`❄️ ${enemy.n}이(가) 얼어붙어 이번 턴 움직이지 못한다!`,"heal"); B.block=null; B.parry=null; B.shield=false; render(); endEnemyTurn(); return true; } }
  return false; }
function hitEnemy(dmg,label,color,elem){ dmg=Math.max(1,dmg);
  if(typeof sfx==="function")sfx(color==="#ff8f3c"?"crit":"attack");   // 🔊 타격음(치명타=주황이면 크리트)
  if(B&&B.charge){                                        // 충전(궁극기) 중: 피해가 HP가 아니라 파훼 게이지로 → 다 채우면 저지
    B.charge.filled=(B.charge.filled||0)+dmg;
    line(`${label} — <b style="color:#8fd0ff">충전 저지! 파훼 +${dmg}</b>`,"heal"); fxHit(); spawnFloat("+"+dmg,"#8fd0ff","foe"); setSceneFoe();
    if(B.charge.filled>=B.charge.need) breakCharge();
    return false; }
  if(elem && enemy){                                       // 🔥 속성 상성
    if(enemy.weak===elem){ dmg=Math.round(dmg*1.5);
      if(!enemy._weakShown){ line(`${ELEMENTS[elem].ic} <b>약점 적중!</b> ${enemy.n}은(는) ${ELEMENTS[elem].n}에 약하다!`,"loot"); enemy._weakShown=true; if(P.codexWeak)P.codexWeak[enemy.n]=elem; }
      else line(`${ELEMENTS[elem].ic} 약점을 찌른다! (피해 ×1.5)`,"sys"); gainMomentum(15); }
    applyAil(elem, enemy.weak===elem); }
  if(enemy.ail&&enemy.ail.shock&&enemy.ail.shock.t>0)dmg=Math.round(dmg*1.25);   // ⚡ 감전: 받는 피해↑
  if(B&&B.enemyVuln)dmg=Math.round(dmg*(1+B.enemyVuln));   // 약점 노출: 적이 받는 피해↑
  if(enemy.staggered)dmg=Math.round(dmg*2);
  if(enemy.shieldHp>0){ const ab=Math.min(enemy.shieldHp,dmg); enemy.shieldHp-=ab; dmg-=ab;   // 🛡 보호막: HP보다 먼저 깎임
    line(`🛡 보호막이 ${ab} 흡수${enemy.shieldHp>0?` (남은 ${enemy.shieldHp})`:""}`,"sys"); spawnFloat("🛡"+ab,"#8fd0ff","foe");
    if(enemy.shieldHp<=0)line("🛡 <b>보호막 파괴!</b> 이제 피해가 통한다.","loot");
    if(dmg<=0){ updateFoeBar(); setSceneFoe(); return false; } }
  const _wasFull=enemy.hp>=enemy.hpMax;   // 🎖 원펀맨 판정용(풀피에서 한 방)
  enemy.hp-=dmg; line(`${label} — ${enemy.n}에게 <b>${dmg}</b> 피해.`,"dmg"); fxHit(); spawnFloat("-"+dmg,color||"#ff8a8a","foe"); updateFoeBar();
  if(relicBonus().vamp){ const h=Math.max(1,Math.round(dmg*0.12)); heal(h); }   // 밸런스: 흡혈 25%→12%(엔드 완화 과잉 방지)
  if(enemy.hp<=0){                                          // 🫧 분열: 죽을 때 1회 부활
    if(enemy.mech==="split" && !enemy.splitUsed){ enemy.splitUsed=true; enemy.hp=Math.round(enemy.hpMax*0.45); enemy.atk=Math.round(enemy.atk*0.8); enemy.staggered=false; enemy.groggy=0;
      line(`🫧 <b>${enemy.n}이(가) 둘로 갈라졌다!</b> 더 작아진 채 다시 일어선다.`,"dmg"); bigPop("SPLIT!","#8fd0ff"); updateFoeBar(); setSceneFoe(); return false; }
    if(_wasFull && typeof bumpFeat==="function"){ bumpFeat("oneShot"); if(enemy.boss)bumpFeat("oneShotBoss"); }   // 🎖 원펀맨(풀피 한 방)
    _killBlow={label:label, dmg:dmg, crit:(color==="#ff8f3c")};   // 💥 마지막 일격 기록
    winCombat(); return true; }
  checkEnrage();                                            // 💢 광폭화 문턱 판정
  if(enemy.mech==="thorns" && dmg>0 && P.hp>0){ const r=Math.max(1,Math.round(dmg*0.12)); P.hp-=r;   // 🌵 가시 반사
    deathCause=`🌵 ${enemy.n}의 가시 반사 — 내 공격이 되받아쳐짐 (${r} 피해)`;
    line(`🌵 ${enemy.n}의 가시가 되받아친다 — ${r} 피해. <span style="color:var(--dim)">(내 공격 반사)</span>`,"dmg"); spawnFloat("-"+r,"#ff8a8a","me"); render(); if(P.hp<=0){ die(); return false; } }
  return false; }
function checkEnrage(){ if(!enemy||enemy.mech!=="enrage"||enemy.enraged)return; if(enemy.hp/enemy.hpMax<=0.30){ enemy.enraged=true; enemy.atk=Math.round(enemy.atk*1.5);
    line(`💢 <b>${enemy.n}이(가) 광폭화했다!</b> 공격이 사나워진다.`,"dmg"); bigPop("ENRAGE!","#ff5a5a"); fxShake(); setSceneFoe(); } }
/* ⚡ 속공(턴 쪼개기) — 행동 후 확률 발동. 민첩·행운 기반 · 턴당 발동 상한 */
function quickProcChance(){ return clamp(0.05 + estat("dex")*0.004 + LUKv()*0.002 + (passiveEquipped("crit_focus")?0.03:0), 0.05, 0.26); }   // 밸런스: 속공 확률↓(적 턴 스킵 남용 방지)
function quickProcCheck(){ if(!enemy||enemy.hp<=0)return false; if((B.quickProcs||0)>=1)return false; return chance(quickProcChance()); }   // 턴당 1회로 제한
function afterPlayerAction(){ if(!enemy)return;
  if(quickProcCheck()){ B.quickProcs=(B.quickProcs||0)+1; line("⚡ <b>속공 발동!</b> 빈틈을 파고들어 한 번 더 행동한다!","loot"); bigPop("SPEED!","#8fd0ff"); fxShake(); render(); playerPhase(); return; }
  companionPhase(()=>{ if(enemy&&P.hp>0)toEnemyPhase(); }); }
/* ⏳ 내 편(나+동료) 행동이 끝나면 '상대의 턴' 구분선을 띄우고 잠깐 텀을 둔 뒤 적이 행동 (턴이 겹쳐 보이지 않게) */
function toEnemyPhase(){ if(!enemy||P.hp<=0)return; setActions([]);   // 적 턴 동안 커맨드 비활성
  render(); turnBanner("ENEMY TURN","foe");   // 🎬 턴 표시는 배너 애니로만
  setTimeout(()=>{ if(enemy&&P.hp>0)enemyPhase(); }, 600); }

function companionPhase(next){ if(!B.comp){ next(); return; } const c=B.comp; const lv=c.lv||1, tier=c.tier||0, ru=c.rune||{}; c.energy=Math.min(c.max,c.energy+1);
  if(ru.mom&&typeof gainMomentum==="function")gainMomentum(ru.mom);   // 🌟 기세의 룬
  if(c.energy>=c.max){ c.energy=0; compSpecial(c,next); return; }
  if(c.role==="heal"){ if(P.hp<MAXHP()){ line(`${c.emoji} ${c.n}의 치유 빛.`,"sys"); heal(Math.max(2,Math.round(MAXHP()*(0.04+lv*0.005+tier*0.02+(ru.healPct||0))))); } }
  else if(c.role==="dps"){ line(`${c.emoji} ${c.n}의 지원 공격!`,"sys"); const dmg=Math.round(ATK()*(0.12+lv*0.015+tier*0.06+(ru.dpsPct||0)))+rnd(4); const dead=hitEnemy(dmg,`${c.emoji} 일격`,"#ffb060",ru.elem); if(ru.vamp&&P.hp<MAXHP())heal(Math.max(1,Math.round(dmg*ru.vamp))); if(dead)return; }
  render(); updateFoeBar(); next(); }
function compSpecial(c,next){ const lv=c.lv||1, tier=c.tier||0, ru=c.rune||{}; line(`✦ <b>${c.n}</b>의 특수 지원!`,"heal");
  if(c.role==="heal"){ heal(Math.round(MAXHP()*(0.35+lv*0.01+tier*0.06+(ru.healPct||0)))); if(B.poison>0){ B.poison=0; line("독이 정화됐다.","heal"); }
    if(tier>=2){ B.shield=true; line("여명의 가호 — 다음 적 공격을 막는다.","heal"); } }
  else if(c.role==="dps"){ const dmg=Math.round(ATK()*(1.5+lv*0.03+tier*0.4+(ru.dpsPct||0)*2))+rnd(6); const dead=hitEnemy(dmg,`${c.emoji} 대폭발`,"#ff8a3a",ru.elem); if(ru.vamp&&P.hp<MAXHP())heal(Math.max(1,Math.round(dmg*ru.vamp))); if(dead)return; }
  else if(c.role==="tank"){ B.shield=true; line(`${c.n} 방패 전개 — 다음 적 공격을 막고 반사한다.`,"heal");
    if(tier>=1&&P.hp<MAXHP()){ heal(Math.round(MAXHP()*(0.08+tier*0.05+(ru.healPct||0)))); } }
  render(); if(enemy&&enemy.hp>0)next(); }
/* 🐾 유대 획득 → 레벨업 → 각성(진화) */
function gainCompBond(n){ if(!P||!P.companion||n<=0)return; const rec=compRec(P.companion); if((rec.lv||1)>=COMP_LV_CAP)return;
  rec.bond=(rec.bond||0)+n; let leveled=false, awoke=false;
  while((rec.lv||1)<COMP_LV_CAP && rec.bond>=compBondNeed(rec.lv||1)){ const before=compTier(rec.lv); rec.bond-=compBondNeed(rec.lv); rec.lv=(rec.lv||1)+1; leveled=true; if(compTier(rec.lv)>before)awoke=true; }
  if(awoke){ const d=compDisp(P.companion,rec.lv); rec.awk=compTier(rec.lv);
    line(`🌟 <b>각성!</b> 동료가 <b>${d.emoji} ${d.n}</b>(으)로 진화했다!`,"loot"); if(typeof toast==="function")toast("동료 각성: "+d.n); if(typeof spawnFloat==="function")spawnFloat("🌟각성!","#ffd36a","me"); if(B&&B.comp&&B.comp.key===P.companion){ const nc=buildComp(P.companion); if(nc){ nc.energy=B.comp.energy; B.comp=nc; } } }
  else if(leveled){ const d=compDisp(P.companion,rec.lv); line(`✦ ${d.emoji} ${d.n} 유대 Lv.${rec.lv}`,"sys"); if(B&&B.comp&&B.comp.key===P.companion)B.comp.lv=rec.lv; } }
/* ✨ 보스 처치 시 낮은 확률로 희귀 동료 영입 */
/* 🌟 희귀 스킬 습득/드랍 — 보스 처치 or 몬스터 파밍(낮은 확률)으로만 획득 */
function learnRareSkill(k){ if(!SKILLS[k]||P.skills.includes(k))return false; P.skills.push(k);
  if(SKILLS[k].type==="active"){ if(typeof skillProf==="function")skillProf(k); if(Array.isArray(P.loadout)&&P.loadout.length<activeCap())P.loadout.push(k); } return true; }
function dropRareSkill(fromBoss){ if(typeof RARE_SKILLS==="undefined")return;
  const pool=RARE_SKILLS.filter(k=>!P.skills.includes(k) && (fromBoss || SKILLS[k].src==="farm"));   // 이미 배운 스킬은 제외
  if(!pool.length)return; const ch=fromBoss?0.05:0.0025*(1+((typeof metaEff==="function"?metaEff().drop:0)||0));   // 희귀 스킬북 드랍 하향(보스 5%/파밍 0.25%)
  if(!chance(ch))return; const k=pick(pool); const bk="rbook_"+k;
  if(typeof CONS!=="undefined"&&CONS[bk]){ gainCons(bk); const s=SKILLS[k];   // 🌟 스킬을 직접 주지 않고 '비급(스킬북)'을 드랍 → 가방에서 사용해 습득
    line(`📜 <b>희귀 스킬북 드랍 — ${s.n} 비급!</b> 가방에서 사용하면 <b>${s.n}</b>을(를) 배운다.`,"loot"); toast("희귀 스킬북: "+s.n); if(typeof sfx==="function")sfx("loot"); } }
function maybeDropCompanion(floor){ if(typeof RARE_COMPS==="undefined")return; let pool=RARE_COMPS.filter(k=>!compOwned(k));
  if(typeof EXP!=="undefined" && EXP && typeof PION_COMPS!=="undefined")pool=pool.concat(PION_COMPS.filter(k=>!compOwned(k)));   // 🧭 개척 중엔 개척지 동료도 발견
  if(!pool.length)return;
  if(!chance(clamp(0.05+(floor||1)*0.0015,0,0.12)))return; const key=pick(pool); ensureComp(key); const c=COMPANIONS[key];
  line(`✨ <b>${c.emoji} ${c.n}</b>이(가) 당신을 따르기로 했다! (동료 메뉴에서 교체 가능)`,"loot"); if(typeof toast==="function")toast("희귀 동료 영입: "+c.n); }

function incoming(mult){ const aw=(B&&B.enemyWeak)?(1-B.enemyWeak):1; const fr=(enemy.ail&&enemy.ail.frost&&enemy.ail.frost.t>0)?0.75:1;   // ❄️ 냉기: 적 공격 약화
  let raw=enemy.atk*mult*aw*fr+rnd(4)-1; let dmg=Math.max(1,Math.round(raw)-DEF());   // 약화: 적 공격력↓
  const gp=hasSkill("guard_up");
  if(B.block==="perfect")dmg=Math.round(dmg*(gp?0:0.05)); else if(B.block==="good")dmg=Math.round(dmg*(gp?0.35:0.5)); else if(B.block==="weak")dmg=Math.round(dmg*0.85);
  if(B.comp&&B.comp.role==="tank"){ const red=Math.min(0.55,0.18+(B.comp.lv||1)*0.004+(B.comp.tier||0)*0.04+((B.comp.rune&&B.comp.rune.tankRed)||0)); dmg=Math.round(dmg*(1-red)); }
  if(B.dmgTakenPct)dmg=Math.round(dmg*(1+B.dmgTakenPct));   // 🌫 지역 디버프(내성 없음): 받는 피해 증가
  if(dmg>0 && typeof setGim==="function"){ const g=setGim(); if(g.dodge && chance(g.dodge)){ line("✨ <b>공허 세트 — 피해를 무효화했다!</b>","heal"); bigPop("무적!","#c9a9ff"); return 0; } }   // ✦ 공허 세트: 확률 피해 무효
  return Math.max(0,dmg); }
function applyPlayerDamage(d,msg){ if(d<=0){ line(msg+" 하지만 완벽히 막아냈다!","heal"); return; } P.hp-=d; deathCause=`⚔ ${msg.replace(/<[^>]+>/g,"")} (${d} 피해)`; line(`${msg} <b>${d}</b> 피해.`,"dmg"); fxPlayerHurt(); spawnFloat("-"+d,"#ff8a8a","me"); }
function tickPoison(){ if(B.poison>0){ const pd=3+Math.floor(P.floor/3); P.hp-=pd; B.poison--; deathCause=`☣️ 중독 (${pd} 피해)`; line(`독으로 ${pd} 피해 (남은 ${B.poison}턴)`,"dmg"); spawnFloat("-"+pd,"#9bd36b","me"); render(); } }
/* 🔥 몬스터 속성 공격 → 플레이어 지속피해(도트) 부여 · 매 턴 틱 */
function applyMonsterAil(elem){ if(!B||!elem||typeof ELEMENTS==="undefined"||!ELEMENTS[elem])return; if(B.pdot&&B.pdot.t>0)return; const el=ELEMENTS[elem];
  const dmg=Math.max(2, Math.round(((enemy&&enemy.atk)||8)*0.22)); const t=(elem==="shock")?2:3;
  B.pdot={elem,t,dmg}; line(`${el.ic} <b>${el.n}</b>에 휩싸였다! ${t}턴 동안 지속 피해를 입는다.`,"dmg"); }
function tickPlayerDot(){ if(!B||!B.pdot||(B.pdot.t||0)<=0)return false; const el=(typeof ELEMENTS!=="undefined"&&ELEMENTS[B.pdot.elem])||{ic:"☣",n:"이상"}; const d=B.pdot.dmg;
  P.hp-=d; B.pdot.t--; deathCause=`${el.ic} ${el.n} 지속피해 (${d})`; line(`${el.ic} ${el.n}으로 ${d} 피해 (남은 ${B.pdot.t}턴)`,"dmg"); if(typeof spawnFloat==="function")spawnFloat("-"+d,"#ff8a8a","me");
  if(B.pdot.t<=0)B.pdot=null; render(); if(P.hp<=0){ die(); return true; } return false; }
function chargeNeed(){ return Math.max(24, Math.round(ATK()*2.3)); }   // 3턴 안에 화력을 퍼부으면 저지 가능한 수준
/* 보스 궁극기 충전 시작 — HP 문턱을 넘을 때마다 (총 2회) */
function maybeStartCharge(){ if(!enemy||!enemy.boss||B.charge)return false;
  const frac=enemy.hp/enemy.hpMax, done=B.chargeCount||0, thr=[0.62,0.30];
  if(done<thr.length && frac<=thr[done]){
    B.chargeCount=done+1;
    B.charge={left:3, need:chargeNeed(), filled:0, name:enemy.sp||"파멸의 일격", ult:enemy.ultMult||2.7};
    B.enemyIntent={type:"charge",icon:"🔮",label:`⚡ 충전 3`,preview:0};
    line(`🔮 <b>${enemy.n}</b>이(가) 막대한 힘을 끌어모으기 시작한다!`,"dmg");
    line(bossStory(P.floor,"charge"),"quote");   // 보스별 충전 대사
    line(`⚡ <b>3턴</b> 안에 공격을 퍼부어 <b style="color:#8fd0ff">파훼 게이지</b>를 가득 채워 저지하라. 못 막으면 <b>${B.charge.name}</b>이(가) 작렬한다!`,"sys");
    setSceneFoe(); return true; }
  return false; }
/* 파훼 성공: 충전이 폭발해 보스를 덮침 → 반동 피해 + 그로기 */
function breakCharge(){ const e=enemy; B.charge=null;
  line(`💥 <b>충전 저지 성공!</b> ${e.n}이(가) 응축하던 힘이 역류해 스스로를 덮친다!`,"loot"); fxShake();
  const back=Math.round((e.atk||6)*1.2); e.hp-=back; line(`반동으로 ${e.n}에게 <b>${back}</b> 피해!`,"dmg"); spawnFloat("-"+back,"#8fd0ff","foe");
  if(e.hp<=0){ setSceneFoe(); winCombat(); return; }
  e.staggered=true; e.stagUsed=false; e.groggy=e.groggyMax; B.enemyIntent=null;   // 충전 인텐트 배지 제거
  line(`${e.n}이(가) <b>그로기</b> 상태에 빠졌다 — 추격하라!`,"sys"); setSceneFoe(); updateFoeBar(); }
/* 저지 실패: 궁극기 작렬 (방어 타이밍으로 경감 · 부분 충전만큼 위력↓) */
function unleashUltimate(){ const e=enemy; if(!e)return; const c=B.charge; B.charge=null;
  const name=(c&&c.name)||"파멸의 일격", partial=c?clamp((c.filled||0)/c.need,0,1):0;
  setSceneFoe(); line(`🔥 ${e.n}이(가) 응축한 힘을 해방한다 — <b>${name}</b>!`,"dmg");
  const applyUlt=(q)=>{ if(!enemy)return;
    const base=Math.round(e.atk*(c&&c.ult?c.ult:2.7));
    const guardCut=q==="perfect"?0.12:q==="good"?0.4:0.85, partialCut=1-0.55*partial;
    let d=Math.max(1, Math.round(base*guardCut*partialCut) - DEF());
    if(q==="perfect")line("완벽한 방어! 충격의 대부분을 흘려냈다!","heal");
    if(partial>0.35)line("부분 저지 덕에 위력이 크게 꺾였다.","sys");
    applyPlayerDamage(d, `${name} 직격!`);
    if(P.hp<=0){ die(); return; }
    line(`${e.n}이(가) 힘을 소진해 크게 휘청인다.`,"sys");
    enemy.groggy=Math.min(enemy.groggyMax,(enemy.groggy||0)+Math.round(enemy.groggyMax*0.5));   // 소진 → 그로기 게이지 절반 보상
    B.block=null; B.parry=null; B.shield=false; if(P.hp<=0){ die(); return; } render(); updateGroggyBar();
    B.enemyIntent=rollIntent(); startPlayerTurn(); };
  if(globalThis.__SIM__){ applyUlt("good"); return; }
  startGauge("block", applyUlt, 1.0, `🛡 ${name}이(가) 온다! 완벽한 타이밍에 막아라!`); }

/* 💬 포켓몬식 전투 대화박스 — 적 행동을 박스로 알리고 [클릭/스페이스]로 진행(안 누르면 잠깐 뒤 자동). 큰 공격은 붉은 경고 */
function battleSay(text, onDone, opts){ opts=opts||{};
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ if(onDone)onDone(); return; }
  line(text, opts.danger?"dmg":"sys");   // 💬 위 메시지 박스(#battlemsg) 갱신
  const bm=$("battlemsg"); if(bm){ bm.classList.add("await"); bm.classList.toggle("danger", !!opts.danger); }
  if(typeof sfx==="function")sfx("click");
  let done=false, timer=null;
  const go=()=>{ if(done)return; done=true; if(timer)clearTimeout(timer); document.removeEventListener("keydown",key);
    const b=$("battlemsg"); if(b){ b.classList.remove("await","danger"); } if(onDone)onDone(); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "||e.key==="Enter"){ e.preventDefault(); go(); } };
  document.addEventListener("keydown",key);
  setActions([{label:"▶ 계속  (클릭 / 스페이스)",full:true,act:go}]);
  timer=setTimeout(go, opts.hold||1200);   // 자동 진행(빠른 템포) — 누르면 즉시
}
function enemyPhase(){ if(!enemy)return;
  if(B.enemyDot&&B.enemyDot.turns>0){ const dd=B.enemyDot.dmg; enemy.hp-=dd; B.enemyDot.turns--;   // 출혈/맹독 도포 DoT
    line(`🩸 출혈로 ${enemy.n}에게 <b>${dd}</b> 피해 (남은 ${B.enemyDot.turns}턴)`,"dmg"); spawnFloat("-"+dd,"#ff8a8a","foe"); updateFoeBar();
    if(B.enemyDot.turns<=0)B.enemyDot=null; if(enemy.hp<=0){ _killBlow={label:"🩸 출혈",dmg:dd,dot:true}; winCombat(); return; } }
  if(tickAilments())return;   // 🔥 속성 상태이상(화상/중독 DoT · 빙결 동결 판정 · 감전 지속)
  if(enemy.mech==="regen" && enemy.hp>0 && enemy.hp<enemy.hpMax){ const h=Math.max(2,Math.round(enemy.hpMax*0.05)); enemy.hp=Math.min(enemy.hpMax,enemy.hp+h);   // 💚 재생
    line(`💚 ${enemy.n}이(가) ${h} 회복했다.`,"sys"); spawnFloat("+"+h,"#6bcf8a","foe"); updateFoeBar(); }
  if(B.charge){                              // === 궁극기 충전 진행 중 ===
    B.charge.left--;
    if(B.charge.left<=0){ unleashUltimate(); return; }   // 저지 실패 → 작렬 (gauge 콜백이 다음 턴을 이어감)
    line(`⚡ ${enemy.n}이(가) 힘을 응축한다… <b>${B.charge.left}턴</b> 후 ${B.charge.name}! 파훼 게이지를 채워 저지하라!`,"dmg");
    B.enemyIntent={type:"charge",icon:"🔮",label:`⚡ 충전 ${B.charge.left}`,preview:0};
    tickPoison(); if(P.hp<=0){ die(); return; }
    B.block=null; B.parry=null; B.shield=false; render(); setSceneFoe(); startPlayerTurn(); return; }
  if(enemy.staggered && !enemy.stagUsed){   // 그로기 진입: 적 행동 불가 · 다음 내 턴에 추격(콤보/강타) 가능
    enemy.stagUsed=true; line(`💫 ${enemy.n}은(는) 그로기 상태! 이번 턴 행동하지 못한다. (다음 턴에 추격!)`,"sys");
    B.block=null; B.parry=null; B.shield=false; B.enemyGuard=0;
    if(B.poison>0){ const pd=3+Math.floor(P.floor/3); P.hp-=pd; B.poison--; deathCause=`☣️ 중독 (${pd} 피해)`; line(`독으로 ${pd} 피해 (남은 ${B.poison}턴)`,"dmg"); spawnFloat("-"+pd,"#9bd36b","me"); render(); if(P.hp<=0){ die(); return; } }
    render(); B.enemyIntent=rollIntent(); startPlayerTurn(); return; }
  if(enemy.staggered && enemy.stagUsed){    // 추격 턴 종료 → 그로기 회복 후 정상 행동
    line(`${enemy.n}이(가) 그로기에서 회복한다.`,"sys"); enemy.staggered=false; enemy.stagUsed=false; enemy.groggy=0; updateGroggyBar(); }
  if(B.enemyStun){ B.enemyStun=false; line(`💤 ${enemy.n}은(는) 노래에 취해 잠들었다 — 이번 턴 행동 불가!`,"heal"); B.block=null; B.parry=null; B.shield=false; render(); endEnemyTurn(); return; }
  const it=B.enemyIntent||{type:"attack"};
  if(it.type==="guard"){ B.enemyGuard=0.5; line(`${enemy.n}이(가) 방어 태세를 취한다.`,"sys"); endEnemyTurn(); return; }
  if(it.type==="poison"){ const d=incoming(0.6); applyPlayerDamage(d,`${enemy.n}의 맹독 공격!`); if(P.hp>0){ B.poison=Math.max(B.poison,3); line("중독됐다! (3턴)","dmg"); } endEnemyTurn(); return; }
  // 물리 공격 — 💬 대화박스로 행동 예고 → 큰 공격은 항상 패링 기회, 일반은 확률 패링
  const mult=it.type==="heavy"?2.0:it.type==="special"?2.4:1.0;
  const big=(it.type==="heavy"||it.type==="special");
  const actName = it.type==="heavy"?"강타":it.type==="special"?(it.label||"필살기"):(it.label||"공격");
  const sayText = `${enemy.n}의 <b>${actName}</b>!` + (big?` <span style="color:#ffd36a">— 큰 공격! 패링 준비!</span>`:"");
  battleSay(sayText, ()=>{ if(!enemy||P.hp<=0)return;
    const canParry = !B.disarmed && !B.block && enemy && enemy.hp>0;
    if(canParry && (big || chance(parryProcChance()))){ reactiveParry(mult,it); return; }   // 큰 공격은 반드시 패링 QTE
    resolveEnemyAttack(mult,it,"none");
  }, {danger:big, hold:big?1900:1050}); }
/* 적 공격 최종 처리 (패링 결과 pr: perfect/good/miss/none) → 엔드턴 */
function resolveEnemyAttack(mult,it,pr){ if(!enemy)return;
  if(pr==="perfect"){ line(`⚔️ <b>완벽한 패링!</b> ${enemy.n}의 공격을 되받아쳤다!`,"loot"); addGroggy(30);
    const cd=Math.round(ATK()*1.2)+rnd(6); const killed=hitEnemy(cd,"⚔️ 패링 반격","#ffd36a"); if(killed||!enemy)return; endEnemyTurn(); return; }
  let d=incoming(mult);
  if(pr==="good"){ d=Math.round(d*0.4); line("⚔️ 받아넘겼다 — 피해 감소!","heal"); }
  else if(pr==="miss"){ d=Math.round(d*1.2); line("패링 실패! 무방비로 노출됐다.","dmg"); }
  if(B.shield){ line("강철 방패가 공격을 막고 반사한다!","heal"); hitEnemy(Math.round(enemy.atk*0.8),"🛡 반사","#7ad6c0"); d=0; }
  if(B.summon&&B.summon.guard&&d>0){ d=Math.round(d*0.6); B.summon.guard=false; line(`🛡 ${B.summon.emoji} ${B.summon.n}이(가) 몸으로 막아냈다! (피해 40%↓)`,"heal"); }
  if(enemy&&d>0){ applyPlayerDamage(d,it.type==="heavy"?`${enemy.n}의 강타!`:it.type==="special"?`${enemy.n}의 맹공!`:`${enemy.n}의 공격!`);
    if(enemy.atkElem && P.hp>0 && chance(it.type==="attack"?0.45:0.7))applyMonsterAil(enemy.atkElem);   // 🔥 속성 몬스터: 지속피해 부여(큰 공격일수록 확률↑)
    if(enemy.vamp){ const h=Math.round(d*0.5); enemy.hp+=h; enemy.hpMax=Math.max(enemy.hpMax,enemy.hp); line(`${enemy.n}이(가) ${h} 흡혈.`,"sys"); updateFoeBar(); }
    if((it.type==="heavy"||it.type==="special") && !B.disarmed && P.equip.weapon && pr!=="perfect" && B.block!=="perfect" && P.hp>0 && chance(clamp(0.24-P.stats.dex*0.008,0.05,0.24))){
      B.disarmed=true; line(`🗡️ 충격에 <b>검을 놓쳤다!</b> 무장 해제 — 회피하며 검을 주우러 가야 한다!`,"dmg"); fxShake(); } }
  endEnemyTurn(); }
/* 적 턴 마무리 (독 틱 · 다음 인텐트 · 돌발 · 다음 플레이어 턴) */
function endEnemyTurn(){ if(!enemy)return; B.block=null; B.parry=null; B.shield=false; if(P.hp<=0){ die(); return; }
  if(B.poison>0){ const pd=3+Math.floor(P.floor/3); P.hp-=pd; B.poison--; deathCause=`☣️ 중독 (${pd} 피해)`; line(`독으로 ${pd} 피해 (남은 ${B.poison}턴)`,"dmg"); spawnFloat("-"+pd,"#9bd36b","me"); render(); if(P.hp<=0){ die(); return; } }
  if(tickPlayerDot())return;   // 🔥 속성 지속피해(화상/감전/빙결 등)
  render();
  if(maybeStartCharge()){ startPlayerTurn(); return; }   // 보스: HP 문턱 도달 → 궁극기 충전 개시
  B.enemyIntent=rollIntent();
  const emCh=enemy.boss?0.2:0.1; if(chance(emCh))triggerEmergency(()=>{ if(enemy&&P.hp>0)startPlayerTurn(); }); else startPlayerTurn(); }

function triggerEmergency(done){ const luck=LUKv();
  const thr=clamp((enemy?enemy.atk:6)*0.008*(enemy&&enemy.boss?1.4:1),0,0.25);   // 적이 강할수록 회피 어려움
  const evadeP=clamp(0.55+luck*0.03-thr,0.10,0.95), rollP=clamp(0.6+luck*0.03-thr,0.10,0.95);
  const pool=[
    {text:`${enemy.n}이(가) 독안개를 뿜는다!`,time:4,opts:[
      {label:`숨 참고 회피 (${Math.round(evadeP*100)}%)`,resolve:()=>{ if(chance(evadeP))line("회피 성공! 무사하다.","heal"); else{ B.poison=3; line("실패… 중독됐다.","dmg"); } }},
      {label:P.potions>0?"물약으로 헹군다 (확정)":"물약으로 헹군다 (없음)",resolve:()=>{ if(P.potions>0){ P.potions--; line("물약을 끼얹어 독을 씻었다.","heal"); } else line("물약이 없어 조금 들이마셨다…","dmg"); }}],
      timeout:()=>{ B.poison=3; P.hp-=5; line("멍하니 있다 독을 뒤집어썼다! 중독 + 5 피해.","dmg"); }},
    {text:"발밑이 무너진다!",time:3,opts:[{label:`왼쪽으로 구른다 (${Math.round(rollP*100)}%)`,resolve:()=>emDodge(rollP)},{label:`오른쪽으로 구른다 (${Math.round(rollP*100)}%)`,resolve:()=>emDodge(rollP)}],
      timeout:()=>{ const d=8+rnd(8); P.hp-=d; line(`추락 피해 ${d}!`,"dmg"); spawnFloat("-"+d,"#ff8a8a","me"); }},
    {text:`${enemy.n}이(가) 빈틈을 보인다! 반격 기회!`,time:3,opts:[
      {label:"지금 찌른다!",resolve:()=>{ hitEnemy(Math.round(ATK()*1.5)+rnd(6),"💥 반격!","#ffd36a"); }},
      {label:"신중히 물러난다",resolve:()=>{ P.mp=clamp(P.mp+2,0,MAXMP()); line("기력을 추스른다. (+2)","heal"); }}],
      timeout:()=>{ line("망설이다 기회를 놓쳤다.","sys"); }},
  ];
  runEmergency(pick(pool),done); }
function emDodge(p){ if(chance(p))line("구르며 피했다!","heal"); else{ const d=6+rnd(6); P.hp-=d; line(`살짝 긁혔다. ${d} 피해.`,"dmg"); spawnFloat("-"+d,"#ff8a8a","me"); } }
function runEmergency(ev,done){ awaiting=null; setActions([]); const s=$("stage"); const box=document.createElement("div"); box.className="ecdown";
  box.innerHTML=`<div class="et">⚠ ${ev.text}</div><div class="ecbar"><i></i></div><div class="ecbtns"></div>`; s.appendChild(box);
  const bar=box.querySelector(".ecbar>i"); const btns=box.querySelector(".ecbtns"); let closed=false,iv=null;
  const finish=(fn)=>{ if(closed)return; closed=true; if(iv)clearInterval(iv); box.remove(); if(fn)fn(); render(); if(P.hp<=0){ die(); return; } if(!enemy)return; if(done)done(); };
  ev.opts.forEach(o=>{ const b=document.createElement("button"); b.innerHTML=o.label; b.onclick=()=>finish(o.resolve); btns.appendChild(b); });
  if(globalThis.__SIM__){ finish(ev.opts[0].resolve); return; }
  let t=ev.time*1000; const total=t; iv=setInterval(()=>{ t-=100; if(bar)bar.style.width=Math.max(0,t/total*100)+"%"; if(t<=0)finish(ev.timeout); },100); }

function doGuard(){ startGauge("block",q=>{ B.block=q; line(q==="perfect"?"완벽한 타이밍! 방어 자세를 잡았다.":q==="good"?"제때 막을 준비를 했다.":"급하게 막는다.","heal"); P.mp=clamp(P.mp+3,0,MAXMP()); render(); afterPlayerAction(); }); }
/* ⚔️ 패링 — 줄어드는 원이 정중앙일 때 단 한 번. 완벽=무효+반격+큰 그로기 / 양호=피해 감소 / 실패=피해 증가 */
/* ⚔️ 돌발 패링 — 적 공격 중 확률로 튀어나오는 반응 QTE. 결과를 resolveEnemyAttack로 전달 */
function parryProcChance(){ return clamp(0.14 + estat("dex")*0.006 + LUKv()*0.004, 0.14, 0.5); }
function reactiveParry(mult,it){ awaiting=null;
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ resolveEnemyAttack(mult,it,"good"); return; }
  const s=$("stage"); const box=document.createElement("div"); box.className="ecdown aim parry";
  box.innerHTML=`<div class="et" style="color:#ffd36a">⚡ <b>돌발! 패링</b> — 줄어드는 파란 원이 <b>금색 원</b>에 들어올 때 [클릭/스페이스] (안쪽=완벽)</div>`+
    `<div class="aimwrap"><div class="aimzone"></div><div class="aimcore"></div><div class="aimdot"></div><div class="aimring" id="pring"></div></div>`;
  s.appendChild(box); const ring=box.querySelector("#pring");
  let r=100,raf=null,done=false; const RSZ=150, spd=2.7;
  const finish=(q)=>{ if(done)return; done=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",key); box.remove();
    if(q==="perfect"){ bigPop("PARRY!","#ffd36a"); fxShake(); fxHit(); gainMomentum(18); if(typeof bumpFeat==="function")bumpFeat("perfectParry"); }
    else if(q==="good"){ bigPop("GUARD!","#8fd0ff"); fxShake(); gainMomentum(10); }
    render(); resolveEnemyAttack(mult,it,q); };
  const tap=()=>{ if(done)return; const q=r<=15?"perfect":r<=38?"good":"miss"; finish(q); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "){ e.preventDefault(); tap(); } };
  document.addEventListener("keydown",key); box.onclick=tap; setActions([{label:"⚔️ 패링!",full:true,act:tap}]);
  const step=()=>{ if(done)return; r-=spd; if(r<=5){ finish("miss"); return; } if(ring){ const px=Math.round(r/100*RSZ); ring.style.width=px+"px"; ring.style.height=px+"px"; } raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); }
/* 큰 팝업 (패링 성공 등 타격감) */
function bigPop(text,color){ const s=$("stage"); if(!s)return; const d=document.createElement("div"); d.className="bigpop"; d.textContent=text; if(color)d.style.color=color; s.appendChild(d); setTimeout(()=>{ if(d.parentNode)d.remove(); },780); }
/* 🎬 턴 배너 — 화면에 MY TURN / ENEMY TURN 을 슬라이드 애니로 표시 */
function turnBanner(text,cls){ const s=$("stage"); if(!s)return; const old=s.querySelector(".turnbanner"); if(old)old.remove();
  const d=document.createElement("div"); d.className="turnbanner "+(cls||""); d.innerHTML=`<span>${text}</span>`; s.appendChild(d);
  if(typeof sfx==="function")sfx(cls==="foe"?"encounter":"click");
  setTimeout(()=>{ if(d.parentNode)d.remove(); },1050); }
/* 운명의 주사위 — 턴 소모 없는 자유행동(전투당 1회) · 2d6+행운 */
const DICE_FACE=["⚀","⚁","⚂","⚃","⚄","⚅"];
function rollDiceAnim(cb){ const d1=1+rnd(6), d2=1+rnd(6);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(d1,d2); return; }
  awaiting=null; setActions([]); const s=$("stage"); const box=document.createElement("div"); box.className="diceov";
  box.innerHTML=`<div class="et" style="color:var(--gold)">🎲 운명의 주사위</div><div class="dicewrap"><span class="dice" id="dcA">🎲</span><span class="dice" id="dcB">🎲</span></div>`;
  s.appendChild(box); let n=0;
  const iv=setInterval(()=>{ const a=$("dcA"),b=$("dcB"); if(a)a.textContent=DICE_FACE[rnd(6)]; if(b)b.textContent=DICE_FACE[rnd(6)];
    if(++n>=12){ clearInterval(iv); if(a)a.textContent=DICE_FACE[d1-1]; if(b)b.textContent=DICE_FACE[d2-1]; box.classList.add("done");
      setTimeout(()=>{ box.remove(); cb(d1,d2); },650); } },85); }
function rollDice3Anim(cb){ const d1=1+rnd(6), d2=1+rnd(6), d3=1+rnd(6);
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ cb(d1,d2,d3); return; }
  awaiting=null; setActions([]); const s=$("stage"); const box=document.createElement("div"); box.className="diceov";
  box.innerHTML=`<div class="et" style="color:var(--gold)">🎲 <b>주사위 3개</b> — 트리플이면 대박!</div><div class="dicewrap"><span class="dice" id="dcA">🎲</span><span class="dice" id="dcB">🎲</span><span class="dice" id="dcC">🎲</span></div>`;
  s.appendChild(box); let n=0; const fin=[d1,d2,d3];
  const iv=setInterval(()=>{ ["dcA","dcB","dcC"].forEach(id=>{ const el=$(id); if(el)el.textContent=DICE_FACE[rnd(6)]; });
    if(++n>=7){ clearInterval(iv); ["dcA","dcB","dcC"].forEach((id,i)=>{ const el=$(id); if(el){ el.textContent=DICE_FACE[fin[i]-1]; el.style.color=fin[i]===6?"#ffd36a":fin[i]===1?"#8a3b3b":"#e8c56a"; } });
      box.classList.add("done"); setTimeout(()=>{ box.remove(); cb(d1,d2,d3); },300); } },55); }
function doDice(){ if(B.diceUsed){ toast("이번 전투엔 이미 굴렸다"); return; } B.diceUsed=true;
  rollDiceAnim((d1,d2)=>{ const mod=Math.floor(LUKv()/3), t=d1+d2+mod;
    line(`🎲 ${d1} + ${d2}${mod?` (+행운 ${mod})`:""} = <b>${t}</b>`,"loot");
    if(t<=4){ B.atkPct=(B.atkPct||0)-0.15; line("💢 저주! 이번 전투 공격 -15%.","dmg"); }
    else if(t<=10){ const mp=3+rnd(4); P.mp=clamp(P.mp+mp,0,MAXMP()); line(`무난 — 기력이 +${mp} 회복됐다.`,"heal"); }
    else if(t<=13){ B.atkPct=(B.atkPct||0)+0.25; line("✨ 축복! 이번 전투 공격 +25%.","loot"); fxShake(); }
    else{ const h=Math.round(MAXHP()*0.3); heal(h); B.atkPct=(B.atkPct||0)+0.25; line(`★ 대박! 체력 ${h} 회복 + 이번 전투 공격 +25%!`,"loot"); fxShake(); }
    render();
    if(enemy&&enemy.hp>0&&P.hp>0) playerPhase();   // 턴 소모 없음: 같은 배틀페이즈로 복귀
  }); }
function fleeChance(){ if(typeof enemy==="undefined"||!enemy)return clamp(0.5+LUKv()*0.04,0.1,0.92);
  const ps=DEF()*1.5+LUKv()*2+6, es=(enemy.atk||6)*(enemy.boss?1.4:1);   // 적이 강할수록(특히 보스) 도망 어려움
  return clamp(0.30 + (ps/(ps+es))*0.55 + LUKv()*0.01, 0.10, 0.92); }
function fleeText(){ return `행운 판정 · 성공 ~${Math.round(fleeChance()*100)}%`; }
function playerFlee(){ if(chance(fleeChance())){ line("재빠르게 도망쳤다!","sys"); if(typeof bumpFeat==="function")bumpFeat("fled"); enemy=null; B=null;
    if(expReturn){ const r=expReturn; expReturn=null; r(); return; }   // 대륙 개척: 개척 허브로 복귀
    fleeRetreat(); return;   // 🏃 도망 성공 → 지나온 마지막 포탈(거점)로 후퇴
  } else{ line("도망 실패!","dmg"); afterPlayerAction(); } }
/* 🏃 도망 성공 시 지나온 마지막 포탈로 후퇴 → 거기서 휴식·재등반·마을 선택 */
function fleeRetreat(){ const passed=(P.portals||[1]).filter(f=>f<=(P.floor||1)); const back=passed.length?Math.max.apply(null,passed):1;
  if(CHECKPOINTS[back]){ P.floor=back; P.mp=clamp(P.mp,0,MAXMP()); render(); save(true);
    line(`지나온 <b>${back}층 거점 '${CHECKPOINTS[back].n}'</b>(으)로 후퇴했다.`,"sys");
    setTimeout(()=>checkpointTown(back),160); return; }
  // 지나온 거점이 없다(초반 1~5층) → 탑 입구로
  P.floor=1; render(); save(true); clearLog(); setScene("🚪","탑 입구 — 도망쳐 내려왔다.");
  line("지나온 거점이 없어 <b>탑 입구</b>까지 도망쳐 내려왔다.","sys");
  setActions([
    {label:"🪜 다시 오른다 (1층부터)",full:true,act:()=>{ enterFloor(); }},
    {label:"🏘 마을로 돌아간다",full:true,act:returnToTown},
  ]); }
/* 확률 헬퍼: 두 주사위(rnd12) 대결에서 이길 확률 등 */
function pctRoll(margin){ let c=0; for(let a=0;a<12;a++)for(let b=0;b<12;b++)if(a-b>=margin)c++; return c/144; }

function winCombat(){
  if(P._duel && enemy && enemy.pvp){ const npc=P._duel; P._duel=null; const g=npc.gold||0; P.gold+=g;   // ⚔ PvP 결투 승리
    line(`⚔ <b>결투 승리!</b> ${npc.name}을(를) 제압하고 <b>${g}G</b>를 약탈했다!`,"loot"); if(npc.item&&chance(0.6)){ addRelic(npc.item); line(`전리품: <b>${npc.item}</b>!`,"loot"); }
    toast("약탈 +"+g+"G"); if(typeof sfx==="function")sfx("victory"); if(typeof bumpFeat==="function")bumpFeat("pvpWin"); enemy=null; B=null; save(true); setScene("🏆","결투에서 승리했다!"); showClimb(); return; }
  P.kills++; P.runKills=(P.runKills||0)+1; const wasBoss=enemy.boss, floor=P.floor, foeName=enemy.n;
  if(typeof sfx==="function")sfx("victory");
  if(typeof bgm==="function" && !(wasBoss&&floor>=TOP))bgm("tower");   // 🎵 승리 즉시 전투/보스 BGM 종료 → 탐험 앰비언트로(최종보스 승리는 엔딩용으로 유지)
  line(`<b style="color:var(--good)">🏆 ${foeName}을(를) 쓰러뜨렸다!</b>`);   // 전투 마무리(위 박스에 표시)
  { const kb=_killBlow; _killBlow=null;   // 💥 마지막 일격 — 어떤 공격으로 몇 데미지에 죽었는지
    const how=kb&&kb.label?String(kb.label).replace(/\s*—.*$/,"").trim():"마지막 일격";
    const dtxt=(kb&&kb.dot)?"지속 피해가 숨통을 끊었다!":(kb&&kb.dmg!=null?`<b style="color:#ffd36a">${kb.dmg}</b> 피해로 쓰러뜨렸다!`:"쓰러뜨렸다!");
    line(`💥 <b>${how}</b> — ${kb&&kb.crit?'<span style="color:#ff8f3c">치명! </span>':''}${dtxt}`,"dmg"); }
  if(wasBoss)line(bossStory(floor,"defeat"),"quote");   // 보스 처치 서사(박스)
  // ===== 전리품 수집(캡처) → 나중에 별도 패널로 한 번에 보여줌(전투/획득 분리) =====
  _lootCapture=true; _lootBuf=[];
  const g=enemy.g+rnd(6); P.gold+=g; line(`💰 금화 +${g}`,"loot"); spawnFloat("💰+"+g,"#ffe08a","foe");
  const mkeys=Object.keys(MATS); const m=mkeys[rnd(mkeys.length)]; const ma=1+rnd(3); addMat(m,ma); line(`${MATS[m][0]} ${MATS[m][1]} +${ma}`,"loot");   // 재료 1~3개
  if(typeof FOODS!=="undefined" && chance(wasBoss?1:0.28)){ const fk=pick(["food_heal","food_dps","food_tank"]); const fa=(wasBoss?2:1)+rnd(2); gainFood(fk,fa); line(`${FOODS[fk].emoji} <b>${FOODS[fk].n}</b> +${fa} <span style="color:var(--dim)">(동료 먹이)</span>`,"loot"); }   // 🍖 동료 먹이 드랍
  { const st=pick(["str","int","dex","vit","luk"]); const tp=3+rnd(3)+Math.floor((enemy.atk||6)/4)+(wasBoss?12:0)+(enemy.elite?6:0);
    const up=trainStat(st,tp); if(up>0){ spawnFloat(`✦ ${STAT_NAME[st]} +${up}`,"#9be08a","me"); line(`✦ <b>${STAT_NAME[st]} +${up}</b> (전투 숙련)`,"loot"); } }
  if(wasBoss){ bossReward(); if(chance(0.18))dropManaOrb();   // 💎 크리스탈은 전투 중 지급 안 함(과금 재화 — 통신판매/우편으로만)
    if(chance(0.01)){ gainCons("enhance_charm"); line(`⚜️ <b>강화의 축복</b>을 얻었다! (초희귀 · 대장간 강화 시 성공↑·파괴방지)`,"loot"); toast("강화의 축복 획득!"); } }   // 보스 초희귀 드랍
  else { if(chance(0.025))dropManaOrb();   // 물약은 몬스터가 떨구지 않음 — 상자에서만
    if(chance(0.008))dropBook(); else if(chance(clamp((0.005+LUKv()*0.0004)*(1+metaEff().drop),0,0.015)))dropRelic(); else if(chance(0.55)){ const gb=5+rnd(12); P.gold+=gb; line(`💰 금화 +${gb}`,"loot"); } }
  dropSignature(enemy, wasBoss);   // ✨ 몬스터 고유(시그니처) 드랍 + 몬스터 도감 처치 기록
  if(P.companion&&typeof gainCompBond==="function")gainCompBond(wasBoss?Math.round(15+floor*0.8):Math.round(3+floor*0.25));   // 🐾 동료 유대
  if(wasBoss&&typeof maybeDropCompanion==="function")maybeDropCompanion(floor);
  if(typeof dropRareSkill==="function")dropRareSkill(wasBoss);
  _lootCapture=false;
  checkTitleUnlocks(); checkQuests();
  const loot=_lootBuf.slice(); enemy=null; B=null; save(true);
  const cont = expReturn ? (()=>{ const r=expReturn; expReturn=null; render(); setTimeout(r,120); })
    : (wasBoss&&floor>=TOP) ? (()=>{ setTimeout(victory,120); })
    : (()=>{ clearLog(); setScene("🏆","적을 물리쳤다. 위층 계단이 보인다."); showClimb(); });
  deathDropPause(wasBoss, ()=>showVictoryLoot(wasBoss, foeName, loot, cont)); }
/* 🎁 처치 → 상자/장비 드랍 연출을 잠깐 보여준 뒤(클릭/스페이스) 전리품 패널로 */
function deathDropPause(wasBoss, next){
  if(globalThis.__SIM__ || typeof requestAnimationFrame!=="function"){ next(); return; }
  if(typeof dropChestFx==="function")dropChestFx(wasBoss);   // 스테이지에 상자 떨구기
  const bm=$("battlemsg"); if(bm)bm.classList.add("await");
  let done=false, timer=null;
  const go=()=>{ if(done)return; done=true; if(timer)clearTimeout(timer); document.removeEventListener("keydown",key);
    const b=$("battlemsg"); if(b)b.classList.remove("await"); next(); };
  const key=(e)=>{ if(e.code==="Space"||e.key===" "||e.key==="Enter"){ e.preventDefault(); go(); } };
  document.addEventListener("keydown",key);
  setActions([{label:"▶ 전리품 확인  (클릭 / 스페이스)",full:true,act:go}]);
  timer=setTimeout(go, wasBoss?2400:1500); }
/* 🎁 전리품 패널 — 전투 끝나면 스테이지(트로피) 자리에 크게 (스크롤 없이 '계속' 보이게) */
function showVictoryLoot(wasBoss, foeName, loot, cont){ render(); clearLog();
  if(document.body)document.body.classList.add("lootview");   // 스테이지 숨기고 전리품을 위로
  const rows = (loot&&loot.length) ? loot.map(h=>`<div class="lootrow">${h}</div>`).join("") : `<div class="lootrow" style="color:var(--dim)">획득한 전리품이 없다.</div>`;
  $("log").innerHTML=`<div class="lootpanel"><div class="lh"><span>🏆 ${wasBoss?"보스 격파!":"승리!"} · 전리품</span><span class="lhsub">${foeName} 처치</span></div><div class="lootlist">${rows}</div></div>`;
  const go=()=>{ if(document.body)document.body.classList.remove("lootview"); cont(); };
  setActions([{label:"▶ 계속",full:true,act:go}]); }
function dropRelic(){ const f=P.floor; const early=["녹슨 단검","가죽 갑옷","토끼발 부적"],mid=["이 빠진 롱소드","판금 흉갑","흡혈의 반지","사냥꾼의 활"],late=["월광 세이버"];
  let pool;
  if(f>=31) pool=GEAR_TIERS.rift;               // 시공: 시공 티어
  else if(f>=16) pool=GEAR_TIERS.sky;           // 천공: 천공 티어
  else if(f>=10) pool=[...mid,...late];
  else if(f>=5) pool=[...early,...mid];
  else pool=early;
  addRelic(pick(pool)); }
function dropBook(){ const books=Object.keys(CONS).filter(k=>CONS[k].use==="learn"&&!CONS[k].rare); const bk=pick(books); gainCons(bk); line(`${CONS[bk].emoji} <b>${CONS[bk].n}</b>을(를) 발견했다! (가방에서 사용해 스킬 습득)`,"loot"); }   // 희귀 비급은 제외(전용 드랍만)
function dropManaOrb(){ if((P.skillSlots||SLOT_BASE)>=SLOT_MAX)return; gainCons("mana_orb"); line(`🔵 <b>마나 오브</b> 드랍! 가방에서 쓰면 액티브 스킬 슬롯 +1 (현재 ${P.skillSlots}/${SLOT_MAX}).`,"loot"); toast("마나 오브 획득!"); }
function bossReward(){ const f=P.floor;
  const mats=Object.keys(MATS).slice().sort(()=>Math.random()-0.5).slice(0,3);   // 3종만 (뭉뚱그리지 않고 구체적으로)
  const got=mats.map(m=>{ const a=2+rnd(3); addMat(m,a); return `${MATS[m][0]}${MATS[m][1]}+${a}`; });
  line(`📦 재료 — ${got.join(" · ")}`,"loot");
  if(f===15)addRelic("이름 없는 열쇠"); P.potions+=1; line("🧪 물약 +1","loot");
  if(f>=45){ const g=pick(GEAR_TIERS.myth); addRelic(g); line(`✦ <b>신화 장비</b> — ${g}을(를) 손에 넣었다!`,"loot"); toast("신화 장비 획득!"); }   // 정점 보스: 신화 확정
  else if(f>=31){ if(chance(0.6))addRelic(pick(GEAR_TIERS.rift)); }   // 상위 장비는 60% (매번 확정 X)
  else if(f>=16){ if(chance(0.6))addRelic(pick(GEAR_TIERS.sky)); } }   // 랜덤 소비품 지급 제거(퍼주기 방지)
function showClimb(){ setActions([
  {label:`계단을 올라 ${P.floor+1}층으로`,full:true,act:nextFloor},
  {label:"🎒 소지품 (장비 착용)",desc:"드랍 장비 착용·정리",act:inventoryMenu},
  {label:"📋 스킬 (장착 변경)",desc:"액티브·패시브 교체",act:skillWindow},
  {label:"🚪 마을로 귀환",desc:"다이브 종료 · 획득물 유지",act:returnToTown},
]); }
function backToClimb(){ if(EXP&&!enemy){ expeditionHub(); return; } clearLog(); setScene("🪜",`${P.floor}층 계단 앞 — 위로 오를까?`); line("계단 앞으로 돌아왔다.","sys"); showClimb(); }
function nextFloor(){ P.floor=Math.min((P.floor||1)+1,50); P.mp=clamp(P.mp+2,0,MAXMP()); render(); save(true); enterFloor(); }   // 탑은 50층까지(정상). 그 위는 대륙 개척으로.
function checkpointTown(f){ const c=CHECKPOINTS[f]; const firstPortal=!P.portals.includes(f);
  if(firstPortal){ P.portals.push(f); if(typeof toast==="function")toast("포탈 해금: "+c.n); }
  save(true);
  if(typeof checkpointStory==="function"){ checkpointStory(f, ()=>checkpointMenu(f,firstPortal)); return; }   // 🎭 첫 도착 스토리 비트 → 메뉴
  checkpointMenu(f,firstPortal); }
function checkpointMenu(f,firstPortal){ const c=CHECKPOINTS[f]; clearLog();
  setScene(f>=31?"🌌":f>=16?"⛅":"🏘️",`${c.zone} · ${c.n}`);
  if(firstPortal)line(`🌀 <b>${c.zone} 거점 '${c.n}'</b> 도착! 포탈이 열렸다 — 다음 다이브부터 여기서 시작할 수 있다.`,"loot");
  line(`탑 ${f}층 <b>${c.n}</b>. 잠시 숨 돌릴 안전지대. 마을로 갔다가 이 포탈로 곧장 돌아올 수 있다.`,"sys");
  setActions([
    {label:`계단을 올라 ${f+1}층으로`,full:true,act:nextFloor},
    {label:"🔥 휴식 (HP·기력 회복)",act:()=>{ heal(Math.round(MAXHP()*0.6)); P.mp=MAXMP(); line("거점에서 충분히 쉬었다.","heal"); render(); checkpointMenu(f,false); }},
    {label:"🎒 소지품 (장비 착용)",act:inventoryMenu},
    {label:"📋 스킬 (장착 변경)",act:skillWindow},
    {label:"🌀 포탈로 마을 귀환",desc:"파밍·제작 후 이 포탈로 복귀 · 획득물 유지",act:returnToTown},
  ]); }
/* 🧪 보스 방 앞 버프 준비 — 자기 버프를 미리 걸고 들어간다(startCombat이 이어받음) */
const PREBUFF_SKILLS=["war_cry","iron_will","barrier","focus","battle_hymn"];
function prebuffCast(k){ const s=SKILLS[k]; if(!s||!B||P.mp<s.mp)return; const bm=(typeof passiveEquipped==="function"&&passiveEquipped("encore"))?1.25:1;
  if(k==="war_cry"){ B.atkPct=(B.atkPct||0)+0.35; line("🗣️ 전투 함성 — 공격 +35%","loot"); }
  else if(k==="iron_will"){ B.defB=(B.defB||0)+6; line("🛡️ 강철 의지 — 방어 +6","heal"); }
  else if(k==="barrier"){ B.defB=(B.defB||0)+8; line("🔮 마력 방벽 — 방어 +8","heal"); }
  else if(k==="focus"){ B.nextCrit=true; B.critB=(B.critB||0)+0.12; line("🌀 집중 — 다음 확정 치명 · 치명↑","loot"); }
  else if(k==="battle_hymn"){ B.atkPct=(B.atkPct||0)+0.30*bm; B.critB=(B.critB||0)+0.08*bm; line(`🎺 전투 찬가 — 공격 +${Math.round(30*bm)}% · 치명 +${Math.round(8*bm)}%`,"loot"); }
  else return;
  P.mp-=s.mp; if(typeof gainSkillXp==="function")gainSkillXp(k,6); if(typeof sfx==="function")sfx("heal"); render(); }
function bossPrep(onStart){ if(!B||!B.prebuff)B={comp:null,prebuff:true,atkPct:0,critB:0,defB:0,nextCrit:false};
  clearLog(); setScene("🧪","전투 준비 — 버프를 걸고 들어간다");
  line("문 너머, 강대한 것이 기다린다. 미리 버프를 걸어 대비할 수 있다. (기력 소모)","sys");
  const on=[]; if(B.atkPct)on.push(`⚔공+${Math.round(B.atkPct*100)}%`); if(B.defB)on.push(`🛡방+${B.defB}`); if(B.critB)on.push(`🎯치+${Math.round(B.critB*100)}%`); if(B.nextCrit)on.push("확정치명");
  line(on.length?`✨ 준비된 버프: <b>${on.join(" · ")}</b>`:`아직 건 버프 없음 · 기력 ${P.mp}/${MAXMP()}`,on.length?"loot":"sys");
  const avail=P.skills.filter(k=>PREBUFF_SKILLS.includes(k)&&(P.loadout||[]).includes(k));
  const acts=avail.map(k=>{ const s=SKILLS[k]; return {label:`${s.emoji} ${s.n} 미리 걸기`,desc:`${s.desc} · 기력 ${s.mp}`,disabled:P.mp<s.mp,act:()=>{ prebuffCast(k); bossPrep(onStart); }}; });
  if(!avail.length)acts.push({label:"장착한 버프 스킬이 없다",desc:"전투 함성·강철 의지·마력 방벽·집중·전투 찬가 장착 시 미리 걸 수 있음",disabled:true,act:()=>{}});
  acts.push({label:"⚔ 문을 열고 결전!",full:true,act:()=>onStart()});
  setActions(acts); }
function enterFloor(){ const f=P.floor; P.flags.maxFloor=Math.max(P.flags.maxFloor||0,f); P.runPeakFloor=Math.max(P.runPeakFloor||0,f); checkQuests();
  if(typeof bgm==="function")bgm("tower");   // 🪜 층 탐험 앰비언트(전투 시작 시 startCombat이 전투/보스 BGM으로 전환)
  if(CHECKPOINTS[f]){ checkpointTown(f); return; }
  clearLog(); line(`<span class="sys">— 탑 ${f}층 —</span>`);
  if(BOSSES[f]){ const b=BOSSES[f]; setScene(IX[b.ic][1],"이 층에는 거대한 것이 기다리고 있다.");
    line(bossStory(f,"approach"));   // 데이터 기반 보스 서사
    const be=makeEnemy(); setActions([{label:"⚔ 문을 열고 들어간다",full:true,act:()=>startCombat(be,"")},{label:"🧪 버프 걸고 들어가기",desc:"보스전 전 자기 버프 준비",act:()=>bossPrep(()=>startCombat(be,""))}]); return; }
  if(f>=3 && f<=9 && !P.quests.q_tower1 && chance(0.25)){ floorQuestNPC(); return; }
  const r=Math.random();   // 전투 비중 유지 + 이벤트 다양화
  if(r<0.50)floorCombat();
  else if(r<0.60)floorStory();
  else if(r<0.66)floorRiddle();
  else if(r<0.72)floorFork();
  else if(r<0.80)floorTreasure();
  else if(r<0.85)floorRest();
  else if(r<0.90)floorMerchant();
  else if(r<0.94)floorAmbush();
  else if(r<0.98)floorPlayerEncounter();
  else floorTrap(); }
function floorQuestNPC(){ const q=QUESTS.q_tower1; setScene("👻","반투명한 유령이 손짓한다.");
  line(`탑의 유령: <span class="quote">"내 부적을… 더 깊은 곳에서 봤다. ${q.desc}. 찾아주면 사례하지."</span>`);
  setActions([
    {label:"📜 퀘스트 수락",desc:`${q.desc} → 보상 ${rewardText(q.reward)}`,act:()=>{ acceptQuest("q_tower1"); showClimb(); }},
    {label:"거절하고 지나간다",full:true,act:()=>{ line("유령이 스르르 사라진다.","sys"); showClimb(); }},
  ]); }
function floorCombat(){ setScene("⚔️","복도 저편에서 형체가 다가온다."); line(pick(["복도 저편에서 발소리가 다가온다.","그림자 사이로 무언가 움직인다.","막다른 길… 그것이 돌아섰다."]));
  setActions([{label:"맞선다",full:true,act:()=>startCombat(makeEnemy(),"")}]); }
/* 갈림길 — 유저에게 선택지 (샛길: 보물/함정/정예) */
function floorFork(){ setScene("🔀","길이 갈라진다 — 어둠 속 샛길이 보인다.");
  line("좁은 샛길이 옆으로 뻗어 있다. 보물이 있을 수도, 위험이 도사릴 수도.","sys");
  setActions([
    {label:"🕯 샛길로 간다",desc:"보물 42% · 함정 30% · 정예 28%",act:()=>{ clearLog(); const r=Math.random(); if(r<0.42)floorTreasure(); else if(r<0.72)floorTrap(); else floorElite(); }},
    {label:"➡ 원래 길로 간다",desc:"안전하게 계단으로",full:true,act:()=>{ clearLog(); const r=Math.random(); if(r<0.6)floorCombat(); else floorStory(); }},
  ]); }
/* 함정 — 반응 선택지 (회피 or 해체) */
function floorTrap(){ setScene("⚠️","바닥의 돌이 미묘하게 어긋나 있다…"); line("함정이다! 재빨리 판단해야 한다.","dmg");
  const dodgeP=clamp(0.40+estat("dex")*0.02+LUKv()*0.02,0.40,0.90), disarmP=clamp(0.30+LUKv()*0.03,0.30,0.80);
  setActions([
    {label:"⤴ 몸을 날려 피한다",desc:`민첩·행운 · 성공 ${Math.round(dodgeP*100)}%`,act:()=>{ if(chance(dodgeP)){ line("아슬아슬하게 함정을 피했다!","heal"); }
      else { const d=8+rnd(10)+Math.floor(P.floor/2); P.hp-=d; spawnFloat("-"+d,"#ff8a8a","me"); line(`함정 작동! <b>${d}</b> 피해.`,"dmg"); render(); if(P.hp<=0){ die(); return; } } render(); showClimb(); }},
    {label:"🔍 조심히 해체한다",desc:`행운 · 성공 ${Math.round(disarmP*100)}% · 성공 시 보상`,act:()=>{ if(chance(disarmP)){ const g=20+rnd(40); P.gold+=g; line(`함정을 해체하고 숨겨진 금화 +${g}!`,"loot"); }
      else { const d=6+rnd(8); P.hp-=d; spawnFloat("-"+d,"#ff8a8a","me"); line(`해체 실패… <b>${d}</b> 피해.`,"dmg"); render(); if(P.hp<=0){ die(); return; } } render(); showClimb(); }},
  ]); }
/* 정예 몬스터 — 강하지만 보상 2배 */
function floorElite(){ setScene("💢","심상치 않은 기운 — 정예 몬스터다!"); line("강력한 정예 몬스터가 앞을 막는다! 강하지만 쓰러뜨리면 보상이 크다.","dmg");
  setActions([{label:"맞선다 (정예전)",full:true,act:()=>{ const e=makeEnemy(); e.n="정예 "+e.n; e.hp=Math.round(e.hp*1.6); e.hpMax=e.hp; e.atk=Math.round(e.atk*1.2); e.def+=2; e.g=Math.round(e.g*2.2); e.groggyMax=Math.round(e.groggyMax*1.3); e.elite=true; startCombat(e,"정예 몬스터가 포효한다!"); }},
    {label:"물러선다",act:()=>{ line("괜한 위험은 피한다.","sys"); showClimb(); }}]); }
/* 🧑‍🤝‍🧑 다른 모험가(NPC) 조우 — 거래 / 친선 버프 / 결투(약탈) · 추후 실제 유저 매칭으로 교체 가능 */
const NPC_PLAYERS=["강철나비","달빛사냥꾼","탑돌이","고인물","야간모드","용사김밥","광부왕","은둔고수","세이버장인","포션과부하"];
function npcRelicName(){ const f=P.floor; const early=["녹슨 단검","가죽 갑옷","토끼발 부적"],mid=["이 빠진 롱소드","판금 흉갑","흡혈의 반지"],late=["월광 세이버"]; return pick(f<10?[...early,...mid]:[...mid,...late]); }
function makeNpcPlayer(){ const f=P.floor; return { name:pick(NPC_PLAYERS), power:Math.round((10+f*2.2)*(0.8+Math.random()*0.6)), gold:15+rnd(30)+f*3, item: chance(0.45)?npcRelicName():null }; }
function duelWinPct(npc){ const M=ATK()*1.6+DEF()*2.2+MAXHP()*0.12+LUKv()*1.5, T=npc.power*1.15; return clamp(pctRoll(Math.round(T-M)),0,1); }
function floorPlayerEncounter(){ const npc=makeNpcPlayer();
  setScene("🧑‍🤝‍🧑","다른 모험가와 마주쳤다."); line(`탑 ${P.floor}층에서 <b>${npc.name}</b> 님을 만났다. (전투력 ~${npc.power})`,"sys");
  const acts=[{label:"🤝 인사한다",desc:"친선 · 소소한 선물/버프",act:()=>npcGreet(npc)}];
  if(npc.item)acts.push({label:"💰 거래 제안 받기",desc:`${npc.name}: "${npc.item} 팝니다"`,act:()=>npcTrade(npc)});
  acts.push({label:"⚔ 결투 (PvP 전투)",desc:`진짜 전투로 겨룬다 · 이기면 약탈 · 지면 손실 · 악행`,act:()=>npcDuel(npc)});
  acts.push({label:"지나친다",full:true,act:()=>{ line(`${npc.name} 님과 가볍게 목례하고 지나쳤다.`,"sys"); showClimb(); }});
  setActions(acts); }
function npcGreet(npc){ karma(1); const r=Math.random();
  if(r<0.4){ const g=8+rnd(15); P.gold+=g; line(`🤝 ${npc.name}: "행운을 빌어요!" — 금화 ${g}를 나눠줬다.`,"loot"); }
  else if(r<0.7){ P.potions++; line(`🤝 ${npc.name}이(가) 물약 하나를 건넸다. (+1)`,"loot"); }
  else { P.buffs.atkPct=(P.buffs.atkPct||0)+0.1; line(`✨ ${npc.name}이(가) 응원 버프를 걸어줬다! 이번 다이브 공격 +10%.`,"heal"); }
  render(); showClimb(); }
function npcTrade(npc){ if(!npc.item){ showClimb(); return; } const price=Math.round((RELICS[npc.item]?.val||40)*(0.7+Math.random()*0.4));
  clearLog(); setScene("💰",`${npc.name}의 거래 제안`); line(`${npc.name}: <span class="quote">"${npc.item}, ${price}G에 어때요?"</span>`);
  setActions([
    {label:`구매 (${price}G)`,disabled:P.gold<price,act:()=>{ if(P.gold<price){ toast("금화 부족"); return; } P.gold-=price; addRelic(npc.item); toast("거래 성사"); render(); showClimb(); }},
    {label:"거절한다",full:true,act:()=>{ line("거래를 정중히 거절했다.","sys"); showClimb(); }},
  ]); }
function npcToEnemy(npc){ const f=P.floor; const hp=Math.round(npc.power*4.2+f*7+30);   // 실제 전투용 적으로 변환
  return { n:npc.name, ic:"player", hp, hpMax:hp, atk:Math.round(npc.power*0.85+5), def:Math.round(npc.power*0.22),
    g:npc.gold, taunt:['"실력을 보여주지!"','"먼저 쓰러지는 쪽이 지는 거다."','"덤벼라, 도전자!"'], pvp:true, pvpItem:npc.item }; }
function npcDuel(npc){ karma(-2); P._duel=npc; const e=npcToEnemy(npc);
  if(typeof turnBanner==="function")setTimeout(()=>turnBanner("PVP!","foe"),60);
  startCombat(e, `⚔ <b>${npc.name}</b>과(와)의 결투 — 진짜 실력으로 겨룬다!`); }
function pvpLoss(npc){ enemy=null; B=null; P._duel=null; if(typeof sfx==="function")sfx("defeat");
  const loss=Math.min(P.gold, 20+rnd(30)+P.floor); P.gold-=loss; P.hp=Math.max(1,Math.round(MAXHP()*0.15));
  clearLog(); setScene("💀","결투 패배…"); line(`⚔ <b>${npc.name}</b>에게 패했다. ${loss}G를 빼앗기고 간신히 목숨만 건졌다.`,"dmg"); toast("결투 패배 -"+loss+"G");
  render(); setActions([{label:"🪜 계단으로",full:true,act:showClimb}]); }
/* 🗿 셔플 수수께끼 — 여러 문제 + 보기 순서 랜덤(외우기 방지) */
const RIDDLES=[
  {q:"낮엔 자고 밤에 깨며, 한 눈으로 마을을 지킨다. 나는?", a:"달", w:["등대","올빼미","별"]},
  {q:"가질수록 무거워지고, 나눌수록 가벼워지는 것은?", a:"비밀", w:["금화", "짐", "슬픔"]},
  {q:"문도 창도 없는 집 안에 황금이 가득한 것은?", a:"달걀", w:["무덤","보물상자","해골"]},
  {q:"높이 오를수록 커지고, 정상에서 당신을 삼키는 것은?", a:"고독", w:["그림자","공포","바람"]},
  {q:"주면 줄지만, 아끼면 결국 모두 잃는 것은?", a:"시간", w:["금화","목숨","기억"]},
  {q:"불에 타지 않고, 물에 젖지 않으며, 모든 것을 먹어치우는 것은?", a:"세월", w:["재","어둠","공허"]},
];
function floorRiddle(){ const r=pick(RIDDLES); const opts=[{t:r.a,ok:true}].concat(r.w.map(t=>({t,ok:false}))).sort(()=>Math.random()-0.5);
  setScene("🗿",""); line(`고대의 석상이 눈을 뜬다. <span class="quote">"${r.q}"</span>`);
  setActions(opts.map(o=>({label:o.t,act:()=>{ if(o.ok){ line('"…옳다." 석상이 지혜를 나눈다.',"loot"); trainStat("int",14+rnd(10)); P.gold+=18+rnd(16); if(typeof bumpFeat==="function")bumpFeat("riddleRight"); } else { line('"…아니다." 석상이 다시 잠든다.',"sys"); if(chance(0.3)){ const d=6+rnd(6); P.hp=Math.max(1,P.hp-d); line(`석상의 실망이 스민다 — ${d} 피해.`,"dmg"); } } render(); showClimb(); }})).concat([{label:"침묵하고 지나친다",full:true,act:()=>{ line("답하지 않고 지나친다.","sys"); showClimb(); }}])); }
/* 🧳 떠돌이 상인 — 층 티어의 좋은 무기 + 축복/물약 (프리미엄가) */
function floorMerchant(){ const f=P.floor;
  const pool=(f>=31?GEAR_TIERS.rift:f>=16?GEAR_TIERS.sky:["월광 세이버","무쇠 세이버","사냥꾼의 활","이 빠진 롱소드","보조 단검"]).filter(k=>RELICS[k]&&RELICS[k].slot==="weapon");
  const picks=[]; let tries=0; while(picks.length<2 && tries<12 && pool.length){ tries++; const k=pick(pool); if(!picks.some(p=>p.k===k))picks.push({k,price:Math.round((RELICS[k].val||100)*(0.9+Math.random()*0.6))}); }
  renderMerchant(picks, {charm:chance(0.4), potion:{n:3,price:90+f*3}}); }
function renderMerchant(picks, ex){ setScene("🧳","떠돌이 상인이 좌판을 편다.");
  line('떠돌이 상인: <span class="quote">"먼 곳에서 왔소. 좋은 물건 있으니 구경하고 가시오."</span>');
  const acts=picks.map((p,i)=>({label:`🗡 ${p.k}`,desc:`${RELICS[p.k].note||""} · 💰${p.price}`,disabled:P.gold<p.price,act:()=>{ if(P.gold<p.price){ toast("골드 부족"); return; } P.gold-=p.price; addRelic(p.k); if(typeof bumpFeat==="function")bumpFeat("merchantBuy"); line(`🧳 <b>${p.k}</b>을(를) 샀다!`,"loot"); toast("구매: "+p.k); picks.splice(i,1); render(); renderMerchant(picks,ex); }}));
  if(ex.charm)acts.push({label:"⚜️ 강화의 축복",desc:"강화 성공↑·파괴방지 · 💰2000",disabled:P.gold<2000,act:()=>{ if(P.gold<2000){ toast("골드 부족"); return; } P.gold-=2000; gainCons("enhance_charm"); line("⚜️ 강화의 축복을 샀다.","loot"); toast("구매"); ex.charm=false; render(); renderMerchant(picks,ex); }});
  if(ex.potion)acts.push({label:`🧪 물약 ${ex.potion.n}개`,desc:`💰${ex.potion.price}`,disabled:P.gold<ex.potion.price,act:()=>{ if(P.gold<ex.potion.price){ toast("골드 부족"); return; } P.gold-=ex.potion.price; P.potions+=ex.potion.n; line(`🧪 물약 ${ex.potion.n}개 구매.`,"loot"); ex.potion=null; render(); renderMerchant(picks,ex); }});
  acts.push({label:"떠난다",full:true,act:()=>{ line("상인이 좌판을 접고 어둠 속으로 사라진다.","sys"); showClimb(); }});
  setActions(acts); }
/* 👤 의태 몬스터 — 친근한 NPC가 돌발 전투 */
function floorAmbush(){ setScene("🧑","길에서 한 사람이 웃으며 다가온다.");
  line(pick(['낯선 이: <span class="quote">"여어— 동료를 만나 반갑구려!"</span>','한 여행자가 손을 흔들며 다가온다.']));
  setActions([
    {label:"🤝 인사한다",full:true,act:()=>{ line("…그 순간, 그의 얼굴이 흐물흐물 일그러진다!","dmg"); line('<b style="color:var(--danger)">돌발 전투!</b> 그것은 사람이 아니었다 — 의태하던 괴물!',"dmg");
      const e=makeEnemy(); e.n="탈을 쓴 "+(e.n||"괴물"); if(typeof turnBanner==="function")setTimeout(()=>turnBanner("AMBUSH!","foe"),50); setTimeout(()=>startCombat(e,"본모습을 드러낸다!"),320); }},
    {label:"👁 경계한다",act:()=>{ if(chance(0.55)){ line("낌새가 이상하다 — 거리를 두자 상대가 스르륵 사라진다.","sys"); showClimb(); } else { line("역시 사람이었다. 미안한 마음에 물약 하나를 받았다.","loot"); P.potions++; render(); showClimb(); } }},
  ]); }
function floorTreasure(){ setScene("🎁","먼지 쌓인 보물상자가 놓여 있다."); line(pick(["먼지 쌓인 보물상자가 놓여 있다.","벽감 안에서 무언가 반짝인다."]));
  setActions([
    {label:"상자를 연다",act:()=>{ line("녹슨 걸쇠를 젖힌다…"); const r=Math.random();
      if(r<0.15&&!P.flags.trapped){ P.flags.trapped=true; const d=6+rnd(8); P.hp-=d; spawnFloat("-"+d,"#ff8a8a","me"); render(); line(`함정! 독침이 <b>${d}</b> 피해.`,"dmg"); if(P.hp<=0){ die(); return; } }
      else if(r<0.42){ const g=20+rnd(40); P.gold+=g; line(`💰 금화 +${g}`,"loot"); }
      else if(r<0.66){ const m=Object.keys(MATS)[rnd(5)]; const a=1+rnd(3); addMat(m,a); line(`${MATS[m][0]} ${MATS[m][1]} +${a}`,"loot"); }
      else if(r<0.85){ const n=1+rnd(2); P.potions+=n; line(`🧪 물약 +${n} (상자에서 발견)`,"loot"); }
      else dropRelic(); render(); showClimb(); }},
    {label:"의심스럽다. 지나친다",act:()=>{ line("괜한 위험은 피한다.","sys"); showClimb(); }},
  ]); }
function floorRest(){ setScene("🔥","모닥불이 아직 타고 있다."); line("누군가 피워둔 모닥불이 아직 타고 있다.");
  setActions([
    {label:"불 곁에서 쉰다",desc:"HP·기력 회복",act:()=>{ heal(Math.round(MAXHP()*0.5)); P.mp=MAXMP(); line("숨을 고른다. 기력이 가득 찼다.","heal"); render(); showClimb(); }},
    {label:"불을 뒤진다",desc:"행운 판정",act:()=>{ if(chance(0.4+LUKv()*0.03)){ const g=15+rnd(25); P.gold+=g; line(`재 속에서 금화 +${g}.`,"loot"); } else line("재뿐이었다.","sys"); render(); showClimb(); }},
  ]); }
const STORY=[
  {ico:"🔒",text:'철창에 갇힌 자가 손을 뻗는다. <span class="quote">"제발 꺼내다오."</span>',opts:[
    {label:"꺼내준다",act:()=>{ karma(2,"선한 선택을 했다."); if(chance(0.7)){ line("물약 2개와 금화를 받았다.","loot"); P.potions+=2; P.gold+=20; } else { line("금화를 조금 훔쳐 달아났다.","dmg"); P.gold=Math.max(0,P.gold-10);} render(); }},
    {label:"무시한다",act:()=>{ karma(-1); line("등 뒤로 울음이 멀어진다.","sys"); }}]},
  {ico:"🍷",text:"제단 위 검은 성배. 마시면 강해진다는 속삭임.",opts:[
    {label:"마신다",act:()=>{ karma(-2,"금기의 힘에 손댔다."); P.stats.str+=1; line("피가 끓는다! 힘 +1 (영구).","loot"); render(); }},
    {label:"깨뜨린다",act:()=>{ karma(2,"유혹을 물리쳤다."); line("성배가 부서진다. (기력 완전 회복)","heal"); P.mp=MAXMP(); render(); }}]},
  /* --- 추가 조우: 기억·도박·희생·판정·세계관 (수수께끼는 floorRiddle에서 셔플) --- */
  {ico:"🕯",text:'벽에 박힌 수정 조각에 낯선 기억이 어린다 — 누군가의 얼굴, 무너지는 탑. <span class="quote">"…이건, 내 기억인가?"</span>',opts:[
    {label:"기억을 들여다본다",act:()=>{ if(chance(0.6)){ trainStat("int",1); line("잊었던 감각이 돌아온다. 지능 +1 (영구).","loot"); } else { const d=Math.round(MAXHP()*0.1); P.hp=Math.max(1,P.hp-d); line(`기억이 너무 아프다… ${d} 피해.`,"dmg"); } render(); }},
    {label:"외면한다",act:()=>{ line("알고 싶지 않은 것도 있다. 조용히 지나친다.","sys"); }}]},
  {ico:"🧙",text:'눈먼 노상인이 보따리를 연다. <span class="quote">"운을 시험해 보겠나? 금화 30이면, 무엇이 나올지는 나도 몰라."</span>',opts:[
    {label:"30G 건다",disabled:()=>P.gold<30,act:()=>{ P.gold-=30; const r=Math.random(); if(r<0.4){ P.gold+=80; line("보따리에서 금화 80이 쏟아진다!","loot"); } else if(r<0.7){ dropRelic(); line("장비 하나가 굴러나왔다.","loot"); } else { P.potions+=2; line("물약 2개… 나쁘지 않다.","loot"); } render(); }},
    {label:"사양한다",act:()=>{ line("노상인이 껄껄 웃으며 흩어진다.","sys"); }}]},
  {ico:"🩸",text:'검붉게 젖은 제단. 손을 대면 <b>생명을 바쳐 힘을 얻으라</b>는 속삭임이 들린다.',opts:[
    {label:"피를 바친다",desc:"HP 대가 · 힘 영구 +1",act:()=>{ const d=Math.round(MAXHP()*0.2); P.hp=Math.max(1,P.hp-d); trainStat("str",1); karma(-1); line(`${d}을(를) 바치고 힘 +1을 얻었다.`,"loot"); render(); }},
    {label:"기도만 올린다",act:()=>{ karma(1); heal(Math.round(MAXHP()*0.2)); line("조용히 기도한다. 상처가 조금 아문다.","heal"); render(); }}]},
  {ico:"🧒",text:'탑 속에 어울리지 않는 아이가 훌쩍인다. <span class="quote">"엄마를… 잃어버렸어요."</span>',opts:[
    {label:"함께 길을 찾아준다",act:()=>{ karma(2,"약한 이를 도왔다."); trainStat("luk",1); if(chance(0.7))P.gold+=30; line("아이가 사라지며 작은 부적을 남긴다. 행운 +1.","loot"); render(); }},
    {label:"수상하다. 물러선다",act:()=>{ if(chance(0.5))line("아이의 형체가 일그러진다 — 미믹이었다! 재빨리 피했다.","dmg"); else line("그냥 지나친다. 뒤가 서늘하다.","sys"); }}]},
  {ico:"🎲",text:'해골 도박꾼이 뼈주사위를 굴린다. <span class="quote">"합이 8 이상이면 두 배, 아니면 잃는 거야."</span>',opts:[
    {label:"40G 건다",disabled:()=>P.gold<40,act:()=>{ P.gold-=40; const d=2+rnd(6)+rnd(6); if(d>=8){ P.gold+=80; line(`주사위 합 ${d}! 금화 80 획득!`,"loot"); } else line(`주사위 합 ${d}… 잃었다.`,"dmg"); render(); }},
    {label:"관둔다",act:()=>{ line("도박꾼이 어깨를 으쓱한다.","sys"); }}]},
  {ico:"⚔️",text:'봉인된 무구가 좌대에 꽂혀 있다. 봉인을 풀면 장비를, 실패하면 반동을.',opts:[
    {label:"봉인을 푼다",desc:"행운 판정 · 성공 시 장비",act:()=>{ if(chance(clamp(0.45+LUKv()*0.03,0.45,0.85))){ dropRelic(); line("봉인이 풀리고 장비를 얻었다!","loot"); } else { const d=8+rnd(10); P.hp=Math.max(1,P.hp-d); line(`봉인의 반동! ${d} 피해.`,"dmg"); } render(); }},
    {label:"건드리지 않는다",act:()=>{ line("괜한 위험은 피한다.","sys"); }}]},
  {ico:"👤",text:'벽의 그림자가 속삭인다. <span class="quote">"힘을 원하나? 대가는… 나중에 치르면 돼."</span>',opts:[
    {label:"제안을 받는다",act:()=>{ karma(-2,"어둠과 거래했다."); P.buffs.atkPct=(P.buffs.atkPct||0)+0.2; line("어둠이 스며든다. 이번 다이브 공격 +20%… 허나 무언가 잃은 기분이다.","loot"); render(); }},
    {label:"거부한다",act:()=>{ karma(1); line("그림자가 실망한 듯 스러진다.","sys"); }}]},
  {ico:"🪦",text:'오른 자들의 이름이 빼곡한 비석. 대부분 지워졌고, 맨 아래 빈 칸이 당신을 기다리는 듯하다.',opts:[
    {label:"묵념한다",act:()=>{ karma(1); P.mp=MAXMP(); line("먼저 간 이들에게 묵념한다. 마음이 가라앉는다. (기력 완전 회복)","heal"); render(); }},
    {label:"이름을 새긴다",act:()=>{ line("빈 칸에 당신의 이름을 새긴다. …글자가 곧 희미하게 지워진다.","sys"); if(chance(0.5))P.gold+=15; render(); }}]},
];
function floorStory(){ const ev=pick(STORY); setScene(ev.ico,""); line(ev.text);
  setActions(ev.opts.map(o=>({ label:o.label, disabled:typeof o.disabled==="function"?o.disabled():!!o.disabled, act:()=>{ o.act(); render(); showClimb(); } }))); }


/* ============================================================
   🗺️ 대륙 개척 (프로토타입) — 층=대륙, 구역을 개척하며 오른다
   ============================================================ */
const STEPS_PER_AREA=5;
/* 지역 디버프 — 대륙마다 상시 페널티. 전용 내성 아이템(CONS resist_*)으로 무효 */
const REGION_DEBUFFS={   // 내성 없이 가면 매우 아픔 — 받는 피해↑ + 강한 도트
  corrode:{n:"부식",icon:"🛢️",resist:"resist_corrode",desc:"방어 -6 · 받는 피해 +12%",applyB:(B)=>{ B.defB=(B.defB||0)-6; B.dmgTakenPct=(B.dmgTakenPct||0)+0.12; }},
  burn:{n:"작열",icon:"🔥",resist:"resist_burn",desc:"매 턴 화상(HP 8%) · 받는 피해 +8%",applyB:(B)=>{ B.dmgTakenPct=(B.dmgTakenPct||0)+0.08; },onTurn:()=>{ const d=Math.max(6,Math.round(MAXHP()*0.08)); P.hp-=d; line(`🔥 작열! 화상으로 <b>${d}</b> 피해.`,"dmg"); spawnFloat("-"+d,"#ff8a3a","me"); }},
  frost:{n:"한기",icon:"❄️",resist:"resist_frost",desc:"공격 -25% · 받는 피해 +10%",applyB:(B)=>{ B.atkPct=(B.atkPct||0)-0.25; B.dmgTakenPct=(B.dmgTakenPct||0)+0.10; }},
  plague:{n:"역병",icon:"☣️",resist:"resist_plague",desc:"매 턴 중독(HP 7%) · 공격 -12% · 회복 반감",applyB:(B)=>{ B.atkPct=(B.atkPct||0)-0.12; B.healCut=true; },onTurn:()=>{ const d=Math.max(5,Math.round(MAXHP()*0.07)); P.hp-=d; line(`☣️ 역병! 중독으로 <b>${d}</b> 피해.`,"dmg"); spawnFloat("-"+d,"#9bd36b","me"); }},
  voidcurse:{n:"공허",icon:"🕳️",resist:"resist_void",desc:"공격·치명·방어 저하 · 받는 피해 +12%",applyB:(B)=>{ B.atkPct=(B.atkPct||0)-0.18; B.critB=(B.critB||0)-0.12; B.defB=(B.defB||0)-5; B.dmgTakenPct=(B.dmgTakenPct||0)+0.12; }},
};
/* 5대륙 — 탑 정상 너머의 엔드게임. 갈수록 강해지고 각 대륙엔 자기 탑(수호체) */
const CONTINENTS=[
  {name:"제1대륙 · 잿빛 평원",ic:"🏜️",diffBase:12,pool:"sky",debuff:"corrode",setKey:"strata",
   intro:"탑 밖 첫 대륙. 부식의 안개가 갑옷을 갉아먹는다. 여기에도 무너진 탑이 있었다.",
   areas:[{n:"무너진 성문",ic:"⛩",boss:{n:"성문의 파수병",ic:"knight"}},{n:"안개 습지",ic:"🌫",boss:{n:"늪의 포식자",ic:"slime"}},{n:"뼈의 언덕",ic:"💀",boss:{n:"뼈무덤의 지배자",ic:"skeleton"}},{n:"잿빛 첨탑",ic:"🗼",boss:{n:"폐탑의 망령 기사",ic:"knight"}}],
   contBoss:{n:"잿빛 평원의 수호체 · 석화의 여왕",ic:"gorgon"}},
  {name:"제2대륙 · 화염의 협곡",ic:"🌋",diffBase:18,pool:"void",debuff:"burn",setKey:"blackiron",
   intro:"용암이 흐르는 협곡. 대기 자체가 살갗을 태운다 — 화염 내성 없이는 버티기 힘들다.",
   areas:[{n:"잿불 능선",ic:"🏔",boss:{n:"이글거리는 거인",ic:"meteor"}},{n:"용암 동굴",ic:"🕳",boss:{n:"불꽃 히드라",ic:"rifthydra"}},{n:"화산 제단",ic:"🔥",boss:{n:"제단의 화신",ic:"fire"}},{n:"불타는 첨탑",ic:"🗼",boss:{n:"첨탑의 용인",ic:"wyvern"}}],
   contBoss:{n:"화염 협곡의 폭군 · 용암의 군주",ic:"voidlord"}},
  {name:"제3대륙 · 서리 심연",ic:"❄️",diffBase:24,pool:"void",debuff:"frost",setKey:"strata",
   intro:"시간마저 얼어붙은 백야의 심연. 손끝이 곱아 검을 쥐기조차 힘들다.",
   areas:[{n:"얼어붙은 항구",ic:"⚓",boss:{n:"빙결의 세이렌",ic:"wraith"}},{n:"백야 설원",ic:"🌨",boss:{n:"설원의 군주",ic:"crystal"}},{n:"유빙 미궁",ic:"🧊",boss:{n:"심해의 관찰자",ic:"watcher"}},{n:"서리 첨탑",ic:"🗼",boss:{n:"빙탑의 마녀",ic:"starwraith"}}],
   contBoss:{n:"서리 심연의 수호체 · 빙하의 리바이어던",ic:"rifthydra"}},
  {name:"제4대륙 · 부패의 밀림",ic:"🌿",diffBase:31,pool:"void",debuff:"plague",setKey:"blackiron",
   intro:"살아 숨쉬는 부패의 밀림. 공기마다 역병이 스며 있어 상처가 아물지 않는다.",
   areas:[{n:"독안개 늪",ic:"🐸",boss:{n:"역병의 두꺼비왕",ic:"ghoul"}},{n:"뒤틀린 수림",ic:"🌳",boss:{n:"뒤틀린 정령",ic:"gorgon"}},{n:"포자 군락",ic:"🍄",boss:{n:"포자 여왕",ic:"tentacle"}},{n:"부패 첨탑",ic:"🗼",boss:{n:"썩은 탑의 지배자",ic:"voidbeast"}}],
   contBoss:{n:"부패 밀림의 수호체 · 역병의 어머니",ic:"tentacle"}},
  {name:"제5대륙 · 공허의 끝",ic:"🌌",diffBase:38,pool:"void",debuff:"voidcurse",setKey:"voidset",
   intro:"모든 탑의 근원. 별도 시간도 무너져 내리는 공허의 끝 — 여기서 진짜 결말을 마주한다.",
   areas:[{n:"무너지는 경계",ic:"💫",boss:{n:"경계의 파수꾼",ic:"timewarden"}},{n:"별의 무덤",ic:"🌠",boss:{n:"죽은 별의 화신",ic:"starwraith"}},{n:"시간의 잔해",ic:"⏳",boss:{n:"시간의 포식자",ic:"voidbeast"}},{n:"창세의 첨탑",ic:"🗼",boss:{n:"창세탑의 감시자",ic:"watcher"}}],
   contBoss:{n:"공허의 끝 · 근원의 신",ic:"godhead"}},
];
function CONT(){ return CONTINENTS[(EXP&&EXP.ci)||0]; }
function contUnlockedCount(){ return Math.min(CONTINENTS.length, (P.flags.contCleared||0)+1); }
function expDifficulty(){ if(!EXP)return 10; return CONT().diffBase + EXP.ai*2 + Math.floor(EXP.step/2); }
function expScale(diff){ return 1 + (diff-1)*0.17; }   // 밸런스: 대륙 곡선 대폭 강화(0.12→0.17) — 탑과 격차 확대
/* 🌩 개척은 탑과 '비교도 안 될' 강함: 몬스터 자체에 배수 부여 */
const EXP_HPMUL=1.85, EXP_ATKMUL=1.6, EXP_DEFADD=3;
function expPool(){ const p=CONT().pool; return p==="void"?ENEMIES3 : p==="sky"?ENEMIES2 : ENEMIES; }
function regionDebuff(){ return EXP?REGION_DEBUFFS[CONT().debuff]:null; }
function regionResisted(){ const d=regionDebuff(); return !!(d && P.buffs && P.buffs.regionResist===CONT().debuff); }
function applyRegionDebuff(){ const d=regionDebuff(); if(!d||!B)return;   // 전투 시작 시 정적 디버프 적용(내성 없으면)
  if(regionResisted()){ line(`🧪 <b>${d.n}</b> 내성 — 지역 디버프 무효.`,"heal"); return; }
  if(d.applyB)d.applyB(B); line(`${d.icon} 지역 디버프 <b>${d.n}</b> 활성 — ${d.desc}`,"dmg"); }
function regionTurnTick(){ const d=regionDebuff(); if(!d||!d.onTurn||!enemy||regionResisted())return; d.onTurn(); if(P.hp<=0)deathCause=`${d.icon||"🌫"} 지역 효과 · ${d.n||"디버프"}`; render(); if(P.hp<=0){ die(); return true; } return false; }
/* 🧭 대륙 선택 */
function startExpedition(){ if(enemy){ toast("전투 중엔 갈 수 없다"); return; } stopAuctionTimer(); auction=null; expSelectContinent(); }
function expSelectContinent(){ mode="town"; EXP=null; render(); clearLog(); setScene("🧭","대륙 개척 — 어느 대륙으로?");
  line("탑 너머로 펼쳐진 대륙들. 갈수록 강력한 적과 <b>지역 디버프</b>가 기다린다.","sys");
  const unlocked=contUnlockedCount();
  const acts=CONTINENTS.map((c,i)=>{ const d=REGION_DEBUFFS[c.debuff]; const cleared=(P.flags.contCleared||0)>i; const open=i<unlocked;
    const pr=P.expProg&&P.expProg[i]; const inProg=!cleared&&pr&&(pr.ai>0||pr.step>0);
    return open
      ? {label:`${cleared?"✅":inProg?"▶":c.ic} ${c.name}${inProg?` <span style="color:var(--gold)">개척 중 ${pr.ai}/${c.areas.length}</span>`:""}`,desc:`${d.icon} ${d.n} · ${d.desc}${cleared?" · 개척완료(재도전)":inProg?" · 이어서 개척":""}`,full:true,act:()=>beginContinent(i)}
      : {label:`🔒 ${c.name}`,desc:"이전 대륙을 먼저 개척해야 열린다",full:true,disabled:true,act:()=>{}}; });
  acts.push({label:"🏘 마을로",full:true,act:townMenu}); setActions(acts); }
function saveExpProg(){ if(!EXP||!P)return; if(!P.expProg)P.expProg={}; P.expProg[EXP.ci]={ai:EXP.ai,step:EXP.step}; save(true); }   // 🧭 개척 진행 저장(마을 갔다 와도 이어짐)
function beginContinent(ci){ mode="dive"; const sv=(P.expProg&&P.expProg[ci])||null; const rai=(sv&&sv.ai)||0, rstep=(sv&&sv.step)||0;
  EXP={ci,ai:rai,step:rstep}; EXP.debuff=REGION_DEBUFFS[CONTINENTS[ci].debuff]; EXP.debuffKey=CONTINENTS[ci].debuff; expReturn=null;
  P.dives++; P.hp=MAXHP(); P.mp=MAXMP(); enemy=null; B=null; if(P.buffs)P.buffs.regionResist=null; P.floor=expDifficulty();
  const total=(P.potions||0)+(P._divePotBank||0); P._divePotBank=Math.max(0,total-DIVE_POTION_MAX); P.potions=Math.min(total,DIVE_POTION_MAX);
  const c=CONT(), d=regionDebuff(); render(); clearLog(); setScene(c.ic,c.name);
  line(`🗺️ <b>${c.name}</b> — ${c.intro}`,"sys");
  line(`${d.icon} <b>지역 디버프: ${d.n}</b> — ${d.desc}. <b>${CONS[d.resist].n}</b>(잡화점)으로 무효화 가능.`,"dmg");
  if(P._divePotBank>0)line(`🧪 물약은 최대 ${DIVE_POTION_MAX}개만 반입 (나머지 ${P._divePotBank}개 마을 보관).`,"sys");
  if(rai>0||rstep>0)line(`📍 이전 진행부터 이어서 개척한다 — <b>${(CONTINENTS[ci].areas[rai]||{}).n||"수호체"}</b> (${rai}/${CONTINENTS[ci].areas.length} 구역 완료).`,"loot");
  expeditionHub(); }
function expMapHtml(){ const c=CONT(), spa=STEPS_PER_AREA, areas=c.areas, total=areas.length*spa;
  const done=EXP.ai*spa+Math.min(EXP.step,spa), pct=Math.round(done/total*100);
  let rows=areas.map((a,idx)=>{ let cls,mark,extra="";
    if(idx<EXP.ai){ cls="done"; mark="✅"; }
    else if(idx===EXP.ai){ cls="cur"; mark="▶"; const filled=Math.min(EXP.step,spa);
      const pips=Array.from({length:spa},(_,i)=>`<span class="epip ${i<filled?'on':''}"></span>`).join("");
      extra=`<div class="epips">${pips}<span class="estep">${filled}/${spa}${EXP.step>=spa?" · 수호자!":""}</span></div>`; }
    else { cls="lock"; mark="🔒"; }
    return `<div class="enode ${cls}"><div class="eln">${mark} ${a.ic} ${a.n}${idx<EXP.ai?" — 개척 완료":idx===EXP.ai?" — 개척 중":""}</div>${extra}</div>`; }).join("");
  rows+=`<div class="enode boss ${EXP.ai>=areas.length?'cur':'lock'}"><div class="eln">👑 ${c.contBoss.n}</div></div>`;
  const d=regionDebuff(), res=regionResisted();
  const dbadge=`<div class="edebuff ${res?'ok':''}">${d.icon} ${d.n}${res?" · 내성✔":" (내성 필요)"}</div>`;
  return `<div class="expmap"><div class="ehead"><span>${c.ic} ${c.name}</span><span class="epct">개척 ${pct}%</span></div>${dbadge}${rows}</div>`; }
function expeditionHub(){ if(!EXP||enemy)return; mode="dive"; P.floor=expDifficulty(); render();
  const c=CONT(), spa=STEPS_PER_AREA;
  if(EXP.ai>=c.areas.length){   // 🐛 FIX: 모든 구역 완료 → 대륙 수호체 결전 대기 (예전엔 area=undefined로 크래시 → 진행 불가)
    setScene("👑",`${c.name} · 대륙 수호체`);
    $("log").innerHTML=expMapHtml();
    setActions([
      {label:`⚔ ${c.contBoss.n} 결전`,desc:"모든 구역 개척 완료 · 대륙 수호체와 최종 결전",full:true,act:contBossIntro},
      {label:"🎒 소지품",act:inventoryMenu},{label:"📋 스킬",act:skillWindow},
      {label:"🚪 마을로 귀환",desc:"개척 종료 · 획득물 유지 (다시 오면 수호체부터)",act:returnToTown},
    ]); return;
  }
  const area=c.areas[EXP.ai], atBoss=EXP.step>=spa;
  setScene(area.ic,`${c.name} · ${area.n}`);
  $("log").innerHTML=expMapHtml();
  setActions([
    {label:atBoss?`⚔ ${area.boss.n} 결전`:`🧭 탐험하기 (${EXP.step}/${spa})`,desc:atBoss?"구역 보스와 결전":"이 구역을 개척한다",full:true,act:exploreStep},
    {label:"🎒 소지품",act:inventoryMenu},{label:"📋 스킬",act:skillWindow},
    {label:"🚪 마을로 귀환",desc:"개척 종료 · 획득물 유지",act:returnToTown},
  ]); }
function exploreStep(){ if(!EXP||enemy)return; const spa=STEPS_PER_AREA;
  if(EXP.step>=spa){ areaBoss(); return; }
  EXP.step++; saveExpProg(); P.floor=expDifficulty(); clearLog();
  const r=Math.random();
  if(r<0.58)expCombat(); else if(r<0.73)expLifeNode(); else if(r<0.86)expTreasure(); else expEvent(); }
function expCombat(){ expReturn=expeditionHub; setScene("⚔️","무언가 다가온다.");
  setActions([{label:"맞선다",full:true,act:()=>startCombat(expEnemy(expDifficulty()),pick(["폐허 사이로 형체가 다가온다.","공기가 뒤틀리며 그것이 나타났다.","발소리가 가까워진다."]))}]); }
function expLifeNode(){ setScene("⛏","자원 지대를 발견했다.");
  const mk=pick(Object.keys(MATS)), amt=1+rnd(3); addMat(mk,amt); const st=pick(["str","vit","dex"]); trainStat(st,6+rnd(5));
  line(`${MATS[mk][0]} <b>${MATS[mk][1]} +${amt}</b> 채집 · ${STAT_NAME[st]} 단련.`,"loot"); render();
  setActions([{label:"🧭 계속 개척",full:true,act:expeditionHub}]); }
function expTreasure(){ setScene("🎁","폐허 속 보물을 발견했다.");
  const r=Math.random();
  if(r<0.42){ const g=40+rnd(60); P.gold+=g; line(`💰 금화 +${g}`,"loot"); }
  else if(r<0.7){ const mk=pick(Object.keys(MATS)), a=1+rnd(3); addMat(mk,a); line(`${MATS[mk][0]} ${MATS[mk][1]} +${a}`,"loot"); }
  else if(r<0.94){ const n=1+rnd(2); P.potions+=n; line(`🧪 물약 +${n}`,"loot"); }
  else dropRelic();   // 장비 25%→6%(리니지급)
  render(); setActions([{label:"🧭 계속 개척",full:true,act:expeditionHub}]); }
function expEvent(){ setScene("🏕","버려진 야영지.");
  if(chance(0.5)){ heal(Math.round(MAXHP()*0.4)); P.mp=MAXMP(); line("모닥불에 숨을 고른다. HP·기력 회복.","heal"); }
  else { const g=15+rnd(30); P.gold+=g; line(`버려진 주머니에서 금화 +${g}.`,"loot"); }
  render(); setActions([{label:"🧭 계속 개척",full:true,act:expeditionHub}]); }
function areaBoss(){ if(!EXP)return; const area=CONT().areas[EXP.ai]; expReturn=afterAreaClear; P.floor=expDifficulty()+2;
  clearLog(); setScene(area.ic,`${area.n} — 수호자 출현`); line(`구역의 끝. <b>${area.boss.n}</b>이(가) 길을 막는다!`,"dmg");
  const e=expBoss(area.boss,expDifficulty(),false);
  setActions([{label:"⚔ 맞선다",full:true,act:()=>startCombat(e,`${area.boss.n}이(가) 포효한다!`)},{label:"🧪 버프 걸고 들어가기",act:()=>bossPrep(()=>startCombat(e,`${area.boss.n}이(가) 포효한다!`))},{label:"물러난다",act:()=>{ expReturn=null; expeditionHub(); }}]); }
function afterAreaClear(){ if(!EXP)return; const c=CONT(); clearLog(); setScene("✅","구역 개척 완료"); line(`✅ <b>${c.areas[EXP.ai].n}</b> 구역을 개척했다!`,"loot");
  if(c.setKey&&chance(0.22)){ line(`✦ <b>${SETS[c.setKey].n}</b> 조각 발견!`,"loot"); dropSetPiece(c.setKey); }   // 구역 보스: 세트 조각 확률 드랍(파밍)
  EXP.ai++; EXP.step=0; saveExpProg();
  if(EXP.ai>=c.areas.length){ contBossIntro(); return; }
  line(`다음 구역: <b>${c.areas[EXP.ai].n}</b>`,"sys"); setActions([{label:"🧭 다음 구역으로",full:true,act:expeditionHub}]); }
function contBossIntro(){ if(!EXP)return; const c=CONT(); expReturn=afterContClear; P.floor=expDifficulty()+4;
  clearLog(); setScene("👑",`${c.name} — 대륙 수호체`); line(`대륙의 심장부. <b>${c.contBoss.n}</b>이(가) 깨어난다!`,"dmg");
  const e=expBoss(c.contBoss,expDifficulty(),true); if(EXP.ci>=CONTINENTS.length-1)e.final=true;   // 🔥 마지막 대륙 보스 = 최종보스
  setActions([{label:"⚔ 결전",full:true,act:()=>startCombat(e,`${c.contBoss.n}이(가) 모습을 드러낸다!`)},{label:"🧪 버프 걸고 들어가기",act:()=>bossPrep(()=>startCombat(e,`${c.contBoss.n}이(가) 모습을 드러낸다!`))},{label:"물러난다",act:()=>{ expReturn=null; expeditionHub(); }}]); }
function dropSetPiece(setKey){ const pieces=Object.keys(RELICS).filter(k=>RELICS[k].set===setKey); if(!pieces.length)return;
  const unowned=pieces.filter(k=>!P.inv.some(x=>x.k===k)&&!(P.stash&&P.stash.inv||[]).some(x=>x.k===k)); addRelic(pick(unowned.length?unowned:pieces)); }
function afterContClear(){ const ci=EXP.ci, c=CONTINENTS[ci], last=(ci>=CONTINENTS.length-1);
  if(!P.flags.contClearCount)P.flags.contClearCount={};   // 🔁 대륙별 정복 횟수(재정복 보상 감산용)
  const prevClears=P.flags.contClearCount[ci]||0, repeat=prevClears>=1, mul=repeat?0.8:1;   // 2회차부터 80%(무한 파밍 방지)
  P.flags.contClearCount[ci]=prevClears+1;
  P.runContClears=(P.runContClears||0)+1;   // 🌌 회귀 메아리 계산용
  clearLog(); setScene("🏆",`${c.name} 개척 완료!`);
  line(`🎉 <b>${c.name}</b>을(를) 완전히 개척했다!`,"loot");
  if(repeat)line(`♻ <b>재정복 보상 80%</b> — 이미 정복한 탑이라 보상이 줄어듭니다.`,"sys");
  const gold=Math.round((300+ci*200)*mul); P.gold+=gold; const matAmt=Math.max(1,Math.round((4+ci)*mul)); Object.keys(MATS).forEach(m=>addMat(m,matAmt)); line(`💰 금화 +${gold}, 재료 +${matAmt}씩 획득!`,"loot");
  if(c.setKey && (!repeat || chance(0.8))){ line(`✦ <b>${SETS[c.setKey].n}</b> 조각을 획득했다!`,"loot"); dropSetPiece(c.setKey); }
  if(chance(0.5*mul))dropRelic();
  if((P.flags.contCleared||0)<ci+1)P.flags.contCleared=ci+1;   // 다음 대륙 해금
  if(P.expProg)delete P.expProg[ci];   // 🧭 완전 개척 → 진행 기록 정리(재도전은 처음부터)
  if(typeof unlockAnnounce==="function")unlockAnnounce("🗼",`${c.name}의 탑`,"마을 탑 등반 목록에서 이 탑의 포탈을 이용할 수 있어요!");
  else line(`🗼 <b>${c.name}</b>의 탑으로 통하는 <b>포탈</b>이 열렸다!`,"loot");   // 🗼 탑 포탈 해금
  EXP=null; expReturn=null; checkTitleUnlocks(); render();
  if(last){ setTimeout(trueEnding,300); return; }
  line(`🧭 <b>다음 대륙</b>이 열렸다 — ${CONTINENTS[ci+1].name}!`,"loot");
  setActions([{label:"🧭 대륙 선택으로",full:true,act:startExpedition},{label:"🏘 마을로",full:true,act:townMenu}]); }
function trueEnding(){ stopAuctionTimer(); enemy=null; B=null; EXP=null; clearLog(); setScene("🌌","");
  const good=P.karma>=3, evil=P.karma<=-3;
  line(`<b style="color:var(--gold)">— 공허의 끝, 근원의 신 앞에서 —</b>`);
  line("모든 탑과 대륙을 넘어선 자리. 근원의 신이 당신을 마주 본다 — 역시, 당신과 같은 얼굴로.");
  if(good){ line("당신은 근원을 부수지 않고 끌어안는다. 갇힌 세계가 숨을 되찾고, 모든 탑이 조용히 무너진다.","quote"); line("★ <b>세계의 해방자</b> — 진(眞) 엔딩. 순환이 끝났다.","loot"); }
  else if(evil){ line("당신은 근원을 삼켜 새로운 신이 된다. 대륙과 탑이 당신의 뜻대로 다시 세워진다.","quote"); line("★ <b>새로운 근원</b> — 진(眞) 엔딩. 당신이 곧 탑이 되었다.","loot"); }
  else { line("당신은 근원에 등을 돌린다. 답은 얻지 못했으나, 처음으로 탑을 벗어나 걸어간다.","quote"); line("★ <b>경계를 넘은 자</b> — 진(眞) 엔딩. 세계의 끝을 본 유일한 방랑자.","loot"); }
  P.flags.trueCleared=(P.flags.trueCleared||0)+1; P.gold+=2000; Object.keys(MATS).forEach(m=>addMat(m,10)); gainStamina(STAM_MAX);
  line("💰 금화 +2000, 재료 대량 획득! 당신의 전설이 새겨졌다.","loot"); checkTitleUnlocks(); render();
  setActions([{label:"🏘 마을로 (계속 플레이)",full:true,act:townMenu}]); }
function expEnemy(diff){ const base=pick(expPool()); const s=expScale(diff)*ngMul();
  const e={...base,hp:Math.round(base.hp*s*EXP_HPMUL),atk:Math.round(base.atk*s*EXP_ATKMUL),def:base.def+Math.floor(diff/5)+EXP_DEFADD,g:Math.round(base.g*(1+(diff-1)*0.14)*1.4)};
  e.hpMax=e.hp; e.groggy=0; e.groggyMax=Math.round((40+diff*3)); e.staggered=false; e.stagUsed=false; return e; }
function expBoss(def,diff,cont){ const base=pick(expPool()); const s=expScale(diff)*ngMul(), mul=cont?3.4:2.2;
  const e={n:def.n,ic:def.ic,taunt:["기이한 기운이 몰아친다.","공기가 무겁게 짓눌린다.","대륙이 진동한다."],
    hp:Math.round(base.hp*s*mul*EXP_HPMUL),atk:Math.round(base.atk*s*1.25*EXP_ATKMUL),def:base.def+Math.floor(diff/5)+2+EXP_DEFADD,g:Math.round(base.g*s*(cont?3:1.8)*1.5),boss:true,sp:cont?"대륙의 분노":"강타",ultMult:cont?3.1:2.7};
  e.hpMax=e.hp; e.groggy=0; e.groggyMax=Math.round((40+diff*3)*2.0); e.staggered=false; e.stagUsed=false; return e; }
