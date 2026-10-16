CREATE TABLE IF NOT EXISTS biquote_markets (
    symbol VARCHAR(30) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO biquote_markets (symbol, enabled)
VALUES
    ('XAUUSD', true),
    ('XAGUSD', true),
    ('USOIL', true),
    ('UKOIL', true),
    ('XCUUSD', true),
    ('XALUSD', true),
    ('XNIUSD', true),
    ('XZNUSD', true),
    ('XPBUSD', true),
    ('XPDUSD', true),
    ('XPTUSD', true),
    ('XNGUSD', true)
ON CONFLICT (symbol) DO NOTHING;