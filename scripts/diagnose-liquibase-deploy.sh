#!/usr/bin/env bash
# Diagnose Liquibase after deploy (local or AHRI server).
# Usage:
#   cd OpenELIS-Global-2 && bash scripts/diagnose-liquibase-deploy.sh
#   cd /opt/OpenELIS-Docker && bash scripts/diagnose-liquibase-deploy.sh
set -euo pipefail

WEBAPP="${WEBAPP_CONTAINER:-openelisglobal-webapp}"
DB="${DB_CONTAINER:-openelisglobal-database}"

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif sudo -n docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  echo "Error: docker not available (try: sudo usermod -aG docker \$USER)" >&2
  exit 1
fi

docker_cmd() {
  "${DOCKER[@]}" "$@"
}

echo "=== Container status ==="
docker_cmd ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | grep -E 'openelis|NAMES' || true

echo
echo "=== Image tag in docker-compose ==="
grep -E 'openelis-global-2|image:' docker-compose.yml 2>/dev/null | head -10 || echo "(run from repo root or /opt/OpenELIS-Docker)"

echo
echo "=== Liquibase / checksum lines in webapp log (last 60) ==="
docker_cmd logs "$WEBAPP" 2>&1 | grep -i -E 'liquibase|changelog|checksum|Validation Failed|074-|075-|076-|077-|changeset|migration' | tail -60 || true

echo
echo "=== Recent errors in webapp log ==="
docker_cmd logs "$WEBAPP" 2>&1 | grep -i -E 'exception|error|failed' | tail -30 || true

echo
echo "=== Migrations 074–077 in databasechangelog ==="
docker_cmd exec -i "$DB" psql -U clinlims -d clinlims -c "
SELECT id, author, filename, exectype, dateexecuted
FROM clinlims.databasechangelog
WHERE id LIKE '%074%' OR id LIKE '%075%' OR id LIKE '%076%' OR id LIKE '%077%'
   OR filename LIKE '%074%' OR filename LIKE '%075%' OR filename LIKE '%076%' OR filename LIKE '%077%'
ORDER BY dateexecuted;
"

echo
echo "=== Last 10 Liquibase changesets applied ==="
docker_cmd exec -i "$DB" psql -U clinlims -d clinlims -c "
SELECT id, author, exectype, dateexecuted
FROM clinlims.databasechangelog
ORDER BY dateexecuted DESC
LIMIT 10;
"

echo
echo "=== Failed / locked changesets (if any) ==="
docker_cmd exec -i "$DB" psql -U clinlims -d clinlims -c "
SELECT id, author, exectype, md5sum
FROM clinlims.databasechangelog
WHERE exectype NOT IN ('EXECUTED', 'MARK_RAN')
ORDER BY dateexecuted DESC
LIMIT 20;
" 2>/dev/null || true

docker_cmd exec -i "$DB" psql -U clinlims -d clinlims -c "
SELECT * FROM clinlims.databasechangeloglock;
" 2>/dev/null || true

echo
echo "=== Duplicate notebook_page orders (can break 076) ==="
docker_cmd exec -i "$DB" psql -U clinlims -d clinlims -c "
SELECT notebook_id, page_order, COUNT(*) AS cnt, string_agg(title, ', ') AS titles
FROM clinlims.notebook_page
GROUP BY notebook_id, page_order
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 15;
"

echo
echo "Done. Paste this full output when asking for a fix."
