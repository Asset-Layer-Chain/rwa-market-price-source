// //현재 Oracle 서버가 없기 Market Data Server 에서 현재 수집된 데이터를 확인할 수 있게 API 열어두기

import "dotenv/config";
import express from "express";
import { pool } from "./db.js";
import { marketDataService } from "./services/market-data.service.js";

const app = express();
const port = Number(process.env.PORT) || 3002;

app.use(express.json());

// SSE 클라이언트 관리
const clients = new Set();

function notifyMarketsChanged() {
  for (const client of clients) {
    client.write(
      `event: markets-changed\ndata: ${JSON.stringify({
        timestamp: Date.now(),
      })}\n\n`,
    );
  }
}

async function listenMarketChanges() {
  const client = await pool.connect();

  client.on("notification", (message) => {
    if (message.channel === "biquote_markets_changed") {
      notifyMarketsChanged();
    }
  });

  client.on("error", (error) => {
    console.error("[PostgreSQL LISTEN] 연결 오류:", error);
  });

  await client.query("LISTEN biquote_markets_changed");

  console.log("[SSE] PostgreSQL 종목 변경 감지 시작");
}

listenMarketChanges().catch(console.error);

// ===========================
// 기존 가격 조회 API
// ===========================

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/prices", (req, res) => {
  res.json({
    data: marketDataService.getAllPrices(),
  });
});

app.get("/prices/quote/:quote", (req, res) => {
  res.json({
    quote: req.params.quote.toUpperCase(),
    data: marketDataService.getPricesByQuote(req.params.quote),
  });
});

app.get("/prices/source/:source", (req, res) => {
  res.json({
    source: req.params.source.toUpperCase(),
    data: marketDataService.getPricesBySource(req.params.source),
  });
});

app.get("/prices/:asset", (req, res) => {
  res.json({
    asset: req.params.asset.toUpperCase(),
    data: marketDataService.getPricesByAsset(req.params.asset),
  });
});

// ===========================
// Biquote 종목 관리 API
// ===========================

// 전체 종목 조회
app.get("/api/markets", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT symbol, enabled
      FROM biquote_markets
      ORDER BY symbol
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "종목 조회 실패" });
  }
});

// 종목 추가
app.post("/api/markets", async (req, res) => {
  const { symbol, enabled = true } = req.body ?? {};

  if (
    typeof symbol !== "string" ||
    !/^[A-Z0-9]{2,30}$/.test(symbol) ||
    typeof enabled !== "boolean"
  ) {
    return res.status(400).json({ error: "잘못된 입력값" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO biquote_markets (symbol, enabled)
       VALUES ($1, $2)
       RETURNING symbol, enabled`,
      [symbol, enabled],
    );

    notifyMarketsChanged();

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);

    res.status(error.code === "23505" ? 409 : 500).json({
      error: "종목 추가 실패",
    });
  }
});

// 종목 활성화 / 비활성화
app.patch("/api/markets/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { enabled } = req.body ?? {};

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      error: "enabled는 boolean이어야 합니다",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE biquote_markets
       SET enabled = $1, updated_at = NOW()
       WHERE symbol = $2
         AND enabled IS DISTINCT FROM $1
       RETURNING symbol, enabled`,
      [enabled, symbol],
    );

    if (rows.length > 0) {
      notifyMarketsChanged();
    }

    res.json({
      updated: rows.length > 0,
      data: rows[0] ?? null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "종목 변경 실패" });
  }
});

// ===========================
// SSE 종목 변경 알림
// ===========================

app.get("/api/markets/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  clients.add(res);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// ===========================
// 서버 실행
// ===========================

app.listen(port, () => {
  console.log(`Market Data Server running on http://localhost:${port}`);

  marketDataService.start();
});

// import "dotenv/config";
// import express from "express";
// import { marketDataService } from "./services/market-data.service.js";

// const app = express();

// app.use(express.json());

// const port = Number(process.env.PORT) || 3002;

// app.get("/health", (req, res) => {
//   res.json({
//     status: "OK",
//   });
// });

// app.get("/prices", (req, res) => {
//   res.json({
//     data: marketDataService.getAllPrices(),
//   });
// });

// app.get("/prices/:asset", (req, res) => {
//   res.json({
//     asset: req.params.asset.toUpperCase(),
//     data: marketDataService.getPricesByAsset(req.params.asset),
//   });
// });

// app.get("/prices/quote/:quote", (req, res) => {
//   res.json({
//     quote: req.params.quote.toUpperCase(),
//     data: marketDataService.getPricesByQuote(req.params.quote),
//   });
// });

// app.get("/prices/source/:source", (req, res) => {
//   res.json({
//     source: req.params.source.toUpperCase(),
//     data: marketDataService.getPricesBySource(req.params.source),
//   });
// });

// app.listen(port, () => {
//   console.log(`Market Data Server running on http://localhost:${port}`);

//   marketDataService.start();
// });
