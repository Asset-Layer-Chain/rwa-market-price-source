import { getBiquoteSymbols } from "../repository/biquoteSymbolRepository.js";

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

export async function fetchBiquotePrices() {
  const symbols = await getBiquoteSymbols();

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

    throw new Error(`BIQUOTE_API_ERROR status=${response.status} body=${body}`);
  }

  const data = await response.json();

  return Object.values(data);
}
