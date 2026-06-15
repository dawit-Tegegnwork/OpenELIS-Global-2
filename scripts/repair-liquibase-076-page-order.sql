-- Manual repair when Liquibase 076 fails on notebook_page unique (notebook_id, page_order).
-- Run ONLY if 076-reorder-biorepository-retention-to-end failed and is NOT in databasechangelog.
-- Usage on server:
--   sudo docker exec -i openelisglobal-database psql -U clinlims -d clinlims < scripts/repair-liquibase-076-page-order.sql

BEGIN;

-- Per-notebook reorder: Retention last (7), Sample Request 4, QC 5, Reporting 6
DO $$
DECLARE
  nb RECORD;
BEGIN
  FOR nb IN
    SELECT DISTINCT np.notebook_id
    FROM clinlims.notebook_page np
    WHERE np.title = 'Storage Assignment'
      AND EXISTS (
        SELECT 1 FROM clinlims.notebook_page np2
        WHERE np2.notebook_id = np.notebook_id
          AND np2.title = 'Retention & Disposal'
      )
  LOOP
    UPDATE clinlims.notebook_page SET page_order = 900 + page_order
    WHERE notebook_id = nb.notebook_id
      AND title IN (
        'Sample Request & Retrieval',
        'QC Inspection',
        'Reporting & Audit',
        'Retention & Disposal'
      );

    UPDATE clinlims.notebook_page SET page_order = 4
    WHERE notebook_id = nb.notebook_id AND title = 'Sample Request & Retrieval';
    UPDATE clinlims.notebook_page SET page_order = 5
    WHERE notebook_id = nb.notebook_id AND title = 'QC Inspection';
    UPDATE clinlims.notebook_page SET page_order = 6
    WHERE notebook_id = nb.notebook_id AND title = 'Reporting & Audit';
    UPDATE clinlims.notebook_page SET page_order = 7
    WHERE notebook_id = nb.notebook_id AND title = 'Retention & Disposal';
  END LOOP;
END $$;

COMMIT;
