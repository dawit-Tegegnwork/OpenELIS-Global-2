#!/usr/bin/env bash
# AHRI go-live cleanup — inventory + dry-run (no destructive changes).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
HOST="${AHRI_DB_HOST:-192.168.25.25}"
DB_USER="${AHRI_DB_USER:-clinlims}"
DB_NAME="${AHRI_DB_NAME:-clinlims}"
KEEP_BACT_ENTRY_ID="${KEEP_BACT_ENTRY_ID:-}"

mkdir -p "${REPORT_DIR}"

echo "=== Building keep-lists from reference zip ==="
python3 "${SCRIPT_DIR}/build-keep-lists.py" \
  "${AHRI_REFERENCE_ZIP:-/home/dawit/Downloads/AHRI-20260525T055818Z-3-001.zip}" \
  -o "${SCRIPT_DIR}/reference"

echo "=== Exporting pre-cleanup inventory to ${REPORT_DIR} ==="
ssh "openelis@${HOST}" "docker exec openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME} -At -F, -c \"
SELECT 'bio_sample', COUNT(*) FROM clinlims.bio_sample
UNION ALL SELECT 'notebook_entry', COUNT(*) FROM clinlims.notebook_entry
UNION ALL SELECT 'notebook', COUNT(*) FROM clinlims.notebook
UNION ALL SELECT 'sample_storage_assignment', COUNT(*) FROM clinlims.sample_storage_assignment
UNION ALL SELECT 'storage_room', COUNT(*) FROM clinlims.storage_room
UNION ALL SELECT 'storage_device', COUNT(*) FROM clinlims.storage_device
UNION ALL SELECT 'storage_box', COUNT(*) FROM clinlims.storage_box;
\"" > "${REPORT_DIR}/pre-cleanup-row-counts-${TIMESTAMP}.csv"

ssh "openelis@${HOST}" "docker exec openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME} -At -F, -c \"
SELECT ne.id, ne.entry_number, n.name, ne.lastupdated, COUNT(nes.sample_item_id)
FROM clinlims.notebook_entry ne
JOIN clinlims.notebook n ON n.id = ne.notebook_id
LEFT JOIN clinlims.notebook_entry_sample nes ON nes.notebook_entry_id = ne.id
GROUP BY ne.id, n.name
ORDER BY ne.lastupdated DESC NULLS LAST;
\"" > "${REPORT_DIR}/pre-cleanup-notebook-entries-${TIMESTAMP}.csv"

echo "=== Bacteriology candidates (pick newest for KEEP_BACT_ENTRY_ID) ==="
ssh "openelis@${HOST}" "docker exec openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME} -c \"
SELECT ne.id, ne.entry_number, n.name AS template_name, ne.lastupdated,
       COUNT(nes.sample_item_id) AS sample_count
FROM clinlims.notebook_entry ne
JOIN clinlims.notebook n ON n.id = ne.notebook_id
LEFT JOIN clinlims.notebook_entry_sample nes ON nes.notebook_entry_id = ne.id
WHERE LOWER(n.name) LIKE '%bacteriology%'
GROUP BY ne.id, n.name
ORDER BY ne.lastupdated DESC NULLS LAST, ne.id DESC
LIMIT 5;
\""

if [[ -z "${KEEP_BACT_ENTRY_ID}" ]]; then
  echo "Set KEEP_BACT_ENTRY_ID to the id from the query above before execute."
fi

echo "=== Dry-run SQL (BEGIN ... ROLLBACK) ==="
ssh "openelis@${HOST}" "docker exec -i openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME}" <<EOF
BEGIN;
\set DRY_RUN 1
\i /dev/stdin
$(sed 's/\\if :{?DRY_RUN}/\\if true/' "${SCRIPT_DIR}/go-live-cleanup.sql" | sed 's/\\else/-- \\else/' | sed 's/\\endif/-- \\endif/')
ROLLBACK;
EOF

echo "Dry-run complete. Review ${REPORT_DIR}/pre-cleanup-*-${TIMESTAMP}.csv"
