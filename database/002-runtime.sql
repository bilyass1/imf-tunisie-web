CREATE TABLE IF NOT EXISTS imf_revision (
 id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0
);
INSERT INTO imf_revision(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS imf_media (
 id text PRIMARY KEY,
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 8388608)
);
INSERT INTO imf_schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
