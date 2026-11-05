CREATE TABLE up_private.admin_passwords (
  user_id uuid PRIMARY KEY REFERENCES up.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON up_private.admin_passwords FROM PUBLIC, up_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON up_private.admin_passwords TO up_internal;
ALTER TABLE up_private.login_codes ADD COLUMN purpose text NOT NULL DEFAULT 'login'
  CHECK (purpose IN ('login', 'password_reset'));
