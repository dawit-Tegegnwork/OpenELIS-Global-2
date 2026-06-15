-- Biorepository QC local test data seed
-- Populates zones, devices, shelves, racks, boxes, samples, and storage assignments
-- for QC Inspection testing (notebook template id 27 / department 196).
--
-- Safe to re-run: removes prior QC-TEST-* rows before inserting.

BEGIN;

-- ---------------------------------------------------------------------------
-- Cleanup prior QC test seed (idempotent re-run)
-- ---------------------------------------------------------------------------
DELETE FROM clinlims.sample_storage_assignment
WHERE sample_item_id IN (
    SELECT si.id FROM clinlims.sample_item si
    WHERE si.external_id LIKE 'QC-TEST-%'
);

DELETE FROM clinlims.bio_sample
WHERE sample_item_id IN (
    SELECT si.id FROM clinlims.sample_item si
    WHERE si.external_id LIKE 'QC-TEST-%'
);

DELETE FROM clinlims.sample_item
WHERE external_id LIKE 'QC-TEST-%';

DELETE FROM clinlims.sample
WHERE accession_number LIKE 'QCT%';

-- Remove QC test storage hierarchy (delete children first)
DELETE FROM clinlims.sample_storage_assignment
WHERE location_type = 'box' AND location_id BETWEEN 1000 AND 1999;
DELETE FROM clinlims.storage_box WHERE id BETWEEN 1000 AND 1999;
DELETE FROM clinlims.storage_rack WHERE id BETWEEN 1000 AND 1999;
DELETE FROM clinlims.storage_shelf WHERE id BETWEEN 1000 AND 1099;
DELETE FROM clinlims.storage_device WHERE id BETWEEN 100 AND 199;

-- ---------------------------------------------------------------------------
-- Devices in biorepository zones (Zone A = room 8, Zone B = room 9)
-- ---------------------------------------------------------------------------
INSERT INTO clinlims.storage_device
    (id, fhir_uuid, name, code, type, temperature_setting, capacity_limit, active,
     parent_room_id, sys_user_id, biorepository_storage)
VALUES
    (100, 'a1000000-0000-4000-8000-000000000100', 'ULT Freezer A1', 'QC-ULT-A1', 'freezer', -80.00, 500, true, 8, '1', true),
    (101, 'a1000000-0000-4000-8000-000000000101', 'ULT Freezer A2', 'QC-ULT-A2', 'freezer', -80.00, 500, true, 8, '1', true),
    (102, 'a1000000-0000-4000-8000-000000000102', 'Refrigerator B1', 'QC-REF-B1', 'refrigerator', 4.00, 300, true, 9, '1', true),
    (103, 'a1000000-0000-4000-8000-000000000103', 'Refrigerator B2', 'QC-REF-B2', 'refrigerator', 4.00, 300, true, 9, '1', true)
ON CONFLICT (id) DO UPDATE SET
    biorepository_storage = true,
    active = true,
    parent_room_id = EXCLUDED.parent_room_id;

-- Ensure legacy biorepository devices stay flagged
UPDATE clinlims.storage_device SET biorepository_storage = true WHERE id IN (15, 16);

-- ---------------------------------------------------------------------------
-- Shelves (2 per device) — IDs 1001-1099
-- ---------------------------------------------------------------------------
INSERT INTO clinlims.storage_shelf
    (id, fhir_uuid, label, code, capacity_limit, active, parent_device_id, sys_user_id)
SELECT
    1001 + d.device_idx * 10 + s.shelf_idx,
    ('a1000000-0000-4000-8000-' || lpad((1001 + d.device_idx * 10 + s.shelf_idx)::text, 12, '0'))::uuid,
    'Shelf ' || chr(64 + s.shelf_idx),
    'S' || d.device_idx || s.shelf_idx,
    50,
    true,
    d.device_id,
    '1'
FROM (VALUES (0, 100), (1, 101), (2, 102), (3, 103)) AS d(device_idx, device_id)
CROSS JOIN (VALUES (1), (2)) AS s(shelf_idx);

-- ---------------------------------------------------------------------------
-- Racks (2 per shelf) — IDs 1101-1299
-- ---------------------------------------------------------------------------
INSERT INTO clinlims.storage_rack
    (id, fhir_uuid, label, code, active, parent_shelf_id, sys_user_id)
SELECT
    1101 + sh.shelf_seq * 10 + r.rack_idx,
    ('b1000000-0000-4000-8000-' || lpad((1101 + sh.shelf_seq * 10 + r.rack_idx)::text, 12, '0'))::uuid,
    'Rack ' || r.rack_idx,
    'R' || sh.shelf_seq || r.rack_idx,
    true,
    sh.shelf_id,
    '1'
FROM (
    SELECT id AS shelf_id,
           row_number() OVER (ORDER BY id) AS shelf_seq
    FROM clinlims.storage_shelf
    WHERE id BETWEEN 1001 AND 1099
) sh
CROSS JOIN (VALUES (1), (2)) AS r(rack_idx);

