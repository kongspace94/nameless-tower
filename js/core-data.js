"use strict";
/* ============================================================
   이름 없는 탑 v4 — 자급자족 로그라이트 (오프라인 프로토타입)
   구조: [거점 마을] 생활활동→스탯성장 · 스킬 습득 트리 · 경매(봇)
         [탑 다이브] 로그라이트 전투(예고/게이지/돌발/주사위/동료)
   캐릭터(스탯·스킬·재료·골드)는 영구. 죽어도 마을로 귀환.
   데이터는 서버(DB) 이식이 쉽도록 순수 객체로 보관.
   ============================================================ */
const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random()*n);
const pick = arr => arr[rnd(arr.length)];
const chance = p => Math.random() < p;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

/* ---------- 아이콘 ---------- */
const ASSET_BASE="assets/";
const IX={
  bat:["enemies/bat.png","🦇"], skeleton:["enemies/skeleton.png","💀"], slime:["enemies/slime.png","🟢"],
  spider:["enemies/spider.png","🕷️"], knight:["enemies/cursed_knight.png","🛡️"], ghoul:["enemies/ghoul.png","🧟"],
  fire:["enemies/fire_spirit.png","🔥"], gorgon:["enemies/gorgon.png","🐍"],
  golem:["enemies/boss_golem.png","🗿"], countess:["enemies/boss_countess.png","🧛"], tentacle:["enemies/boss_tentacle.png","🐙"],
  /* 제2컨셉존(16~30층) 천공의 성역 */
  harpy:["enemies/harpy.png","🦅"], crystal:["enemies/crystal_golem.png","💠"], wraith:["enemies/light_wraith.png","👻"],
  wyvern:["enemies/storm_wyvern.png","🐲"], seraph:["enemies/fallen_seraph.png","👼"], thunderbird:["enemies/thunderbird.png","⚡"],
  archon:["enemies/boss_archon.png","⚜️"], archangel:["enemies/boss_archangel.png","😇"], overlord:["enemies/boss_overlord.png","👑"],
  /* 제3컨셉존(31~50층) 시공의 균열 */
  voidbeast:["enemies/void_beast.png","🌑"], meteor:["enemies/meteor_giant.png","☄️"], starwraith:["enemies/star_wraith.png","🌠"],
  timewarden:["enemies/time_warden.png","⏳"], watcher:["enemies/formless_watcher.png","👁️"], rifthydra:["enemies/rift_hydra.png","🐉"],
  riftlord:["enemies/boss_riftlord.png","🌀"], voidlord:["enemies/boss_voidlord.png","🕳️"], stareater:["enemies/boss_stareater.png","💫"], godhead:["enemies/boss_godhead.png","🌟"],
  dagger:["items/dagger.png","🗡️"], longsword:["items/longsword.png","⚔️"], moon:["items/moon_saber.png","🌙"], bow:["items/bow.png","🏹"],
  leather:["items/leather_armor.png","🥋"], plate:["items/plate_armor.png","🛡️"], rabbit:["items/rabbit_foot.png","🐰"],
  vring:["items/vampire_ring.png","💍"], key:["items/nameless_key.png","🗝️"], potion:["items/potion.png","🧪"], gold:["items/gold.png","🪙"],
  shield:["items/shield.png","🛡️"], boots:["items/boots.png","👢"], amulet:["items/amulet.png","📿"], offdagger:["items/dagger.png","🗡️"],
  dice:["items/dice.png","🎲"], card:["items/card.png","🃏"],
  player:["ui/player.png","🧝"], fairy_light:["companions/fairy_light.png","🧚"], fairy_imp:["companions/fairy_imp.png","🔥"], fairy_steel:["companions/fairy_steel.png","🛡️"],
};
function ico(key,size=40){ const a=IX[key]; if(!a) return spanEmo("❔",size);
  return `<img class="ico" src="${ASSET_BASE}${a[0]}" data-emo="${a[1]}" data-size="${size}" style="width:${size}px;height:${size}px" onerror="iconFail(this)">`; }
function spanEmo(e,size){ return `<span class="emo" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.62)}px">${e}</span>`; }
function iconFail(img){ const s=+(img.dataset.size||40); const sp=document.createElement("span"); sp.className="emo"; sp.textContent=img.dataset.emo||"❔";
  sp.style.width=s+"px"; sp.style.height=s+"px"; sp.style.fontSize=Math.round(s*0.62)+"px"; img.replaceWith(sp); }
window.iconFail=iconFail;

/* ---------- 재료 / 생활 / 스킬 정의 ---------- */
const MATS={ wood:["🪵","원목"], ore:["🪨","광석"], herb:["🌿","약초"], fish:["🐟","생선"], mana:["🔮","마정석"] };
/* ⛺ 자동 파밍 (부족 거점 · 일꾼) — 시간 기반 자동 생산(오프라인 포함) */
const FARM_BASE_RATE=4, FARM_CAP_PER_LV=40, FARM_MAX_SLOTS=6, FARM_START_SLOTS=2;
function farmRate(lv){ return FARM_BASE_RATE*(lv||1); }            // 시간당 생산량
function farmCap(lv){ return FARM_CAP_PER_LV*(lv||1); }            // 슬롯 저장 상한
function farmHireCost(n){ return 800+n*n*700; }                   // 다음 일꾼(슬롯) 고용 금화 — 대폭↑(자동 파밍은 강력한 수익원)
function farmUpCostGold(lv){ return 60*(lv||1); }                 // 슬롯 강화 금화
/* 🔥 속성 상성 + 상태이상 — 적마다 약점 속성, 무기·스킬에 속성 부여 */
const ELEMENTS={ fire:{n:"화염",ic:"🔥",col:"#ff8a3a",ail:"화상"}, frost:{n:"냉기",ic:"❄️",col:"#8fd0ff",ail:"빙결"},
  shock:{n:"뇌전",ic:"⚡",col:"#ffe08a",ail:"감전"}, venom:{n:"맹독",ic:"🧪",col:"#9be08a",ail:"중독"} };
const ELEM_KEYS=Object.keys(ELEMENTS);
/* 🎭 프로필 커스터마이징 — 아바타(이모지) · 첫 변경 무료, 이후 💎크리스탈(유료재화) */
const AVATARS=["🧑","🧔","👩","🧙","🧝","🧛","🥷","🦹","🧟","👺","🤖","👻","🐺","🦊","🐲","🦁","👑","💀","🔥","⚔️"];
const AVATAR_COST=3, NAME_COST=5;   // 두 번째 변경부터 크리스탈 비용
function isImgAvatar(a){ return typeof a==="string" && a.slice(0,5)==="data:"; }   // 📷 업로드한 사진(데이터 URL)인지
function playerIco(size){ if(!(typeof P!=="undefined"&&P&&P.avatar)) return ico("player",size);
  if(isImgAvatar(P.avatar)) return `<span class="pavatar pavimg" style="width:${size}px;height:${size}px;display:inline-flex;border-radius:50%;overflow:hidden;background:#0a0d13"><img src="${P.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></span>`;
  return `<span class="pavatar" style="font-size:${Math.round(size*0.82)}px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${P.avatar}</span>`; }
