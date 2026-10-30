import React, { useEffect, useState } from "react";

const POLL_MS = 1000;
const EXCHANGES = ["BINANCE", "BINANCE_FUTURES", "BIQUOTE", "GATE", "GATE_FUTURES"];
const EXCHANGE_LABELS = {
  BINANCE: "Binance Spot",
  BINANCE_FUTURES: "Binance Futures",
  BIQUOTE: "biquote 참고",
  GATE: "Gate.io Spot",
  GATE_FUTURES: "Gate.io Futures",
};
const LABELS = {
  PRICE_OK: "가격 확인",
  STALE_CACHE: "이전 가격",
  NO_PRICE_IN_CACHE: "미수집",
};
const CLASS = { PRICE_OK: "ok", STALE_CACHE: "warn", NO_PRICE_IN_CACHE: "muted" };

function formatPrice(price) {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: price < 1 ? 10 : 6 }).format(price);
}
function formatTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour12: false }) : "-";
}
function MarketCell({ info }) {
  if (!info || info.status === "NOT_COLLECTED") return <td className="compare-detail">—</td>;
  return (
    <td>
      <div className="compare-price">{(info.status === "PRICE_OK" || info.status === "STALE_CACHE") && info.price != null ? `${formatPrice(info.price)} ${info.quote}` : "—"}</div>
      {(info.markPrice != null || info.indexPrice != null) && (
        <div className="compare-detail">mark {formatPrice(info.markPrice)} · index {formatPrice(info.indexPrice)}</div>
      )}
      <div className="compare-detail">{info.symbol} · {info.market}</div>
      <div className={`compare-status ${CLASS[info.status] ?? "muted"}`}>
        {LABELS[info.status] || info.status} · {formatTime(info.fetchedAt)}
      </div>
      {info.matchType === "UNDERLYING_REFERENCE" && <span className="ref-label">기초자산 참고가격</span>}
    </td>
  );
}

export default function ConfirmedPricesTable({ filter }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const fetchSnapshot = async () => {
      try {
        const response = await fetch("/api/confirmed-prices", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!Array.isArray(json.data)) throw new Error("응답 형식 오류");
        if (alive) { setSnapshot(json); setError(""); }
      } catch (e) {
        if (alive && e.name !== "AbortError") setError(e.message);
      }
    };
    fetchSnapshot();
    const timer = setInterval(() => { if (!document.hidden) fetchSnapshot(); }, POLL_MS);
    return () => { alive = false; clearInterval(timer); controller.abort(); };
  }, []);

  // 거래소별 조회심볼(NVDAG_USDT, COPPERUSDT 등)로도 검색되도록 포함
  const rows = (snapshot?.data || []).filter((item) =>
    [item.category, item.name, item.symbol, item.label, ...Object.values(item.exchanges || {}).map((e) => e?.symbol)]
      .join(" ").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="confirmed-section">
      <div className="confirmed-header">
        <div>
          <h2>확정 31개 종목 · 거래소별 가격 비교</h2>
          <p>공통 심볼 기준으로 거래소별 가격을 모아 비교 · 선물은 mark/index 가격 함께 표시</p>
        </div>
        <a className="export-csv" href="/api/confirmed-prices.csv" download="confirmed-prices.csv">CSV 내보내기</a>
      </div>
      {error && <div className="error-box">확정 종목 API 연결 실패: {error}</div>}
      <div className="confirmed-key">
        <span><i className="key-dot ok" /> 가격 확인</span>
        <span><i className="key-dot warn" /> 오래된 가격</span>
        <span><i className="key-dot muted" /> 서버에 가격 없음</span>
        <span>— 수집 대상 아님</span>
        <span>최신성 기준 {snapshot ? `${snapshot.freshnessMs / 1000}초` : "—"}</span>
      </div>
      <div className="confirmed-scroll">
        <table className="confirmed-table">
          <thead><tr><th>분류</th><th>종목</th>{EXCHANGES.map((e) => <th key={e}>{EXCHANGE_LABELS[e]}</th>)}</tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.symbol}>
                <td>{item.category}</td>
                <td><strong>{item.name}</strong><div className="compare-detail">{item.symbol} · {item.label}</div></td>
                {EXCHANGES.map((e) => <MarketCell key={e} info={item.exchanges[e]} />)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="confirmed-empty">{snapshot ? "검색 결과가 없습니다." : "가격을 확인하고 있습니다."}</p>}
      </div>
      <p className="confirmed-note">'미수집'은 미상장이라는 뜻이 아닙니다. 실제 응답이 없는 상태입니다. 가격은 메모리 스냅샷이며 장이 닫혔거나 수집에 실패하면 이전 가격이 남을 수 있습니다.</p>
    </section>
  );
}
