import { createHttpError } from "./http-error.js";

const GATE_URL = "https://api.gateio.ws/api/v4/spot/tickers";

export async function fetchGatePrices() {
  const response = await fetch(GATE_URL, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw createHttpError("GATE_API_ERROR", response);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("GATE_INVALID_RESPONSE");
  }

  return data;
}