function elemForName(name){ if(!name)return ELEM_KEYS[0]; let h=0; for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0; return ELEM_KEYS[h%ELEM_KEYS.length]; }
const LIFE={
  logging:{n:"벌목",emoji:"🪓",stat:"str",mat:"wood",note:"힘 단련 · 원목"},
  mining:{n:"채광",emoji:"⛏️",stat:"vit",mat:"ore",note:"체력 단련 · 광석"},
  herbing:{n:"약초 채집",emoji:"🌿",stat:"dex",mat:"herb",note:"민첩 단련 · 약초"},
  fishing:{n:"낚시",emoji:"🎣",stat:"luk",mat:"fish",note:"행운 단련 · 생선"},
  arcana:{n:"마법 연구",emoji:"🔮",stat:"int",mat:"mana",note:"지능 단련 · 마정석"},
};
const STAT_NAME={str:"힘",int:"지능",dex:"민첩",vit:"체력",luk:"행운"};
const STAM_MAX=100, STAM_COST=8, STAM_REGEN_MS=210000; // 생활력: 활동당 8 소모 · 기본 칸당 ~3.5분(체력 낮을 때 완충 ~5.5h) · 체력(vit) 높을수록 가속 · 생활 비약/제단으로 보충
const DIVE_POTION_MAX=10; // 탑에 들고 들어갈 수 있는 물약 최대치(나머지는 마을에 보관)
const SKILLS={
  heavy_strike:{n:"강타",emoji:"💥",type:"active",mp:4,tier:1,req:{str:7},cost:{gold:40,ore:3},desc:"강한 물리 피해"},
  guard_up:{n:"방패 숙련",emoji:"🛡️",type:"passive",tier:1,req:{vit:7},cost:{gold:40,wood:3},desc:"방어 시 피해 추가 감소"},
  heal_spell:{n:"회복술",emoji:"✨",type:"active",mp:5,tier:1,req:{int:7},cost:{gold:50,herb:4},chant:"치유의 빛이여 나를 감싸안아라",desc:"HP 회복 (지능 비례) · 영창 필요"},
  power_shot:{n:"급소 찌르기",emoji:"🎯",type:"active",mp:4,tier:1,req:{dex:7},cost:{gold:45,fish:3},desc:"높은 치명타 공격"},
  meditate:{n:"명상",emoji:"🧘",type:"passive",tier:2,req:{int:10},cost:{gold:70,mana:3},desc:"최대 기력↑ · 매 턴 기력 회복"},
  fireball:{n:"파이어볼",emoji:"🔥",type:"active",mp:6,tier:2,req:{int:11,skill:"heal_spell"},cost:{gold:90,mana:4},chant:"불꽃이여 타올라 적을 태워라",desc:"강한 마법 화염 (방어 무시) · 영창 필요"},
  crit_focus:{n:"급소 간파",emoji:"👁️",type:"passive",tier:2,req:{dex:11,skill:"power_shot"},cost:{gold:80,fish:5},desc:"모든 공격 치명 확률 +10%"},
  double_slash:{n:"연속 베기",emoji:"⚔️",type:"active",mp:7,tier:2,req:{str:12,skill:"heavy_strike"},cost:{gold:110,ore:6},desc:"2회 연속 타격"},
  execute:{n:"처형",emoji:"☠️",type:"active",mp:8,tier:3,req:{str:16,dex:14,skill:"double_slash"},cost:{gold:180,ore:8,mana:4},desc:"적 HP 30%↓면 막대한 피해"},
  /* 버프/디버프/특수 — 턴을 투자해 판을 만드는 스킬 (턴 쪼개기) */
  war_cry:{n:"전투 함성",emoji:"🗣️",type:"active",mp:5,tier:2,req:{str:12},cost:{gold:100,ore:5},desc:"이번 전투 공격력 +35% (버프)"},
  iron_will:{n:"강철 의지",emoji:"🛡️",type:"active",mp:5,tier:2,req:{vit:12},cost:{gold:100,wood:5},desc:"이번 전투 방어 +6 (받는 피해↓)"},
  sunder:{n:"무장 파괴",emoji:"🔨",type:"active",mp:6,tier:3,req:{str:14,skill:"heavy_strike"},cost:{gold:150,ore:7},desc:"적 방어 -4 + 그로기 축적 (디버프)"},
  expose:{n:"약점 노출",emoji:"🎯",type:"active",mp:5,tier:2,req:{dex:11},cost:{gold:110,fish:5},desc:"이번 전투 적이 받는 피해 +35% (디버프)"},
  focus:{n:"집중",emoji:"🌀",type:"active",mp:4,tier:2,req:{dex:10},cost:{gold:90,fish:4},desc:"다음 공격 확정 치명 + 치명률 +12%"},
  bleed_blade:{n:"맹독 도포",emoji:"🩸",type:"active",mp:5,tier:3,req:{dex:12,skill:"power_shot"},cost:{gold:150,herb:6},desc:"적에게 4턴 출혈(지속 피해)"},
  weaken:{n:"약화의 저주",emoji:"💀",type:"active",mp:5,tier:2,req:{int:11},cost:{gold:110,mana:4},desc:"이번 전투 적 공격력 -30% (디버프)"},
  barrier:{n:"마력 방벽",emoji:"🔮",type:"active",mp:6,tier:2,req:{int:12},cost:{gold:120,mana:5},desc:"이번 전투 방어 +8 (버프)"},
  drain:{n:"생명 흡수",emoji:"🧛",type:"active",mp:6,tier:3,req:{int:12,skill:"heal_spell"},chant:"생명을 바쳐 나의 힘이 되어라",cost:{gold:160,mana:6},desc:"마법 피해 + 그만큼 절반 회복 · 영창"},
  awaken:{n:"각성",emoji:"🔥",type:"active",mp:10,tier:3,req:{str:14,vit:12},cost:{gold:220,ore:8,mana:5},desc:"전투당 1회 · 공격+40% 치명+20% 방어+5 (특수)"},
  /* 🐾 테이머 — 소환/계약 (조련사 교관) */
  summon:{n:"소환",emoji:"🌀",type:"active",mp:6,tier:2,req:{int:9},cost:{gold:140,mana:5},chant:"__summon__",desc:"영창해 소환수를 부른다 · 영창을 길게 완성할수록 강한 개체 · 계약한 몬스터를 부를 수 있다"},
  tame_mastery:{n:"조련 숙련",emoji:"🪢",type:"passive",tier:2,req:{int:10},cost:{gold:120,herb:5},desc:"계약(테이밍) 성공 확률 +15%p"},
  beast_bond:{n:"야수 결속",emoji:"🐾",type:"passive",tier:3,req:{int:13,skill:"summon"},cost:{gold:190,fish:7},desc:"소환수 피해 +20% · 지속 +1턴"},
  wild_call:{n:"야성의 부름",emoji:"📣",type:"active",mp:5,tier:3,req:{int:12,skill:"summon"},cost:{gold:170,fish:6},desc:"소환수가 있으면 즉시 한 번 더 맹공을 명령한다 (턴 소모 없음)"},
  /* 🎲 겜블러 — 운/도박 (도박사 교관) */
  lucky_strike:{n:"행운의 일격",emoji:"🍀",type:"active",mp:5,tier:2,req:{luk:9},cost:{gold:110,herb:4},desc:"행운이 높을수록 치명 확률이 치솟는 공격"},
  loaded_dice:{n:"납주사위",emoji:"🎯",type:"active",mp:4,tier:2,req:{luk:9},cost:{gold:100,ore:4},desc:"이번 전투 행운 +8 (주사위·카드·치명 결과 상향)"},
  all_in:{n:"올인",emoji:"💰",type:"active",mp:6,tier:3,req:{luk:12},cost:{gold:180,mana:5},desc:"현재 HP 15%를 걸고 도박 — 70% 대박 폭딜 / 30% 헛손질"},
  wild_card:{n:"와일드카드",emoji:"🃏",type:"active",mp:6,tier:3,req:{luk:13,skill:"loaded_dice"},cost:{gold:200,mana:6},desc:"운명의 카드를 뒤집는다 — 폭딜/치유/버프/꽝 중 무작위"},
  /* 🎵 음유시인 — 노래로 버프/디버프 (음유시인 교관) */
  battle_hymn:{n:"전투 찬가",emoji:"🎺",type:"active",mp:5,tier:2,req:{int:9},cost:{gold:110,wood:4},desc:"이번 전투 공격 +30% · 치명 +8% (버프)"},
  dissonance:{n:"불협화음",emoji:"🎻",type:"active",mp:5,tier:2,req:{int:10},cost:{gold:110,mana:4},desc:"이번 전투 적 공격 -30% · 적이 받는 피해 +20% (디버프)"},
  hymn_valor:{n:"용맹의 찬가",emoji:"🎶",type:"active",mp:5,tier:2,req:{int:11},cost:{gold:120,herb:5},desc:"HP·기력 회복 + 이번 전투 방어 +4 (버프)"},
  lullaby:{n:"자장가",emoji:"💤",type:"active",mp:6,tier:3,req:{int:12},cost:{gold:160,mana:5},desc:"확률로 적을 잠재워 다음 턴을 무력화 (보스는 저항↑)"},
  encore:{n:"앙코르",emoji:"🎼",type:"passive",tier:3,req:{int:13,skill:"battle_hymn"},cost:{gold:190,mana:6},desc:"노래(버프) 스킬의 효과 +25%"},
  /* 🌀 마법진 영창 — 말이 아니라 룬을 순서대로 이어 그려 시전 */
  rune_blast:{n:"룬 파열",emoji:"🌀",type:"active",mp:7,tier:3,req:{int:13,skill:"fireball"},cost:{gold:200,mana:7},chant:"__circle__",desc:"마법진을 그려 시전 · 원 완성도만큼 강한 마법 피해(방어 무시)"},
  /* 🗡️ 도적 — 단검·기습·독 (그림자 교관 카이) */
  backstab:{n:"기습",emoji:"🗡️",type:"active",mp:5,tier:2,req:{dex:11},cost:{gold:110,fish:5},desc:"치명적인 기습 일격 (치명 확률↑)",fx:{hits:1,mult:1.9,crit:0.4,color:"#ff5a5a",shake:true}},
  shadow_step:{n:"그림자 밟기",emoji:"🌑",type:"active",mp:4,tier:2,req:{dex:12},cost:{gold:100,fish:4},desc:"다음 공격 확정 치명 + 이번 전투 치명 +15%",fx:{nextCrit:true,buff:{critB:0.15},msg:"그림자에 스며든다"}},
  venom_coat:{n:"독 바르기",emoji:"🧪",type:"active",mp:5,tier:2,req:{dex:11},cost:{gold:110,herb:5},desc:"단검에 맹독 — 적에게 5턴 중독(지속 피해)",fx:{dot:{atk:0.4,turns:5},msg:"칼날에 독을 바른다"}},
  fan_knives:{n:"칼날 부채",emoji:"🔪",type:"active",mp:7,tier:3,req:{dex:14,skill:"backstab"},cost:{gold:160,fish:7},desc:"단검을 흩뿌려 4연타",fx:{hits:4,mult:0.7,color:"#dfeaff"}},
  assassinate:{n:"암살",emoji:"☠️",type:"active",mp:8,tier:3,req:{dex:16,skill:"venom_coat"},cost:{gold:190,fish:8,mana:3},desc:"적 HP 35%↓면 즉사급 피해",fx:{execMult:5,execThresh:0.35,mult:1.6,color:"#c96ad6"}},
  /* 🌟 희귀 스킬 — 보스 처치/몬스터 파밍으로만 획득(교관 습득 불가). 예능~강력 */
  meteor:{n:"메테오",emoji:"☄️",type:"active",mp:12,rare:true,src:"boss",desc:"하늘에서 운석 낙하 — 방어 무시 대마법",fx:{magic:true,mult:3.4,elem:"fire",defIgnore:true,popup:"METEOR",shake:true}},
  thousand_cuts:{n:"천의 칼날",emoji:"🌀",type:"active",mp:10,rare:true,src:"farm",desc:"환영의 칼날로 6연타",fx:{hits:6,mult:0.62,color:"#dfeaff"}},
  dragon_fang:{n:"용아파",emoji:"🐲",type:"active",mp:10,rare:true,src:"boss",desc:"용의 이빨 필살 강타 + 대형 그로기",fx:{hits:1,mult:3.1,groggy:35,color:"#ff8f3c",popup:"용아!",shake:true}},
  soul_reap:{n:"영혼 수확",emoji:"💀",type:"active",mp:9,rare:true,src:"boss",desc:"적 HP 40%↓면 영혼째 베어낸다",fx:{execMult:6,execThresh:0.4,mult:1.5,color:"#c96ad6"}},
  blizzard:{n:"블리자드",emoji:"❄️",type:"active",mp:10,rare:true,src:"farm",desc:"눈보라 — 냉기 대마법 + 적 약화",fx:{magic:true,mult:2.5,elem:"frost",enemyWeak:0.2,color:"#8fd0ff"}},
  thunderclap:{n:"뇌명",emoji:"⚡",type:"active",mp:10,rare:true,src:"farm",desc:"낙뢰 — 감전 마법 + 기절 확률",fx:{magic:true,mult:2.3,elem:"shock",stun:0.45,stunBoss:0.2}},
  berserk:{n:"광폭화",emoji:"😡",type:"active",mp:8,rare:true,src:"boss",desc:"HP를 태워 공격 +60%·치명 +15% (양날)",fx:{buff:{atkPct:0.6,critB:0.15},selfHpCost:0.1,popup:"BERSERK",popColor:"#ff5a5a"}},
  life_siphon:{n:"생명 착취",emoji:"🩸",type:"active",mp:9,rare:true,src:"boss",desc:"마법 피해 + 60% 흡혈",fx:{magic:true,mult:1.9,vamp:0.6,color:"#c96ad6"}},
  guillotine:{n:"단두대",emoji:"🪓",type:"active",mp:10,rare:true,src:"farm",desc:"거대 참수 — 낮은 HP 적 특효",fx:{execMult:4,execThresh:0.35,mult:2.3,color:"#ff5a5a",shake:true}},
  holy_smite:{n:"천벌",emoji:"🌟",type:"active",mp:10,rare:true,src:"boss",desc:"신성한 심판 — 방어 무시 대타격",fx:{hits:1,mult:2.9,defIgnore:true,color:"#ffe08a",popup:"천벌!"}},
  rubber_chicken:{n:"고무 치킨",emoji:"🐔",type:"active",mp:4,rare:true,src:"farm",desc:"고무 치킨으로 후려친다 — 피해 완전 랜덤(꽝~대박)",fx:{randMult:[0.1,5.5],color:"#ffcf6a",msg:"꼬끼오!!"}},
  troll_face:{n:"약올리기",emoji:"😜",type:"active",mp:5,rare:true,src:"farm",desc:"적을 약올려 받는 피해 +50%",fx:{enemyVuln:0.5,hits:1,mult:0.3,msg:"메롱~ 약오르지?"}},
  money_throw:{n:"돈 뿌리기",emoji:"💸",type:"active",mp:6,rare:true,src:"farm",desc:"금화를 흩뿌려 피해 (쓴 만큼 강함)",fx:{goldThrow:300,color:"#ffd36a"}},
  pizza_time:{n:"피자 타임",emoji:"🍕",type:"active",mp:5,rare:true,src:"farm",desc:"피자를 먹고 HP·기력 대량 회복",fx:{healFrac:0.5,mpRestore:25,msg:"피자 파워!"}},
  dad_joke:{n:"아재개그",emoji:"🤣",type:"active",mp:5,rare:true,src:"farm",desc:"아재개그로 적을 굳게 만든다 (기절)",fx:{stun:0.6,stunBoss:0.3,msg:"…적이 할 말을 잃었다"}},
  air_guitar:{n:"에어 기타",emoji:"🎸",type:"active",mp:5,rare:true,src:"farm",desc:"열정의 기타 솔로 — 공격+20%·치명+20%",fx:{buff:{atkPct:0.2,critB:0.2},msg:"🎸 솔로 작렬!"}},
  duck_army:{n:"오리 부대",emoji:"🦆",type:"active",mp:6,rare:true,src:"farm",desc:"오리 떼가 달려든다 — 3연타",fx:{hits:3,mult:0.55,color:"#ffe08a",msg:"꽥꽥꽥!"}},
  reverse_card:{n:"리버스 카드",emoji:"🔁",type:"active",mp:6,rare:true,src:"farm",desc:"운명을 뒤집는다 — 적 공격 -40%·내 방어+5",fx:{enemyWeak:0.4,buff:{defB:5},msg:"우노 리버스!"}},
  self_destruct:{n:"자폭 인형",emoji:"🧨",type:"active",mp:7,rare:true,src:"boss",desc:"HP를 크게 태워 방어 무시 초대형 폭발",fx:{hits:1,mult:4.6,defIgnore:true,selfHpCost:0.2,popup:"BOOM!",popColor:"#ff5a5a",shake:true}},
  cat_nap:{n:"고양이 낮잠",emoji:"🐱",type:"active",mp:5,rare:true,src:"farm",desc:"느긋한 낮잠 — HP 회복 + 방어+4",fx:{healFrac:0.4,buff:{defB:4},msg:"냐옹… zzz"}},
};
const RARE_SKILLS=Object.keys(SKILLS).filter(k=>SKILLS[k].rare);   // 🌟 보스/파밍 전용 희귀 스킬 목록

