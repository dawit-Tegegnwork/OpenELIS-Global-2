-- AHRI go-live cleanup (phased, FK-safe)
-- Set psql variables before running execute mode:
--   \set KEEP_BACT_ENTRY_ID 12345
--
-- ALWAYS run inventory + dry-run first via go-live-cleanup-dry-run.sh

\echo '=== Phase 0: Preconditions ==='
SELECT locked, lockgranted, lockedby FROM clinlims.databasechangeloglock;

\echo '=== Inventory: row counts ==='
SELECT 'bio_sample' AS table_name, COUNT(*) FROM clinlims.bio_sample
UNION ALL SELECT 'notebook_entry', COUNT(*) FROM clinlims.notebook_entry
UNION ALL SELECT 'notebook', COUNT(*) FROM clinlims.notebook
UNION ALL SELECT 'sample_storage_assignment', COUNT(*) FROM clinlims.sample_storage_assignment
UNION ALL SELECT 'storage_room', COUNT(*) FROM clinlims.storage_room
UNION ALL SELECT 'storage_device', COUNT(*) FROM clinlims.storage_device
UNION ALL SELECT 'storage_box', COUNT(*) FROM clinlims.storage_box;

\echo '=== Identify newest bacteriology notebook_entry (set KEEP_BACT_ENTRY_ID) ==='
SELECT ne.id, ne.entry_number, n.name AS template_name, ne.lastupdated,
       COUNT(nes.sample_item_id) AS sample_count
FROM clinlims.notebook_entry ne
JOIN clinlims.notebook n ON n.id = ne.notebook_id
LEFT JOIN clinlims.notebook_entry_sample nes ON nes.notebook_entry_id = ne.id
WHERE LOWER(n.name) LIKE '%bacteriology%'
   OR ne.notebook_id IN (
     SELECT nd.notebook_id FROM clinlims.notebook_departments nd
     JOIN clinlims.test_section ts ON ts.id = nd.test_section_id
     WHERE LOWER(ts.name) LIKE '%bacteriology%'
   )
GROUP BY ne.id, n.name
ORDER BY ne.lastupdated DESC NULLS LAST, ne.id DESC
LIMIT 5;

\echo '=== KEEP sample_item_ids: bio_sample union bacteriology entry ==='
-- Preview only; execute script materializes into temp table.
WITH keep_bio AS (
  SELECT si.id AS sample_item_id
  FROM clinlims.bio_sample bs
  JOIN clinlims.sample_item si ON si.id = bs.sample_item_id
),
keep_bact AS (
  SELECT nes.sample_item_id
  FROM clinlims.notebook_entry_sample nes
  WHERE nes.notebook_entry_id = :KEEP_BACT_ENTRY_ID
)
SELECT COUNT(DISTINCT sample_item_id) AS keep_sample_count
FROM (
  SELECT sample_item_id FROM keep_bio
  UNION
  SELECT sample_item_id FROM keep_bact
) keep_samples;

\if :{?DRY_RUN}
\echo 'DRY_RUN=1 — no deletes executed'
\else
\echo '=== Phase 1: Delete non-kept notebook_entry instances ==='
CREATE TEMP TABLE keep_notebook_entries (id INTEGER PRIMARY KEY);
INSERT INTO keep_notebook_entries(id)
SELECT :KEEP_BACT_ENTRY_ID
UNION
SELECT id FROM clinlims.notebook WHERE is_template = true;

DELETE FROM clinlims.notebook_entry ne
WHERE ne.id NOT IN (SELECT id FROM keep_notebook_entries)
  AND ne.notebook_id NOT IN (SELECT id FROM clinlims.notebook WHERE is_template = true);

\echo '=== Phase 2: Orphan training samples (not in KEEP set, no bio_sample) ==='
CREATE TEMP TABLE keep_sample_items (sample_item_id INTEGER PRIMARY KEY);
INSERT INTO keep_sample_items(sample_item_id)
SELECT si.id FROM clinlims.bio_sample bs
JOIN clinlims.sample_item si ON si.id = bs.sample_item_id
UNION
SELECT nes.sample_item_id FROM clinlims.notebook_entry_sample nes
WHERE nes.notebook_entry_id = :KEEP_BACT_ENTRY_ID;

-- Child tables first (subset — extend if FK errors occur)
DELETE FROM clinlims.result r
USING clinlims.analysis a
JOIN clinlims.sample_item si ON si.id = a.sampitem_id
WHERE r.analysis_id = a.id
  AND si.id NOT IN (SELECT sample_item_id FROM keep_sample_items)
  AND NOT EXISTS (SELECT 1 FROM clinlims.bio_sample bs WHERE bs.sample_item_id = si.id);

DELETE FROM clinlims.analysis a
USING clinlims.sample_item si
WHERE a.sampitem_id = si.id
  AND si.id NOT IN (SELECT sample_item_id FROM keep_sample_items)
  AND NOT EXISTS (SELECT 1 FROM clinlims.bio_sample bs WHERE bs.sample_item_id = si.id);

DELETE FROM clinlims.sample_storage_movement ssm
USING clinlims.sample_storage_assignment ssa
JOIN clinlims.sample_item si ON si.id = ssa.sample_item_id
WHERE ssm.assignment_id = ssa.id
  AND si.id NOT IN (SELECT sample_item_id FROM keep_sample_items);

DELETE FROM clinlims.sample_storage_assignment ssa
USING clinlims.sample_item si
WHERE ssa.sample_item_id = si.id
  AND si.id NOT IN (SELECT sample_item_id FROM keep_sample_items);

DELETE FROM clinlims.sample_human sh
USING clinlims.sample s
JOIN clinlims.sample_item si ON si.samp_id = s.id
WHERE sh.samp_id = s.id
  AND si.id NOT IN (SELECT sample_item_id FROM keep_sample_items)
  AND NOT EXISTS (SELECT 1 FROM clinlims.bio_sample bs WHERE bs.sample_item_id = si.id);

DELETE FROM clinlims.sample_item si
WHERE si.id NOT IN (SELECT sample_item_id FROM keep_sample_items)
  AND NOT EXISTS (SELECT 1 FROM clinlims.bio_sample bs WHERE bs.sample_item_id = si.id);

\echo '=== Phase 3: Cancel stale biorepository workflow noise ==='
UPDATE clinlims.sample_retrieval_request
SET status = 'CANCELLED'
WHERE status = 'PENDING';

UPDATE clinlims.sample_transfer_request
SET status = 'CANCELLED'
WHERE status IN ('PENDING', 'IN_PROGRESS')
  AND id NOT IN (
    SELECT DISTINCT str.id
    FROM clinlims.sample_transfer_request str
    JOIN clinlims.sample_transfer_item sti ON sti.transfer_request_id = str.id
    JOIN clinlims.bio_sample bs ON bs.sample_item_id = sti.sample_item_id
  );

\echo '=== Phase 4: Storage prune (only unassigned locations) ==='
-- Prefer deactivating over delete when assignments exist.
UPDATE clinlims.storage_box b
SET active = false
WHERE b.active = true
  AND NOT EXISTS (
    SELECT 1 FROM clinlims.sample_storage_assignment ssa
    WHERE ssa.location_type = 'box' AND ssa.location_id = b.id
  );

\echo '=== Post-cleanup inventory ==='
SELECT 'bio_sample' AS table_name, COUNT(*) FROM clinlims.bio_sample
UNION ALL SELECT 'notebook_entry', COUNT(*) FROM clinlims.notebook_entry
UNION ALL SELECT 'sample_storage_assignment', COUNT(*) FROM clinlims.sample_storage_assignment;
\endif
