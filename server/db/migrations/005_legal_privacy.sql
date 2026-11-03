CREATE TABLE up_private.legal_documents (
  kind text NOT NULL CHECK(kind IN ('terms','privacy')),
  version text NOT NULL CHECK(length(version) BETWEEN 1 AND 64),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK(length(body) BETWEEN 1 AND 100000),
  digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
  created_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(kind,version)
);
CREATE TABLE up_private.legal_publication (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  terms_kind text NOT NULL DEFAULT 'terms' CHECK(terms_kind='terms'),
  privacy_kind text NOT NULL DEFAULT 'privacy' CHECK(privacy_kind='privacy'),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  published_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  published_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(terms_kind,terms_version) REFERENCES up_private.legal_documents(kind,version),
  FOREIGN KEY(privacy_kind,privacy_version) REFERENCES up_private.legal_documents(kind,version)
);
CREATE TABLE up_private.legal_publication_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  published_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON up_private.legal_documents,up_private.legal_publication_history TO up_internal;
GRANT SELECT,INSERT,UPDATE ON up_private.legal_publication TO up_internal;
GRANT USAGE,SELECT ON SEQUENCE up_private.legal_publication_history_id_seq TO up_internal;

ALTER TABLE up.consents ADD COLUMN terms_digest text,
  ADD COLUMN privacy_digest text, ADD COLUMN ip inet, ADD COLUMN user_agent text;
-- Aceites são escritos pelo serviço após validar as versões efetivamente publicadas.
REVOKE INSERT,UPDATE,DELETE ON up.consents FROM up_app;
REVOKE UPDATE,DELETE ON up.consents FROM up_internal;

ALTER TABLE up.privacy_requests DROP CONSTRAINT privacy_requests_status_check;
ALTER TABLE up.privacy_requests ADD CONSTRAINT privacy_requests_status_check
  CHECK(status IN ('pending','processing','done','rejected','cancelled'));
ALTER TABLE up.privacy_requests ADD COLUMN reason text NOT NULL DEFAULT '',
  ADD COLUMN resolution_note text NOT NULL DEFAULT '',
  ADD COLUMN handled_by uuid REFERENCES up.users(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX one_open_deletion ON up.privacy_requests(user_id)
  WHERE kind='delete' AND status IN ('pending','processing');
CREATE INDEX privacy_requests_user_created ON up.privacy_requests(user_id,created_at DESC);

ALTER TABLE up_private.login_events ADD COLUMN user_id uuid REFERENCES up.users(id) ON DELETE SET NULL;
UPDATE up_private.login_events e SET user_id=u.id FROM up.users u WHERE u.email=e.email;
CREATE INDEX login_events_user_date ON up_private.login_events(user_id,created_at);

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='up_exporter') THEN
    CREATE ROLE up_exporter NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='up_exporter' AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)) THEN
    RAISE EXCEPTION 'Papel de exportação incompatível';
  END IF;
END $$;
GRANT USAGE ON SCHEMA up,up_private TO up_exporter;
GRANT EXECUTE ON FUNCTION up_private.current_user_id() TO up_exporter;
GRANT SELECT ON up.users,up.entitlements,up_private.login_events TO up_exporter;
CREATE POLICY export_own_user ON up.users FOR SELECT TO up_exporter USING(id=up_private.current_user_id());
CREATE POLICY export_own_access ON up.entitlements FOR SELECT TO up_exporter USING(user_id=up_private.current_user_id());
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['diagnostics','finance_snapshots','finance_snapshot_revisions','kit_transactions','kit_bills','debts','offers','plans_90','weekly_checkins','procedures','user_drafts','consents','privacy_requests'] LOOP
    EXECUTE format('GRANT SELECT ON up.%I TO up_exporter',tbl);
    EXECUTE format('CREATE POLICY export_own ON up.%I FOR SELECT TO up_exporter USING(user_id=up_private.current_user_id())',tbl);
  END LOOP;
END $$;

-- Direito de consultar todos os próprios dados, inclusive de produtos vencidos.
-- Não recebe um ID arbitrário e não inclui senhas, códigos, sessões, segredos ou payloads comerciais.
CREATE FUNCTION up_private.export_personal_data() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'formatVersion',1,'exportedAt',now(),'identity',to_jsonb(u),
    'accesses', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.activated_at,x.id) FROM up.entitlements x WHERE x.user_id=u.id),'[]'::jsonb),
    'diagnostics', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.diagnostics x WHERE x.user_id=u.id),'[]'::jsonb),
    'financialSnapshots', coalesce((SELECT jsonb_agg(to_jsonb(x)||jsonb_build_object('revenue',x.revenue::text,'after_debt',x.after_debt::text) ORDER BY x.month,x.id) FROM up.finance_snapshots x WHERE x.user_id=u.id),'[]'::jsonb),
    'financialRevisions', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.snapshot_id,x.version) FROM up.finance_snapshot_revisions x WHERE x.user_id=u.id),'[]'::jsonb),
    'transactions', coalesce((SELECT jsonb_agg(to_jsonb(x)||jsonb_build_object('value',x.value::text) ORDER BY x.date,x.id) FROM up.kit_transactions x WHERE x.user_id=u.id),'[]'::jsonb),
    'bills', coalesce((SELECT jsonb_agg(to_jsonb(x)||jsonb_build_object('value',x.value::text) ORDER BY x.due,x.id) FROM up.kit_bills x WHERE x.user_id=u.id),'[]'::jsonb),
    'debts', coalesce((SELECT jsonb_agg(to_jsonb(x)||jsonb_build_object('balance',x.balance::text,'payment',x.payment::text,'rate',x.rate::text) ORDER BY x.created_at,x.id) FROM up.debts x WHERE x.user_id=u.id),'[]'::jsonb),
    'offers', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.offers x WHERE x.user_id=u.id),'[]'::jsonb),
    'plans', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.plans_90 x WHERE x.user_id=u.id),'[]'::jsonb),
    'checkins', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.weekly_checkins x WHERE x.user_id=u.id),'[]'::jsonb),
    'procedures', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.procedures x WHERE x.user_id=u.id),'[]'::jsonb),
    'drafts', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.resource) FROM up.user_drafts x WHERE x.user_id=u.id),'[]'::jsonb),
    'consents', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.accepted_at) FROM up.consents x WHERE x.user_id=u.id),'[]'::jsonb),
    'privacyRequests', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) FROM up.privacy_requests x WHERE x.user_id=u.id),'[]'::jsonb),
    'loginEvents',coalesce((SELECT jsonb_agg(jsonb_build_object('at',e.created_at,'ip',e.ip,'result',e.result) ORDER BY e.created_at,e.id)
      FROM up_private.login_events e WHERE e.user_id=u.id),'[]'::jsonb)
  ) FROM up.users u WHERE u.id=up_private.current_user_id() AND u.status='active';
$$;
REVOKE ALL ON FUNCTION up_private.export_personal_data() FROM PUBLIC;
GRANT CREATE ON SCHEMA up_private TO up_exporter;
ALTER FUNCTION up_private.export_personal_data() OWNER TO up_exporter;
REVOKE CREATE ON SCHEMA up_private FROM up_exporter;
GRANT EXECUTE ON FUNCTION up_private.export_personal_data() TO up_app;