/* ---------- 동료 / 유물 ---------- */
const COMPANIONS={
  light:{n:"빛의 요정",emoji:"🧚",role:"heal",ic:"fairy_light",note:"매 턴 회복 · 각성할수록 강한 치유",
    evo:[{n:"빛의 요정",emoji:"🧚"},{n:"빛의 세라핌",emoji:"👼"},{n:"여명의 대천사",emoji:"😇"}]},
  imp:{n:"불꽃 임프",emoji:"🔥",role:"dps",ic:"fairy_imp",note:"매 턴 화염 지원 · 각성할수록 강한 딜",
    evo:[{n:"불꽃 임프",emoji:"🔥"},{n:"업화 데몬",emoji:"👺"},{n:"멸화의 이프리트",emoji:"🌋"}]},
  steel:{n:"강철 정령",emoji:"🛡️",role:"tank",ic:"fairy_steel",note:"받는 피해↓ · 각성할수록 단단해짐",
    evo:[{n:"강철 정령",emoji:"🛡️"},{n:"수호 골렘",emoji:"🗿"},{n:"불멸의 아이기스",emoji:"⚔️"}]},
  // ✨ 희귀 동료 — 보스 처치 시 낮은 확률로 영입(상점 구매 불가)
  wisp:{n:"위령의 혼불",emoji:"🕯️",role:"heal",ic:"fairy_light",rare:true,note:"온기로 회복 · 각성할수록 강한 치유",
    evo:[{n:"위령의 혼불",emoji:"🕯️"},{n:"안식의 정령",emoji:"👻"},{n:"승천의 성화",emoji:"🔥"}]},
  raven:{n:"피의 까마귀",emoji:"🐦‍⬛",role:"dps",ic:"fairy_imp",rare:true,note:"그림자 일격 · 각성할수록 치명적",
    evo:[{n:"피의 까마귀",emoji:"🐦‍⬛"},{n:"까마귀 군주",emoji:"🦅"},{n:"밤의 처형자",emoji:"🌑"}]},
  warden:{n:"무덤지기",emoji:"🪦",role:"tank",ic:"fairy_steel",rare:true,note:"받는 피해↓ · 각성할수록 불굴",
    evo:[{n:"무덤지기",emoji:"🪦"},{n:"납골당 수호자",emoji:"⚰️"},{n:"불멸의 파수꾼",emoji:"💀"}]},
  // 🦇 보스 초희귀 영입
  bat:{n:"심연의 박쥐",emoji:"🦇",role:"dps",ic:"fairy_imp",rare:true,note:"어둠 속 급습 · 각성할수록 치명적",
    evo:[{n:"심연의 박쥐",emoji:"🦇"},{n:"밤의 흡혈귀",emoji:"🧛"},{n:"공허의 날개",emoji:"🖤"}]},
  // 🦉 전용 퀘스트 보상
  owl:{n:"현자의 부엉이",emoji:"🦉",role:"heal",ic:"fairy_light",quest:true,note:"지혜의 치유 · 각성할수록 강한 회복",
    evo:[{n:"현자의 부엉이",emoji:"🦉"},{n:"별을 읽는 부엉이",emoji:"🌙"},{n:"예언의 대현자",emoji:"🔮"}]},
  // 🐢🦂 개척지 발견
  turtle:{n:"바위지기 거북",emoji:"🐢",role:"tank",ic:"fairy_steel",pion:true,note:"단단한 등껍질 · 각성할수록 철벽",
    evo:[{n:"바위지기 거북",emoji:"🐢"},{n:"이끼바위 수호귀",emoji:"🪨"},{n:"대지의 산악귀",emoji:"⛰️"}]},
  scorpion:{n:"사막 전갈",emoji:"🦂",role:"dps",ic:"fairy_imp",pion:true,note:"맹독 집게 · 각성할수록 치명 맹독",
    evo:[{n:"사막 전갈",emoji:"🦂"},{n:"모래폭풍 전갈",emoji:"🌪️"},{n:"독왕 데스스팅",emoji:"☠️"}]},
};
const STARTER_COMPS=["light","imp","steel"], RARE_COMPS=["wisp","raven","warden","bat"], PION_COMPS=["turtle","scorpion"], QUEST_COMPS=["owl"], STARTER_RECRUIT_GEMS=8;
/* 🍖 동료 먹이 — 아무 재료나 못 먹고 '역할별 전용먹이' + '공용사료'로만 성장 (까마귀가 광석 씹는 일은 이제 없다) */
const FOODS={
  food_heal:{n:"치유의 새싹",emoji:"🌿",role:"heal",note:"회복형 동료 전용 먹이 · 유대 대폭↑"},
  food_dps: {n:"핏빛 열매", emoji:"🩸",role:"dps", note:"공격형 동료 전용 먹이 · 유대 대폭↑"},
  food_tank:{n:"단단한 정광",emoji:"⛰️",role:"tank",note:"방어형 동료 전용 먹이 · 유대 대폭↑"},
  food_any: {n:"공용 사료", emoji:"🥫",role:"any", note:"아무 동료나 먹는 사료 · 유대↑ (통신판매)"},
};
const FOOD_BY_ROLE={heal:"food_heal",dps:"food_dps",tank:"food_tank"};
function foodBond(fk,role){ if(fk==="food_any")return 15; const f=FOODS[fk]; if(!f)return 0; return f.role===role?28:8; }
function compOwned(key){ return !!(P&&P.comps&&P.comps[key]); }
function ensureComp(key){ if(!P.comps)P.comps={}; if(!P.comps[key])P.comps[key]={bond:0,lv:1,awk:0}; return P.comps[key]; }
/* 🐾 동료 성장(유대/각성) — 동료별로 기록(P.comps[key]={bond,lv,awk}) */
const COMP_LV_CAP=30, AWAKEN_LV=[12,24];   // 각성 티어 경계(0/1/2)
function compBondNeed(lv){ return 18+(lv-1)*11; }          // lv→lv+1 필요 유대치
function compTier(lv){ return lv>=AWAKEN_LV[1]?2 : lv>=AWAKEN_LV[0]?1 : 0; }
function compRec(key){ key=key||(P&&P.companion); if(!P)return{bond:0,lv:1,awk:0}; if(!P.comps)P.comps={}; return P.comps[key]||(P.comps[key]={bond:0,lv:1,awk:0}); }
function compDisp(key,lv){ const d=COMPANIONS[key]; if(!d)return{n:"동료",emoji:"❓",ic:null}; const t=compTier(lv||1); const e=(d.evo&&d.evo[t])?d.evo[t]:{n:d.n,emoji:d.emoji}; return {n:e.n,emoji:e.emoji,ic:d.ic,tier:t}; }
/* 🔩 동료 룬 — 각성 티어만큼 슬롯 개방(0→1·1→2·2→3칸). 제작소서 제작, 동료 메뉴서 장착 */
const RUNES={
  rune_vigor:{n:"활력의 룬",emoji:"💚",note:"동료 회복 효과 +3%p",eff:{healPct:0.03},cost:{gold:120,mats:{herb:3}}},
  rune_ember:{n:"불씨의 룬",emoji:"🔥",note:"동료 딜 +6%p · 화염 부여",eff:{dpsPct:0.06,elem:"fire"},cost:{gold:150,mats:{ore:3}}},
  rune_bulwark:{n:"방벽의 룬",emoji:"🧱",note:"동료 피해감소 +4%p",eff:{tankRed:0.04},cost:{gold:150,mats:{ore:3}}},
  rune_haste:{n:"신속의 룬",emoji:"⏩",note:"동료 특수기 쿨 -1턴",eff:{cdCut:1},cost:{gold:220,mats:{mana:2,ore:2}}},
  rune_leech:{n:"흡정의 룬",emoji:"🩸",note:"동료 공격이 날 회복(피해 20%)",eff:{vamp:0.2},cost:{gold:200,mats:{mana:2}}},
  rune_valor:{n:"용맹의 룬",emoji:"⚔️",note:"동행 중 내 공격 +8%",eff:{pAtk:0.08},cost:{gold:200,mats:{ore:2,mana:1}}},
  rune_focus:{n:"집중의 룬",emoji:"🎯",note:"동행 중 내 치명 +6%",eff:{pCrit:0.06},cost:{gold:200,mats:{mana:2}}},
  rune_aegis:{n:"철벽의 룬",emoji:"🛡️",note:"동행 중 내 방어 +4",eff:{pDef:4},cost:{gold:180,mats:{ore:3}}},
  rune_tempo:{n:"기세의 룬",emoji:"🌟",note:"동료 행동마다 기세 +6",eff:{mom:6},cost:{gold:220,mats:{mana:2,herb:2}}},
};
function compRuneSlots(key){ return 1+compTier((compRec(key).lv)||1); }   // 각성 티어만큼 +1(최대 3)
function compRuneEff(key){ const rec=compRec(key); const list=(rec&&rec.runes)||[]; const s={healPct:0,dpsPct:0,tankRed:0,cdCut:0,vamp:0,mom:0,pAtk:0,pCrit:0,pDef:0,elem:null};
  for(const rk of list){ const r=RUNES[rk]; if(!r)continue; const e=r.eff||{}; for(const k in e){ if(k==="elem"){ if(!s.elem)s.elem=e.elem; } else s[k]=(s[k]||0)+e[k]; } } return s; }
function buildComp(key){ const d=COMPANIONS[key]; if(!d)return null; const rec=compRec(key); const lv=rec.lv||1; const tier=compTier(lv); const disp=compDisp(key,lv);
  const rune=compRuneEff(key); const baseMax=tier>=2?2:3;
  return {key,ic:d.ic,n:disp.n,emoji:disp.emoji,role:d.role,lv,tier,energy:0,max:Math.max(2,baseMax-(rune.cdCut||0)),rune}; }
