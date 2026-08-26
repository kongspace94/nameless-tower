# 🔊 사운드 교체 가이드

지금은 **파일 없이 합성음(placeholder)** 으로 소리가 납니다.
실제 사운드로 바꾸려면 이 폴더(`sounds/`)에 파일을 넣고 **`js/audio.js`** 상단의
`SFX` / `BGM` 항목에 **`src` 경로만** 적으면 됩니다. (파일이 없거나 로드 실패하면 자동으로 합성음으로 폴백)

## 효과음(SFX) 교체 예시
`js/audio.js`에서:
```js
const SFX = {
  click:  { src: "sounds/click.mp3", gain: 0.5 },   // ← src 추가하면 이 파일 사용
  attack: { src: "sounds/attack.mp3", gain: 0.6 },
  crit:   { src: "sounds/crit.wav" },
  ...
};
```

> 🎼 **지금은 임시 합성 배경음악**이 재생돼요 (마을=잔잔한 단조 패드, 전투=긴박한 베이스). `js/audio.js`의 `BGM_SYNTH`에서 조정 가능. **아래처럼 `src`에 파일을 넣으면 합성음 대신 그 파일이 재생**돼요.

## 배경음악(BGM) 교체 예시
```js
const BGM = {
  town:   { src: "sounds/bgm-town.mp3",   vol: 0.6, loop: true },
  combat: { src: "sounds/bgm-combat.mp3", vol: 0.7, loop: true },
};
```

## 환경음(Ambient) 교체 예시 — 배경음악과 별도 레이어(바람·마을 소음 등)
```js
const AMB = {
  town:   { src: "sounds/amb-town.mp3",  vol: 0.6, loop: true },
  tower:  { src: "sounds/amb-tower.mp3", vol: 0.6, loop: true },
};
```
> 배경음악 / 효과음 / 환경음은 게임 내 **⚙ 설정**(마을 하단)에서 각각 켜기·끄기·음량 조절돼요. `vol`은 트랙별 기본 볼륨이고, 최종 음량 = `vol × 설정 슬라이더`.

## 이벤트 목록 (소리가 울리는 순간)
| 이름 | 언제 |
|---|---|
| `click` | 메뉴 버튼 클릭 |
| `attack` | 적을 타격 |
| `crit` | 치명타 |
| `hurt` | 플레이어가 피해를 입음 |
| `encounter` | 적 등장(전투 시작) |
| `loot` | 아이템·골드 획득 |
| `heal` | 체력 회복 |
| `victory` | 적 처치 |
| `defeat` | 사망 |
| `town`(BGM) | 마을 |
| `combat`(BGM) | 전투 |

## 포맷 팁
- **mp3 / ogg / wav / m4a** 모두 가능 (브라우저 호환은 mp3가 무난)
- 효과음은 짧게(0.1~0.5초), 배경음악은 loop 되게 자연스러운 구간으로
- 볼륨·음소거는 게임 내 **설정** 화면에서 조절
```
```
새 효과음 이름을 추가하고 싶으면 `SFX`에 항목을 넣고, 코드에서 `sfx("이름")`으로 호출하면 됩니다.
