#!/usr/bin/env bash
# Deploy an OpenELIS GHCR release to /opt/OpenELIS-Docker on the AHRI server.
# Usage: ./scripts/deploy-release.sh v2026.06.03.07 [host]
set -euo pipefail

RELEASE="${1:?Release tag required, e.g. v2026.06.03.07}"
HOST="${2:-192.168.25.25}"
APP_DIR="/opt/OpenELIS-Docker"
REMOTE="openelis@${HOST}"

echo "Deploying ${RELEASE} to ${HOST}..."

ssh "${REMOTE}" "bash -s" <<EOF
set -euo pipefail
cd ${APP_DIR}
cp docker-compose.yml "docker-compose.yml.bak-${RELEASE}"
sed -i 's#v2026\\.[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]#${RELEASE}#g' docker-compose.yml
echo '--- image tags ---'
grep -E 'openelis-global-2' docker-compose.yml
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
EOF

echo "Copying notebook department linkages..."
scp volume/configuration/backend/notebook-departments/research-lab-linkages.csv \
  "${REMOTE}:${APP_DIR}/volume/configuration/backend/notebook-departments/research-lab-linkages.csv"

ssh "${REMOTE}" "sudo docker restart openelisglobal-webapp"

echo "Done. Optional cleanup: docker exec -i openelisglobal-database psql -U clinlims -d clinlims < scripts/deactivate-non-notebook-departments.sql"
