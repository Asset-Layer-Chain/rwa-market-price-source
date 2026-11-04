import { SOURCE_SYMBOL_MAP } from "../catalog/confirmed-symbols.js";

// markPrice / indexPrice 는 없거나 0·빈 문자열이면 null
function optionalPrice(value) {
  if (value == null || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : null;
}

// 시각은 내부적으로 epoch ms 로 통일 (Biquote 는 ISO 문자열로 내려옴)
function toEpochMs(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value === "") return null;

  const ms = Date.parse(value);

  return Number.isNaN(ms) ? null : ms;
}

// 거래소 전체 응답에서 확정 종목만 골라 공통 심볼(symbol)로 정규화
function selectConfirmed(source, items, getSourceSymbol, toFields) {
  const symbols = SOURCE_SYMBOL_MAP[source];
  const fetchedAt = Date.now();
  const prices = [];

  for (const item of items) {
    const sourceSymbol = getSourceSymbol(item);
    const symbol = symbols.get(sourceSymbol);

    if (!symbol) continue;

    prices.push({
      source,
      symbol,
      sourceSymbol,
      price: null,
      markPrice: null,
      indexPrice: null,
      sourceTimestamp: null,
      fetchedAt,
      ...toFields(item),
    });
  }

  return prices;
}

export function normalizeBinancePrices(data) {
  return selectConfirmed(
    "BINANCE",
    data,
    (item) => item.symbol,
    (item) => ({ price: Number(item.price) }),
  );
}

// tickers(v2/ticker/price) 의 price 에 premiumIndex 의 markPrice/indexPrice 를 합침
export function normalizeBinanceFuturesPrices({ tickers, premiumIndex }) {
  const premiumBySymbol = new Map(premiumIndex.map((p) => [p.symbol, p]));

  return selectConfirmed(
    "BINANCE_FUTURES",
    tickers,
    (item) => item.symbol,
    (item) => {
      const premium = premiumBySymbol.get(item.symbol);

      return {
        price: Number(item.price),
        markPrice: optionalPrice(premium?.markPrice),
        indexPrice: optionalPrice(premium?.indexPrice),
        sourceTimestamp: toEpochMs(item.time),
      };
    },
  );
}

export function normalizeGatePrices(data) {
  return selectConfirmed(
    "GATE",
    data,
    (item) => item.currency_pair,
    (item) => ({ price: Number(item.last) }),
  );
}

export function normalizeGateFuturesPrices(data) {
  return selectConfirmed(
    "GATE_FUTURES",
    data,
    (item) => item.contract,
    (item) => ({
      price: Number(item.last),
      markPrice: optionalPrice(item.mark_price),
      indexPrice: optionalPrice(item.index_price),
    }),
  );
}

export function normalizeBiquotePrices(data) {
  return selectConfirmed(
    "BIQUOTE",
    data,
    (item) => item.symbol,
    (item) => ({
      // Biquote에서는 mid를 대표가격으로 사용
      price: Number(item.mid),

      sourceTimestamp: toEpochMs(item.lastQuoteAt ?? item.timestamp),

      // 유효성 확인용 추가 데이터 (외부 출력에서는 제외)
      stale: item.stale,
      quoteAgeSeconds: item.quoteAgeSeconds,
      marketState: item.marketState,
    }),
  );
}

// export function normalizeCmcPrices(body) {
//   const fetchedAt = Date.now();

//   return Object.values(body.data).map((item) => ({
//     source: "CMC",
//     asset: item.symbol,
//     quote: "USD",
//     symbol: item.symbol,
//     assetId: item.id,
//     price: Number(item.quote?.USD?.price),
//     sourceTimestamp: item.quote?.USD?.last_updated ?? null,
//     fetchedAt,
//   }));
// }
