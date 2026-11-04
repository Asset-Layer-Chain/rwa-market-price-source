// 사람이 읽는 한국시간 문자열 (예: "2026-10-30 15:27:06").
// 표시용 전용 — 시간 계산/비교/저장은 항상 epoch ms(fetchedAt)로 한다.
export function formatKst(ms) {
  if (!Number.isFinite(ms)) return null;

  return new Date(ms).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
}

// 외부(오라클/API)로 내보내는 형태. 검증용 필드(sourceTimestamp, stale 등)는 제외
export function toPublicPrice({
  source,
  symbol,
  sourceSymbol,
  price,
  markPrice,
  indexPrice,
  fetchedAt,
}) {
  return {
    source,
    symbol,
    sourceSymbol,
    price,
    markPrice,
    indexPrice,
    fetchedAt,
    fetchedAtKst: formatKst(fetchedAt),
  };
}
