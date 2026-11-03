CREATE TABLE up_private.purchase_orders (
  order_id text PRIMARY KEY,
  user_id uuid REFERENCES up.users(id) ON DELETE SET NULL,
  product_code text CHECK (product_code IN ('front','essencial','kit')),
  external_product_id text,
  status text NOT NULL CHECK (status IN ('paid','refunded','chargeback')),
  first_event_id uuid NOT NULL REFERENCES up_private.webhook_events(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up_private.webhook_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES up_private.webhook_events(id) ON DELETE CASCADE,
  body_digest text NOT NULL,
  payload_encrypted text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_deliveries_event ON up_private.webhook_deliveries(event_id,received_at);
GRANT SELECT, INSERT, UPDATE ON up_private.purchase_orders TO up_internal;
GRANT SELECT, INSERT ON up_private.webhook_deliveries TO up_internal;
GRANT USAGE, SELECT ON SEQUENCE up_private.webhook_deliveries_id_seq TO up_internal;