/* 장비: slot = weapon | armor | accessory (착용해야 효과) */
const RELICS={
  "녹슨 단검":{slot:"weapon",wt:"dagger",atk:2,note:"공격 +2",ic:"dagger",val:40,shop:"weapon"}, "낡은 단궁":{slot:"weapon",wt:"bow",atk:3,note:"공격 +3 · 원거리",ic:"bow",val:55,shop:"weapon"},
  "이 빠진 롱소드":{slot:"weapon",wt:"sword",atk:4,note:"공격 +4",ic:"longsword",val:80,shop:"weapon"}, "무쇠 세이버":{slot:"weapon",wt:"saber",atk:5,note:"공격 +5 · 강격/그로기",ic:"moon",val:90,shop:"weapon"},
  "노름꾼의 주사위":{slot:"weapon",wt:"dice",atk:4,note:"공격 +4 · 주사위 도박",ic:"dice",val:75,shop:"weapon"}, "행운의 주사위":{slot:"weapon",wt:"dice",atk:7,luck:3,note:"공격 +7, 행운 +3 · 대박 확률↑",ic:"dice",val:170,shop:"weapon"},
  "견습 타로 카드":{slot:"weapon",wt:"card",atk:4,note:"공격 +4 · 카드 뽑기",ic:"card",val:80,shop:"weapon"}, "점술사의 카드":{slot:"weapon",wt:"card",atk:7,luck:2,note:"공격 +7, 행운 +2 · 카드 뽑기",ic:"card",val:175,shop:"weapon"},
  "월광 세이버":{slot:"weapon",wt:"saber",atk:7,luck:1,note:"공격 +7, 행운 +1",ic:"moon",val:180}, "사냥꾼의 활":{slot:"weapon",wt:"bow",atk:5,note:"공격 +5 · 원거리(치명↑)",ic:"bow",val:120,shop:"weapon"},
  "화염의 장검":{slot:"weapon",wt:"sword",atk:6,elem:"fire",note:"공격 +6 · 🔥화염 부여(화상)",ic:"longsword",val:240,shop:"weapon"},
  "서리 단검":{slot:"weapon",wt:"dagger",atk:5,elem:"frost",note:"공격 +5 · ❄️냉기 부여(빙결)",ic:"dagger",val:230,shop:"weapon"},
  "뇌전의 활":{slot:"weapon",wt:"bow",atk:6,elem:"shock",note:"공격 +6 · ⚡뇌전 부여(감전)",ic:"bow",val:240,shop:"weapon"},
  "가죽 갑옷":{slot:"armor",def:2,note:"방어 +2",ic:"leather",val:50,shop:"armor"},
  "판금 흉갑":{slot:"armor",def:4,note:"방어 +4",ic:"plate",val:110,shop:"armor"}, "토끼발 부적":{slot:"amulet",luck:3,note:"행운 +3",ic:"rabbit",val:70,shop:"armor"},
  "흡혈의 반지":{slot:"ring",atk:1,note:"공격 +1, 타격 시 회복",ic:"vring",vamp:true,val:150},
  "입문자의 장검":{slot:"weapon",wt:"sword",atk:5,note:"공격 +5",ic:"longsword",val:70}, "입문자의 갑옷":{slot:"armor",def:3,note:"방어 +3",ic:"plate",val:70}, "입문자의 반지":{slot:"ring",atk:2,note:"공격 +2",ic:"vring",val:70},
  /* 새 슬롯 기본 장비 (상점) */
  "병사의 방패":{slot:"offhand",def:3,note:"방어 +3 · 안정",ic:"shield",val:60,shop:"armor"},
  "보조 단검":{slot:"offhand",atk:2,note:"공격 +2 · 보조 타격",ic:"offdagger",val:55,shop:"weapon"},
  "낡은 장화":{slot:"boots",def:2,note:"방어 +2",ic:"boots",val:45,shop:"armor"},
  "구리 반지":{slot:"ring",atk:1,note:"공격 +1",ic:"vring",val:40,shop:"armor"},
  "나무 부적":{slot:"amulet",luck:2,note:"행운 +2",ic:"amulet",val:45,shop:"armor"},
  /* ===== 엔드게임 장비 (드랍 전용) — 무기 종류별 티어 ===== */
  /* 천공 티어 (16~30층 드랍) */
  "여명의 단검":{slot:"weapon",wt:"dagger",atk:9,luck:1,note:"공격 +9, 행운 +1 · 급소 특화",ic:"dagger",val:420},
  "천공 기사검":{slot:"weapon",wt:"sword",atk:10,note:"공격 +10 · 균형",ic:"longsword",val:460},
  "월식 세이버":{slot:"weapon",wt:"saber",atk:11,note:"공격 +11 · 강격/그로기",ic:"moon",val:500},
  "천상의 장궁":{slot:"weapon",wt:"bow",atk:9,luck:1,note:"공격 +9, 행운 +1 · 원거리 치명",ic:"bow",val:440},
  "천공 판금":{slot:"armor",def:7,note:"방어 +7",ic:"plate",val:420},
  "천사의 깃털":{slot:"amulet",luck:5,note:"행운 +5",ic:"rabbit",val:400},
  "천공 방패":{slot:"offhand",def:6,note:"방어 +6 · 안정",ic:"shield",val:420},
  "천공 반지":{slot:"ring",atk:8,note:"공격 +8",ic:"vring",val:440},
  "천공 장화":{slot:"boots",def:5,luck:2,note:"방어 +5, 행운 +2",ic:"boots",val:400},
  /* 시공 티어 (31~45층 드랍) */
  "시공의 비수":{slot:"weapon",wt:"dagger",atk:13,luck:2,note:"공격 +13, 행운 +2 · 급소 특화",ic:"dagger",val:820},
  "차원 절단검":{slot:"weapon",wt:"sword",atk:14,note:"공격 +14 · 균형",ic:"longsword",val:880},
  "붕괴의 대검":{slot:"weapon",wt:"saber",atk:15,note:"공격 +15 · 강격/그로기",ic:"moon",val:940},
  "성좌의 활":{slot:"weapon",wt:"bow",atk:13,luck:2,note:"공격 +13, 행운 +2 · 원거리 치명",ic:"bow",val:840},
  "균열 방벽":{slot:"armor",def:11,note:"방어 +11",ic:"plate",val:820},
  "역행의 모래시계":{slot:"amulet",atk:3,luck:3,note:"공격 +3, 행운 +3",ic:"amulet",val:820},
  "시공의 방패":{slot:"offhand",def:10,note:"방어 +10 · 안정",ic:"shield",val:820},
  "시공 반지":{slot:"ring",atk:12,note:"공격 +12",ic:"vring",val:840},
  "균열 장화":{slot:"boots",def:8,luck:2,note:"방어 +8, 행운 +2",ic:"boots",val:800},
  /* 정점·신화 티어 (45·50 보스 드랍) */
  "이름 없는 이빨":{slot:"weapon",wt:"dagger",atk:18,luck:2,note:"공격 +18, 행운 +2 · 타격 시 회복",ic:"dagger",vamp:true,val:1600},
  "창조주의 검":{slot:"weapon",wt:"sword",atk:20,note:"공격 +20 · 균형의 정점",ic:"longsword",val:1700},
  "종말의 세이버":{slot:"weapon",wt:"saber",atk:21,note:"공격 +21 · 최강의 강격",ic:"moon",val:1800},
  "별을 꿰는 활":{slot:"weapon",wt:"bow",atk:18,luck:3,note:"공격 +18, 행운 +3 · 원거리 치명",ic:"bow",val:1650},
  "창조의 흉갑":{slot:"armor",def:16,note:"방어 +16",ic:"plate",val:1600},
  "이름 없는 인장":{slot:"ring",atk:3,luck:3,note:"공격 +3, 행운 +3 · 타격 시 회복",ic:"vring",vamp:true,val:1700},
  "이름 없는 방패":{slot:"offhand",def:15,note:"방어 +15 · 절대 방어",ic:"shield",val:1600},
  "종언의 반지":{slot:"ring",atk:16,note:"공격 +16 · 타격 시 회복",ic:"vring",vamp:true,val:1750},
  "이름 없는 목걸이":{slot:"amulet",luck:8,atk:2,note:"행운 +8, 공격 +2",ic:"amulet",val:1700},
  "이름 없는 장화":{slot:"boots",def:12,luck:3,note:"방어 +12, 행운 +3",ic:"boots",val:1600},
  /* ===== 세트 장비 (조각을 모으면 세트 효과) ===== */
  "성층 갑옷":{slot:"armor",def:9,note:"방어 +9",ic:"plate",set:"strata",val:520},
  "성층 반지":{slot:"ring",atk:7,note:"공격 +7",ic:"vring",set:"strata",val:520},
  "성층 목걸이":{slot:"amulet",luck:6,note:"행운 +6",ic:"amulet",set:"strata",val:520},
  "성층 장화":{slot:"boots",def:6,luck:2,note:"방어 +6, 행운 +2",ic:"boots",set:"strata",val:520},
  "흑철 갑옷":{slot:"armor",def:8,atk:2,note:"방어 +8, 공격 +2",ic:"plate",set:"blackiron",val:560},
  "흑철 반지":{slot:"ring",atk:9,note:"공격 +9",ic:"vring",set:"blackiron",val:560},
  "흑철 목걸이":{slot:"amulet",atk:4,luck:2,note:"공격 +4, 행운 +2",ic:"amulet",set:"blackiron",val:560},
  "흑철 장화":{slot:"boots",def:5,atk:2,note:"방어 +5, 공격 +2",ic:"boots",set:"blackiron",val:560},
  "공허 갑옷":{slot:"armor",def:15,note:"방어 +15",ic:"plate",set:"voidset",val:1500},
  "공허 반지":{slot:"ring",atk:15,note:"공격 +15 · 타격 시 회복",ic:"vring",vamp:true,set:"voidset",val:1550},
  "공허 목걸이":{slot:"amulet",luck:8,atk:3,note:"행운 +8, 공격 +3",ic:"amulet",set:"voidset",val:1500},
  "공허 장화":{slot:"boots",def:12,luck:3,note:"방어 +12, 행운 +3",ic:"boots",set:"voidset",val:1500},
  "이름 없는 열쇠":{note:"꼭대기의 문",ic:"key",key:true,val:0},
};
/* 세트 효과 — 착용 조각 수(2/4피스)에 따라 발동 */
const SETS={
  strata:{n:"성층 세트",bonus:{2:{def:10,note:"방어 +10"}, 4:{luck:8,atkPct:0.06,gim:{doubleHit:0.18},note:"행운 +8 · 공격 +6% · 🗡18% 2연타"}}},
  blackiron:{n:"흑철 세트",bonus:{2:{atk:8,note:"공격 +8"}, 4:{atkPct:0.12,crit:0.10,gim:{lightning:0.30},note:"공격 +12% · 치명 +10% · ⚡치명 시 번개"}}},
  voidset:{n:"공허 세트",bonus:{2:{atk:14,def:10,note:"공격 +14 · 방어 +10"}, 4:{atkPct:0.15,crit:0.12,vamp:true,gim:{dodge:0.12},note:"공격 +15% · 치명 +12% · 흡혈 · ✨12% 피해 무효"}}},
};
function setGim(){ const c=setCounts(), g={doubleHit:0,lightning:0,dodge:0};
  for(const key in c){ const s=SETS[key]; if(!s)continue; const n=c[key];
    for(const th of Object.keys(s.bonus)){ if(n>=(+th)){ const gm=s.bonus[th].gim; if(gm){ for(const k in gm)g[k]=Math.max(g[k]||0,gm[k]); } } } }
  return g; }
function setCounts(){ const c={}; for(const s of SLOTS){ const it=equippedItem(s[0]); const g=it&&RELICS[it.k]; if(g&&g.set)c[g.set]=(c[g.set]||0)+1; } return c; }
function setBonus(){ const c=setCounts(), b={atk:0,def:0,luck:0,vamp:false,atkPct:0,crit:0};
  for(const key in c){ const s=SETS[key]; if(!s)continue; const n=c[key];
    for(const th of Object.keys(s.bonus)){ if(n>=(+th)){ const bo=s.bonus[th]; b.atk+=bo.atk||0; b.def+=bo.def||0; b.luck+=bo.luck||0; b.vamp=b.vamp||!!bo.vamp; b.atkPct+=bo.atkPct||0; b.crit+=bo.crit||0; } } }
  return b; }
