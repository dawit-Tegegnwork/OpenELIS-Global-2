-- Backfill bio_sample.manifest_sno from scripts/ahri/data/manifest-sno-backfill.csv
-- Idempotent: only updates NULL or mismatched manifest_sno values.
--
-- Usage (on production DB host):
--   psql -U clinlims -d clinlims -f scripts/ahri/backfill-biosample-manifest-sno.sql

BEGIN;

CREATE TABLE IF NOT EXISTS staging_manifest_sno (
    barcode TEXT NOT NULL,
    manifest_sno INTEGER NOT NULL
);

TRUNCATE staging_manifest_sno;

\copy staging_manifest_sno(barcode, manifest_sno) FROM 'scripts/ahri/data/manifest-sno-backfill.csv' WITH (FORMAT csv, HEADER true);

UPDATE clinlims.bio_sample bs
SET manifest_sno = stg.manifest_sno
FROM clinlims.sample_item si
JOIN staging_manifest_sno stg ON LOWER(TRIM(si.external_id)) = LOWER(TRIM(stg.barcode))
WHERE bs.sample_item_id = si.id
  AND (bs.manifest_sno IS NULL OR bs.manifest_sno <> stg.manifest_sno);

-- Verification (review before COMMIT)
SELECT COUNT(*) FILTER (WHERE manifest_sno IS NULL) AS missing_sno,
       COUNT(*) AS total
FROM clinlims.bio_sample;

SELECT bs.manifest_sno, si.external_id, bs.id
FROM clinlims.bio_sample bs
JOIN clinlims.sample_item si ON si.id = bs.sample_item_id
ORDER BY bs.manifest_sno NULLS LAST, bs.id
LIMIT 20;

-- Unmatched barcodes in DB (no CSV row)
SELECT si.external_id, bs.id, bs.manifest_sno
FROM clinlims.bio_sample bs
JOIN clinlims.sample_item si ON si.id = bs.sample_item_id
LEFT JOIN staging_manifest_sno stg ON LOWER(TRIM(si.external_id)) = LOWER(TRIM(stg.barcode))
WHERE stg.barcode IS NULL
ORDER BY si.external_id
LIMIT 50;

COMMIT;
