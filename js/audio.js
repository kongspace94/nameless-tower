/* 이름 없는 탑 — 사운드 엔진
 * 지금은 파일 없이 WebAudio 합성음(placeholder)으로 울림. 나중에 실제 사운드 파일로 바꾸려면
 * 아래 SFX / BGM 항목에 src 경로만 넣으면 됩니다 (없으면 합성음, 파일 로드 실패 시에도 합성음으로 폴백):
 *     attack: { src:"sounds/attack.mp3", gain:0.5 }
 *     town:   { src:"sounds/bgm-town.mp3", vol:0.35, loop:true }
 *  ─ 파일은 D:\text-rpg\sounds\ 같은 폴더에 두고 상대경로로 지정. 온라인 배포 시 서버가 자동 서빙.
 *  ─ 볼륨/음소거는 설정 화면에서. 첫 클릭/키입력 때 오디오가 활성화됩니다(브라우저 자동재생 정책).
 */
function _lsNum(k, d) { if (typeof localStorage === "undefined") return d; const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : v; }
function _lsOn(k) { return (typeof localStorage === "undefined") ? true : localStorage.getItem(k) !== "off"; }
function _clamp01(v) { return Math.max(0, Math.min(1, v)); }
const AUDIO = {
  on:     _lsOn("nt_sfx"),   vol:    _lsNum("nt_vol", 0.6),      // 효과음
  bgmOn:  _lsOn("nt_bgm"),   bgmVol: _lsNum("nt_bgmvol", 0.6),   // 배경음악
  ambOn:  _lsOn("nt_amb"),   ambVol: _lsNum("nt_ambvol", 0.5),   // 환경음
  ctx: null, master: null, bufs: {}, bgmEl: null, bgmName: null, ambEl: null, ambName: null, _last: {}, _unlocked: false,
};

/* ══════════ 여기만 바꾸면 됨: 이벤트별 사운드 ══════════
   synth 종류: blip(짧은 톤) · sweep(주파수 활강) · noise(타격 잡음) · arp(멜로디 몇 음)
   실제 파일로 교체: 항목에 src:"sounds/xxx.mp3" 추가 (gain으로 개별 볼륨 조절) */
const SFX = {
  click:     { synth: "blip",  freq: 480, dur: 0.045, type: "square",   gain: 0.16 },
  attack:    { synth: "blip",  freq: 165, dur: 0.10,  type: "sawtooth", gain: 0.32 },
  crit:      { synth: "sweep", from: 820, to: 170, dur: 0.18, type: "square",   gain: 0.4 },
  hurt:      { synth: "noise", dur: 0.16, cut: 900, gain: 0.3 },
  encounter: { synth: "sweep", from: 110, to: 520, dur: 0.36, type: "sawtooth", gain: 0.26 },
  loot:      { synth: "arp",   notes: [660, 880, 1320], step: 0.07, type: "triangle", gain: 0.26 },
  heal:      { synth: "arp",   notes: [520, 784],       step: 0.09, type: "sine",     gain: 0.24 },
  victory:   { synth: "arp",   notes: [523, 659, 784, 1046], step: 0.12, type: "triangle", gain: 0.34 },
  defeat:    { synth: "sweep", from: 400, to: 70, dur: 0.7, type: "sine", gain: 0.34 },
  // 예) 파일 교체:  click: { src:"sounds/click.mp3", gain:0.5 }
};
const BGM = {   // 배경음악 (src 없으면 무음 대기). vol=트랙별 기본 볼륨(0~1), 최종=vol×설정마스터
  town:   { src: "", vol: 0.6, loop: true },   // 예) src:"sounds/bgm-town.mp3"
  combat: { src: "", vol: 0.7, loop: true },
};
const AMB = {   // 환경음 (바람·풀벌레·마을 소음 등, 배경음악과 별도 레이어). src 넣으면 재생
  town:   { src: "", vol: 0.6, loop: true },   // 예) src:"sounds/amb-town.mp3"
  tower:  { src: "", vol: 0.6, loop: true },
};
/* 🎼 임시 합성 배경음악 루프 — BGM에 src가 없을 때 자동으로 이 루프가 재생됨(파일 넣으면 파일 우선).
   town=잔잔한 단조 패드 진행 / combat=긴박한 베이스 오스티나토. 나중에 참고용/자리표시자. */