/* 드랍 전용 엔드게임 장비 풀 (존별) */
const GEAR_TIERS={
  sky:["여명의 단검","천공 기사검","월식 세이버","천상의 장궁","천공 판금","천사의 깃털","천공 방패","천공 반지","천공 장화"],
  rift:["시공의 비수","차원 절단검","붕괴의 대검","성좌의 활","균열 방벽","역행의 모래시계","시공의 방패","시공 반지","균열 장화"],
  myth:["이름 없는 이빨","창조주의 검","종말의 세이버","별을 꿰는 활","창조의 흉갑","이름 없는 인장","이름 없는 방패","종언의 반지","이름 없는 목걸이","이름 없는 장화"],
};
const SLOTS=[["weapon","⚔️","무기"],["offhand","🛡","보조무기"],["armor","🥋","방어구"],["ring","💍","반지"],["amulet","📿","목걸이"],["boots","👢","신발"]];
const SLOT_LABEL={weapon:"무기",offhand:"보조무기",armor:"방어구",ring:"반지",amulet:"목걸이",boots:"신발"};
/* 아이템 종류 라벨 — 무기는 세부 종류(단검/검/활/주사위/카드…), 그 외는 슬롯 */
const SLOT_ICON={weapon:"⚔",offhand:"🛡",armor:"🥋",ring:"💍",amulet:"📿",boots:"👢"};
function gearTypeLabel(g){ if(!g||!g.slot)return "📦 장비"; if(g.slot==="weapon"){ const w=g.wt&&WEAPONS[g.wt]; return w?`${w.ic} ${w.n}`:"⚔ 무기"; } return `${SLOT_ICON[g.slot]||"📦"} ${SLOT_LABEL[g.slot]||"장비"}`; }
/* 🎒 장비 3분류 — 무기(weapon/offhand) · 방어구(armor/boots) · 악세(ring/amulet). 인벤/창고/대장간 탭 공용 */
const GEARCAT3={ wpn:["🗡","무기"], arm:["🛡","방어구"], acc:["💍","악세사리"] };
function gearCat3(g){ if(!g||!g.slot)return "acc"; if(g.slot==="weapon"||g.slot==="offhand")return "wpn"; if(g.slot==="armor"||g.slot==="boots")return "arm"; return "acc"; }
/* 아이템의 주 스탯(강화가 올리는 스탯): 무기=공격, 그 외엔 아이템이 실제로 가진 최고 스탯 */
function gearMainStat(g){ if(!g)return "luck"; if(g.slot==="weapon")return "atk";
  const c=[["atk",g.atk||0],["def",g.def||0],["luck",g.luck||0]].sort((a,b)=>b[1]-a[1]);
  return c[0][1]>0?c[0][0]:(g.slot==="armor"||g.slot==="offhand"||g.slot==="boots"?"def":"luck"); }
const relicIco = name => RELICS[name] ? RELICS[name].ic : "gold";
/* 무기 타입별 기본공격 패턴: hits 타수 · mult 계수 · crit 추가치명 · groggy 그로기축적 · gauge 게이지속도(↑=빠름/어려움) */
/* mg: 무기별 기본공격 미니게임 — gauge(타이밍) | sequence(급소) | charge(차지) | aim(조준) */
const WEAPONS={
  fist:  {n:"맨손",  hits:1, mult:0.70, crit:0.00, groggy:6,  gauge:1.00, ic:"👊", mg:"gauge"},    // 타이밍 게이지
  dagger:{n:"단검",  hits:1, mult:0.8,  crit:0.18, groggy:7,  gauge:0.90, ic:"🗡", mg:"twinbar"},  // 2영역 게이지: 두 영역 다 맞추면 완벽(큰 데미지) · 치명 특화
  sword: {n:"검",    hits:1, mult:1.00, crit:0.00, groggy:10, gauge:1.00, ic:"⚔", mg:"gauge"},    // 타이밍 게이지 · 균형
  saber: {n:"세이버",hits:1, mult:1.18, crit:0.03, groggy:18, gauge:1.10, ic:"🌙", mg:"saber"},   // 강격 차지 — 강격존서 릴리즈=강격+그로기, 과충전=빗나감
  bow:   {n:"활",    hits:1, mult:1.10, crit:0.12, groggy:8,  gauge:1.00, ic:"🏹", mg:"charge"},  // 활시위 당기기(차지) · 가득 당겨 발사 · 치명 특화
  dice:  {n:"주사위",hits:1, mult:0.85, crit:0.05, groggy:8,  gauge:1.00, ic:"🎲", mg:"dice"},    // 주사위 2개 · 합이 높을수록 대박(도박형)
  card:  {n:"카드",  hits:1, mult:0.90, crit:0.05, groggy:6,  gauge:1.00, ic:"🃏", mg:"card"},    // 랜덤 3장 뽑아 1장으로 공격/버프
};
const MG_NAME={gauge:"타이밍 게이지",figure:"급소 주사위(도박)",charge:"활시위 당기기",aim:"접근원 조준",twinbar:"2영역 급소 연격",dice:"주사위 굴리기",card:"카드 뽑기"};

/* ============================================================
   스토리 레이어 (데이터 기반) — 어느 모드에서든 보스에 서사를 입힌다
   boss[층]: approach(진입) · charge(궁극기 충전 시 대사) · defeat(처치)
   지정 없는 보스는 bossGeneric 풀에서 뽑아 씀 → 모든 보스가 최소 서사 확보
   ============================================================ */
const LORE={
  boss:{
    5:{
      approach:["5층. 계단 끝 문은 사람 키의 세 배. 이끼 낀 <b>거석 골렘</b>이 눈을 뜬다 — 탑이 세운 <b>첫 번째 시험</b>이다.",
                "문지기의 가슴에 새겨진 글자가 희미하게 빛난다. <span class=\"quote\">「자격 없는 자, 여기서 멈추라.」</span>"],
      charge:'"자격을… 증명해라." 골렘이 두 팔에 대지의 힘을 응축한다. 온몸이 돌처럼 단단해진다.',
      defeat:["문지기가 무릎 꿇으며 돌 틈으로 오래된 목소리가 샌다. <span class=\"quote\">\"통과다. 허나 위층은… 너를 더 깊이 들여다볼 것이다.\"</span>",
              "첫 관문이 열렸다. 탑은 당신을 눈여겨보기 시작했다."]},
    /* --- 제1존 어둠의 미궁 (자격을 시험한다) --- */
    10:{approach:["10층. 붉은 융단이 축축하다. <b>핏빛 여백작</b>이 술잔을 천천히 내려놓는다.",
                  "여백작이 당신을 훑어본다. <span class=\"quote\">「좋은 빈티지가 제 발로 걸어들어왔구나.」</span>"],
        charge:'"네 피 한 방울까지 남기지 않으마." 여백작의 손톱이 검붉게 부풀어 오른다.',
        defeat:"여백작이 재가 되어 흩어지며 속삭인다. <span class=\"quote\">\"…너, 전에도 여기 왔었지. 기억 못 하는 건 너뿐이야.\"</span>"},
    15:{approach:["15층. 미궁의 끝. 바닥의 어둠이 살아 꿈틀댄다 — 벽도 천장도 없이, 그저 <b>심연</b>이 입을 벌린다.",
                  "수십 갈래 촉수가 어둠 속에서 솟아오른다."],
        charge:"촉수 전부가 한 점으로 모여든다. 심연이 너를 통째로 삼키려 응축한다.",
        defeat:"심연이 잦아들고, 머리 위로 처음 보는 빛이 샌다. <span class=\"quote\">어둠의 미궁이 끝났다. 위에는 — 빛이 있다.</span>"},
    /* --- 제2존 천공의 성역 (신을 자처하는 것들이 심판한다) --- */
    20:{approach:["20층. 눈부신 성문 앞, 빛의 수호자 <b>아르콘</b>이 거대한 검을 세운다.",
                  "<span class=\"quote\">「여기서부터는 신의 영역이다. 죽은 자는 물러가라.」</span>"],
        charge:'"심판을 받아라." 아르콘의 검날에 하늘의 빛이 응축된다.',
        defeat:"아르콘이 무릎 꿇으며 의아해한다. <span class=\"quote\">\"죽은 자가… 어떻게 아직도 오르는가.\"</span>"},
    25:{approach:["25층. 세 쌍의 날개가 하늘을 가린다. <b>불멸의 대천사</b>가 심판의 나팔을 든다.",
                  "나팔의 첫 음이 공기를 떨리게 한다."],
        charge:"나팔이 부풀어 오른다. 한 번 울리면 살아있는 것은 재가 된다 — 그 전에 응축을 깨라.",
        defeat:"대천사가 스러지며 마지막 숨을 내쉰다. <span class=\"quote\">\"불멸조차… 이 탑 앞에선 한낱 계단이었나.\"</span>"},
    30:{approach:["30층. 천공의 옥좌. 대군주 <b>메타트론</b>이 눈을 뜬다.",
                  "<span class=\"quote\">「천공의 끝에서, 대체 무엇을 바라느냐.」</span>"],
        charge:'"네 소원을 말해 보아라 — 천벌로 지워주마." 옥좌 위로 뇌광이 응축된다.',
        defeat:"메타트론이 옥좌째 무너진다. <span class=\"quote\">\"…소원이라. 너는 아직도, 무엇을 되찾으러 오르는지조차 기억 못 하는군.\"</span> 천공이 갈라지고, 별과 어둠이 뒤섞인 균열이 열린다."},
    /* --- 제3존 시공의 균열 (회귀의 진실과 자기 대면) --- */
    35:{approach:["35층. 시간이 멈춘 듯 고요하다. 파수꾼 <b>크로노스</b>가 너를 응시한다.",
                  "<span class=\"quote\">「너는 이 순간을… 대체 몇 번이나 반복했지?」</span>"],
        charge:'"이번에도 여기서 끝이다." 크로노스가 네 시간을 한 점에 응축한다.',
        defeat:"크로노스가 흩어지며 나직이 웃는다. <span class=\"quote\">\"기억하지 못하는 회귀는… 몇 번째 죽음이더냐.\"</span>"},
    40:{approach:["40층. 모든 빛이 빨려 들어간다. <b>공허의 군주</b> 앞에서, 존재한다는 감각마저 희미해진다.",
                  "무(無)가 천천히 입을 벌린다."],
        charge:"군주가 주변의 무를 한 점으로 붕괴시킨다. 닿으면, 있었다는 사실조차 사라진다.",
        defeat:"공허가 잠잠해진다. <span class=\"quote\">\"무로 돌아가는 게 두렵지 않은 자여… 너는 이미 잃을 것이 없구나.\"</span>"},
    45:{approach:["45층. 하늘이 텅 비어 있다 — <b>별을 삼킨 자</b>가, 뱃속에서 타오르는 별빛으로 너를 비춘다.",
                  "삼켜진 별들이 안에서 웅성인다."],
        charge:"삼킨 별들이 한꺼번에 타오른다. 초신성이 응축되고 있다 — 지금 멈추지 않으면.",
        defeat:"그것이 마지막 별을 토해내며 스러진다. <span class=\"quote\">\"정점이… 바로 위다. 올라가 봐라. 네가 그토록 오르려던 것이 무엇이었는지.\"</span>"},
    /* --- 정점: 이름 없는 신 = 당신 자신 --- */
    50:{approach:["50층. 탑의 끝. 모든 것의 시작이 당신을 마주 본다 — 그것은 <b>당신과 같은 얼굴</b>을 하고 있다.",
                  "<span class=\"quote\">「드디어… 나를 마주하러 왔는가.」</span>"],
        charge:'"이 일격을 견딜 자격이 있는가." 창조의 파동이 응축된다 — 세상을 한 번 지웠다 다시 그리는 힘.',
        defeat:"이름 없는 신이 무너지며, 그 얼굴이 천천히 당신의 것과 겹쳐진다. 탑 전체가 흔들린다 — 이제, 선택은 당신 몫이다."},
  },
  bossGeneric:{
    approach:["공기가 무겁게 가라앉는다. 이 층의 주인이 당신을 기다리고 있었다.",
              "횃불이 일제히 꺼졌다 붉게 되살아난다. 거대한 무언가가 어둠 속에서 몸을 일으킨다.",
              "탑이 숨을 죽인다. 다음 시험이 당신 앞을 가로막는다."],
    charge:['그것이 모든 힘을 한 점에 끌어모은다 — "이 일격을 견딜 수 있겠나?"',
            "대기가 뒤틀린다. 상대가 파멸적인 일격을 응축하기 시작한다.",
            "공기가 진동한다. 지금 저지하지 못하면 끝이다."],
    defeat:["상대가 무너져 내린다. 탑의 침묵 속에서, 위로 향하는 길이 한 겹 더 열렸다.",
            "쓰러진 자리에서 오래된 기운이 흩어진다. 당신은 조금 더 위로 오를 자격을 얻었다.",
            "적이 재로 흩어진다. 정상은 여전히, 보이지 않을 만큼 멀다."]},
};
function bossStory(floor,kind){ const b=LORE.boss[floor]; const v=(b&&b[kind])||LORE.bossGeneric[kind]; return Array.isArray(v)?pick(v):v; }
/* 수련관 전직 교관 — 무기·계열별 기본 스킬 전수 */
const INSTRUCTORS={
  warrior:{n:"검술 교관 그레이",emoji:"⚔️",note:"검·대검 · 버프/각성",skills:["heavy_strike","double_slash","guard_up","execute","war_cry","iron_will","sunder","awaken"]},
  hunter: {n:"사냥꾼 교관 리안",emoji:"🏹",note:"활·단검 · 디버프",skills:["power_shot","crit_focus","expose","focus","bleed_blade"]},
  rogue:  {n:"그림자 교관 카이",emoji:"🗡️",note:"단검 · 기습·암살·독",skills:["backstab","shadow_step","venom_coat","fan_knives","assassinate"]},
  mage:   {n:"마법 교관 셀린",emoji:"🔮",note:"마법 · 저주 · 마법진",skills:["heal_spell","fireball","meditate","weaken","barrier","drain","rune_blast"]},
  tamer:  {n:"조련사 교관 브렌",emoji:"🐺",note:"소환·계약 · 야수 통솔",skills:["summon","tame_mastery","beast_bond","wild_call"]},
  gambler:{n:"도박사 교관 포춘",emoji:"🎲",note:"운·도박 · 일확천금",skills:["lucky_strike","loaded_dice","all_in","wild_card"]},
  bard:   {n:"음유시인 교관 리라",emoji:"🎵",note:"노래 · 버프/디버프",skills:["battle_hymn","dissonance","hymn_valor","lullaby","encore"]},
};
const weaponPatternText = wt => { const w=WEAPONS[wt]||WEAPONS.sword; const mg=MG_NAME[w.mg]?` · ${MG_NAME[w.mg]}`:"";
  return (w.hits>1 ? `${w.n} · ${w.hits}연타 · 치명 +${Math.round(w.crit*100)}%p`
    : `${w.n} · 단타 ×${w.mult.toFixed(2)}${w.groggy>=15?" · 그로기↑":""}${w.crit?` · 치명 +${Math.round(w.crit*100)}%p`:""}`)+mg; };
