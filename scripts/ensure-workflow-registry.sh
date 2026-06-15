#!/bin/bash
#
# ensure-workflow-registry.sh
#
# Ensures ahri-workflows.csv is present for OpenELIS workflow RBAC.
# Without it, non-admin users get HTTP 403 on notebook stage APIs.
#
# Usage (local):
#   ./scripts/ensure-workflow-registry.sh
#
# Usage (server):
#   cd /opt/OpenELIS-Docker
#   bash scripts/ensure-workflow-registry.sh
#   sudo docker restart openelisglobal-webapp
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Prefer OpenELIS-Docker layout on server, else repo volume/
if [ -d "${REPO_ROOT}/volume/configuration/backend/workflow-registry" ]; then
    SRC="${REPO_ROOT}/volume/configuration/backend/workflow-registry/ahri-workflows.csv"
    DEST_DIR="${REPO_ROOT}/volume/configuration/backend/workflow-registry"
elif [ -d "/opt/OpenELIS-Docker/volume/configuration/backend/workflow-registry" ]; then
    SRC="/opt/OpenELIS-Docker/volume/configuration/backend/workflow-registry/ahri-workflows.csv"
    DEST_DIR="/opt/OpenELIS-Docker/volume/configuration/backend/workflow-registry"
else
    DEST_DIR="${REPO_ROOT}/volume/configuration/backend/workflow-registry"
    SRC="${DEST_DIR}/ahri-workflows.csv"
fi

mkdir -p "${DEST_DIR}"

if [ ! -f "${SRC}" ]; then
    echo "ERROR: ahri-workflows.csv not found at ${SRC}" >&2
    echo "Copy from repo: volume/configuration/backend/workflow-registry/ahri-workflows.csv" >&2
    exit 1
fi

if [ "${SRC}" != "${DEST_DIR}/ahri-workflows.csv" ]; then
    cp "${SRC}" "${DEST_DIR}/ahri-workflows.csv"
fi

LINES=$(wc -l < "${DEST_DIR}/ahri-workflows.csv")
echo "Workflow registry ready: ${DEST_DIR}/ahri-workflows.csv (${LINES} lines)"
echo "Restart openelisglobal-webapp and confirm log: Loaded N workflow stages from ahri-workflows.csv"
