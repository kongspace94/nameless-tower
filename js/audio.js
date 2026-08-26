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

/* ── 엔진 (아래는 손댈 필요 없음) ── */
function audioSupported() { return typeof window !== "undefined" && (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined"); }
function audioInit() {
  if (!audioSupported() || AUDIO.ctx) return AUDIO.ctx;
  try { const AC = window.AudioContext || window.webkitAudioContext; AUDIO.ctx = new AC();
    AUDIO.master = AUDIO.ctx.createGain(); AUDIO.master.gain.value = AUDIO.vol; AUDIO.master.connect(AUDIO.ctx.destination);
  } catch (e) { AUDIO.ctx = null; }
  return AUDIO.ctx;
}
function audioUnlock() {   // 첫 사용자 제스처에 호출 → 오디오 활성화 + 대기 중이던 BGM/환경음 재생
  if (AUDIO._unlocked) return; AUDIO._unlocked = true; audioInit();
  try { if (AUDIO.ctx && AUDIO.ctx.state === "suspended") AUDIO.ctx.resume(); } catch (e) {}
  if (AUDIO.bgmName) bgm(AUDIO.bgmName, true);
  if (AUDIO.ambName) amb(AUDIO.ambName, true);
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
function bgm(name, force) {   // 배경음악 전환 (src 없으면 조용히 대기)
  AUDIO.bgmName = name; if (!audioSupported()) return; const def = BGM[name];
  if (!AUDIO.bgmOn || !def || !def.src) { bgmStop(); return; }
  if (AUDIO.bgmEl && AUDIO._bgmSrc === def.src && !force && !AUDIO.bgmEl.paused) return;
  bgmStop();
  try { const el = new Audio(def.src); el.loop = def.loop !== false; el.volume = _clamp01(AUDIO.bgmVol * (def.vol != null ? def.vol : 1));
    el.play().catch(() => {}); AUDIO.bgmEl = el; AUDIO._bgmSrc = def.src; } catch (e) {}
}
function bgmStop() { if (AUDIO.bgmEl) { try { AUDIO.bgmEl.pause(); } catch (e) {} AUDIO.bgmEl = null; AUDIO._bgmSrc = null; } }
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
function bgmSetVol(v) { AUDIO.bgmVol = _clamp01(v); try { localStorage.setItem("nt_bgmvol", String(AUDIO.bgmVol)); } catch (e) {} if (AUDIO.bgmEl && AUDIO.bgmName && BGM[AUDIO.bgmName]) { const def = BGM[AUDIO.bgmName]; AUDIO.bgmEl.volume = _clamp01(AUDIO.bgmVol * (def.vol != null ? def.vol : 1)); } }
function ambSetOn(b) { AUDIO.ambOn = !!b; try { localStorage.setItem("nt_amb", b ? "on" : "off"); } catch (e) {} if (b) amb(AUDIO.ambName || "town", true); else ambStop(); }
function ambSetVol(v) { AUDIO.ambVol = _clamp01(v); try { localStorage.setItem("nt_ambvol", String(AUDIO.ambVol)); } catch (e) {} if (AUDIO.ambEl && AUDIO.ambName && AMB[AUDIO.ambName]) { const def = AMB[AUDIO.ambName]; AUDIO.ambEl.volume = _clamp01(AUDIO.ambVol * (def.vol != null ? def.vol : 1)); } }
