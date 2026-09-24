CREATE TABLE IF NOT EXISTS imf_rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL CHECK(count > 0),
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS imf_rate_limits_expires_at ON imf_rate_limits(expires_at);
INSERT INTO imf_schema_migrations(version) VALUES(3) ON CONFLICT DO NOTHING;
