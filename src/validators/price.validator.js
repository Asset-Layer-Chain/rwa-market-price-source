// const VALID_SOURCES = new Set(["BINANCE", "GATE", "CMC"]);
const VALID_SOURCES = new Set(["BINANCE", "GATE", "CMC", "BIQUOTE"]);

export function isValidPrice(item) {
  if (!item) return false;

  if (!VALID_SOURCES.has(item.source)) {
    return false;
  }

  if (typeof item.asset !== "string" || item.asset.length === 0) {
    return false;
  }

  if (typeof item.quote !== "string" || item.quote.length === 0) {
    return false;
  }

  if (!Number.isFinite(item.price) || item.price <= 0) {
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
