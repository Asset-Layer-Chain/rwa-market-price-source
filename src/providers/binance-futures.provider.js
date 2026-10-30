import { createHttpError } from "./http-error.js";

// USDⓈ-M Futures. 둘 다 symbol 없이 전체 조회 후 필터링한다.
// weight: premiumIndex 10, v2/ticker/price 2 (symbol 지정 시 각각 1이지만 31개면 더 비쌈)
const BASE_URL = "https://fapi.binance.com";

async function fetchJsonArray(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) {
    throw createHttpError("BINANCE_FUTURES_API_ERROR", response);
  }
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("BINANCE_FUTURES_INVALID_RESPONSE");
  return data;
}

export async function fetchBinanceFuturesPrices() {
  const [tickers, premiumIndex] = await Promise.all([
    fetchJsonArray("/fapi/v2/ticker/price"),
    fetchJsonArray("/fapi/v1/premiumIndex"),
  ]);
  return { tickers, premiumIndex };
}
