CREATE TABLE IF NOT EXISTS imf_schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS imf_projects (slug text PRIMARY KEY, data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'));
CREATE TABLE IF NOT EXISTS imf_lots (
 project_slug text NOT NULL REFERENCES imf_projects(slug), ref text NOT NULL,
 status text NOT NULL CHECK(status IN ('available','reserved','sold')), data jsonb NOT NULL,
 PRIMARY KEY(project_slug,ref)
);
CREATE TABLE IF NOT EXISTS imf_users (
 id text PRIMARY KEY, email text NOT NULL, role text NOT NULL CHECK(role IN ('admin','client')),
 password_hash text NOT NULL, auth_version integer NOT NULL DEFAULT 0 CHECK(auth_version>=0),
 project_slug text, lot_ref text, data jsonb NOT NULL,
 FOREIGN KEY(project_slug,lot_ref) REFERENCES imf_lots(project_slug,ref)
);
CREATE UNIQUE INDEX IF NOT EXISTS imf_users_email_unique ON imf_users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS imf_client_lot_unique ON imf_users(project_slug,lot_ref) WHERE role='client';
CREATE TABLE IF NOT EXISTS imf_messages (
 client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL,
 sender text NOT NULL CHECK(sender IN ('imf','client')), sent_at timestamptz NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), PRIMARY KEY(client_id,id)
);
CREATE INDEX IF NOT EXISTS imf_messages_conversation ON imf_messages(client_id,sent_at,id);
CREATE TABLE IF NOT EXISTS imf_documents (
 client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL, archived boolean NOT NULL DEFAULT false,
 data jsonb NOT NULL, PRIMARY KEY(client_id,id)
);
CREATE TABLE IF NOT EXISTS imf_records (
 collection text NOT NULL CHECK(collection IN ('news','contacts','deals','activities','tasks','uploads','settings')),
 id text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, PRIMARY KEY(collection,id)
);
INSERT INTO imf_schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
