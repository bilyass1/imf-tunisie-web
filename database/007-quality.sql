-- Query shapes used by bounded CRM pages and availability searches.
CREATE INDEX imf_crm_contact ON imf_records(collection,(data->>'contactId'),id) WHERE collection IN ('deals','activities','tasks');
CREATE INDEX imf_crm_stage ON imf_records((data->>'stage'),id) WHERE collection='deals';
CREATE INDEX imf_crm_due ON imf_records((data->>'dueDate'),id) WHERE collection='tasks' AND data->>'done'='false';
CREATE INDEX imf_crm_recent ON imf_records((data->>'date') DESC,id DESC) WHERE collection='activities';
CREATE INDEX imf_lots_status_project ON imf_lots(status,project_slug,ref);
CREATE TABLE imf_web_vitals (
 id text NOT NULL CHECK(length(id) BETWEEN 1 AND 100),
 metric text NOT NULL CHECK(metric IN ('LCP','INP','CLS','TTFB','FCP')),
 route text NOT NULL CHECK(route IN ('home','projects','project','apartment','search','contact','group','news','other','client','admin','login')),
 locale text NOT NULL CHECK(locale IN ('fr','en','ar')),
 device text NOT NULL CHECK(device IN ('mobile','desktop')),
 value double precision NOT NULL CHECK(value>=0 AND value<=3600000),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(id,metric)
);
CREATE INDEX imf_vitals_period ON imf_web_vitals(recorded_at);
INSERT INTO imf_schema_migrations(version) VALUES(7);
