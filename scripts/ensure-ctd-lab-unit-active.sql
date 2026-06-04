-- Ensure CTD appears in User Management Lab Unit Roles (active test_section + canonical name).
-- Run on production after reviewing current state.
--
-- Diagnose first:
--   SELECT ts.id, ts.name, ts.description, ts.is_active, loc.english
--   FROM clinlims.test_section ts
--   LEFT JOIN clinlims.localization loc ON loc.id = ts.name_localization_id
--   WHERE ts.name ILIKE '%CTD%' OR ts.name ILIKE '%Medical%' OR loc.english ILIKE '%CTD%';
--
-- Usage:
--   docker exec -i openelisglobal-database psql -U clinlims -d clinlims -f - < scripts/ensure-ctd-lab-unit-active.sql

BEGIN;

-- Reactivate CTD / legacy Medical Laboratory row
UPDATE clinlims.test_section ts
SET is_active = 'Y',
    lastupdated = NOW()
WHERE ts.name IN ('CTD', 'Medical Laboratory')
   OR ts.id = 181;

-- Normalize name and description (matches Liquibase 039-rename-ctd-viral-vaccine-departments)
UPDATE clinlims.test_section
SET name = 'CTD',
    description = 'CTD Department',
    lastupdated = NOW()
WHERE id = 181
   OR name = 'Medical Laboratory';

UPDATE clinlims.localization loc
SET english = 'CTD',
    french = COALESCE(NULLIF(TRIM(loc.french), ''), 'CTD'),
    lastupdated = NOW()
WHERE loc.id IN (
    SELECT name_localization_id
    FROM clinlims.test_section
    WHERE name = 'CTD' OR id = 181
);

COMMIT;

-- After running: restart openelisglobal-webapp so DisplayListService refreshes TEST_SECTION_ACTIVE.
