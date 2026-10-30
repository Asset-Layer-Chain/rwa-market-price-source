// 프로젝트에서 확정한 31개 종목과 거래소별 조회 심볼 (기준: 거래소 종목 및 가중치.pdf).
// symbol = 공통 심볼. 정규화된 가격은 이 공통 심볼로 모은다.
// sources 값이 null 이면 해당 거래소에서는 수집하지 않는다.
export const SOURCES = Object.freeze([
  "BINANCE",
  "BINANCE_FUTURES",
  "BIQUOTE",
  "GATE",
  "GATE_FUTURES",
]);

const STOCK = "주식";
const COMMODITY = "원자재";
const CRYPTO = "암호화폐";

function item(symbol, category, name, label, sources) {
  const [BINANCE, BINANCE_FUTURES, BIQUOTE, GATE, GATE_FUTURES] = sources;

  return Object.freeze({
    symbol,
    category,
    name,
    label,
    sources: Object.freeze({
      BINANCE,
      BINANCE_FUTURES,
      BIQUOTE,
      GATE,
      GATE_FUTURES,
    }),
  });
}

// prettier-ignore
export const confirmedSymbols = Object.freeze([
  //    공통      구분       종목명                  표시명         BINANCE        BINANCE_FUTURES BIQUOTE        GATE            GATE_FUTURES
  item("NVDA",   STOCK,     "엔비디아",              "NVDAB",      ["NVDABUSDT",  "NVDAUSDT",     "NVDAUSDT",    "NVDAG_USDT",   null]),
  item("AMD",    STOCK,     "AMD",                  "AMDB",       ["AMDBUSDT",   "AMDUSDT",      "AMDUSDT",     "AMDG_USDT",    null]),
  item("AVGO",   STOCK,     "브로드컴",              "AVGOB",      ["AVGOBUSDT",  "AVGOUSDT",     "AVGOUSDT",    "AVGOG_USDT",   null]),
  item("MU",     STOCK,     "마이크론 테크놀로지",      "MUB",        ["MUBUSDT",    "MUUSDT",       "MUUSDT",      "MUG_USDT",     null]),
  item("TSLA",   STOCK,     "테슬라",               "TSLAB",      ["TSLABUSDT",  "TSLAUSDT",     "TSLAUSDT",    "TSLAG_USDT",   null]),
  item("ARM",    STOCK,     "암 홀딩스",             "ARMB",       ["ARMBUSDT",   "ARMUSDT",      "ARMUSDT",     "ARMG_USDT",    null]),
  item("FWDI",   STOCK,     "포워드 인더스트리",       "FWDIB",      ["FWDIBUSDT",  "FWDIUSDT",     "FWDIUSDT",    null,           null]),
  item("MSFT",   STOCK,     "마이크로소프트",          "MSFTB",      ["MSFTBUSDT",  "MSFTUSDT",     "MSFTUSDT",    "MSFTG_USDT",   null]),
  item("MSTR",   STOCK,     "마이크로스트레티지",       "MSTRB",      ["MSTRBUSDT",  "MSTRUSDT",     "MSTRUSDT",    "MSTRG_USDT",   null]),
  item("COIN",   STOCK,     "코인베이스",             "COINB",      ["COINBUSDT",  "COINUSDT",     "COINUSDT",    "COING_USDT",   null]),
  item("HOOD",   STOCK,     "로빈후드",              "HOODB",      ["HOODBUSDT",  "HOODUSDT",     "HOODUSDT",    "HOODG_USDT",   null]),
  item("AAPL",   STOCK,     "애플",                 "AAPLB",      ["AAPLBUSDT",  "AAPLUSDT",     "AAPLUSDT",    "AAPLG_USDT",   null]),
  item("GOOGL",  STOCK,     "구글 / 알파벳",          "GOOGLB",     ["GOOGLBUSDT", "GOOGLUSDT",    "GOOGLUSDT",   "GOOGLG_USDT",  null]),
  item("AMZN",   STOCK,     "아마존",               "AMZNB",      ["AMZNBUSDT",  "AMZNUSDT",     "AMZNUSDT",    "AMZNG_USDT",   null]),
  item("PDD",    STOCK,     "PDD 홀딩스",            "PDDB",       ["PDDBUSDT",   "PDDUSDT",      "PDDUSDT",     null,           null]),
  item("LLY",    STOCK,     "일라이 릴리",            "LLYB",       ["LLYBUSDT",   "LLYUSDT",      "LLYUSDT",     "LLYG_USDT",    null]),
  item("CRM",    STOCK,     "세일즈포스",             "CRMB",       ["CRMBUSDT",   "CRMUSDT",      "CRMUSDT",     null,           null]),
  item("HIMS",   STOCK,     "힘스앤허스 헬스",         "HIMSB",      ["HIMSBUSDT",  "HIMSUSDT",     "HIMSUSDT",    null,           null]),
  item("ZM",     STOCK,     "줌 비디오 커뮤니케이션",    "ZMB",        ["ZMBUSDT",    "ZMUSDT",       "ZMUSDT",      null,           null]),
  item("JPM",    STOCK,     "제이피모건 체이스",        "JPMB",       ["JPMBUSDT",   "JPMUSDT",      "JPMUSDT",     "JPMG_USDT",    null]),

  item("XAU",    COMMODITY, "금",                   "XAUUSDT",    [null,         "XAUUSDT",      "XAUUSDT",     null,           "XAU_USDT"]),
  item("XAG",    COMMODITY, "은",                   "XAGUSDT",    [null,         "XAGUSDT",      "XAGUSDT",     null,           "XAG_USDT"]),
  item("XPT",    COMMODITY, "백금",                  "XPTUSDT",    [null,         "XPTUSDT",      "XPTUSDT",     null,           "XPT_USDT"]),
  item("XPD",    COMMODITY, "팔라듐",                "XPDUSDT",    [null,         "XPDUSDT",      "XPDUSDT",     null,           "XPD_USDT"]),
  item("XCU",    COMMODITY, "구리",                  "COPPERUSDT", [null,         "COPPERUSDT",   "COPPERUSDT",  null,           "XCU_USDT"]),
  item("CL",     COMMODITY, "WTI 원유",              "CLUSDT",     [null,         "CLUSDT",       "CLUSDT",      null,           "CL_USDT"]),
  item("BZ",     COMMODITY, "브렌트유",               "BZUSDT",     [null,         "BZUSDT",       "BZUSDT",      null,           "BZ_USDT"]),
  item("NG",     COMMODITY, "천연가스",               "NATGASUSDT", [null,         "NATGASUSDT",   "NATGASUSDT",  null,           "NG_USDT"]),

  item("BTC",    CRYPTO,    "비트코인",               "BTCUSDT",    ["BTCUSDT",    "BTCUSDT",      "BTCUSDT",     "BTC_USDT",     "BTC_USDT"]),
  item("ETH",    CRYPTO,    "이더리움",               "ETHUSDT",    ["ETHUSDT",    "ETHUSDT",      "ETHUSDT",     "ETH_USDT",     "ETH_USDT"]),
  item("SOL",    CRYPTO,    "솔라나",                "SOLUSDT",    ["SOLUSDT",    "SOLUSDT",      "SOLUSDT",     "SOL_USDT",     "SOL_USDT"]),
]);

// source -> Map(거래소 심볼 -> 공통 심볼). 전체 응답에서 필요한 종목만 고를 때 사용.
export const SOURCE_SYMBOL_MAP = Object.freeze(
  Object.fromEntries(
    SOURCES.map((source) => [
      source,
      new Map(
        confirmedSymbols
          .filter((s) => s.sources[source])
          .map((s) => [s.sources[source], s.symbol]),
      ),
    ]),
  ),
);

export function sourceSymbols(source) {
  return [...SOURCE_SYMBOL_MAP[source].keys()];
}