-- ---------------------------------------------------------------------------
-- Boxes (2 per rack, 8x12 grid) — IDs 1401-1999
-- ---------------------------------------------------------------------------
INSERT INTO clinlims.storage_box
    (id, fhir_uuid, label, type, rows, columns, position_schema_hint, code, active, parent_rack_id, sys_user_id)
SELECT
    1401 + rk.rack_seq * 10 + b.box_idx,
    ('c1000000-0000-4000-8000-' || lpad((1401 + rk.rack_seq * 10 + b.box_idx)::text, 12, '0'))::uuid,
    'Box ' || rk.rack_seq || '-' || b.box_idx,
    '96-well',
    8,
    12,
    'letter-number',
    'B' || rk.rack_seq || b.box_idx,
    true,
    rk.rack_id,
    '1'
FROM (
    SELECT id AS rack_id,
           row_number() OVER (ORDER BY id) AS rack_seq
    FROM clinlims.storage_rack
    WHERE id BETWEEN 1101 AND 1299
) rk
CROSS JOIN (VALUES (1), (2)) AS b(box_idx);

-- ---------------------------------------------------------------------------
-- Samples: 2 per box (64 total) with full biorepository metadata
-- ---------------------------------------------------------------------------
WITH boxes AS (
    SELECT
        bx.id AS box_id,
        bx.label AS box_label,
        rk.label AS rack_label,
        sh.label AS shelf_label,
        d.name AS device_name,
        r.name AS room_name,
        row_number() OVER (ORDER BY bx.id) AS box_seq
    FROM clinlims.storage_box bx
    JOIN clinlims.storage_rack rk ON bx.parent_rack_id = rk.id
    JOIN clinlims.storage_shelf sh ON rk.parent_shelf_id = sh.id
    JOIN clinlims.storage_device d ON sh.parent_device_id = d.id
    JOIN clinlims.storage_room r ON d.parent_room_id = r.id
    WHERE bx.id BETWEEN 1400 AND 1999
),
sample_rows AS (
    SELECT
        b.box_seq,
        b.box_id,
        b.room_name,
        b.device_name,
        b.shelf_label,
        b.rack_label,
        b.box_label,
        slot.slot_idx,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_item_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS bio_sample_id,
        'QCT' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 5, '0') AS accession_number,
        'QC-TEST-' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 4, '0') AS external_id,
        CASE slot.slot_idx
            WHEN 1 THEN 'A1'
            ELSE 'B3'
        END AS position_coord
    FROM boxes b
    CROSS JOIN (VALUES (1), (2)) AS slot(slot_idx)
)
INSERT INTO clinlims.sample
    (id, accession_number, domain, entered_date, received_date, sys_user_id, status_id)
SELECT
    sample_id,
    accession_number,
    'H',
    now(),
    now(),
    1,
    20
FROM sample_rows;

WITH boxes AS (
    SELECT
        bx.id AS box_id,
        bx.label AS box_label,
        rk.label AS rack_label,
        sh.label AS shelf_label,
        d.name AS device_name,
        r.name AS room_name,
        row_number() OVER (ORDER BY bx.id) AS box_seq
    FROM clinlims.storage_box bx
    JOIN clinlims.storage_rack rk ON bx.parent_rack_id = rk.id
    JOIN clinlims.storage_shelf sh ON rk.parent_shelf_id = sh.id
    JOIN clinlims.storage_device d ON sh.parent_device_id = d.id
    JOIN clinlims.storage_room r ON d.parent_room_id = r.id
    WHERE bx.id BETWEEN 1400 AND 1999
),
sample_rows AS (
    SELECT
        b.box_seq,
        b.box_id,
        b.room_name,
        b.device_name,
        b.shelf_label,
        b.rack_label,
        b.box_label,
        slot.slot_idx,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_item_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS bio_sample_id,
        'QCT' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 5, '0') AS accession_number,
        'QC-TEST-' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 4, '0') AS external_id,
        CASE slot.slot_idx
            WHEN 1 THEN 'A1'
            ELSE 'B3'
        END AS position_coord
    FROM boxes b
    CROSS JOIN (VALUES (1), (2)) AS slot(slot_idx)
)
INSERT INTO clinlims.sample_item
    (id, sort_order, samp_id, typeosamp_id, status_id, external_id, collection_date)
SELECT
    sample_item_id,
    1,
    sample_id,
    2,
    1,
    external_id,
    now()
FROM sample_rows;

