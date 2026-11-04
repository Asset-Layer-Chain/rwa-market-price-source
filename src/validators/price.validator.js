import { SOURCES } from "../catalog/confirmed-symbols.js";

const VALID_SOURCES = new Set(SOURCES);

// 거래소가 준 시세 시각(sourceTimestamp)이 이보다 오래되면 버림 (장 마감 후 마지막 체결가 등)
const MAX_SOURCE_AGE_MS = Number(process.env.MAX_SOURCE_AGE_MS) || 60_000;
// 거래소와 서버 시계 차이로 미래 시각이 오는 경우 허용 범위
const MAX_CLOCK_SKEW_MS = 5_000;

function isOptionalPrice(value) {
  return value === null || (Number.isFinite(value) && value > 0);
}

// sourceTimestamp 가 없는 소스(Binance Spot, Gate)는 검사하지 않음
function isFreshSource(sourceTimestamp, now) {
  if (sourceTimestamp === null) return true;

  return (
    Number.isFinite(sourceTimestamp) &&
    now - sourceTimestamp <= MAX_SOURCE_AGE_MS &&
    sourceTimestamp - now <= MAX_CLOCK_SKEW_MS
  );
}

export function isValidPrice(item, now = Date.now()) {
  if (!item) return false;

  if (!VALID_SOURCES.has(item.source)) {
    return false;
  }

  if (typeof item.symbol !== "string" || item.symbol.length === 0) {
    return false;
  }

  if (!Number.isFinite(item.price) || item.price <= 0) {
    return false;
  }

  if (!isOptionalPrice(item.markPrice) || !isOptionalPrice(item.indexPrice)) {
    return false;
  }

  if (!Number.isFinite(item.fetchedAt)) {
    return false;
  }

  if (!isFreshSource(item.sourceTimestamp, now)) {
    return false;
  }

  if (
    item.source === "BIQUOTE" &&
    (item.stale === true || item.marketState !== "open")
  ) {
    return false;
  }

  return true;
}

export function filterValidPrices(prices, now = Date.now()) {
  return prices.filter((item) => isValidPrice(item, now));
}
