import { fetchBinancePrices } from "../providers/binance.provider.js";
import { fetchBinanceFuturesPrices } from "../providers/binance-futures.provider.js";
import { fetchGatePrices } from "../providers/gate.provider.js";
import { fetchGateFuturesPrices } from "../providers/gate-futures.provider.js";
// import { fetchCmcPrices } from "../providers/cmc.provider.js";
import { fetchBiquotePrices } from "../providers/biquote.provider.js";

import {
  normalizeBinancePrices,
  normalizeBinanceFuturesPrices,
  normalizeGatePrices,
  normalizeGateFuturesPrices,
  //   normalizeCmcPrices,
  normalizeBiquotePrices,
} from "../normalizers/price.normalizer.js";

import { filterValidPrices } from "../validators/price.validator.js";
import {
  SOURCES,
  SOURCE_SYMBOL_MAP,
  confirmedSymbols,
} from "../catalog/confirmed-symbols.js";

// Retry-After 헤더 없이 429/418 을 받았을 때 쓰는 대기 시간 (연속 발생 시 2배씩 증가)
const DEFAULT_RATE_LIMIT_BACKOFF_MS =
  Number(process.env.RATE_LIMIT_BACKOFF_MS) || 60_000;
const MAX_RATE_LIMIT_BACKOFF_MS = 15 * 60_000;

class MarketDataService {
  constructor() {
    this.prices = new Map();
    this.inFlight = new Set();
    // name -> { until, streak }
    this.rateLimits = new Map();
  }

  savePrices(prices) {
    for (const price of prices) {
      const key = `${price.source}:${price.symbol}`;

      this.prices.set(key, price);
    }
  }

  // 이전 요청이 끝나지 않았거나 rate limit 대기 중이면 이번 tick 은 건너뜀
  async runGuarded(name, task) {
    const rateLimit = this.rateLimits.get(name);

    if (rateLimit && Date.now() < rateLimit.until) {
      return;
    }

    if (this.inFlight.has(name)) {
      console.warn(`[${name}] previous request still in flight, skipping`);
      return;
    }

    this.inFlight.add(name);

    try {
      await task();

      if (rateLimit) {
        this.rateLimits.delete(name);
        console.log(`[${name}] rate limit cleared, resumed`);
      }
    } catch (error) {
      if (error.isRateLimited) {
        this.applyRateLimit(name, error);
      } else {
        console.error(`[${name}] fetch failed:`, error.message);
      }
    } finally {
      this.inFlight.delete(name);
    }
  }

  applyRateLimit(name, error) {
    const streak = (this.rateLimits.get(name)?.streak ?? 0) + 1;

    const waitMs =
      error.retryAfterMs ??
      Math.min(
        DEFAULT_RATE_LIMIT_BACKOFF_MS * 2 ** (streak - 1),
        MAX_RATE_LIMIT_BACKOFF_MS,
      );

    const until = Date.now() + waitMs;

    this.rateLimits.set(name, { until, streak });

    console.error(
      `[${name}] rate limited status=${error.status} ` +
        `retryAfter=${error.retryAfterMs == null ? "none(backoff)" : `${waitMs}ms`} ` +
        `paused until ${new Date(until).toISOString()}`,
    );
  }

  schedule(name, task, intervalMs) {
    const run = () => this.runGuarded(name, task);

    run();
    setInterval(run, intervalMs);
  }

  async collectBinance() {
    const raw = await fetchBinancePrices();

    const prices = filterValidPrices(normalizeBinancePrices(raw));

    this.savePrices(prices);

    this.logCollected("BINANCE", raw.length, prices);
  }

  async collectBinanceFutures() {
    const raw = await fetchBinanceFuturesPrices();
    const prices = filterValidPrices(normalizeBinanceFuturesPrices(raw));
    this.savePrices(prices);
    this.logCollected(
      "BINANCE_FUTURES",
      `${raw.tickers.length}/${raw.premiumIndex.length}`,
      prices,
    );
  }

  async collectGate() {
    const raw = await fetchGatePrices();

    const prices = filterValidPrices(normalizeGatePrices(raw));

    this.savePrices(prices);

    this.logCollected("GATE", raw.length, prices);
  }

  async collectGateFutures() {
    const raw = await fetchGateFuturesPrices();

    const prices = filterValidPrices(normalizeGateFuturesPrices(raw));

    this.savePrices(prices);

    this.logCollected("GATE_FUTURES", raw.length, prices);
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
    const raw = await fetchBiquotePrices();

    const prices = filterValidPrices(normalizeBiquotePrices(raw));

    this.savePrices(prices);

    this.logCollected("BIQUOTE", raw.length, prices);
  }

  // valid=수집된 확정 종목 수/카탈로그상 기대 종목 수
  logCollected(source, received, prices) {
    console.log(
      `[${source}] received=${received} ` +
        `valid=${prices.length}/${SOURCE_SYMBOL_MAP[source].size}`,
    );
  }

  getAllPrices() {
    return [...this.prices.values()];
  }

  getPricesBySymbol(symbol) {
    return this.getAllPrices().filter(
      (item) => item.symbol === symbol.toUpperCase(),
    );
  }

  // 공통 심볼별로 거래소 가격을 모음. 수집 대상 거래소만 포함, 아직 미수신이면 null
  getGroupedPrices() {
    return confirmedSymbols.map((item) => ({
      symbol: item.symbol,
      category: item.category,
      name: item.name,
      prices: Object.fromEntries(
        SOURCES.filter((source) => item.sources[source]).map((source) => [
          source,
          this.prices.get(`${source}:${item.symbol}`) ?? null,
        ]),
      ),
    }));
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
    const binquoteInterval = Number(process.env.BIQUOTE_INTERVAL_MS) || 5000;

    this.schedule("BINANCE", () => this.collectBinance(), binanceInterval);

    this.schedule(
      "BINANCE_FUTURES",
      () => this.collectBinanceFutures(),
      Number(process.env.BINANCE_FUTURES_INTERVAL_MS) || 5000,
    );

    this.schedule("GATE", () => this.collectGate(), gateInterval);

    this.schedule(
      "GATE_FUTURES",
      () => this.collectGateFutures(),
      Number(process.env.GATE_FUTURES_INTERVAL_MS) || 5000,
    );

    // this.schedule("CMC", () => this.collectCmc(), cmcInterval);

    this.schedule("BIQUOTE", () => this.collectBiquote(), binquoteInterval);
  }
}

export const marketDataService = new MarketDataService();
