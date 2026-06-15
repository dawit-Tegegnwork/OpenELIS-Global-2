-- Skip 053-seed-notebook-demo-stock when demo inventory already exists (AHRI prod fix).
-- Run on server:
--   sudo docker exec -i openelisglobal-database psql -U clinlims -d clinlims < scripts/repair-liquibase-053-seed-skip.sql
-- Then: sudo docker restart openelisglobal-webapp

BEGIN;

-- Show current state
SELECT id, author, exectype, dateexecuted
FROM clinlims.databasechangelog
WHERE id IN ('053-seed-notebook-demo-stock', '053-backfill-notebook-scope-and-demo-stock')
ORDER BY dateexecuted;

SELECT name, catalog_number, department_test_section_id, fhir_uuid
FROM clinlims.inventory_item
WHERE catalog_number IN (
    'VV-MEDIA-001', 'VV-REAG-001', 'VIR-MEDIA-001', 'VIR-REAG-001', 'GEN-REAG-001', 'GEN-REAG-002'
)
ORDER BY catalog_number;

-- Mark seed changeset as already applied so Liquibase can continue to 074+
INSERT INTO clinlims.databasechangelog (
    id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, liquibase
)
SELECT
    '053-seed-notebook-demo-stock',
    'orbithealth',
    'liquibase/3.5.x.x/053-backfill-notebook-scope-and-demo-stock.xml',
    NOW(),
    (SELECT COALESCE(MAX(orderexecuted), 0) + 1 FROM clinlims.databasechangelog),
    'MARK_RAN',
    '8:5e67c33ce74c7eb7588e2747352b7b95',
    'Skipped: demo stock already present on AHRI server',
    '4.8.0'
WHERE NOT EXISTS (
    SELECT 1 FROM clinlims.databasechangelog
    WHERE id = '053-seed-notebook-demo-stock' AND author = 'orbithealth'
);

DELETE FROM clinlims.databasechangeloglock WHERE locked = true;

COMMIT;
