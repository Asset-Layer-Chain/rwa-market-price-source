// 429 Too Many Requests, 418 Binance IP ban (sent after ignoring 429s).
const RATE_LIMIT_STATUSES = new Set([429, 418]);

export class HttpError extends Error {
  constructor(message, { status, retryAfterMs = null }) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }

  get isRateLimited() {
    return RATE_LIMIT_STATUSES.has(this.status);
  }
}

// Retry-After is either delta-seconds ("120") or an HTTP-date.
export function parseRetryAfter(value, now = Date.now()) {
  if (value == null || value.trim() === "") return null;

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const date = Date.parse(trimmed);

  if (Number.isNaN(date)) return null;

  return Math.max(0, date - now);
}

export function createHttpError(code, response, body) {
  const suffix = body === undefined ? "" : ` body=${body}`;

  return new HttpError(`${code} status=${response.status}${suffix}`, {
    status: response.status,
    retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
  });
}
