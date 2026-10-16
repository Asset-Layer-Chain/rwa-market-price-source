import React, { useCallback, useEffect, useRef, useState } from "react";

const SOURCES = [
  { id: "BINANCE", label: "Binance", short: "BN", accent: "binance" },
  { id: "GATE", label: "Gate.io", short: "GT", accent: "gate" },
  { id: "BIQUOTE", label: "Biquote", short: "BQ", accent: "biquote" },
];
const POLL_INTERVAL_MS = 1000;

function formatPrice(value) {
  value = Number(value);
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits:
      value < 0.0001 ? 12 : value < 1 ? 8 : value < 10 ? 6 : 4,
  }).format(value);
}

function PricePanel({ source, prices, filter }) {
  const filtered = prices.filter((item) =>
    `${item.symbol} ${item.asset || ""} ${item.quote || ""}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <section className={`market-panel ${source.accent}`}>
      <header className="panel-header">
        <div className="exchange-name">
          <span className="exchange-icon">{source.short}</span>
          {source.label}
        </div>
        <span className="count">{filtered.length.toLocaleString()}종목</span>
      </header>
      <div className="column-heading">
        <span>종목</span>
        <span>가격</span>
      </div>
      <div
        className="price-scroll"
        role="list"
        aria-label={`${source.label} 가격 목록`}
      >
        {filtered.length === 0 ? (
          <div className="empty">
            {filter ? "검색 결과가 없습니다." : "아직 수신된 가격이 없습니다."}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              className="price-row"
              role="listitem"
              key={`${source.id}-${item.symbol}`}
              title={`${item.symbol} / ${item.quote || "-"}`}
            >
              <span className="symbol" title={item.symbol}>
                {item.symbol}
              </span>
              <span className="price" title={String(item.price)}>
                {formatPrice(item.price)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [prices, setPrices] = useState([]);
  const [filter, setFilter] = useState("");
  const [enabledBiquote, setEnabledBiquote] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const pollingBusy = useRef(false);

  const fetchPrices = useCallback(async (signal) => {
    if (pollingBusy.current) return;
    pollingBusy.current = true;
    try {
      const response = await fetch("/prices", { signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.data))
        throw new Error("응답의 data가 배열이 아닙니다.");
      setPrices(body.data);
      setLastChecked(new Date());
      setError("");
    } catch (err) {
      if (err.name !== "AbortError")
        setError(`백엔드 연결 실패: ${err.message}`);
    } finally {
      pollingBusy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPrices(controller.signal);
    const timer = window.setInterval(() => {
      if (!document.hidden) fetchPrices(controller.signal);
    }, POLL_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (!document.hidden) fetchPrices(controller.signal);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      controller.abort();
    };
  }, [fetchPrices]);

  useEffect(() => {
    let active = true;

    const events = new EventSource("/api/markets/events");

    async function loadMarkets() {
      try {
        const response = await fetch("/api/markets", {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("종목 조회 실패");

        const markets = await response.json();

        if (active) {
          setEnabledBiquote(
            new Set(
              markets
                .filter((item) => item.enabled === true)
                .map((item) => item.symbol.toUpperCase()),
            ),
          );
        }
      } catch (error) {
        console.error("[BIQUOTE] 종목 갱신 실패:", error);
      }
    }

    // 최초 조회
    loadMarkets();

    // SSE 최초 연결 및 재연결
    events.onopen = loadMarkets;

    // 종목이 변경되면 자동 갱신
    events.addEventListener("markets-changed", () => {
      console.log("[SSE] Biquote 종목 변경 감지");
      loadMarkets();
    });

    return () => {
      active = false;
      events.close();
    };
  }, []);

  const grouped = Object.fromEntries(SOURCES.map(({ id }) => [id, []]));
  for (const item of prices) {
    if (!item || typeof item !== "object") continue;
    const source = String(item.source || "").toUpperCase();
    const symbol = String(item.symbol || item.asset || "").toUpperCase();
    if (!grouped[source] || !symbol) continue;
    if (source === "BIQUOTE" && enabledBiquote && !enabledBiquote.has(symbol))
      continue;
    grouped[source].push({ ...item, symbol });
  }
  for (const items of Object.values(grouped)) {
    items.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <p className="eyebrow">MARKET DATA</p>
          <h1>
            실시간 거래소 가격 모니터{" "}
            <small className="app-version">v1.1</small>
          </h1>
          <p className="subtitle">
            거래소별 종목과 마지막 수집 가격을 확인합니다.
          </p>
        </div>
        <div className="status">
          <span className={`status-dot ${error ? "offline" : ""}`} />
          {error ? "연결 확인 필요" : loading ? "연결 중" : "가격 자동 갱신 중"}
          <span className="last-time">
            {lastChecked
              ? `마지막 확인 ${lastChecked.toLocaleTimeString("ko-KR")}`
              : ""}
          </span>
        </div>
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error} · 백엔드 localhost:3002 실행 여부를 확인해주세요.
        </div>
      )}
      <div className="toolbar">
        <label htmlFor="filter">종목 검색</label>
        <input
          id="filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="BTCUSDT, XAUUSD ..."
          autoComplete="off"
        />
        <span className="refresh-hint">1초 간격으로 서버의 최신 가격 확인</span>
      </div>
      <div className="panels">
        {SOURCES.map((source) => (
          <PricePanel
            key={source.id}
            source={source}
            prices={grouped[source.id]}
            filter={filter}
          />
        ))}
      </div>
      <p className="footnote">
        가격은 백엔드 <code>/prices</code> 응답 기준입니다. 백엔드의 실제 수집
        주기(현재 설정 5초)에 따라 값이 갱신됩니다.
      </p>
    </main>
  );
}