const BGM_SYNTH = {
  town: {   // 잔잔한 단조 진행 Am–F–C–G–Am–F–Dm–E (E로 강한 단조 해결) + 애절한 리드 멜로디
    stepMs: 2400,
    chords: [[220,261.63,329.63],[174.61,220,261.63],[130.81,164.81,196.00],[196.00,246.94,293.66],
             [220,261.63,329.63],[174.61,220,261.63],[146.83,174.61,220.00],[164.81,207.65,246.94]],
    melody:   [440,523.25, 523.25,0, 392,329.63, 587.33,493.88, 523.25,659.25, 440,698.46, 587.33,440, 493.88,415.30],  // 스텝당 2음(0=쉼표), A 단조/E7 리딩톤
    harmony:  [349.23,440, 440,0, 329.63,261.63, 493.88,392, 440,523.25, 349.23,587.33, 493.88,349.23, 392,329.63],     // 멜로디 3도 아래(A단조 다이어토닉) — 후반부에만 얹어 풍성하게
  },
  combat: {   // 박진감 전투 테마 — Am–F–G–E 진행(코드당 4스텝) + 드럼 + 파워코드 스탭 + 긴장 리드
    stepMs: 235,
    chords: [[110,164.81,220],[87.31,130.81,174.61],[98.00,146.83,196.00],[82.41,123.47,164.81]],   // Am F G E (루트·5도·8도)
    lead:   [440,523.25,659.25,523.25, 440,523.25,698.46,523.25, 392,493.88,587.33,493.88, 415.30,493.88,659.25,493.88],
  },
};

