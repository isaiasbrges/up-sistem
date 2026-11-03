CREATE SCHEMA IF NOT EXISTS up;
CREATE SCHEMA IF NOT EXISTS up_private;
REVOKE ALL ON SCHEMA up, up_private FROM PUBLIC;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'up_app') THEN
    CREATE ROLE up_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'up_internal') THEN
    CREATE ROLE up_internal NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA up, up_private TO up_app, up_internal;

CREATE TABLE up.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  name text NOT NULL DEFAULT 'Aluno UP' CHECK (length(name) BETWEEN 2 AND 120),
  phone text CHECK (length(phone) <= 30),
  platform_role text NOT NULL DEFAULT 'aluno' CHECK (platform_role IN ('aluno','admin','suporte')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deletion_requested','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE up.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  product_code text NOT NULL CHECK (product_code IN ('front','essencial','kit')),
  status text NOT NULL CHECK (status IN ('active','refunded','chargeback','revoked')),
  origin text NOT NULL CHECK (origin IN ('kiwify','manual','legacy')),
  source_ref text NOT NULL CHECK (length(source_ref) BETWEEN 1 AND 254),
  order_id text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_code, origin, source_ref)
);
CREATE INDEX entitlements_active_user ON up.entitlements(user_id, product_code) WHERE status = 'active';

CREATE TABLE up_private.login_codes (
  user_id uuid PRIMARY KEY REFERENCES up.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL UNIQUE,
  code_hash bytea NOT NULL CHECK (octet_length(code_hash) = 32),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at timestamptz
);
CREATE TABLE up_private.sessions (
  token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX sessions_user ON up_private.sessions(user_id);
CREATE INDEX sessions_expiry ON up_private.sessions(expires_at);
CREATE TABLE up_private.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL CHECK (count > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX rate_limit_expiry ON up_private.rate_limit_buckets(expires_at);
CREATE TABLE up_private.login_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  ip inet,
  result text NOT NULL CHECK (result IN ('requested','success','invalid','unavailable','limited','delivery_failed')),
  created_at timestamptz NOT NULL
);
CREATE INDEX login_events_email_time ON up_private.login_events(email, created_at DESC);

CREATE TABLE up_private.kiwify_product_map (
  kiwify_product_id text PRIMARY KEY CHECK (length(kiwify_product_id) BETWEEN 1 AND 254),
  product_code text NOT NULL CHECK (product_code IN ('front','essencial','kit')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up_private.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  event_type text NOT NULL,
  signature_ok boolean NOT NULL,
  payload_encrypted text NOT NULL,
  body_digest text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','review','failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_code text,
  UNIQUE (order_id, event_type)
);
CREATE TABLE up_private.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_owner uuid,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX jobs_ready ON up_private.jobs(available_at) WHERE status IN ('pending','running');
CREATE TABLE up_private.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES up.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up_private.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up_private.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('message','offer','plan','procedure','fixed_text')),
  code text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, code, version)
);

CREATE TABLE up.diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('initial','repeated')),
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);
CREATE UNIQUE INDEX diagnostics_one_initial ON up.diagnostics(user_id) WHERE kind = 'initial';
CREATE INDEX diagnostics_history ON up.diagnostics(user_id, created_at DESC, id);

CREATE TABLE up.finance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ledger')),
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  revenue numeric(15,2) NOT NULL,
  after_debt numeric(20,2) NOT NULL,
  rule_version text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month),
  UNIQUE (user_id, id)
);
CREATE TABLE up.finance_snapshot_revisions (
  user_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  version integer NOT NULL,
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_id, version),
  FOREIGN KEY (user_id, snapshot_id) REFERENCES up.finance_snapshots(user_id,id) ON DELETE CASCADE
);

CREATE TABLE up.kit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 250),
  value numeric(15,2) NOT NULL CHECK (value > 0),
  type text NOT NULL CHECK (type IN ('entrada','saida')),
  category text NOT NULL CHECK (length(category) BETWEEN 1 AND 60),
  scope text NOT NULL CHECK (scope IN ('pessoal','empresa')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,id)
);
CREATE INDEX transactions_month ON up.kit_transactions(user_id, date DESC, id) WHERE deleted_at IS NULL;
CREATE TABLE up.kit_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 250),
  value numeric(15,2) NOT NULL CHECK (value > 0),
  due date NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,id)
);
CREATE INDEX bills_due ON up.kit_bills(user_id, due) WHERE NOT paid AND deleted_at IS NULL;
CREATE TABLE up.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  creditor text NOT NULL CHECK (length(creditor) BETWEEN 1 AND 250),
  scope text NOT NULL CHECK (scope IN ('empresa','pessoal')),
  balance numeric(15,2) NOT NULL CHECK (balance >= 0),
  payment numeric(15,2) NOT NULL CHECK (payment >= 0),
  rate numeric(9,6) NOT NULL CHECK (rate >= 0),
  overdue boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE up.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up.plans_90 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  reminder_day smallint CHECK (reminder_day BETWEEN 0 AND 6),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,id)
);
CREATE UNIQUE INDEX plans_one_current ON up.plans_90(user_id) WHERE archived_at IS NULL;
CREATE TABLE up.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) = 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id,plan_id) REFERENCES up.plans_90(user_id,id) ON DELETE CASCADE
);
CREATE INDEX checkins_history ON up.weekly_checkins(user_id, created_at DESC, id);
CREATE TABLE up.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE up.user_drafts (
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  resource text NOT NULL CHECK (resource IN ('diagnostic','finance')),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,resource)
);
CREATE TABLE up.consents (
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,terms_version,privacy_version)
);
CREATE TABLE up.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('export','delete')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE up_private.idempotency_keys (
  user_id uuid NOT NULL REFERENCES up.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,operation,key)
);
CREATE TABLE up_private.legacy_imports (
  source text NOT NULL,
  legacy_email text NOT NULL,
  legacy_resource text NOT NULL,
  legacy_id text NOT NULL,
  new_id uuid NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source,legacy_email,legacy_resource,legacy_id)
);

