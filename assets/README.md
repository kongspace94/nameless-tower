# 리소스(이미지) 교체 안내

이 폴더의 PNG는 **더미(placeholder)** 입니다. 게임 코드는 아래 **파일 이름**을 그대로 불러오므로,
**같은 경로 · 같은 파일 이름**으로 진짜 그림만 덮어쓰면 코드 수정 없이 바로 반영됩니다.

- 권장 크기: 정사각형 (예: 128×128 또는 256×256), 배경 투명 PNG 추천
- 파일이 없거나 깨져도 게임은 **이모지로 자동 대체**되어 절대 안 깨집니다.
- 이름/이모지 매핑은 `index.html`의 `IX = { ... }` 부분에 있습니다. 새 이미지를 추가하고 싶으면 여기에 한 줄 추가.

## 파일 목록

### enemies/ (몬스터)
| 파일 | 대상 | 대체 이모지 |
|---|---|---|
| bat.png | 동굴 박쥐 | 🦇 |
| skeleton.png | 뼈 병사 | 💀 |
| slime.png | 이끼 슬라임 | 🟢 |
| spider.png | 탑지기 거미 | 🕷️ |
| cursed_knight.png | 저주받은 기사 | 🛡️ |
| ghoul.png | 굶주린 구울 | 🧟 |
| fire_spirit.png | 화염 정령 | 🔥 |
| gorgon.png | 석화의 고르곤 | 🐍 |
| boss_golem.png | (보스) 탑의 문지기·골렘 | 🗿 |
| boss_countess.png | (보스) 핏빛 여백작 | 🧛 |
| boss_tentacle.png | (보스) 심연의 촉수 | 🐙 |

### items/ (유물·아이템)
| 파일 | 대상 | 대체 이모지 |
|---|---|---|
| dagger.png | 녹슨 단검 | 🗡️ |
| longsword.png | 이 빠진 롱소드 | ⚔️ |
| moon_saber.png | 월광 세이버 | 🌙 |
| leather_armor.png | 가죽 갑옷 | 🥋 |
| plate_armor.png | 판금 흉갑 | 🛡️ |
| rabbit_foot.png | 토끼발 부적 | 🐰 |
| vampire_ring.png | 흡혈의 반지 | 💍 |
| nameless_key.png | 이름 없는 열쇠 | 🗝️ |
| potion.png | 물약 | 🧪 |
| gold.png | 금화 | 🪙 |

### companions/ (서포트 동료 요정)
| 파일 | 대상 | 대체 이모지 |
|---|---|---|
| fairy_light.png | 빛의 요정 (힐러) | 🧚 |
| fairy_imp.png | 불꽃 임프 (딜러) | 🔥 |
| fairy_steel.png | 강철 정령 (탱커) | 🛡️ |

### ui/
| 파일 | 대상 | 대체 이모지 |
|---|---|---|
| player.png | 플레이어 초상 | 🧝 |

## 팁
- 그림을 다 바꾸면 브라우저 새로고침(F5). 캐시 때문에 안 바뀌면 Ctrl+F5(강력 새로고침).
