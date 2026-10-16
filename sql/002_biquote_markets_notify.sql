CREATE OR REPLACE FUNCTION notify_biquote_market_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('biquote_markets_changed', '{}');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS biquote_market_change
ON biquote_markets;

CREATE TRIGGER biquote_market_change
AFTER INSERT OR DELETE OR UPDATE OF symbol, enabled
ON biquote_markets
FOR EACH ROW
EXECUTE FUNCTION notify_biquote_market_change();