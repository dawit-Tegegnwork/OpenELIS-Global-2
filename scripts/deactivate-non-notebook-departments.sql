-- Optional production cleanup: deactivate test_section rows not linked to any
-- notebook template department (notebook_departments / parent template linkages).
--
-- Run ONLY after reviewing impact on existing storage rooms and inventory items
-- that may still reference legacy department IDs.
--
-- Usage (on server):
--   docker exec -i openelisglobal-database psql -U clinlims -d clinlims -f - < scripts/deactivate-non-notebook-departments.sql

BEGIN;

-- Preview rows that would be deactivated
SELECT ts.id, ts.name, ts.is_active
FROM clinlims.test_section ts
WHERE COALESCE(ts.is_active, 'Y') = 'Y'
  AND ts.id NOT IN (
    SELECT DISTINCT nd.test_section_id
    FROM clinlims.notebook_departments nd
    WHERE nd.test_section_id IS NOT NULL
  )
ORDER BY ts.name;

-- Deactivate legacy departments not linked to notebook templates
UPDATE clinlims.test_section ts
SET is_active = 'N',
    lastupdated = NOW()
WHERE COALESCE(ts.is_active, 'Y') = 'Y'
  AND ts.id NOT IN (
    SELECT DISTINCT nd.test_section_id
    FROM clinlims.notebook_departments nd
    WHERE nd.test_section_id IS NOT NULL
  );

COMMIT;
