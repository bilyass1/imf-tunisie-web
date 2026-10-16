-- Upgrade schemas originally created by the former runtime bootstrap.
-- Validation intentionally aborts on bad legacy data; never silently drops a client/assignment.
ALTER TABLE imf_users ADD CONSTRAINT imf_users_role_valid CHECK(role IN ('admin','client'));
ALTER TABLE imf_users ADD CONSTRAINT imf_users_auth_version_valid CHECK(auth_version>=0);
ALTER TABLE imf_users ADD CONSTRAINT imf_users_property_fk FOREIGN KEY(project_slug,lot_ref) REFERENCES imf_lots(project_slug,ref);
ALTER TABLE imf_projects ADD CONSTRAINT imf_projects_data_object CHECK(jsonb_typeof(data)='object');
ALTER TABLE imf_messages ADD CONSTRAINT imf_messages_sender_valid CHECK(sender IN ('imf','client'));
ALTER TABLE imf_messages ADD CONSTRAINT imf_messages_body_valid CHECK(length(body) BETWEEN 1 AND 4000);
ALTER TABLE imf_records ADD CONSTRAINT imf_records_collection_valid CHECK(collection IN ('news','contacts','deals','activities','tasks','uploads','settings'));

CREATE TABLE imf_client_property_assignments (
 client_id text NOT NULL REFERENCES imf_users(id) ON DELETE CASCADE,
 project_slug text NOT NULL, lot_ref text NOT NULL, is_primary boolean NOT NULL DEFAULT false,
 PRIMARY KEY(project_slug,lot_ref),
 FOREIGN KEY(project_slug,lot_ref) REFERENCES imf_lots(project_slug,ref)
);
CREATE INDEX imf_assignments_client ON imf_client_property_assignments(client_id);
CREATE UNIQUE INDEX imf_assignments_primary ON imf_client_property_assignments(client_id) WHERE is_primary;
CREATE FUNCTION imf_sync_assignments() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.role=NEW.role AND OLD.project_slug IS NOT DISTINCT FROM NEW.project_slug AND OLD.lot_ref IS NOT DISTINCT FROM NEW.lot_ref AND OLD.data->'properties' IS NOT DISTINCT FROM NEW.data->'properties' THEN RETURN NEW; END IF;
 DELETE FROM imf_client_property_assignments WHERE client_id=NEW.id;
 IF NEW.role='client' THEN
   INSERT INTO imf_client_property_assignments(client_id,project_slug,lot_ref,is_primary)
   SELECT NEW.id,p.project,p.lot,COALESCE(bool_or(p.project=NEW.project_slug AND p.lot=NEW.lot_ref),false)
   FROM (
     SELECT item->>'projectSlug' AS project,item->>'lotRef' AS lot
       FROM jsonb_array_elements(COALESCE(NEW.data->'properties','[]'::jsonb)) item
     UNION ALL SELECT NEW.project_slug,NEW.lot_ref WHERE NEW.project_slug IS NOT NULL AND NEW.lot_ref IS NOT NULL
   ) p GROUP BY p.project,p.lot;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER imf_users_assignments AFTER INSERT OR UPDATE OF role,project_slug,lot_ref,data ON imf_users FOR EACH ROW EXECUTE FUNCTION imf_sync_assignments();
-- Fire validation/backfill without changing any user value, including credentials.
UPDATE imf_users SET data=data;
CREATE TABLE imf_auth_challenges (
 id text PRIMARY KEY, client_id text NOT NULL REFERENCES imf_users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('authenticate','register')), challenge text NOT NULL,
 auth_version integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE imf_passkeys (
 id text PRIMARY KEY, client_id text NOT NULL REFERENCES imf_users(id) ON DELETE CASCADE,
 public_key text NOT NULL, counter bigint NOT NULL DEFAULT 0, transports jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX imf_passkeys_client ON imf_passkeys(client_id);
CREATE TABLE imf_media_objects (
 id text PRIMARY KEY, object_key text NOT NULL UNIQUE, size integer NOT NULL CHECK(size BETWEEN 1 AND 8388608), sha256 text NOT NULL
);
CREATE TABLE imf_admin_sessions (
 id text PRIMARY KEY, client_id text NOT NULL REFERENCES imf_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX imf_admin_sessions_user ON imf_admin_sessions(client_id);
CREATE INDEX imf_contacts_email ON imf_records(lower(data->>'email')) WHERE collection='contacts';
CREATE INDEX imf_contacts_phone ON imf_records(regexp_replace(data->>'phone','\s','','g')) WHERE collection='contacts';
CREATE TABLE imf_media_deletions(object_key text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE imf_public_revision(id integer PRIMARY KEY CHECK(id=1),revision bigint NOT NULL DEFAULT 0);
INSERT INTO imf_public_revision(id) VALUES(1);
CREATE TABLE imf_client_revisions(client_id text PRIMARY KEY REFERENCES imf_users(id) ON DELETE CASCADE,revision bigint NOT NULL DEFAULT 0);
CREATE FUNCTION imf_client_revision_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text;
BEGIN
 IF TG_TABLE_NAME='imf_users' THEN target:=NEW.id;
 ELSIF TG_OP='DELETE' THEN target:=OLD.client_id;
 ELSE target:=NEW.client_id; END IF;
 INSERT INTO imf_client_revisions(client_id,revision) VALUES(target,1) ON CONFLICT(client_id) DO UPDATE SET revision=imf_client_revisions.revision+1;
 RETURN NULL;
END $$;
CREATE TRIGGER imf_users_client_revision AFTER INSERT OR UPDATE ON imf_users FOR EACH ROW EXECUTE FUNCTION imf_client_revision_changed();
CREATE TRIGGER imf_documents_client_revision AFTER INSERT OR UPDATE OR DELETE ON imf_documents FOR EACH ROW EXECUTE FUNCTION imf_client_revision_changed();
CREATE TRIGGER imf_messages_client_revision AFTER INSERT OR UPDATE OR DELETE ON imf_messages FOR EACH ROW EXECUTE FUNCTION imf_client_revision_changed();
INSERT INTO imf_schema_migrations(version) VALUES(6);
