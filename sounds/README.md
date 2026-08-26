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

## 배경음악(BGM) 교체 예시
```js
const BGM = {
  town:   { src: "sounds/bgm-town.mp3",   vol: 0.35, loop: true },
  combat: { src: "sounds/bgm-combat.mp3", vol: 0.40, loop: true },
};
```

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