/* 소비품 (먹는 아이템). use: heal | stat | buff */
const CONS={
  hp_50:{n:"상급 물약",emoji:"🧪",use:"heal",amount:50,val:120,note:"HP 50 회복"},
  hp_100:{n:"특급 물약",emoji:"🍶",use:"heal",amount:100,val:280,note:"HP 100 회복"},
  hp_250:{n:"초특급 물약",emoji:"⚗️",use:"heal",amount:250,val:800,note:"HP 250 회복"},
  hp_500:{n:"전설의 물약",emoji:"🏺",use:"heal",amount:500,val:2000,note:"HP 500 회복"},
  mp_30:{n:"기력 물약",emoji:"🫙",use:"mana",amount:30,val:110,note:"기력(MP) 30 회복"},
  mp_60:{n:"고급 기력 물약",emoji:"⚗️",use:"mana",amount:60,val:240,note:"기력(MP) 60 회복"},
  mp_120:{n:"대현자의 물약",emoji:"🔷",use:"mana",amount:120,val:560,note:"기력(MP) 120 회복"},
  stam_50:{n:"생활 비약",emoji:"🍵",use:"stamina",amount:50,val:90,note:"생활력 50 회복 (채집용)"},
  stam_100:{n:"특제 생활 비약",emoji:"🫖",use:"stamina",amount:100,val:220,note:"생활력 100 회복 (완충)"},
  oil_fire:{n:"화염 기름",emoji:"🔥",use:"enchant",elem:"fire",val:150,note:"이번 다이브 무기에 화염 부여 (약점 적에 강함·화상)"},
  oil_frost:{n:"서리 기름",emoji:"❄️",use:"enchant",elem:"frost",val:150,note:"이번 다이브 무기에 냉기 부여 (빙결·적 약화)"},
  oil_shock:{n:"뇌전 기름",emoji:"⚡",use:"enchant",elem:"shock",val:150,note:"이번 다이브 무기에 뇌전 부여 (감전·받는 피해↑)"},
  oil_venom:{n:"맹독 기름",emoji:"🧪",use:"enchant",elem:"venom",val:150,note:"이번 다이브 무기에 맹독 부여 (중독 지속피해)"},
  str_tonic:{n:"공격의 비약",emoji:"⚔️",use:"buff",buff:"atkPct",amount:0.20,val:180,note:"이번 다이브 공격력 +20%"},
  int_tonic:{n:"마력의 비약",emoji:"🔮",use:"buff",buff:"magicPct",amount:0.30,val:200,note:"이번 다이브 마법 위력 +30%"},
  vit_tonic:{n:"예리함의 비약",emoji:"🎯",use:"buff",buff:"critBonus",amount:0.15,val:200,note:"이번 다이브 치명타 확률 +15%"},
  iron_potion:{n:"강철 물약",emoji:"🧴",use:"buff",buff:"defBonus",amount:3,val:150,note:"이번 다이브 방어 +3"},
  /* 대륙 지역 디버프 내성 (개척 전용) */
  resist_corrode:{n:"방청유",emoji:"🛢️",use:"resist",resKey:"corrode",val:200,note:"이번 개척: 부식 저항"},
  resist_burn:{n:"화염 내성 물약",emoji:"🧯",use:"resist",resKey:"burn",val:280,note:"이번 개척: 작열(화상) 저항"},
  resist_frost:{n:"온기의 부적",emoji:"🔥",use:"resist",resKey:"frost",val:320,note:"이번 개척: 한기 저항"},
  resist_plague:{n:"해독의 향낭",emoji:"🌿",use:"resist",resKey:"plague",val:360,note:"이번 개척: 역병 저항"},
  resist_void:{n:"공허 차단석",emoji:"🪬",use:"resist",resKey:"void",val:420,note:"이번 개척: 공허 저항"},
  mana_orb:{n:"마나 오브",emoji:"🔵",use:"slot",val:180,note:"보스·몬스터가 드랍 · 액티브 스킬 슬롯 +1 (최대 5)"},
  enhance_charm:{n:"강화의 축복",emoji:"⚜️",use:"enhance",val:600,note:"대장간 강화 시 사용 → 성공률 +25%p · 파괴 방지 (보스 초희귀 드랍/통신판매)"},
  book_heavy:{n:"전사 훈련서",emoji:"📕",use:"learn",skill:"heavy_strike",val:60,note:"강타 습득 (스킬북)"},
  book_power:{n:"사냥꾼 지침서",emoji:"📔",use:"learn",skill:"power_shot",val:60,note:"급소 찌르기 습득 (스킬북)"},
  book_heal:{n:"치유 성서",emoji:"📗",use:"learn",skill:"heal_spell",val:90,note:"회복술 습득 (스킬북)"},
  book_fireball:{n:"불의 마도서",emoji:"📘",use:"learn",skill:"fireball",val:130,note:"파이어볼 습득 (스킬북)"},
  book_crit:{n:"급소 해부서",emoji:"📙",use:"learn",skill:"crit_focus",val:110,note:"급소 간파 습득 (패시브)"},
};
/* 칭호(구 직업). 조건을 만족하면 획득 → 하나 장착 시 mods가 파생 스탯에 반영. */
const SLOT_BASE=2, SLOT_MAX=5, MAX_PASSIVE=2;   // 액티브 스킬 슬롯: 기본 2, 마나 오브로 최대 5까지 확장
function activeCap(){ return clamp(((P&&P.skillSlots)||SLOT_BASE)+metaEff().loadout, SLOT_BASE, SLOT_MAX+metaEff().loadout); }
/* ===== 🌌 회귀(로그라이트 메타성장) — 메아리 ✦로 사는 영구 강화 ===== */
const META_UP={
  vigor:  {n:"불멸의 활력",emoji:"❤️",max:5,base:6, desc:l=>`최대 HP +${l*8}%`,      eff:l=>({hpPct:l*0.08})},
  focus:  {n:"각인된 기력",emoji:"🔷",max:5,base:6, desc:l=>`최대 기력 +${l*8}%`,    eff:l=>({mpPct:l*0.08})},
  might:  {n:"타고난 재능",emoji:"💪",max:5,base:8, desc:l=>`시작 시 전 스탯 +${l}`,  eff:l=>({statAll:l})},
  fortune:{n:"상인의 기억",emoji:"💰",max:5,base:5, desc:l=>`시작 골드 +${l*60} · 시작 물약 +${l}`, eff:l=>({gold:l*60,potions:l})},
  growth: {n:"숙달의 잔향",emoji:"📈",max:5,base:8, desc:l=>`스탯 성장 속도 +${l*10}%`, eff:l=>({growth:l*0.10})},
  greed:  {n:"보물 감각",emoji:"🎁",max:5,base:7, desc:l=>`아이템 드랍률 +${l*8}%`,   eff:l=>({drop:l*0.08})},
  legacy: {n:"지식 계승",emoji:"🗝",max:1,base:20,desc:l=>`회귀해도 배운 스킬 유지(재습득 불필요)`, eff:l=>({legacy:l})},
  arsenal:{n:"넓은 그릇",emoji:"🎒",max:2,base:15,desc:l=>`시작 스킬 슬롯 +${l}`,      eff:l=>({loadout:l})},
};
function metaEff(){ const e={hpPct:0,mpPct:0,statAll:0,gold:0,potions:0,growth:0,drop:0,legacy:0,loadout:0};
  if(!P||!P.meta||!P.meta.spent)return e;
  for(const k in P.meta.spent){ const u=META_UP[k]; if(!u)continue; const ef=u.eff(P.meta.spent[k]||0); for(const s in ef)e[s]=(e[s]||0)+ef[s]; } return e; }