/* ── 엔진 (아래는 손댈 필요 없음) ── */
function audioSupported() { return typeof window !== "undefined" && (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined"); }
function audioInit() {
  if (!audioSupported() || AUDIO.ctx) return AUDIO.ctx;
  try { const AC = window.AudioContext || window.webkitAudioContext; AUDIO.ctx = new AC();
    AUDIO.master = AUDIO.ctx.createGain(); AUDIO.master.gain.value = AUDIO.vol; AUDIO.master.connect(AUDIO.ctx.destination);
  } catch (e) { AUDIO.ctx = null; }
  return AUDIO.ctx;
}
function audioUnlock() {   // 사용자 제스처마다 호출(멱등) → ctx 깨우고, 울려야 할 BGM/환경음이 안 울리고 있으면 시작
  if (!audioInit()) return; const ctx = AUDIO.ctx; const wasSuspended = (ctx.state === "suspended");
  const after = () => {   // ctx가 잠겨있다 깨어난 직후엔(또는 루프 미가동 시) 확실히 (재)시작
    if (AUDIO.bgmName && (wasSuspended || !AUDIO.bgmSynth)) bgm(AUDIO.bgmName, true);
    if (AUDIO.ambName && AMB[AUDIO.ambName] && AMB[AUDIO.ambName].src) amb(AUDIO.ambName, true);
    AUDIO._unlocked = true;
  };
  try { if (wasSuspended) ctx.resume().then(after, after); else after(); } catch (e) { after(); }
}
if (typeof document !== "undefined") { ["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, audioUnlock, { once: false })); }

function _env(node, t0, dur, peak) {   // 게인 엔벨로프(어택/릴리즈)
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g); g.connect(AUDIO.master); return g;
}
function _synth(spec) {
  const ctx = AUDIO.ctx, t0 = ctx.currentTime, gain = (spec.gain != null ? spec.gain : 0.3);
  if (spec.synth === "noise") {
    const dur = spec.dur || 0.15, buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    let node = src; if (spec.cut) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = spec.cut; src.connect(lp); node = lp; }
    _env(node, t0, dur, gain); src.start(t0); src.stop(t0 + dur); return;
  }
  if (spec.synth === "arp") {
    const notes = spec.notes || [660], step = spec.step || 0.08;
    notes.forEach((f, i) => { const o = ctx.createOscillator(); o.type = spec.type || "triangle"; o.frequency.value = f;
      const tt = t0 + i * step; _env(o, tt, step * 1.6, gain); o.start(tt); o.stop(tt + step * 1.7); });
    return;
  }
  const o = ctx.createOscillator(); o.type = spec.type || "square"; const dur = spec.dur || 0.12;
  if (spec.synth === "sweep") { o.frequency.setValueAtTime(spec.from || 600, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to || 120), t0 + dur); }
  else { o.frequency.value = spec.freq || 440; }
  _env(o, t0, dur, gain); o.start(t0); o.stop(t0 + dur + 0.02);
}
function _playBuf(name, url, gain) {
  const play = (buf) => { const ctx = AUDIO.ctx, src = ctx.createBufferSource(); src.buffer = buf; const g = ctx.createGain(); g.gain.value = (gain != null ? gain : 1); src.connect(g); g.connect(AUDIO.master); src.start(); };
  if (AUDIO.bufs[name]) { if (AUDIO.bufs[name] !== "fail") play(AUDIO.bufs[name]); return AUDIO.bufs[name] !== "fail"; }
  fetch(url).then(r => r.arrayBuffer()).then(a => AUDIO.ctx.decodeAudioData(a)).then(b => { AUDIO.bufs[name] = b; play(b); }).catch(() => { AUDIO.bufs[name] = "fail"; });
  return true;   // 로딩 중 — 이번 콜은 스킵되지만 다음부터 재생
}
function sfx(name) {   // ★ 메인 진입점: sfx("attack") 처럼 호출
  if (!AUDIO.on || !audioSupported()) return; const spec = SFX[name]; if (!spec) return;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (now - (AUDIO._last[name] || 0) < 45) return; AUDIO._last[name] = now;   // 같은 소리 연타 방지
  if (!audioInit()) return; try { if (AUDIO.ctx.state === "suspended") AUDIO.ctx.resume(); } catch (e) {}
  try { if (spec.src) { if (_playBuf(name, spec.src, spec.gain)) return; } _synth(spec); } catch (e) {}
}
function bgm(name, force) {   // 배경음악 전환. src 있으면 파일, 없으면 합성 루프(자리표시자)
  AUDIO.bgmName = name; if (!audioSupported()) return; const def = BGM[name];
  if (!AUDIO.bgmOn) { bgmStop(); return; }
  if (def && def.src) {   // 실제 파일 우선
    stopSynthBgm();
    if (AUDIO.bgmEl && AUDIO._bgmSrc === def.src && !force && !AUDIO.bgmEl.paused) return;
    bgmStopFile();
    try { const el = new Audio(def.src); el.loop = def.loop !== false; el.volume = _clamp01(AUDIO.bgmVol * (def.vol != null ? def.vol : 1));
      el.play().catch(() => {}); AUDIO.bgmEl = el; AUDIO._bgmSrc = def.src; } catch (e) {}
    return;
  }
  // 파일 없음 → 합성 루프
  bgmStopFile();
  if (BGM_SYNTH[name]) { if (AUDIO.bgmSynth && AUDIO.bgmSynth.name === name && !force) return; startSynthBgm(name); }
  else stopSynthBgm();
}
function bgmStopFile() { if (AUDIO.bgmEl) { try { AUDIO.bgmEl.pause(); } catch (e) {} AUDIO.bgmEl = null; AUDIO._bgmSrc = null; } }
function bgmStop() { bgmStopFile(); stopSynthBgm(); }
function stopSynthBgm() { const s = AUDIO.bgmSynth; if (s) { try { clearInterval(s.timer); } catch (e) {} try { s.gain.gain.setTargetAtTime(0.0001, AUDIO.ctx.currentTime, 0.1); setTimeout(() => { try { s.gain.disconnect(); } catch (e) {} }, 400); } catch (e) {} AUDIO.bgmSynth = null; } }
function startSynthBgm(name) {   // WebAudio 절차적 배경음악 루프
  stopSynthBgm(); if (!audioInit()) return; const ctx = AUDIO.ctx; try { if (ctx.state === "suspended") ctx.resume(); } catch (e) {}
  const spec = BGM_SYNTH[name]; if (!spec) return;
  const g = ctx.createGain(); g.gain.value = _clamp01(AUDIO.bgmVol); g.connect(ctx.destination);   // BGM 전용 게인(효과음 마스터와 분리)
  let step = 0;
  const note = (freq, dur, type, vol, delay, atk) => { if (!freq) return; const t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const a = (atk != null ? atk : Math.min(0.2, dur * 0.25));   // atk 지정 시 빠른 어택(피아노 플럭)
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(ng); ng.connect(g); o.start(t0); o.stop(t0 + dur + 0.03); };
  const noise = (dur, vol, hp) => { const t0 = ctx.currentTime, buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate), dch = buf.getChannelData(0);   // 드럼용 노이즈
    for (let i = 0; i < dch.length; i++) dch[i] = Math.random() * 2 - 1; const src = ctx.createBufferSource(); src.buffer = buf; let nn = src;
    if (hp) { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; src.connect(f); nn = f; }
    const ng = ctx.createGain(); ng.gain.setValueAtTime(vol, t0); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); nn.connect(ng); ng.connect(g); src.start(t0); src.stop(t0 + dur + 0.02); };
  const tick = () => {
    if (name === "combat") { const d = spec.stepMs / 1000, s16 = step % 16, ci = (s16 / 4) | 0, ch = spec.chords[ci], within = s16 % 4;
      note(ch[0], d * 0.92, "sawtooth", 0.08); note(ch[0], d * 0.92, "square", 0.026);                 // 갤로핑 베이스 + 서브
      if (within === 0) { note(ch[0] / 2, d * 4.1, "sine", 0.05); ch.forEach(f => note(f, d * 1.8, "sawtooth", 0.028)); }   // 코드 드론 + 파워코드 스탭
      if (step % 2 === 0) note(73.42, 0.14, "sine", 0.12, 0, 0.003);                                    // 🥁 킥(D2)
      noise(0.03, 0.016, 7000); if (within === 2) noise(0.12, 0.05, 1600);                              // 하이햇(매 스텝) + 스네어(백비트)
      const lf = spec.lead[s16]; if (lf) note(lf, d * 0.85, "triangle", 0.042); }                        // 긴장 리드 모티프
    else { const n = spec.chords.length, idx = step % n, ch = spec.chords[idx], d = spec.stepMs / 1000;
      const half2 = idx >= 4, build = half2 ? Math.pow((idx - 3) / 4, 1.3) : 0, lift = 1 + 0.3 * build;   // 잔잔하게 — 후반부에 은은한 크레센도만
      ch.forEach(f => { note(f, d * 1.05, "triangle", 0.04 * lift); note(f * 1.006, d * 1.05, "triangle", 0.017 * lift); });   // 패드 + 따뜻한 디튠
      note(ch[0] / 2, d * 1.05, "sine", 0.075);                                                                   // 베이스(한 옥타브 아래)
      note(ch[ch.length - 1] * 2, d * 1.05, "sine", 0.014 + 0.02 * build);                                        // 상단 은은한 반짝임(후반부에 살짝 차오름)
      if (spec.melody) { const mi = idx * 2, m1 = spec.melody[mi % 16], m2 = spec.melody[(mi + 1) % 16];          // 스텝당 리드 2음
        note(m1, d * 0.46, "triangle", 0.05 * lift, d * 0.04); note(m2, d * 0.44, "triangle", 0.045 * lift, d * 0.5);
        if (half2 && spec.harmony) { const h1 = spec.harmony[mi % 16], h2 = spec.harmony[(mi + 1) % 16];          // 후반부: 3도 아래 하모니로 풍성하게(웅장 요소는 제거)
          note(h1, d * 0.46, "triangle", 0.012 + 0.03 * build, d * 0.04); note(h2, d * 0.44, "triangle", 0.012 + 0.028 * build, d * 0.5); } } }
    step++;
  };
  tick(); const timer = setInterval(tick, spec.stepMs); AUDIO.bgmSynth = { timer, gain: g, name };
}
function amb(name, force) {   // 환경음 전환 (src 없으면 조용히 대기) — 배경음악과 별도 레이어
  AUDIO.ambName = name; if (!audioSupported()) return; const def = AMB[name];
  if (!AUDIO.ambOn || !def || !def.src) { ambStop(); return; }
  if (AUDIO.ambEl && AUDIO._ambSrc === def.src && !force && !AUDIO.ambEl.paused) return;
  ambStop();
  try { const el = new Audio(def.src); el.loop = def.loop !== false; el.volume = _clamp01(AUDIO.ambVol * (def.vol != null ? def.vol : 1));
    el.play().catch(() => {}); AUDIO.ambEl = el; AUDIO._ambSrc = def.src; } catch (e) {}
}
function ambStop() { if (AUDIO.ambEl) { try { AUDIO.ambEl.pause(); } catch (e) {} AUDIO.ambEl = null; AUDIO._ambSrc = null; } }

