# PENTABALANCE

리그 오브 레전드 5:5 내전을 위한 실시간 Riot API 기반 팀 밸런스 매칭 웹앱.

**배포 사이트**: https://pentabalance.onrender.com

## 스크린샷

| 입력 | 매칭 결과 |
|---|---|
| ![입력 화면](docs/screenshots/input-filled.png) | ![결과 화면](docs/screenshots/result.png) |

| 게임 시뮬레이션 (진행 중) | 게임 시뮬레이션 (종료) |
|---|---|
| ![게임 진행 중](docs/screenshots/game-live.png) | ![게임 종료](docs/screenshots/game-final.png) |

## 구조

```
/                   프론트엔드 (React + Vite + TypeScript)
  src/
    types.ts          공유 타입 (Player, Slot, Teams, GameResult, ...)
    lib/
      tier.ts          점수 <-> 티어 표시 변환
      positions.ts      포지션 메타데이터
      balance.ts        스네이크 드래프트 + 포지션 배정 + 로지스틱 승률 계산
      gameSim.ts         킬 이벤트 기반 게임 시뮬레이터 (실제 평균 스탯 기반)
      api.ts             백엔드 호출 (lookup, analyze NDJSON 스트림, roster, champions)
      storage.ts          localStorage 기반 "저장된 플레이어" 목록
      avatar.ts           아바타/챔피언 아이콘 CDN 유틸
    hooks/useSlots.ts   10슬롯 입력 상태 관리
    components/         재사용 UI 컴포넌트 (ResultCard, ChampionPicker, BalanceSummary, ...)
    screens/             입력 / 분석중 / 결과 / 게임 시뮬레이션 4개 화면
    App.tsx              화면 전환 + 팀 빌드 + 드래그앤드롭 + 분석 스트림 오케스트레이션
server/              백엔드 (Express) — Riot API 프록시
  src/
    riot.ts           Riot API 호출 래퍼 (fetch + 캐시 + 큐 + 타임아웃)
    queue.ts            레이트리밋 큐 (high/low 우선순위 2단계, 20req/1s·100req/2min 준수)
    cache.ts             TTL 인메모리 캐시 (매치 상세는 사실상 영구 캐시)
    ddragon.ts            Data Dragon 버전/챔피언 한글명 캐시
    profile.ts             Riot ID -> Player 프로필 집계 로직 (라인별 챔피언 통계, 평균 KDA 등)
    roster.ts               고정 멤버 목록 (서버 공유 로스터)
    index.ts                라우트: /api/meta, /api/champions, /api/roster, /api/lookup, /api/analyze
```

## 실행 방법

### 1. Riot API 키 발급

https://developer.riotgames.com 에서 Riot 계정으로 로그인 후 **Personal API Key**를 발급받으세요.
Personal key는 실제 라이브 데이터를 그대로 가져오지만 **24시간마다 만료**되므로 매일 재발급이 필요합니다.

```
cd server
cp .env.example .env
# .env 를 열어 RIOT_API_KEY=RGAPI-... 를 방금 발급받은 키로 교체
```

### 2. 의존성 설치

```
npm run install:all
```

### 3. 개발 서버 실행 (프론트 + 백엔드 동시 실행)

```
npm run dev:all
```

- 프론트엔드: http://localhost:5173
- 백엔드: http://localhost:8787 (Vite가 `/api`를 자동 프록시)

## 기능

### 입력 화면
- Riot ID(`닉네임#태그`) 10슬롯, blur/Enter 시 실제 Riot API로 조회
- 슬롯 상태 4종: 빈 / 로딩 / 완료(티어·MMR·포지션 표시) / 에러(존재하지 않는 소환사)
- 슬롯별 포지션 선호 토글
- 조회에 성공한 플레이어는 localStorage에 자동 저장되어 "저장된 플레이어" 사이드바에 누적, 다음 내전에 재사용 가능
- 서버에 고정 등록된 "공용 로스터"(`server/src/roster.ts`) 멤버는 누가 접속하든 자동으로 목록에 떠서 바로 채우기 가능

### 분석 중 화면
- `POST /api/analyze` 가 NDJSON 스트림으로 플레이어별 진행 상황(단계 텍스트 포함)을 실시간 전송
- 순차 체크리스트 + 전체 진행률 바 + 현재 처리 중 텍스트
- 특정 플레이어 조회가 실패해도(레이트리밋 등) 입력 화면에서 이미 확인된 정보로 폴백하여 전체 흐름이 멈추지 않음

