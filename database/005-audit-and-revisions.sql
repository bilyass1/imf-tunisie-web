-- Add-only metadata migration; never changes user credentials or lot statuses.
CREATE TABLE IF NOT EXISTS imf_audit_events (id text PRIMARY KEY, at timestamptz NOT NULL, actor_id text NOT NULL, operation text NOT NULL, data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS imf_audit_at ON imf_audit_events(at DESC);
CREATE OR REPLACE FUNCTION imf_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append only'; END $$;
DROP TRIGGER IF EXISTS imf_audit_immutable ON imf_audit_events;
CREATE TRIGGER imf_audit_immutable BEFORE UPDATE OR DELETE ON imf_audit_events FOR EACH ROW EXECUTE FUNCTION imf_audit_append_only();
ALTER TABLE imf_lots DROP CONSTRAINT IF EXISTS imf_lots_status_check;
ALTER TABLE imf_lots ADD CONSTRAINT imf_lots_status_check CHECK(status IN ('available','reserved','sold','unconfirmed')) NOT VALID;
ALTER TABLE imf_lots VALIDATE CONSTRAINT imf_lots_status_check;
CREATE TABLE IF NOT EXISTS imf_conversation_revisions (client_id text PRIMARY KEY, revision bigint NOT NULL DEFAULT 0);
CREATE OR REPLACE FUNCTION imf_message_revision() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE target text; BEGIN IF TG_OP='DELETE' THEN target:=OLD.client_id; ELSE target:=NEW.client_id; END IF; INSERT INTO imf_conversation_revisions(client_id,revision) VALUES(target,1) ON CONFLICT(client_id) DO UPDATE SET revision=imf_conversation_revisions.revision+1; RETURN NULL; END $$;
DROP TRIGGER IF EXISTS imf_messages_revision ON imf_messages;
CREATE TRIGGER imf_messages_revision AFTER INSERT OR UPDATE OR DELETE ON imf_messages FOR EACH ROW EXECUTE FUNCTION imf_message_revision();
CREATE INDEX IF NOT EXISTS imf_messages_conversation ON imf_messages(client_id,sent_at,id);
INSERT INTO imf_schema_migrations(version) VALUES(5) ON CONFLICT DO NOTHING;
