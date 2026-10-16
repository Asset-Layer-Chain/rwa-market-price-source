const BINANCE_QUOTES = ["USDT", "USDC", "FDUSD", "BTC", "ETH", "BNB"];

function splitBinanceSymbol(symbol) {
  const quote = BINANCE_QUOTES.find((q) => symbol.endsWith(q));

  if (!quote) {
    return null;
  }

  return {
    asset: symbol.slice(0, -quote.length),
    quote,
  };
}

function splitBiquoteSymbol(symbol) {
  const quotes = [
    "USDT",
    "USDC",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "CAD",
    "CHF",
  ];

  const quote = quotes.find((q) => symbol.endsWith(q));

  if (!quote) {
    return {
      asset: symbol,
      quote: null,
    };
  }

  return {
    asset: symbol.slice(0, -quote.length),
    quote,
  };
}

export function normalizeBinancePrices(data) {
  const fetchedAt = Date.now();

  return data
    .map((item) => {
      const pair = splitBinanceSymbol(item.symbol);

      if (!pair) {
        return null;
      }

      return {
        source: "BINANCE",
        asset: pair.asset,
        quote: pair.quote,
        symbol: item.symbol,
        price: Number(item.price),
        sourceTimestamp: null,
        fetchedAt,
      };
    })
    .filter(Boolean);
}

export function normalizeGatePrices(data) {
  const fetchedAt = Date.now();

  return data.map((item) => {
    const [asset, quote] = item.currency_pair.split("_");
    const symbol = `${asset}${quote}`;

    return {
      source: "GATE",
      asset,
      quote,
      symbol: symbol,
      price: Number(item.last),
      sourceTimestamp: null,
      fetchedAt,
    };
  });
}

export function normalizeBiquotePrices(data) {
  const fetchedAt = Date.now();

  return data.map((item) => {
    const pair = splitBiquoteSymbol(item.symbol);

    return {
      source: "BIQUOTE",

      asset: pair.asset,
      quote: pair.quote,

      symbol: item.symbol,

      // Biquote에서는 mid를 대표가격으로 사용
      price: Number(item.mid),

      sourceTimestamp: item.lastQuoteAt ?? item.timestamp ?? null,

      fetchedAt,

      // 유효성 확인용 추가 데이터
      stale: item.stale,
      quoteAgeSeconds: item.quoteAgeSeconds,
      marketState: item.marketState,
    };
  });
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
