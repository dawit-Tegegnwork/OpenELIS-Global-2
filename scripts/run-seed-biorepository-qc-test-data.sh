#!/usr/bin/env bash
# Seed local biorepository QC test data into the running Docker Postgres container.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/seed-biorepository-qc-test-data.sql"
CONTAINER="${OPENELIS_DB_CONTAINER:-openelisglobal-database}"

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing SQL file: ${SQL_FILE}" >&2
  exit 1
fi

echo "Seeding biorepository QC test data via container: ${CONTAINER}"
docker exec -i "${CONTAINER}" psql -U clinlims -d clinlims -v ON_ERROR_STOP=1 < "${SQL_FILE}"
echo "Done. Open QC Inspection (notebook template 13) and refresh the page."