function metaCost(k){ const u=META_UP[k]; if(!u)return 0; const lv=(P&&P.meta&&P.meta.spent&&P.meta.spent[k])||0; return Math.round(u.base*(lv+1)); }
/* 회귀(NG+) 난이도 — 회귀할수록 적 강화. 첫 회차(runs 0)=1.0, 회귀당 +12%(최대 +120%) */
function ngMul(){ return 1 + Math.min((P&&P.meta&&P.meta.runs)||0, 10)*0.12; }
const CHECKPOINTS={ 6:{n:"바람의 쉼터",zone:"제2구역"}, 11:{n:"심연의 관문",zone:"제3구역"},
  16:{n:"천공의 문",zone:"천공 성역"}, 21:{n:"빛의 회랑",zone:"천공 성역"}, 26:{n:"신탑의 계단",zone:"천공 성역"},
  31:{n:"균열의 입구",zone:"시공의 균열"}, 36:{n:"부서진 성좌",zone:"시공의 균열"}, 41:{n:"공허의 안식처",zone:"시공의 균열"}, 46:{n:"창조의 문턱",zone:"시공의 균열"} };
  // 탑 거점(포탈) · 1~15 미궁 / 16~30 천공 성역 / 31~50 시공의 균열
/* 퀘스트. goal.type: kills(누적처치) | floor(최고층) | mat(재료보유) | gold(금화보유) | skill(스킬습득) */
const QUESTS={
  q_pest:{n:"해충 박멸",type:"sub",cat:"hunt",giver:"촌장",desc:"몬스터 10마리 처치",goal:{type:"kills",n:10},reward:{gold:80,mats:{herb:3}}},
  q_gate:{n:"문지기를 넘어라",type:"main",giver:"촌장",desc:"탑 5층에 도달(문지기 격파)",goal:{type:"floor",n:5},reward:{gold:150,book:"book_heavy"}},
  q_lumber:{n:"목재 조달",type:"sub",cat:"village",giver:"대장장이",desc:"원목 12개 모으기",goal:{type:"mat",mat:"wood",n:12},reward:{gold:70,item:"가죽 갑옷"}},
  q_mana:{n:"마정석 연구",type:"sub",cat:"village",giver:"상점주",desc:"마정석 8개 모으기",goal:{type:"mat",mat:"mana",n:8},reward:{gold:90,book:"book_fireball"}},
  q_rich:{n:"한몫 잡기",type:"sub",cat:"reco",giver:"촌장",desc:"금화 300 보유",goal:{type:"gold",n:300},reward:{mats:{ore:5},item:"토끼발 부적"}},
  q_magic:{n:"마법 입문",type:"sub",cat:"reco",giver:"상점주",desc:"파이어볼 습득",goal:{type:"skill",skill:"fireball"},reward:{gold:60,mats:{mana:3}}},
  q_hunt2:{n:"정예 소탕",type:"sub",cat:"hunt",giver:"길드마스터",desc:"몬스터 40마리 처치",goal:{type:"kills",n:40},reward:{gold:180,book:"book_power"}},
  q_village2:{n:"약초 공급",type:"sub",cat:"village",giver:"약초상",desc:"약초 15개 모으기",goal:{type:"mat",mat:"herb",n:15},reward:{gold:110,mats:{mana:2}}},
  q_deep:{n:"심연으로",type:"main",giver:"촌장",desc:"탑 11층 거점에 도달",goal:{type:"floor",n:11},reward:{gold:250,title:"pioneer"}},
  q_sky:{n:"천공에 이르다",type:"main",giver:"촌장",desc:"탑 16층 '천공의 문'에 도달",goal:{type:"floor",n:16},reward:{gold:300,item:"판금 흉갑"}},
  q_beyond:{n:"차원 너머로",type:"main",giver:"촌장",desc:"탑 31층 '균열의 입구'에 도달",goal:{type:"floor",n:31},reward:{gold:600,item:"월광 세이버"}},
  q_summit:{n:"탑의 끝",type:"main",giver:"촌장",desc:"탑 50층 정상에 도달",goal:{type:"floor",n:50},reward:{gold:1500,mats:{mana:15,ore:15}}},
  q_tower1:{n:"잃어버린 부적",type:"sub",giver:"탑의 유령",tower:true,desc:"탑 8층까지 도달",goal:{type:"floor",n:8},reward:{gold:120,item:"흡혈의 반지"}},
  q_owl:{n:"현자의 부탁",type:"sub",cat:"reco",giver:"떠돌이 현자",desc:"몬스터 60마리 처치 — 부엉이가 따를 것이다",goal:{type:"kills",n:60},reward:{gold:220,comp:"owl",food:{food_heal:5}}},
};
const TITLES={
  warrior:{n:"전사",emoji:"⚔️",stats:{str:2},mods:{atkPct:0.12,hp:20},note:"힘 +2 · 공격 +12% · 최대HP +20",how:"힘 14 달성",unlock:p=>p.stats.str>=14},
  archer:{n:"궁수",emoji:"🏹",stats:{dex:2},mods:{crit:0.08,luck:1},note:"민첩 +2 · 치명 +8% · 행운 +1",how:"민첩 14 달성",unlock:p=>p.stats.dex>=14},
  mage:{n:"마법사",emoji:"🔮",stats:{int:2},mods:{mpBonus:8,magic:0.2},note:"지능 +2 · 최대기력 +8 · 마법 +20%",how:"지능 14 달성",unlock:p=>p.stats.int>=14},
  cleric:{n:"클레릭",emoji:"✨",stats:{vit:2},mods:{healPct:0.3,hp:15},note:"체력 +2 · 회복 +30% · 최대HP +15",how:"체력 14 달성",unlock:p=>p.stats.vit>=14},
  slayer:{n:"백전노장",emoji:"🗡️",stats:{str:1,dex:1},mods:{atkPct:0.08,crit:0.04},note:"힘·민첩 +1 · 공격 +8% · 치명 +4%",how:"몬스터 150처치",unlock:p=>p.kills>=150},
  conqueror:{n:"탑의 정복자",emoji:"👑",stats:{str:1,int:1,vit:1},mods:{atkPct:0.1,hp:30},note:"힘·지능·체력 +1 · 공격 +10% · HP +30",how:"탑 정상 정복",unlock:p=>(p.flags&&p.flags.cleared||0)>=1},
  tycoon:{n:"부호",emoji:"💰",stats:{luk:3},mods:{},note:"행운 +3",how:"금화 2000 보유",unlock:p=>p.gold>=2000},
  survivor:{n:"불굴의 생존자",emoji:"🛡️",stats:{vit:3},mods:{hp:15},note:"체력 +3 · 최대HP +15",how:"다이브 30회",unlock:p=>(p.dives||0)>=30},
  pioneer:{n:"탑의 개척자",emoji:"🧭",stats:{str:1,int:1,dex:1,vit:1},mods:{atkPct:0.08},note:"전 스탯 +1 · 공격 +8%",how:"메인 '심연으로' 완료",unlock:p=>!!(p.quests&&p.quests.q_deep&&p.quests.q_deep.status==="done")},
  /* ===== 대량 추가 칭호 ===== */
  onepunch:{n:"한 방에 끝낸 원펀맨",emoji:"👊",stats:{str:2},mods:{atkPct:0.12},note:"힘 +2 · 공격 +12%",how:"적을 풀피에서 한 방에 처치",unlock:p=>fCnt(p,"oneShot")>=1},
  onepunch_god:{n:"세계관 최강자",emoji:"🌟",stats:{str:3},mods:{atkPct:0.15,crit:0.05},note:"힘 +3 · 공격 +15% · 치명 +5%",how:"원펀 50회",unlock:p=>fCnt(p,"oneShot")>=50},
  bosscrusher:{n:"거인 살해자",emoji:"🪓",stats:{str:2},mods:{atkPct:0.12},note:"힘 +2 · 공격 +12%",how:"보스를 한 방에 처치",unlock:p=>fCnt(p,"oneShotBoss")>=1},
  brute:{n:"근육 괴물",emoji:"💪",stats:{str:3},mods:{atkPct:0.1,hp:20},note:"힘 +3 · 공격 +10% · HP +20",how:"힘 25 달성",unlock:p=>p.stats.str>=25},
  titan:{n:"거력의 화신",emoji:"🗿",stats:{str:5},mods:{atkPct:0.15},note:"힘 +5 · 공격 +15%",how:"힘 40 달성",unlock:p=>p.stats.str>=40},
  sage:{n:"현자",emoji:"📖",stats:{int:3},mods:{magic:0.25,mpBonus:10},note:"지능 +3 · 마법 +25%",how:"지능 25 달성",unlock:p=>p.stats.int>=25},
  archmage:{n:"대마법사",emoji:"🌀",stats:{int:5},mods:{magic:0.4,mpBonus:15},note:"지능 +5 · 마법 +40%",how:"지능 40 달성",unlock:p=>p.stats.int>=40},
  sharpshooter:{n:"명사수",emoji:"🎯",stats:{dex:3},mods:{crit:0.1},note:"민첩 +3 · 치명 +10%",how:"민첩 25 달성",unlock:p=>p.stats.dex>=25},
  windwalker:{n:"질풍의 무희",emoji:"🌪️",stats:{dex:5},mods:{crit:0.14},note:"민첩 +5 · 치명 +14%",how:"민첩 40 달성",unlock:p=>p.stats.dex>=40},
  ironhide:{n:"철갑의 수문장",emoji:"🛡️",stats:{vit:3},mods:{hp:40},note:"체력 +3 · HP +40",how:"체력 25 달성",unlock:p=>p.stats.vit>=25},
  immortal:{n:"불사의 벽",emoji:"🏰",stats:{vit:5},mods:{hp:80},note:"체력 +5 · HP +80",how:"체력 40 달성",unlock:p=>p.stats.vit>=40},
  luckyguy:{n:"타고난 운",emoji:"🍀",stats:{luk:4},mods:{},note:"행운 +4",how:"행운 25 달성",unlock:p=>p.stats.luk>=25},
  destiny:{n:"운명을 거스르는 자",emoji:"🎰",stats:{luk:7},mods:{crit:0.06},note:"행운 +7 · 치명 +6%",how:"행운 40 달성",unlock:p=>p.stats.luk>=40},
  jackofall:{n:"만능인",emoji:"🎭",stats:{str:2,int:2,dex:2,vit:2,luk:2},mods:{atkPct:0.06},note:"전 스탯 +2 · 공격 +6%",how:"모든 스탯 20 이상",unlock:p=>Math.min(p.stats.str,p.stats.int,p.stats.dex,p.stats.vit,p.stats.luk)>=20},
  hunter100:{n:"사냥꾼",emoji:"🐗",stats:{str:1,dex:1},mods:{atkPct:0.06},note:"힘·민첩 +1 · 공격 +6%",how:"몬스터 300처치",unlock:p=>p.kills>=300},
  reaper:{n:"학살자",emoji:"☠️",stats:{str:2,dex:1},mods:{atkPct:0.1,crit:0.05},note:"공격 +10% · 치명 +5%",how:"몬스터 1000처치",unlock:p=>p.kills>=1000},
  genocide:{n:"탑의 재앙",emoji:"💀",stats:{str:3,dex:2},mods:{atkPct:0.14,crit:0.08},note:"공격 +14% · 치명 +8%",how:"몬스터 5000처치",unlock:p=>p.kills>=5000},
  climber:{n:"등반가",emoji:"🧗",stats:{vit:1,dex:1},mods:{hp:15},note:"체력·민첩 +1 · HP +15",how:"탑 25층 도달",unlock:p=>(p.flags&&p.flags.maxFloor||0)>=25},
  summit:{n:"정상에 선 자",emoji:"⛰️",stats:{str:2,vit:2},mods:{atkPct:0.1,hp:30},note:"공격 +10% · HP +30",how:"탑 50층 도달",unlock:p=>(p.flags&&p.flags.maxFloor||0)>=50},
  overlord:{n:"탑의 지배자",emoji:"👑",stats:{str:2,int:2,vit:2},mods:{atkPct:0.12,hp:30},note:"공격 +12% · HP +30",how:"탑 3회 정복",unlock:p=>(p.flags&&p.flags.cleared||0)>=3},
  eternal:{n:"영겁의 등반자",emoji:"♾️",stats:{str:3,int:3,vit:3},mods:{atkPct:0.15,hp:40},note:"공격 +15% · HP +40",how:"탑 10회 정복",unlock:p=>(p.flags&&p.flags.cleared||0)>=10},
  explorer:{n:"대륙 탐험가",emoji:"🗺️",stats:{luk:2},mods:{atkPct:0.06},note:"행운 +2 · 공격 +6%",how:"대륙 1곳 개척",unlock:p=>(p.flags&&p.flags.contCleared||0)>=1},
  worldender:{n:"세계의 끝을 본 자",emoji:"🌌",stats:{str:3,int:3},mods:{atkPct:0.15,crit:0.1},note:"공격 +15% · 치명 +10%",how:"5대륙 모두 개척",unlock:p=>(p.flags&&p.flags.contCleared||0)>=5},
  reborn:{n:"회귀자",emoji:"🌀",stats:{luk:2},mods:{atkPct:0.08},note:"행운 +2 · 공격 +8%",how:"회귀 1회",unlock:p=>(p.meta&&p.meta.runs||0)>=1},
  cycle:{n:"윤회의 주인",emoji:"☯️",stats:{str:2,int:2,dex:2,vit:2,luk:2},mods:{atkPct:0.1},note:"전 스탯 +2 · 공격 +10%",how:"회귀 5회",unlock:p=>(p.meta&&p.meta.runs||0)>=5},
  merchant_gold:{n:"큰손",emoji:"💰",stats:{luk:2},mods:{},note:"행운 +2",how:"금화 5000 보유",unlock:p=>p.gold>=5000},
  goldmagnet:{n:"황금 지배자",emoji:"🏦",stats:{luk:4},mods:{},note:"행운 +4",how:"금화 20000 보유",unlock:p=>p.gold>=20000},
  spender:{n:"떠돌이 상인의 단골",emoji:"🧳",stats:{luk:1},mods:{},note:"행운 +1",how:"떠돌이 상인에게 10회 구매",unlock:p=>fCnt(p,"merchantBuy")>=10},
  diver:{n:"베테랑 다이버",emoji:"🪜",stats:{vit:2},mods:{hp:20},note:"체력 +2 · HP +20",how:"다이브 50회",unlock:p=>(p.dives||0)>=50},
  diver100:{n:"탑에 사는 남자",emoji:"🏚️",stats:{vit:3},mods:{hp:30},note:"체력 +3 · HP +30",how:"다이브 100회",unlock:p=>(p.dives||0)>=100},
  saint:{n:"성인",emoji:"😇",stats:{vit:2,luk:2},mods:{healPct:0.2},note:"체력·행운 +2 · 회복 +20%",how:"성향 선(카르마 10+)",unlock:p=>(p.karma||0)>=10},
  demon:{n:"타락한 자",emoji:"😈",stats:{str:2,dex:2},mods:{atkPct:0.12,crit:0.06},note:"공격 +12% · 치명 +6%",how:"성향 악(카르마 -10↓)",unlock:p=>(p.karma||0)<=-10},
  parry_master:{n:"칼날 위의 춤꾼",emoji:"⚔️",stats:{dex:2},mods:{crit:0.08},note:"민첩 +2 · 치명 +8%",how:"완벽 패링 10회",unlock:p=>fCnt(p,"perfectParry")>=10},
  parry_god:{n:"불가침의 검객",emoji:"🗡️",stats:{dex:3},mods:{crit:0.12},note:"민첩 +3 · 치명 +12%",how:"완벽 패링 100회",unlock:p=>fCnt(p,"perfectParry")>=100},
  runaway:{n:"삼십육계 줄행랑",emoji:"🏃",stats:{dex:2,luk:1},mods:{},note:"민첩 +2 · 행운 +1",how:"도망 30회 성공",unlock:p=>fCnt(p,"fled")>=30},
  duelist:{n:"결투가",emoji:"🤺",stats:{str:1,dex:1},mods:{atkPct:0.08},note:"공격 +8%",how:"결투(PvP) 5승",unlock:p=>fCnt(p,"pvpWin")>=5},
  gladiator:{n:"투기장의 왕",emoji:"🏛️",stats:{str:2,dex:2},mods:{atkPct:0.12,crit:0.06},note:"공격 +12% · 치명 +6%",how:"결투 30승",unlock:p=>fCnt(p,"pvpWin")>=30},
  gambler:{n:"강화 도박꾼",emoji:"🎲",stats:{luk:2},mods:{},note:"행운 +2",how:"강화하다 장비 1개 파괴",unlock:p=>fCnt(p,"destroyed")>=1},
  wrecker:{n:"파괴의 화신",emoji:"💥",stats:{luk:3},mods:{atkPct:0.06},note:"행운 +3 · 공격 +6%",how:"장비 10개 파괴",unlock:p=>fCnt(p,"destroyed")>=10},
  scholar:{n:"석상의 벗",emoji:"🗿",stats:{int:2},mods:{magic:0.15},note:"지능 +2 · 마법 +15%",how:"수수께끼 10회 정답",unlock:p=>fCnt(p,"riddleRight")>=10},
  collector:{n:"수집가",emoji:"📦",stats:{luk:2},mods:{},note:"행운 +2",how:"장비 도감 20종 발견",unlock:p=>Object.keys(p.codex||{}).length>=20},
  archivist:{n:"탑의 사관",emoji:"📚",stats:{int:2,luk:2},mods:{atkPct:0.06},note:"지능·행운 +2 · 공격 +6%",how:"장비 도감 60종 발견",unlock:p=>Object.keys(p.codex||{}).length>=60},
  beastmaster:{n:"몬스터 박사",emoji:"👹",stats:{dex:2},mods:{crit:0.06},note:"민첩 +2 · 치명 +6%",how:"몬스터 도감 20종 발견",unlock:p=>Object.keys(p.bestiary||{}).length>=20},
  crystalking:{n:"크리스탈 부자",emoji:"💎",stats:{luk:3},mods:{},note:"행운 +3",how:"크리스탈 50 보유",unlock:p=>(p.gems||0)>=50},
  skillful:{n:"다재다능",emoji:"🎓",stats:{int:1,dex:1},mods:{atkPct:0.06},note:"공격 +6%",how:"스킬 8종 습득",unlock:p=>(p.skills||[]).length>=8},
  potionlover:{n:"물약 중독자",emoji:"🧪",stats:{vit:1},mods:{healPct:0.15},note:"체력 +1 · 회복 +15%",how:"물약 30개 보유",unlock:p=>(p.potions||0)>=30},
  novice:{n:"이름 없는 방랑자",emoji:"🧝",stats:{},mods:{},note:"모든 것의 시작",how:"첫 발을 내딛다",unlock:p=>true},
};
function fCnt(p,k){ return (p&&p.feats&&p.feats[k])||0; }   // 칭호 조건용 업적 카운트
const jobMods = () => (P&&P.title&&TITLES[P.title])?TITLES[P.title].mods:{};
const titleStatBonus = k => { const t=P&&P.title&&TITLES[P.title]; return (t&&t.stats&&t.stats[k])||0; };
const estat = k => (P.stats[k]||0) + titleStatBonus(k);   // 칭호 스탯 포함 유효 스탯
const jobName = () => (P&&P.title&&TITLES[P.title])?TITLES[P.title].n:"방랑자";
const jobEmoji = () => (P&&P.title&&TITLES[P.title])?TITLES[P.title].emoji:"🧝";
/* 강화(+N) 보너스: 무기→공격, 방어구→방어, 장신구→주스탯 에 레벨만큼 가산 */
/* 강화 주스탯 누적 보너스 — 6·11·16강에서 대폭 점프(고강일수록 급격히↑) */
const UP_PER=[2,2,2,2,3, 6,4,4,4,5, 9,6,6,6,8, 13,8,8,8,11];   // 각 강화레벨이 주는 주스탯
function upMainBonus(up){ let t=0; for(let i=0;i<up;i++)t+=(i<UP_PER.length?UP_PER[i]:12); return t; }
function upBonus(it){ const g=it&&RELICS[it.k]; const up=(it&&it.up)||0; if(!g||!up)return {atk:0,def:0,luck:0};
  const o={atk:0,def:0,luck:0}; o[gearMainStat(g)]=upMainBonus(up); return o; }
