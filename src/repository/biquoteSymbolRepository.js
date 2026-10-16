import { pool } from "../db.js";

export async function getBiquoteSymbols() {
  const { rows } = await pool.query(`
    SELECT symbol
    FROM biquote_markets
    WHERE enabled = true
    ORDER BY symbol
  `);

  return rows.map((row) => row.symbol);
}
