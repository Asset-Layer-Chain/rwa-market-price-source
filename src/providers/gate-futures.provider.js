import { createHttpError } from "./http-error.js";

const GATE_FUTURES_URL = "https://api.gateio.ws/api/v4/futures/usdt/tickers";

export async function fetchGateFuturesPrices() {
  const response = await fetch(GATE_FUTURES_URL, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw createHttpError("GATE_FUTURES_API_ERROR", response);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("GATE_FUTURES_INVALID_RESPONSE");
  }

  return data;
}
