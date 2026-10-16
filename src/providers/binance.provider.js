const BINANCE_URL = "https://api.binance.com/api/v3/ticker/price";

export async function fetchBinancePrices() {
  const response = await fetch(BINANCE_URL, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`BINANCE_API_ERROR status=${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("BINANCE_INVALID_RESPONSE");
  }

  return data;
}