### 매칭 결과 화면
- 블루/레드 팀, 로지스틱 함수 기반 예상 승률 게이지 + 근거 분해(MMR만/폼만/KDA만 반영했을 때 각각 몇 %인지)
- 포지션순 카드, 드래그 앤 드롭으로 팀 간 스왑 → 승률 실시간 재계산
- 카드 위 챔피언 아이콘을 클릭해 이번 판 픽 지정 (실전 승률 반영) — 옆의 "+" 버튼으로 전체 챔피언 검색도 가능
- 접히는 "팀 밸런스 근거 요약" 패널: 자연어 요약 문장 + 라인별(TOP/JG/MID/AD/SUP) 블루-레드 매치업 바 비교
- 라인 실전 데이터가 없는 부포지션 선수는 MMR 영향력을 낮춰서 승률에 반영 (전체 평균 쪽으로 보정)
- 다시 짜기 / 결과 복사(디스코드용 텍스트) / 게임 시작 / 처음으로

### 게임 시뮬레이션 화면 (재미 기능)
- "게임 시작" 클릭 시 계산된 승률과 각 선수의 **실제 평균 스탯**(킬/데스/어시스트/CS/골드/데미지)을 기반으로 가상 매치를 생성
- 실시간 킬 스코어 헤더, 타임라인(마커+플레이헤드), 멀티킬 라벨(더블/트리플/쿼드라/펜타 킬)이 순차 공개되는 킬 피드
- 승리 배너 애니메이션 → MVP·데미지바가 있는 팀별 스코어보드 순서로 공개
- 라인 실전 데이터가 아예 없는 선수는 "게임 시작" 시 챔피언 직접 선택을 요구 (엉뚱한 챔피언으로 조용히 시뮬레이션하지 않음)
- 실제 킬 이벤트에서 K/D/A가 파생되므로 블루 팀 총 킬 = 레드 팀 총 데스가 항상 일치

### 사용한 Riot API
- **Account-V1**: Riot ID -> PUUID
- **Summoner-V4**: 프로필 아이콘
- **League-V4**: 솔로랭크 티어/디비전/LP -> MMR 환산 점수
- **Match-V5**: 최근 20경기(입력 화면 미리보기는 10경기) 승률, 주 포지션 추정, 최근 폼(상승/유지/하락), 라인별 챔피언 통계, 실제 평균 K/D/A·CS·골드·데미지
- **Champion-Mastery-V4** *(보너스)*: 숙련도 TOP3 챔피언 — 최근 전적이 적을 때 시그니처 챔피언 아이콘을 보완
- **Spectator-V5** *(보너스)*: 현재 게임 진행 여부를 감지해 슬롯/카드에 `● LIVE` 배지 표시
- **Data Dragon**: 챔피언 한글명, 챔피언/프로필 아이콘 이미지, 전체 챔피언 목록(픽 검색용)

### 승률 계산 방식
AI/LLM 호출 없이 순수 알고리즘(로지스틱 함수)으로 계산합니다. 각 팀의 (1) MMR 합, (2) 최근 폼(승률) 합,
(3) 평균 KDA 합의 격차를 구해 `1/(1+e^(-diff/650))` 시그모이드에 넣어 확률로 변환하고, MMR을 가장 크게,
폼·KDA는 보조 지표로 반영합니다(`src/lib/balance.ts`의 `rates()`). 선수가 실전 데이터 없는 라인에
배정되면(부포지션 오프라인) 그 선수의 MMR 영향력을 낮춰서, 안 하는 라인의 랭크가 그대로 승률을 흔들지
않도록 보정합니다.

### 레이트리밋 대응
Personal key 제한(20req/1s, 100req/2min)을 넘지 않도록 서버에 우선순위 2단계(high/low) 큐를 두어 모든
Riot 호출을 직렬화합니다. 사용자의 실시간 조회(lookup/analyze)는 항상 `high` 우선순위로 즉시 처리되고,
공용 로스터 워밍업 같은 배경 작업은 `low` 우선순위로 항상 여유분을 남기고 진행되어 실사용자 요청을
가로막지 않습니다. 429 응답은 `Retry-After` 헤더를 존중해 재시도하고, 요청마다 12초 타임아웃을 둬서
네트워크 요청 하나가 멈춰도 큐 전체가 막히지 않게 합니다. 계정/티어/매치 상세는 TTL 캐시로 재조회를
최소화합니다(매치 상세는 불변 데이터이므로 24시간 캐시). 공용 로스터처럼 수백 번의 호출이 필요한
작업은 절대 HTTP 요청 안에서 기다리지 않고 항상 백그라운드에서만 진행합니다(배포 환경의 게이트웨이
타임아웃보다 오래 걸릴 수 있기 때문).

## 배포
Render 무료 플랜에 `render.yaml` 블루프린트로 배포되어 있습니다. GitHub `main` 브랜치에 push할 때마다
자동으로 재배포됩니다. `RIOT_API_KEY`는 24시간마다 만료되므로, 매일 Render 대시보드 → 서비스 →
Environment 탭에서 값을 갱신해야 합니다.

## 빌드

```
npm run build
npm --prefix server run build
```