WITH boxes AS (
    SELECT
        bx.id AS box_id,
        bx.label AS box_label,
        rk.label AS rack_label,
        sh.label AS shelf_label,
        d.name AS device_name,
        r.name AS room_name,
        row_number() OVER (ORDER BY bx.id) AS box_seq
    FROM clinlims.storage_box bx
    JOIN clinlims.storage_rack rk ON bx.parent_rack_id = rk.id
    JOIN clinlims.storage_shelf sh ON rk.parent_shelf_id = sh.id
    JOIN clinlims.storage_device d ON sh.parent_device_id = d.id
    JOIN clinlims.storage_room r ON d.parent_room_id = r.id
    WHERE bx.id BETWEEN 1400 AND 1999
),
sample_rows AS (
    SELECT
        b.box_seq,
        b.box_id,
        b.room_name,
        b.device_name,
        b.shelf_label,
        b.rack_label,
        b.box_label,
        slot.slot_idx,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_item_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS bio_sample_id,
        'QCT' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 5, '0') AS accession_number,
        'QC-TEST-' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 4, '0') AS external_id,
        CASE slot.slot_idx
            WHEN 1 THEN 'A1'
            ELSE 'B3'
        END AS position_coord
    FROM boxes b
    CROSS JOIN (VALUES (1), (2)) AS slot(slot_idx)
)
INSERT INTO clinlims.bio_sample
    (id, sample_item_id, biosafety_level, preservation_medium, workflow_status,
     department_test_section_id, project_id, sys_user_id)
SELECT
    bio_sample_id,
    sample_item_id,
    'BSL-1',
    'EDTA',
    'STORED',
    196,
    'QC-DEMO-2026',
    '1'
FROM sample_rows;

WITH boxes AS (
    SELECT
        bx.id AS box_id,
        bx.label AS box_label,
        rk.label AS rack_label,
        sh.label AS shelf_label,
        d.name AS device_name,
        r.name AS room_name,
        row_number() OVER (ORDER BY bx.id) AS box_seq
    FROM clinlims.storage_box bx
    JOIN clinlims.storage_rack rk ON bx.parent_rack_id = rk.id
    JOIN clinlims.storage_shelf sh ON rk.parent_shelf_id = sh.id
    JOIN clinlims.storage_device d ON sh.parent_device_id = d.id
    JOIN clinlims.storage_room r ON d.parent_room_id = r.id
    WHERE bx.id BETWEEN 1400 AND 1999
),
sample_rows AS (
    SELECT
        b.box_seq,
        b.box_id,
        b.room_name,
        b.device_name,
        b.shelf_label,
        b.rack_label,
        b.box_label,
        slot.slot_idx,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS sample_item_id,
        30000 + (b.box_seq - 1) * 2 + slot.slot_idx AS bio_sample_id,
        'QCT' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 5, '0') AS accession_number,
        'QC-TEST-' || lpad(((b.box_seq - 1) * 2 + slot.slot_idx)::text, 4, '0') AS external_id,
        CASE slot.slot_idx
            WHEN 1 THEN 'A1'
            ELSE 'B3'
        END AS position_coord
    FROM boxes b
    CROSS JOIN (VALUES (1), (2)) AS slot(slot_idx)
)
INSERT INTO clinlims.sample_storage_assignment
    (id, sample_item_id, location_id, location_type, position_coordinate,
     assigned_by_user_id, assigned_date, notes)
SELECT
    10000 + sample_item_id,
    sample_item_id,
    box_id,
    'box',
    position_coord,
    1,
    now(),
    'QC test seed — ' || room_name || ' > ' || device_name || ' > ' || shelf_label
        || ' > ' || rack_label || ' > ' || box_label
FROM sample_rows;

-- Restore legacy STORED sample into the biorepository hierarchy for QC
INSERT INTO clinlims.sample_storage_assignment
    (id, sample_item_id, location_id, location_type, position_coordinate,
     assigned_by_user_id, assigned_date, notes)
SELECT 2, 2, 1401, 'box', 'C5', 1, now(),
       'QC test seed — legacy sample in Zone A hierarchy'
WHERE EXISTS (SELECT 1 FROM clinlims.bio_sample WHERE sample_item_id = 2)
ON CONFLICT (sample_item_id) DO UPDATE SET
    location_id = 1401,
    location_type = 'box',
    position_coordinate = 'C5',
    notes = 'QC test seed — legacy sample in Zone A hierarchy';

COMMIT;

-- Summary
SELECT 'devices (biorepo QC)' AS metric, count(*)::text AS value
FROM clinlims.storage_device
WHERE biorepository_storage = true OR id BETWEEN 100 AND 199
UNION ALL
SELECT 'shelves (QC seed)', count(*)::text FROM clinlims.storage_shelf WHERE id BETWEEN 1001 AND 1099
UNION ALL
SELECT 'racks (QC seed)', count(*)::text FROM clinlims.storage_rack WHERE id BETWEEN 1101 AND 1299
UNION ALL
SELECT 'boxes (QC seed)', count(*)::text FROM clinlims.storage_box WHERE id BETWEEN 1401 AND 1999
UNION ALL
SELECT 'QC test samples', count(*)::text FROM clinlims.sample_item WHERE external_id LIKE 'QC-TEST-%'
UNION ALL
SELECT 'QC test assignments', count(*)::text
FROM clinlims.sample_storage_assignment ssa
JOIN clinlims.sample_item si ON si.id = ssa.sample_item_id
WHERE si.external_id LIKE 'QC-TEST-%' OR si.id = 2;
