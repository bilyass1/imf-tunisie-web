-- Historical unconstrained runtime schema; regression fixture only.
CREATE TABLE IF NOT EXISTS imf_schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS imf_projects (slug text PRIMARY KEY, data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS imf_lots (project_slug text NOT NULL REFERENCES imf_projects(slug), ref text NOT NULL, status text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(project_slug,ref));
    CREATE TABLE IF NOT EXISTS imf_users (id text PRIMARY KEY, email text NOT NULL, role text NOT NULL, password_hash text NOT NULL, auth_version integer NOT NULL DEFAULT 0, project_slug text, lot_ref text, data jsonb NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS imf_users_email_unique ON imf_users(lower(email));
    CREATE UNIQUE INDEX IF NOT EXISTS imf_client_lot_unique ON imf_users(project_slug,lot_ref) WHERE role='client';
    CREATE TABLE IF NOT EXISTS imf_messages (client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL, sender text NOT NULL, sent_at timestamptz NOT NULL, body text NOT NULL, PRIMARY KEY(client_id,id));
    CREATE TABLE IF NOT EXISTS imf_documents (client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL, archived boolean NOT NULL DEFAULT false, data jsonb NOT NULL, PRIMARY KEY(client_id,id));
    CREATE TABLE IF NOT EXISTS imf_records (collection text NOT NULL, id text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, PRIMARY KEY(collection,id));
    CREATE TABLE IF NOT EXISTS imf_revision (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0);
    INSERT INTO imf_revision(id) VALUES(1) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS imf_media (id text PRIMARY KEY, bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 8388608));
    CREATE TABLE IF NOT EXISTS imf_rate_limits (key text PRIMARY KEY, count integer NOT NULL CHECK(count > 0), expires_at timestamptz NOT NULL);
    CREATE INDEX IF NOT EXISTS imf_rate_limits_expires_at ON imf_rate_limits(expires_at);
    INSERT INTO imf_schema_migrations(version) VALUES(1),(2),(3) ON CONFLICT DO NOTHING;
