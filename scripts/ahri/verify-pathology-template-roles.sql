-- Verify Pathology Laboratory notebook template allowed_roles (AHRI go-live).
-- Run against production after connecting to clinlims schema.
-- If legacy names appear (e.g. "Technician") but users have AHRI personas
-- ("Laboratory Technician"), update template roles or run backfill changeset.

SELECT n.id,
       n.title,
       n.is_template,
       array_agg(nar.role ORDER BY nar.role) AS allowed_roles
FROM clinlims.notebook n
LEFT JOIN clinlims.notebook_allowed_roles nar ON nar.notebook_id = n.id
WHERE n.title ILIKE 'Pathology Laboratory%'
GROUP BY n.id, n.title, n.is_template
ORDER BY n.id;

-- Expected AHRI persona names (from ahri-workflows.csv):
-- Sample Collector, Laboratory Technician, Junior Researcher, Senior Researcher, Lab Manager
