-- Deactivate legacy smoke/super/demo users so go-live staff (ids 1200-1215) are the
-- only active department test accounts. Does not delete rows (preserves FK history).
--
-- Usage:
--   docker exec -i openelisglobal-database psql -U clinlims -d clinlims -f - \
--     < scripts/deactivate-legacy-smoke-users.sql

BEGIN;

-- Smoke persona users (populate-notebook-users.sh: 1100-1119)
UPDATE clinlims.login_user
SET account_disabled = 'Y', account_locked = 'Y'
WHERE id BETWEEN 1100 AND 1119;

UPDATE clinlims.system_user
SET is_active = 'N', lastupdated = NOW()
WHERE id BETWEEN 1100 AND 1119;

-- Department super-users (populate-department-super-users.sh: 1120-1133)
UPDATE clinlims.login_user
SET account_disabled = 'Y', account_locked = 'Y'
WHERE id BETWEEN 1120 AND 1133;

UPDATE clinlims.system_user
SET is_active = 'N', lastupdated = NOW()
WHERE id BETWEEN 1120 AND 1133;

-- Legacy legacy-dept users (1000-1012) if present
UPDATE clinlims.login_user
SET account_disabled = 'Y', account_locked = 'Y'
WHERE id BETWEEN 1000 AND 1012;

UPDATE clinlims.system_user
SET is_active = 'N', lastupdated = NOW()
WHERE id BETWEEN 1000 AND 1012;

-- Legacy single-account mntd (common old login)
UPDATE clinlims.login_user lu
SET account_disabled = 'Y', account_locked = 'Y'
FROM clinlims.system_user su
WHERE su.id = lu.id
  AND lower(su.login_name) IN ('mntd', 'newmntd', 'mntd_super');

UPDATE clinlims.system_user
SET is_active = 'N', lastupdated = NOW()
WHERE lower(login_name) IN ('mntd', 'newmntd', 'mntd_super');

-- Ensure go-live users stay active (1200-1215)
UPDATE clinlims.login_user
SET account_disabled = 'N', account_locked = 'N'
WHERE id BETWEEN 1200 AND 1215;

UPDATE clinlims.system_user
SET is_active = 'Y', lastupdated = NOW()
WHERE id BETWEEN 1200 AND 1215;

COMMIT;

SELECT su.login_name,
       su.is_active,
       lu.account_disabled,
       lu.account_locked
FROM clinlims.system_user su
JOIN clinlims.login_user lu ON lu.id = su.id
WHERE su.id BETWEEN 1000 AND 1215
   OR lower(su.login_name) IN ('mntd', 'newmntd')
ORDER BY su.id;
