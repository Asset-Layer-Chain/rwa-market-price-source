import { SOURCES } from "../catalog/confirmed-symbols.js";

const VALID_SOURCES = new Set(SOURCES);

function isOptionalPrice(value) {
  return value === null || (Number.isFinite(value) && value > 0);
}

export function isValidPrice(item) {
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

  if (
    item.source === "BIQUOTE" &&
    (item.stale === true || item.marketState !== "open")
  ) {
    return false;
  }

  return true;
}

export function filterValidPrices(prices) {
  return prices.filter(isValidPrice);
}
