import { fetchBinancePrices } from "../providers/binance.provider.js";
import { fetchGatePrices } from "../providers/gate.provider.js";
// import { fetchCmcPrices } from "../providers/cmc.provider.js";
import { fetchBiquotePrices } from "../providers/biquote.provider.js";

import {
  normalizeBinancePrices,
  normalizeGatePrices,
  //   normalizeCmcPrices,
  normalizeBiquotePrices,
} from "../normalizers/price.normalizer.js";

import { filterValidPrices } from "../validators/price.validator.js";

class MarketDataService {
  constructor() {
    this.prices = new Map();
  }

  savePrices(prices) {
    for (const price of prices) {
      const key = `${price.source}:${price.symbol}`;

      this.prices.set(key, price);
    }
  }

  async collectBinance() {
    try {
      const raw = await fetchBinancePrices();

      const prices = filterValidPrices(normalizeBinancePrices(raw));

      this.savePrices(prices);

      console.log(`[BINANCE] received=${raw.length} valid=${prices.length}`);
    } catch (error) {
      console.error("[BINANCE] fetch failed:", error.message);
    }
  }

  async collectGate() {
    try {
      const raw = await fetchGatePrices();

      const prices = filterValidPrices(normalizeGatePrices(raw));

      this.savePrices(prices);

      console.log(`[GATE] received=${raw.length} valid=${prices.length}`);
    } catch (error) {
      console.error("[GATE] fetch failed:", error.message);
    }
  }

  //   async collectCmc() {
  //     try {
  //       const ids = (process.env.CMC_IDS ?? "")
  //         .split(",")
  //         .map((id) => id.trim())
  //         .filter(Boolean);

  //       const raw = await fetchCmcPrices(ids);

  //       const prices = filterValidPrices(normalizeCmcPrices(raw));

  //       this.savePrices(prices);

  //       console.log(`[CMC] requested=${ids.length} valid=${prices.length}`);
  //     } catch (error) {
  //       console.error("[CMC] fetch failed:", error.message);
  //     }
  //   }

  async collectBiquote() {
    try {
      const raw = await fetchBiquotePrices();

      const prices = filterValidPrices(normalizeBiquotePrices(raw));

      this.savePrices(prices);

      console.log(`[BIQUOTE] valid=${prices.length}`);
    } catch (error) {
      console.error("[BIQUOTE] fetch failed:", error.message);
    }
  }

  getAllPrices() {
    return [...this.prices.values()];
  }

  getPricesByAsset(asset) {
    return this.getAllPrices().filter(
      (item) => item.asset === asset.toUpperCase(),
    );
  }

  getPricesByQuote(quote) {
    return this.getAllPrices().filter(
      (item) => item.quote === quote.toUpperCase(),
    );
  }

  getPricesBySource(source) {
    return this.getAllPrices().filter(
      (item) => item.source === source.toUpperCase(),
    );
  }

  start() {
    const binanceInterval = Number(process.env.BINANCE_INTERVAL_MS) || 5000;
    const gateInterval = Number(process.env.GATE_INTERVAL_MS) || 5000;
    // const cmcInterval = Number(process.env.CMC_INTERVAL_MS) || 180000;
    const binquoteInterval = Number(process.env.BINQUOTE_INTERVAL_MS) || 5000;

    this.collectBinance();
    this.collectGate();
    // this.collectCmc();
    this.collectBiquote();

    setInterval(() => this.collectBinance(), binanceInterval);

    setInterval(() => this.collectGate(), gateInterval);

    // setInterval(() => this.collectCmc(), cmcInterval);

    setInterval(() => this.collectBiquote(), binquoteInterval);
  }
}

export const marketDataService = new MarketDataService();