CREATE FUNCTION up_private.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('up.user_id', true), '')::uuid
$$;
CREATE FUNCTION up_private.has_product(product text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM up.entitlements e JOIN up.users u ON u.id=e.user_id
      WHERE e.user_id = up_private.current_user_id() AND u.status='active'
      AND (e.product_code = product OR (product = 'essencial' AND e.product_code = 'kit'))
      AND e.status = 'active' AND e.activated_at <= now()
      AND (e.expires_at IS NULL OR e.expires_at > now())
  )
$$;
REVOKE ALL ON FUNCTION up_private.current_user_id(), up_private.has_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION up_private.current_user_id(), up_private.has_product(text) TO up_app;

ALTER TABLE up.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE up.users FORCE ROW LEVEL SECURITY;
CREATE POLICY own_user ON up.users TO up_app
  USING (id = up_private.current_user_id()) WITH CHECK (id = up_private.current_user_id());
CREATE POLICY internal_identity ON up.users TO up_internal USING (true) WITH CHECK (true);
GRANT SELECT ON up.users TO up_app;
GRANT UPDATE(name) ON up.users TO up_app;
ALTER TABLE up.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE up.entitlements FORCE ROW LEVEL SECURITY;
CREATE POLICY own_entitlements ON up.entitlements FOR SELECT TO up_app USING (user_id = up_private.current_user_id());
CREATE POLICY internal_entitlements ON up.entitlements TO up_internal USING (true) WITH CHECK (true);
GRANT SELECT ON up.entitlements TO up_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON up.users, up.entitlements TO up_internal;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA up_private TO up_internal;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA up_private TO up_internal;
REVOKE ALL ON up_private.schema_migrations FROM up_internal;

DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('diagnostics','front'), ('finance_snapshots','front'), ('finance_snapshot_revisions','front'),
    ('kit_transactions','essencial'), ('kit_bills','essencial'), ('debts','essencial'),
    ('offers','kit'), ('plans_90','kit'), ('weekly_checkins','kit'), ('procedures','kit'),
    ('user_drafts','front')
  ) AS resources(table_name, product_code) LOOP
    EXECUTE format('ALTER TABLE up.%I ENABLE ROW LEVEL SECURITY', item.table_name);
    EXECUTE format('ALTER TABLE up.%I FORCE ROW LEVEL SECURITY', item.table_name);
    EXECUTE format('CREATE POLICY own_product ON up.%I TO up_app USING (user_id = up_private.current_user_id() AND up_private.has_product(%L)) WITH CHECK (user_id = up_private.current_user_id() AND up_private.has_product(%L))', item.table_name, item.product_code, item.product_code);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON up.%I TO up_app', item.table_name);
    EXECUTE format('CREATE INDEX ON up.%I(user_id)', item.table_name);
  END LOOP;
END $$;
REVOKE UPDATE, DELETE ON up.diagnostics, up.finance_snapshot_revisions, up.weekly_checkins FROM up_app;

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['consents','privacy_requests'] LOOP
    EXECUTE format('ALTER TABLE up.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE up.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY own_row ON up.%I TO up_app USING (user_id = up_private.current_user_id()) WITH CHECK (user_id = up_private.current_user_id())', tbl);
    EXECUTE format('CREATE POLICY internal_operations ON up.%I TO up_internal USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('GRANT SELECT, INSERT ON up.%I TO up_app', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON up.%I TO up_internal', tbl);
  END LOOP;
END $$;

-- A chave de idempotência participa da mesma transação do recurso do aluno.
ALTER TABLE up_private.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE up_private.idempotency_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY own_idempotency ON up_private.idempotency_keys TO up_app
  USING (user_id = up_private.current_user_id()) WITH CHECK (user_id = up_private.current_user_id());
CREATE POLICY internal_idempotency ON up_private.idempotency_keys TO up_internal USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON up_private.idempotency_keys TO up_app;

-- O servidor não recebe a credencial que criou o esquema na publicação.
REVOKE CREATE ON SCHEMA up, up_private FROM up_app, up_internal;
