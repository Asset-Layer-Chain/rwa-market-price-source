import { SOURCES, confirmedSymbols } from "./confirmed-symbols.js";
import { formatKst } from "../formatters/price.formatter.js";

export const DEFAULT_FRESHNESS_MS = 30000;

const MARKETS = {
  BINANCE: "SPOT",
  BINANCE_FUTURES: "FUTURES",
  BIQUOTE: "REFERENCE",
  GATE: "SPOT",
  GATE_FUTURES: "FUTURES",
};

function describe(source, category) {
  switch (source) {
    case "BINANCE":
      return category === "주식"
        ? { matchType: "BSTOCK_TOKEN", note: "기초주식과 다른 bStock 토큰 가격" }
        : { matchType: "SPOT_PAIR", note: "Spot USDT 거래쌍" };
    case "GATE":
      return category === "주식"
        ? { matchType: "TOKENIZED_STOCK", note: "Gate 토큰화 주식 Spot 가격" }
        : { matchType: "SPOT_PAIR", note: "Spot USDT 거래쌍" };
    case "BIQUOTE":
      return {
        matchType: "UNDERLYING_REFERENCE",
        note: "MT5 수집 참고시세 (mid)",
      };
    default:
      return {
        matchType: "FUTURES_CONTRACT",
        note: "무기한 선물 계약가격 (Spot 가격 아님)",
      };
  }
}

//가격 상태 판별기
function rowFor(source, item, lookup, now, freshnessMs) {
  const sourceSymbol = item.sources[source];
  const record = sourceSymbol ? lookup.get(`${source}:${item.symbol}`) : null;
  let status;
  if (!sourceSymbol) {
    status = "NOT_COLLECTED";
  } else if (record && Number.isFinite(record.price) && record.price > 0) {
    // sourceTimestamp 신선도는 수집 시 validator 가 이미 걸렀으므로
    // 여기서는 마지막 수집 시각만 본다.
    const cacheFresh =
      now - Number(record.fetchedAt) <= freshnessMs &&
      now >= Number(record.fetchedAt) - 5000;
    status = cacheFresh ? "PRICE_OK" : "STALE_CACHE";
  } else {
    status = "NO_PRICE_IN_CACHE";
  }
  return {
    source,
    market: MARKETS[source],
    symbol: sourceSymbol,
    ...describe(source, item.category),
    status,
    price: record?.price ?? null,
    markPrice: record?.markPrice ?? null,
    indexPrice: record?.indexPrice ?? null,
    quote: "USDT",
    fetchedAt: record?.fetchedAt ?? null,
    sourceTimestamp: record?.sourceTimestamp ?? null,
  };
}

// Only report whether prices are PRESENT in this server's in-memory cache.
// Absence is not proof that an exchange does not list the instrument.
//종합 모니터링 보고서 생성기
export function buildConfirmedSnapshot(
  prices,
  { now = Date.now(), freshnessMs = DEFAULT_FRESHNESS_MS } = {},
) {
  const lookup = new Map(prices.map((p) => [`${p.source}:${p.symbol}`, p]));
  const data = confirmedSymbols.map((item) => ({
    category: item.category,
    name: item.name,
    symbol: item.symbol,
    label: item.label,
    exchanges: Object.fromEntries(
      SOURCES.map((source) => [
        source,
        rowFor(source, item, lookup, now, freshnessMs),
      ]),
    ),
  }));
  const counts = {
    PRICE_OK: 0,
    STALE_CACHE: 0,
    NO_PRICE_IN_CACHE: 0,
    NOT_COLLECTED: 0,
  };
  for (const item of data)
    for (const source of SOURCES) counts[item.exchanges[source].status]++;
  return {
    generatedAt: now,
    freshnessMs,
    totalSymbols: data.length,
    statusDefinitions: {
      PRICE_OK: "서버가 최근에 유효 가격 수집",
      STALE_CACHE: "이전 가격만 남아 있음 (현재가 아님)",
      NO_PRICE_IN_CACHE: "서버 메모리에 현재 가격 없음 (미상장 판정 아님)",
      NOT_COLLECTED: "이 거래소에서는 수집 대상이 아님",
    },
    sources: SOURCES,
    counts,
    data,
  };
}

//엑셀 다운로드 변환기
export function confirmedSnapshotCsv(snapshot) {
  const headers = [
    "구분",
    "종목명",
    "공통심볼",
    "거래소",
    "시장",
    "조회심볼",
    "비교유형",
    "조회상태",
    "가격",
    "markPrice",
    "indexPrice",
    "가격단위",
    "수집시각(KST)",
    "비고",
  ];
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const item of snapshot.data) {
    for (const source of SOURCES) {
      const p = item.exchanges[source];
      lines.push(
        [
          item.category,
          item.name,
          item.symbol,
          source,
          p.market,
          p.symbol,
          p.matchType,
          p.status,
          p.price,
          p.markPrice,
          p.indexPrice,
          p.quote,
          formatKst(p.fetchedAt),
          p.note,
        ]
          .map(escape)
          .join(","),
      );
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
