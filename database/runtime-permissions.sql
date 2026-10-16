-- Example for the operator, NOT run automatically. Substitute the role name.
-- Run migrations as a dedicated owner; never make imf_app owner or superuser.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO imf_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO imf_app;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON imf_client_property_assignments FROM imf_app;
REVOKE UPDATE,DELETE,TRUNCATE ON imf_audit_events FROM imf_app;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON imf_schema_migrations FROM imf_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO imf_app;
