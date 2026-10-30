import { createHttpError } from "./http-error.js";
import { sourceSymbols } from "../catalog/confirmed-symbols.js";

const BASE_URL = "https://biquote.io/api";

//귀금속 , 에너지, 산업금속
// const BIQUOTE_SYMBOLS = [
//   "XAUUSD", //금
//   "XAGUSD", //은
//   "USOIL", //WTI 원유
//   "UKOIL", //브렌트유
//   "XCUUSD", //구리
//   "XALUSD", //알루미늄
//   "XNIUSD", //니켈
//   "XZNUSD", //아연
//   "XPBUSD", //납
//   "XPDUSD", //팔라듐
//   "XPTUSD", //백금
//   "XNGUSD", //천연가스
// ];

// export async function getBiquoteSymbols() {
//   const { rows } = await pool.query(`
//     SELECT symbol
//     FROM biquote_symbols
//     WHERE enabled = true
//   `);

//   return rows.map((row) => row.symbol);
// }

// 개별 조회 불가 → 확정 종목 심볼을 전부 쿼리에 넣어 1회 요청
export async function fetchBiquotePrices() {
  const symbols = sourceSymbols("BIQUOTE");

  if (symbols.length === 0) {
    return [];
  }

  const params = new URLSearchParams();

  for (const symbol of symbols) {
    params.append("symbols", symbol);
  }

  const url = `${BASE_URL}/latest?${params.toString()}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();

    throw createHttpError("BIQUOTE_API_ERROR", response, body);
  }

  const data = await response.json();

  return Object.values(data);
}
