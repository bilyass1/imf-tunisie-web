-- Retire the old reset without rewriting commercial data.
INSERT INTO imf_schema_migrations(version) VALUES(4) ON CONFLICT DO NOTHING;
ALTER TABLE imf_lots DROP CONSTRAINT IF EXISTS imf_lots_status_check;
ALTER TABLE imf_lots ADD CONSTRAINT imf_lots_status_check CHECK(status IN ('available','reserved','sold','unconfirmed')) NOT VALID;
ALTER TABLE imf_lots VALIDATE CONSTRAINT imf_lots_status_check;
