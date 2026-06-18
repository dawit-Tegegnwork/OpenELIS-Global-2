#!/usr/bin/env bash
# AHRI go-live cleanup — EXECUTE (destructive). Requires KEEP_BACT_ENTRY_ID and human approval.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
HOST="${AHRI_DB_HOST:-192.168.25.25}"
DB_USER="${AHRI_DB_USER:-clinlims}"
DB_NAME="${AHRI_DB_NAME:-clinlims}"
KEEP_BACT_ENTRY_ID="${KEEP_BACT_ENTRY_ID:?Set KEEP_BACT_ENTRY_ID before execute}"

mkdir -p "${REPORT_DIR}"

echo "=== Full backup (mandatory) ==="
ssh "openelis@${HOST}" "docker exec openelisglobal-database pg_dump -U ${DB_USER} -Fc ${DB_NAME} > /opt/backups/clinlims-pre-golive-${TIMESTAMP}.dump"
echo "Backup: /opt/backups/clinlims-pre-golive-${TIMESTAMP}.dump"

read -r -p "Type EXECUTE to run phased cleanup on ${HOST}: " CONFIRM
if [[ "${CONFIRM}" != "EXECUTE" ]]; then
  echo "Aborted."
  exit 1
fi

echo "=== Executing go-live-cleanup.sql ==="
ssh "openelis@${HOST}" "docker exec -i openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME} -v KEEP_BACT_ENTRY_ID=${KEEP_BACT_ENTRY_ID}" \
  < "${SCRIPT_DIR}/go-live-cleanup.sql"

ssh "openelis@${HOST}" "docker exec openelisglobal-database psql -U ${DB_USER} -d ${DB_NAME} -At -F, -c \"
SELECT 'bio_sample', COUNT(*) FROM clinlims.bio_sample
UNION ALL SELECT 'notebook_entry', COUNT(*) FROM clinlims.notebook_entry
UNION ALL SELECT 'sample_storage_assignment', COUNT(*) FROM clinlims.sample_storage_assignment;
\"" > "${REPORT_DIR}/post-cleanup-row-counts-${TIMESTAMP}.csv"

echo "Execute complete. Post inventory: ${REPORT_DIR}/post-cleanup-row-counts-${TIMESTAMP}.csv"
echo "Restart webapp if needed: ssh openelis@${HOST} 'sudo docker restart openelisglobal-webapp'"