/* 설정 훅 (설정 화면/모달에서 사용) */
function sfxSetOn(b) { AUDIO.on = !!b; try { localStorage.setItem("nt_sfx", b ? "on" : "off"); } catch (e) {} if (b) sfx("click"); }
function sfxSetVol(v) { AUDIO.vol = _clamp01(v); if (AUDIO.master) AUDIO.master.gain.value = AUDIO.vol; try { localStorage.setItem("nt_vol", String(AUDIO.vol)); } catch (e) {} }
function bgmSetOn(b) { AUDIO.bgmOn = !!b; try { localStorage.setItem("nt_bgm", b ? "on" : "off"); } catch (e) {} if (b) bgm(AUDIO.bgmName || "town", true); else bgmStop(); }
function bgmSetVol(v) { AUDIO.bgmVol = _clamp01(v); try { localStorage.setItem("nt_bgmvol", String(AUDIO.bgmVol)); } catch (e) {}
  if (AUDIO.bgmEl && AUDIO.bgmName && BGM[AUDIO.bgmName]) { const def = BGM[AUDIO.bgmName]; AUDIO.bgmEl.volume = _clamp01(AUDIO.bgmVol * (def.vol != null ? def.vol : 1)); }
  if (AUDIO.bgmSynth) { try { AUDIO.bgmSynth.gain.gain.value = _clamp01(AUDIO.bgmVol); } catch (e) {} } }
function ambSetOn(b) { AUDIO.ambOn = !!b; try { localStorage.setItem("nt_amb", b ? "on" : "off"); } catch (e) {} if (b) amb(AUDIO.ambName || "town", true); else ambStop(); }
function ambSetVol(v) { AUDIO.ambVol = _clamp01(v); try { localStorage.setItem("nt_ambvol", String(AUDIO.ambVol)); } catch (e) {} if (AUDIO.ambEl && AUDIO.ambName && AMB[AUDIO.ambName]) { const def = AMB[AUDIO.ambName]; AUDIO.ambEl.volume = _clamp01(AUDIO.ambVol * (def.vol != null ? def.vol : 1)); } }
