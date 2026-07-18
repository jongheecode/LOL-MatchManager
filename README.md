# PENTABALANCE

리그 오브 레전드 5:5 내전을 위한 실시간 Riot API 기반 팀 밸런스 매칭 웹앱.

## 구조

```
/                   프론트엔드 (React + Vite + TypeScript)
  src/
    types.ts        공유 타입 (Player, Slot, Teams, ...)
    lib/
      tier.ts        점수 <-> 티어 표시 변환
      positions.ts    포지션 메타데이터
      balance.ts      스네이크 드래프트 + 포지션 배정 + 로지스틱 승률 계산
      api.ts          백엔드 호출 (lookup, analyze NDJSON 스트림)
      storage.ts       localStorage 기반 "저장된 플레이어" 목록
      avatar.ts        아바타/챔피언 아이콘 CDN 유틸
    hooks/useSlots.ts  10슬롯 입력 상태 관리
    components/        재사용 UI 컴포넌트
    screens/            입력 / 분석중 / 결과 3개 화면
    App.tsx             화면 전환 + 팀 빌드 + 드래그앤드롭 + 분석 스트림 오케스트레이션
server/              백엔드 (Express) — Riot API 프록시
  src/
    riot.ts           Riot API 호출 래퍼 (fetch + 캐시 + 큐)
    queue.ts           레이트리밋 큐 (20req/1s, 100req/2min 준수)
    cache.ts            TTL 인메모리 캐시 (매치 상세는 사실상 영구 캐시)
    ddragon.ts          Data Dragon 버전/챔피언 한글명 캐시
    profile.ts           Riot ID -> Player 프로필 집계 로직
    index.ts             라우트: /api/meta, /api/lookup, /api/analyze
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

### 분석 중 화면
- `POST /api/analyze` 가 NDJSON 스트림으로 플레이어별 진행 상황(단계 텍스트 포함)을 실시간 전송
- 순차 체크리스트 + 전체 진행률 바 + 현재 처리 중 텍스트
- 특정 플레이어 조회가 실패해도(레이트리밋 등) 입력 화면에서 이미 확인된 정보로 폴백하여 전체 흐름이 멈추지 않음

### 결과 화면
- 블루/레드 팀, 로지스틱 함수 기반 예상 승률 게이지
- 포지션순 카드, 드래그 앤 드롭으로 팀 간 스왑 → 승률 실시간 재계산
- 접히는 "팀 밸런스 근거 요약" 패널 (평균 MMR, 포지션 커버리지, 최근 폼 비교)
- 다시 짜기(다른 조합) / 결과 복사(디스코드용 텍스트) / 처음으로

### 사용한 Riot API
- **Account-V1**: Riot ID -> PUUID
- **Summoner-V4**: 프로필 아이콘
- **League-V4**: 솔로랭크 티어/디비전/LP -> MMR 환산 점수
- **Match-V5**: 최근 20경기(입력 화면 미리보기는 10경기) 승률, 주 포지션 추정, 최근 폼(상승/유지/하락), 주 포지션에서 실제로 플레이한 챔피언 통계
- **Champion-Mastery-V4** *(보너스)*: 숙련도 TOP3 챔피언 — 최근 전적이 적을 때 시그니처 챔피언 아이콘을 보완
- **Spectator-V5** *(보너스)*: 현재 게임 진행 여부를 감지해 슬롯/카드에 `● LIVE` 배지 표시
- **Data Dragon**: 챔피언 한글명, 챔피언/프로필 아이콘 이미지

### 레이트리밋 대응
Personal key 제한(20req/1s, 100req/2min)을 넘지 않도록 서버에 단일 큐를 두어 모든 Riot 호출을 직렬화하고,
429 응답 시 `Retry-After` 헤더를 존중해 재시도합니다. 계정/티어/매치 상세는 TTL 캐시로 재조회를 최소화합니다
(매치 상세는 불변 데이터이므로 24시간 캐시).

## 빌드

```
npm run build
npm --prefix server run build
```
