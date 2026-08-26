# 🌐 이름 없는 탑 — 온라인 배포 가이드

서버 **하나만** 클라우드에 올리면 그 URL로 **게임 + 계정 + 클라우드 세이브 + 실시간 채팅 + 경매장**이 전부 동작합니다.
친구에게 URL만 주면 접속해서 플레이·피드백 가능. (클라이언트는 서버와 같은 주소에 자동 연결 — 설정 불필요)

---

## ✅ 로컬에서 먼저 확인
```bash
cd D:/text-rpg
node server/server.js      # http://localhost:8787 접속 → 게임 + 온라인 전부 동작
```
창을 두 개 열어 다른 계정으로 로그인하면 채팅이 실시간으로 오가는 걸 볼 수 있습니다.

---

## 🚀 방법 A — Render (추천 · 무료 · GitHub 연결)

1. **GitHub에 코드 올리기** (D:/text-rpg 폴더에서)
   ```bash
   git init
   git add .
   git commit -m "이름 없는 탑 온라인"
   ```
   → GitHub에서 새 저장소(Repository) 만들고, 안내대로 `git remote add origin ...` + `git push -u origin main`

2. **Render 배포**
   - https://render.com 가입 → **New +** → **Blueprint** 선택
   - 방금 만든 GitHub 저장소 연결 → `render.yaml`을 자동 인식 → **Apply**
   - (Blueprint 대신 수동: New Web Service → Node → Build `echo no-deps` / Start `node server/server.js`)

3. 몇 분 뒤 **`https://nameless-tower-xxxx.onrender.com`** 같은 공개 URL이 나옵니다.
   → 이 주소를 친구에게 공유! 접속 → **🌐 온라인 플레이** → 가입 → 플레이.

> ⚠ **무료 플랜 주의:** ①15분 비활동 후 슬립(첫 접속 ~30초 대기) ②디스크가 재배포/재시작 시 초기화 → **계정·세이브가 가끔 리셋**될 수 있음.
> 세이브를 영속시키려면 `render.yaml`의 `disk:` 블록 주석 해제(유료 디스크, 월 소액) 후 재배포.

---

## 🚂 방법 B — Railway (GitHub 없이 CLI로)

```bash
npm i -g @railway/cli
railway login
cd D:/text-rpg
railway init          # 프로젝트 생성
railway up            # 현재 폴더 배포
railway domain        # 공개 URL 발급
```
- Railway는 **볼륨(Volume)**을 붙이면 세이브가 영속됩니다. 대시보드에서 볼륨을 `/data`에 마운트하고, 변수 `DATA_DIR=/data` 추가.

---

## 💾 데이터 영구 저장 — MongoDB Atlas (무료)

Render 무료 플랜은 디스크가 임시라 **재배포할 때마다 계정·세이브가 초기화**됩니다.
MongoDB Atlas(무료 512MB)에 연결하면 **재배포해도 데이터가 영구 유지**됩니다.
(코드는 이미 대응됨 — `MONGODB_URI` 환경변수만 넣으면 자동으로 Mongo 사용, 없으면 로컬 파일)

### 1) Atlas 무료 클러스터 만들기
1. https://www.mongodb.com/cloud/atlas 가입 → **Create** → **M0 (Free)** 선택 → 리전 아무거나 → Create
2. **Database Access** → **Add New Database User** → 사용자명/비밀번호 정하기 (기억해둘 것)
3. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) 추가
   - (Render 서버 IP가 고정이 아니라서 전체 허용이 편함)

### 2) 연결 문자열(Connection String) 받기
- **Database** → 클러스터의 **Connect** → **Drivers** → Node.js 선택
- 나오는 문자열 복사: `mongodb+srv://<사용자>:<비밀번호>@cluster0.xxxxx.mongodb.net/?...`
- `<비밀번호>` 부분을 실제 비밀번호로 바꾸기

### 3) Render에 연결 문자열 넣기
- Render 대시보드 → 서비스 → **Environment** → **Add Environment Variable**
- Key: `MONGODB_URI` / Value: 위 연결 문자열 붙여넣기 → **Save** (자동 재배포됨)
- 배포 로그에 `💾 MongoDB Atlas 연결됨` 이 뜨면 성공! 이제 재배포해도 데이터 안 날아감.

> 로컬에서 Mongo로 테스트하려면: `MONGODB_URI="..." node server/server.js` (Windows PowerShell은 `$env:MONGODB_URI="..."; node server/server.js`)

## 🔧 참고
- 서버는 **무의존성**(npm 패키지 0개) — 빌드가 사실상 없음, 배포가 빠릅니다.
- 포트는 호스트가 주는 `PORT` 환경변수를 자동 사용.
- 데이터 저장 위치는 `DATA_DIR` 환경변수로 변경 가능(클라우드 볼륨용).
- 단일 HTML 파일(`text-rpg-standalone.html`)은 **오프라인 배포용** — 온라인이 필요 없을 때 그냥 더블클릭.
- 보안: 현재는 취미 규모(평문 HTTP는 호스트가 HTTPS로 감쌈, 토큰은 인메모리). 규모 커지면 레이트리밋·해시 강화 권장.