function relicBonus(){ let b={atk:0,def:0,luck:0,vamp:false};
  for(const s of SLOTS){ if(s[0]==="weapon" && typeof B!=="undefined" && B && B.disarmed) continue; /* 무장 해제 시 무기 무효 */
    const it=equippedItem(s[0]); const r=it&&RELICS[it.k]; if(!r)continue; b.atk+=r.atk||0; b.def+=r.def||0; b.luck+=r.luck||0; b.vamp=b.vamp||!!r.vamp;
    const u=upBonus(it); b.atk+=u.atk; b.def+=u.def; b.luck+=u.luck;
    if(it.extra){ b.atk+=it.extra.atk||0; b.def+=it.extra.def||0; b.luck+=it.extra.luck||0; } }   // 🎲 강화 랜덤 추가스탯
  const sb=setBonus(); b.atk+=sb.atk; b.def+=sb.def; b.luck+=sb.luck; b.vamp=b.vamp||sb.vamp;   // 세트 효과(스탯)
  return b; }

/* ---------- 파생 스탯 ---------- */
const hasSkill = k => P.skills.includes(k);                 // 배워서 보유했는가
const passiveEquipped = k => !!(P && P.skills && P.skills.includes(k)); // 패시브는 배우면 자동 적용(슬롯 불필요)
const MAXHP=()=> Math.round((24 + estat("vit")*5 + (jobMods().hp||0)) * (1+metaEff().hpPct));
const MAXMP=()=> Math.round((6 + Math.floor(estat("int")*1.5) + (passiveEquipped("meditate")?6:0) + (jobMods().mpBonus||0)) * (1+metaEff().mpPct));
const ATK  =()=> Math.round((4 + Math.floor(estat("str")*1.2) + relicBonus().atk) * (1+((P.buffs&&P.buffs.atkPct)||0)+((typeof B!=="undefined"&&B&&B.atkPct)||0)+(jobMods().atkPct||0)+setBonus().atkPct));
const DEF  =()=> 1 + Math.floor(estat("str")*0.15) + relicBonus().def + ((P.buffs&&P.buffs.defBonus)||0) + ((typeof B!=="undefined"&&B&&B.defB)||0);
const LUKv =()=> estat("luk") + relicBonus().luck + (jobMods().luck||0) + ((typeof B!=="undefined"&&B&&B.lukB)||0) + ((P.buffs&&P.buffs.luck)||0);
const magicPow =()=> Math.round((3 + Math.floor(estat("int")*1.3)) * (1+(jobMods().magic||0)+((P.buffs&&P.buffs.magicPct)||0)));
const critChance =()=> clamp(0.04 + estat("dex")*0.005 + LUKv()*0.005 + (passiveEquipped("crit_focus")?0.10:0) + (jobMods().crit||0) + ((P.buffs&&P.buffs.critBonus)||0) + ((typeof B!=="undefined"&&B&&B.critB)||0) + setBonus().crit, 0, 0.60);   // 밸런스: 치명 계수↓(dex/luk 0.008→0.005) + 상한 60%

