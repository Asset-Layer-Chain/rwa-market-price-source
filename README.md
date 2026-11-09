# Market Data Server

여러 거래소/시세 제공처(Binance, Gate.io, Biquote)에서 가격을 주기적으로 수집해 **메모리에 보관**하고, REST API로 조회할 수 있게 해 주는 Node.js 서버입니다.
함께 들어 있는 React 프론트엔드(`frontend/`)로 수집된 가격을 실시간으로 확인할 수 있습니다.

> 이 서버는 Oracle 서버가 준비되기 전까지 **수집된 데이터를 확인하는 용도로 API를 열어 둔 임시 구성**입니다. ([src/server.js:1](src/server.js#L1) 참고)

---

## 1. 실행 전에 꼭 확인할 것

| 항목 | 내용 |
| --- | --- |
| **Node.js** | 18.11 이상 필요(`node --watch`, 내장 `fetch`, `AbortSignal.timeout` 사용). **20 LTS 이상 권장**. 현재 개발 환경은 v24입니다. |
| **PostgreSQL** | 11 이상(`EXECUTE FUNCTION` 트리거 문법 사용). Biquote 종목 목록을 DB에서 읽고, 종목 변경 알림에 `LISTEN/NOTIFY`를 씁니다. |
| **`.env` 파일** | Git에 올라가지 않습니다. `.env.example`을 복사해서 만드세요. (→ [4. 환경 변수](#4-환경-변수)) |
| **DB 테이블** | `sql/` 폴더의 SQL 2개를 **번호 순서대로** 먼저 실행해야 합니다. |
| **포트** | 백엔드 `3002`, 프론트 `5173`. 프론트는 `strictPort: true`라서 5173이 이미 사용 중이면 **다른 포트로 바꾸지 않고 실행이 실패**합니다. |
| **외부 네트워크** | `api.binance.com`, `api.gateio.ws`, `biquote.io`에 접근할 수 있어야 합니다. Binance는 지역(예: 미국 IP)에 따라 차단될 수 있습니다. |

---

## 2. 실행 방법

### 2-1. 데이터베이스 준비 (최초 1회)

```bash
# 사용자와 DB 생성 (이름은 .env 값과 맞추세요)
createuser market_user --pwprompt
createdb market_db -O market_user

# 테이블 생성 + 기본 종목 12개 입력
psql -h localhost -U market_user -d market_db -f sql/001_create_biquote_markets.sql

# 종목 변경 시 NOTIFY를 보내는 트리거 생성
psql -h localhost -U market_user -d market_db -f sql/002_biquote_markets_notify.sql
```

두 SQL 모두 `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `CREATE OR REPLACE` 형태라 다시 실행해도 안전합니다.

### 2-2. 백엔드 실행

```bash
# 프로젝트 루트(market-data-server/)에서
cp .env.example .env        # 그리고 DB_PASSWORD 등 실제 값 입력
npm install
npm run dev                 # 파일 변경 시 자동 재시작 (node --watch)
# 또는
npm start                   # 일반 실행
```

정상 실행 시 로그:

```
Market Data Server running on http://localhost:3002
[SSE] PostgreSQL 종목 변경 감지 시작
[BINANCE] received=xxxx valid=xxxx
[GATE] received=xxxx valid=xxxx
[BIQUOTE] valid=xx
```

확인: `curl http://localhost:3002/health` → `{"status":"OK"}`

### 2-3. 프론트엔드 실행 (터미널을 하나 더 열어서)

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 <http://localhost:5173> 접속.

- Vite 개발 서버가 `/prices`, `/api`, `/health` 요청을 `localhost:3002`로 **프록시**하므로 CORS 설정이 필요 없습니다. ([frontend/vite.config.js](frontend/vite.config.js))
- 백엔드가 꺼져 있어도 프론트는 뜨고, 상단에 빨간 오류 문구가 표시됩니다.
- 정적 빌드: `npm run build` → `frontend/dist/` 생성. 단, 빌드 결과물에는 프록시가 없으므로 실제 배포 시에는 같은 도메인에서 API를 서빙하거나 백엔드에 CORS를 추가해야 합니다.

---

## 3. 화면 구성

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MARKET DATA                                         ● 가격 자동 갱신 중  │
│ 실시간 거래소 가격 모니터 v1.1                        마지막 확인 10:12:03 │
│ 거래소별 종목과 마지막 수집 가격을 확인합니다.                           │
├──────────────────────────────────────────────────────────────────────────┤
│ (백엔드 연결 실패 시에만) 빨간 오류 박스                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ 종목 검색 [ BTCUSDT, XAUUSD ...      ]       1초 간격으로 서버의 최신 가격 확인 │
├────────────────────────┬────────────────────────┬────────────────────────┤
│ [BN] Binance  2,xxx종목 │ [GT] Gate.io  2,xxx종목 │ [BQ] Biquote    10종목 │
│ 종목            가격    │ 종목            가격    │ 종목            가격    │
│ BTCUSDT   67,123.45     │ BTCUSDT   67,120.1      │ XAGUSD       31.25      │
│ ETHUSDT    3,456.78     │ ...                    │ XAUUSD    2,650.12      │
│ ... (스크롤)            │                        │ ...                    │
└────────────────────────┴────────────────────────┴────────────────────────┘
  가격은 백엔드 /prices 응답 기준입니다. ...
```

| 영역 | 설명 |
| --- | --- |
| 상태 표시 | 초록 점 = 정상, 빨간 점 = 백엔드 연결 실패. 마지막으로 `/prices`를 성공적으로 받은 시각 표시 |
| 종목 검색 | `symbol`, `asset`, `quote`에 대해 대소문자 무시 부분 일치. 세 패널에 동시에 적용 |
| 거래소 패널 3개 | 소스별로 묶어 **심볼 알파벳순** 정렬. 각 패널은 독립 스크롤 |
| 가격 표기 | 값 크기에 따라 소수점 자릿수 자동 조정(0.0001 미만 12자리 … 10 이상 4자리). 마우스를 올리면 원본 숫자 표시 |
| 반응형 | 화면 폭 750px 이하에서는 패널이 세로 1열로 배치 |

**갱신 방식**

- `/prices`를 **1초마다 폴링**합니다(탭이 백그라운드면 멈추고, 다시 보이면 즉시 갱신). 단, 백엔드가 실제로 거래소에서 가져오는 주기는 기본 **5초**이므로 화면의 숫자도 실질적으로 5초마다 바뀝니다.
- Biquote 패널은 `/api/markets`에서 `enabled=true`인 종목만 보여 줍니다. 종목이 바뀌면 SSE(`/api/markets/events`)로 알림을 받아 **새로고침 없이** 목록이 갱신됩니다.

---

## 4. 환경 변수

`.env` (루트). 예시는 [.env.example](.env.example).

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `3002` | 백엔드 포트. 바꾸면 [frontend/vite.config.js](frontend/vite.config.js)의 프록시 주소도 함께 바꿔야 합니다. |
| `BINANCE_INTERVAL_MS` | `5000` | Binance 수집 주기 |
| `GATE_INTERVAL_MS` | `5000` | Gate.io 수집 주기 |
| `BINQUOTE_INTERVAL_MS` | `5000` | Biquote 수집 주기. ⚠️ 이름이 `BIQUOTE`가 아니라 **`BINQUOTE`**(오타)입니다. 코드가 이 이름으로 읽으므로 그대로 쓰세요. |
| `CMC_INTERVAL_MS` | `180000` | CoinMarketCap 수집 주기 (현재 CMC 비활성화) |
| `CMC_API_KEY` | – | CoinMarketCap API 키 (현재 CMC 비활성화) |
| `CMC_IDS` | – | CMC 코인 ID 목록, 쉼표 구분 (현재 CMC 비활성화) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | – | PostgreSQL 접속 정보. [src/db.js](src/db.js)는 **이 값들만** 사용합니다. |
| `DATABASE_URL` | – | `.env`에 있지만 **현재 코드에서 사용하지 않습니다.** |

---

## 5. 구조와 데이터 흐름

```
 Binance API ─┐
 Gate.io API ─┼─▶ providers/ ─▶ normalizers/ ─▶ validators/ ─▶ MarketDataService (메모리 Map)
 Biquote API ─┘    (fetch)       (공통 포맷)      (유효성 필터)          │
      ▲                                                                │
      │ enabled 종목 목록                                     GET /prices ...
 PostgreSQL biquote_markets ◀── POST/PATCH /api/markets              │
      │                                                                ▼
      └─ 트리거 → NOTIFY ─▶ server.js LISTEN ─▶ SSE /api/markets/events ─▶ 프론트엔드
```

1. 서버가 뜨면 `marketDataService.start()`가 즉시 1회 수집하고 이후 `setInterval`로 반복합니다.
2. Biquote는 매 수집마다 DB의 `biquote_markets`에서 `enabled = true` 종목을 읽어 그 종목만 요청합니다. 즉 **DB만 바꾸면 다음 주기부터 수집 대상이 바뀝니다.**
3. 모든 가격은 아래 공통 포맷으로 정규화되어 `"{source}:{symbol}"` 키로 Map에 덮어쓰기 저장됩니다.

```js
{
  source: "BINANCE" | "GATE" | "BIQUOTE",
  asset: "BTC",
  quote: "USDT",
  symbol: "BTCUSDT",
  price: 67123.45,
  sourceTimestamp: null,   // Biquote만 값 있음
  fetchedAt: 1760000000000,
  // Biquote 전용: stale, quoteAgeSeconds, marketState
}
```

---

## 6. 핵심 코드 위치

### 백엔드 (`src/`)

| 파일 | 역할 |
| --- | --- |
| [src/server.js](src/server.js) | Express 앱 진입점. 가격 조회 API, 종목 관리 API, SSE, PostgreSQL `LISTEN` 설정 |
| [src/services/market-data.service.js](src/services/market-data.service.js) | **핵심**. 소스별 수집 함수, 메모리 저장소(`Map`), 조회 메서드, 수집 스케줄러(`start()`) |
| [src/providers/binance.provider.js](src/providers/binance.provider.js) | Binance `/api/v3/ticker/price` 호출 (타임아웃 5초) |
| [src/providers/gate.provider.js](src/providers/gate.provider.js) | Gate.io `/api/v4/spot/tickers` 호출 (타임아웃 5초) |
| [src/providers/biquote.provider.js](src/providers/biquote.provider.js) | DB에서 활성 종목을 읽고 `biquote.io/api/latest?symbols=...` 호출 (타임아웃 10초) |
| [src/providers/cmc.provider.js](src/providers/cmc.provider.js) | CoinMarketCap 호출 — **전체 주석 처리됨** |
| [src/normalizers/price.normalizer.js](src/normalizers/price.normalizer.js) | 소스별 응답 → 공통 포맷 변환. 심볼을 asset/quote로 분해하는 로직 포함 |
| [src/validators/price.validator.js](src/validators/price.validator.js) | 유효 가격 필터. 가격 > 0, quote 존재, Biquote는 `stale=false` 이고 `marketState="open"`일 때만 통과 |
| [src/repository/biquoteSymbolRepository.js](src/repository/biquoteSymbolRepository.js) | `biquote_markets`에서 활성 종목 조회 |
| [src/db.js](src/db.js) | `pg.Pool` 생성 |
| [src/mock/mockBiquoteDB.js](src/mock/mockBiquoteDB.js) | 기본 종목 목업 — **현재 어디서도 import하지 않음** |

### DB (`sql/`)

| 파일 | 역할 |
| --- | --- |
| [sql/001_create_biquote_markets.sql](sql/001_create_biquote_markets.sql) | `biquote_markets(symbol PK, enabled, updated_at)` 생성 + 귀금속/에너지/산업금속 12종 입력 |
| [sql/002_biquote_markets_notify.sql](sql/002_biquote_markets_notify.sql) | INSERT/DELETE/UPDATE(symbol, enabled) 시 `pg_notify('biquote_markets_changed')` 트리거 |

### 프론트엔드 (`frontend/`)

| 파일 | 역할 |
| --- | --- |
| [frontend/src/App.jsx](frontend/src/App.jsx) | 화면 전체. `SOURCES`(표시할 거래소 목록), 1초 폴링, SSE 구독, 소스별 그룹화/정렬, `PricePanel` 컴포넌트 |
| [frontend/src/style.css](frontend/src/style.css) | 스타일 (한 줄로 압축된 CSS) |
| [frontend/vite.config.js](frontend/vite.config.js) | 개발 서버 포트(5173)와 백엔드 프록시 설정 |
| [frontend/src/main.jsx](frontend/src/main.jsx) | React 루트 렌더링 |

---

## 7. API

### 가격 조회 (메모리 데이터)

| Method | 경로 | 설명 |
| --- | --- | --- |
| GET | `/health` | 헬스 체크 |
| GET | `/prices` | 전체 가격 |
| GET | `/prices/:asset` | asset 기준 (예: `/prices/btc`) |
| GET | `/prices/quote/:quote` | quote 기준 (예: `/prices/quote/usdt`) |
| GET | `/prices/source/:source` | 소스 기준 (예: `/prices/source/biquote`) |

경로 파라미터는 대소문자를 구분하지 않습니다.
⚠️ `/prices/:asset`이 `quote`, `source`를 asset으로 오인하지 않도록 [src/server.js](src/server.js)에서 **반드시 `/prices/quote`, `/prices/source` 라우트보다 아래에** 있어야 합니다.

### Biquote 종목 관리 (DB)

| Method | 경로 | Body | 설명 |
| --- | --- | --- | --- |
| GET | `/api/markets` | – | 전체 종목 `[{symbol, enabled}]` |
| POST | `/api/markets` | `{"symbol":"XAUUSD","enabled":true}` | 종목 추가. symbol은 **대문자/숫자 2~30자**만 허용(소문자는 400). 중복이면 409 |
| PATCH | `/api/markets/:symbol` | `{"enabled":false}` | 활성/비활성 전환. 값이 이미 같으면 `updated:false` |
| GET | `/api/markets/events` | – | SSE. 종목 변경 시 `markets-changed` 이벤트, 30초마다 heartbeat |

```bash
curl -X POST http://localhost:3002/api/markets -H 'Content-Type: application/json' -d '{"symbol":"XAUUSD"}'
curl -X PATCH http://localhost:3002/api/markets/XAUUSD -H 'Content-Type: application/json' -d '{"enabled":false}'
```

삭제 API는 없습니다. 삭제는 DB에서 직접 하면 되고, 트리거 덕분에 프론트에도 바로 반영됩니다.

---

## 8. 그 외에 꼭 알아야 할 것

### 동작 방식 관련

- **가격은 메모리에만 저장됩니다.** 서버를 재시작하면 모두 사라지고, 첫 수집이 끝날 때까지 `/prices`는 비어 있습니다. 여러 인스턴스를 띄우면 각자 따로 수집합니다.
- **한 번 저장된 가격은 지워지지 않습니다.** 종목을 비활성화하거나, 장이 닫히거나(`marketState ≠ open`), 데이터가 `stale`이 되어도 **마지막 유효 가격이 `/prices`에 계속 남습니다.** 프론트는 `/api/markets`의 enabled 목록으로 Biquote를 한 번 더 걸러서 보여 주지만, API를 직접 쓰는 쪽은 `fetchedAt`으로 최신성을 확인해야 합니다.
- **수집 실패는 로그만 남기고 넘어갑니다.** 한 소스가 실패해도 다른 소스와 서버는 계속 동작합니다.
- **DB가 없어도 서버는 뜹니다.** 이 경우 Binance/Gate는 정상 동작하지만 Biquote 수집, `/api/markets`, SSE 알림은 실패합니다.
- **`LISTEN` 연결은 자동 재연결되지 않습니다.** DB가 재시작되는 등 연결이 끊기면 SSE 알림이 멈추므로 서버를 재시작해야 합니다.
- API로 종목을 바꾸면 서버가 직접 알림을 보내고 DB 트리거도 알림을 보내므로 **SSE 이벤트가 2번** 갈 수 있습니다(동작에는 문제 없음). DB를 직접 수정하면 트리거 알림만 갑니다.

### 심볼 처리 규칙

- **Binance**: 심볼 끝이 `USDT, USDC, FDUSD, BTC, ETH, BNB` 중 하나인 쌍만 수집하고 나머지는 버립니다. 다른 quote를 추가하려면 [price.normalizer.js의 `BINANCE_QUOTES`](src/normalizers/price.normalizer.js#L1)를 수정하세요.
- **Gate.io**: `BTC_USDT` → `BTCUSDT`로 변환해 Binance와 같은 심볼 형식을 씁니다.
- **Biquote**: 대표 가격으로 `mid`를 사용합니다. 심볼 끝이 `USDT, USDC, USD, EUR, GBP, JPY, AUD, CAD, CHF` 중 하나여야 asset/quote로 분해됩니다.

### ⚠️ 알려진 이슈

- **`USOIL`, `UKOIL`은 화면/API에 나오지 않습니다.** 심볼에 quote 접미사가 없어서 `quote: null`이 되고, validator가 `quote`가 없는 가격을 버리기 때문입니다. 표시하려면 [splitBiquoteSymbol](src/normalizers/price.normalizer.js#L16)에서 quote를 기본값(예: `USD`)으로 두거나 validator 조건을 조정해야 합니다.
- **인증이 없습니다.** `POST`/`PATCH /api/markets`는 누구나 호출할 수 있습니다. 게다가 프론트 개발 서버가 `--host 0.0.0.0`으로 떠서 같은 네트워크의 다른 PC에서도 프록시를 거쳐 접근할 수 있습니다. 외부에 공개하지 마세요.
- `frontend/README.md`의 "압축파일 교체" 안내는 초기 배포용 문서이므로 무시하고 이 README를 기준으로 하세요.

### 비활성/미사용 코드

- **CoinMarketCap(CMC)**: provider, normalizer, service에서 모두 주석 처리되어 있습니다. 다시 켜려면 세 파일의 주석을 해제하고 `.env`에 `CMC_API_KEY`, `CMC_IDS`를 넣으세요. (validator는 이미 `CMC`를 허용합니다.)
- `cors` 패키지는 설치되어 있지만 사용하지 않습니다(Vite 프록시로 대체).
- [src/server.js](src/server.js) 하단의 주석 블록은 DB 기능 추가 전 버전의 코드입니다.

### 새 거래소를 추가하려면

1. `src/providers/`에 `fetchXxxPrices()` 추가
2. [price.normalizer.js](src/normalizers/price.normalizer.js)에 `normalizeXxxPrices()` 추가 (공통 포맷으로 변환)
3. [price.validator.js](src/validators/price.validator.js)의 `VALID_SOURCES`에 소스 이름 추가
4. [market-data.service.js](src/services/market-data.service.js)에 `collectXxx()` 추가 후 `start()`에 등록
5. 화면에도 표시하려면 [App.jsx](frontend/src/App.jsx)의 `SOURCES` 배열과 `style.css`의 아이콘 색상 추가

### Git

- `.env`(API 키, DB 비밀번호), `node_modules/`, `frontend/dist/`는 `.gitignore`로 제외됩니다.
- 새 환경 변수를 추가하면 `.env.example`에 **키 이름만** 추가하세요.
- `package-lock.json`은 버전을 고정하기 위해 **커밋합니다.**


## Control read-only integration

기존 `npm start`는 기존 live 서버입니다. 새 `npm run start:integrated`는 기본 offline(외부 요청/DB 접속 없음)이며 `/health` 200, 데이터 없는 `/ready`·`/oracle/v1/prices`는 503입니다.
`SOURCE_MODE=fixture`는 명시적 `mock:true` 합성 가격을 전달합니다. `SOURCE_MODE=live`는 기존 수집기를 그대로 쓰며 24자 이상 `INTERNAL_SERVICE_TOKEN`이 필요합니다. Biquote에는 기존 DB 설정이 필요합니다.
새 Docker는 read-only adapter만 노출하고 관리 쓰기 API를 노출하지 않습니다. 기존 서버의 추가 Oracle 조회 경로도 토큰을 요구합니다.
`observedAt=sourceTimestamp ?? fetchedAt`; 10초 기본 허용 지연은 개발 설정이며 운영의 소스별 카탈로그 값으로 교체해야 합니다. 미래 시각·오래된 가격·휴장/stale 레코드는 제외합니다.
종료 시 수집 타이머를 중지하며 CLI 종료 상한은 2초입니다. live provider의 진행 중 호출은 기존 provider timeout을 따르고, 상한 이후 프로세스 종료로 네트워크 자원을 닫습니다.

### 021 후속 연결 보완

기존 수집기의 `{symbol: 공통 심볼, sourceSymbol: 공급자 심볼}`을 읽기 전용 어댑터에서 확정 종목표와 대조합니다. 정확히 일치한 쌍만 `asset`, `quote=USDT`, 공급자 `symbol`로 전달합니다. 수집기·원시 가격·DB 스키마는 변경하지 않습니다. 불일치·통화 충돌·만료·장 마감 시세는 거절합니다. 확정 31종목의 모든 등록 공급자 심볼을 자동 검사합니다.
