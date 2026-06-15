#!/bin/bash
# Run on openelis-server after copying scripts to /opt/OpenELIS-Docker/scripts/
#
# From dev machine (optional):
#   scp OpenELIS-Global-2/scripts/populate-golive-department-users.sh \
#       OpenELIS-Global-2/scripts/hash-password.py \
#       OpenELIS-Global-2/scripts/verify-golive-users.py \
#       openelis@192.168.25.25:/opt/OpenELIS-Docker/scripts/
#
# Or on server via curl (after pushing to demo/ethiopia):
#   cd /opt/OpenELIS-Docker/scripts
#   curl -fsSLO https://raw.githubusercontent.com/orbithealthplc/OpenELIS-Global-2/demo/ethiopia/scripts/populate-golive-department-users.sh
#   curl -fsSLO https://raw.githubusercontent.com/orbithealthplc/OpenELIS-Global-2/demo/ethiopia/scripts/hash-password.py
#   curl -fsSLO https://raw.githubusercontent.com/orbithealthplc/OpenELIS-Global-2/demo/ethiopia/scripts/verify-golive-users.py

set -euo pipefail

cd /opt/OpenELIS-Docker
chmod +x scripts/populate-golive-department-users.sh

python3 -c "import bcrypt" 2>/dev/null || pip3 install --user bcrypt

sudo bash scripts/populate-golive-department-users.sh "$@"
sudo docker restart openelisglobal-webapp

echo ""
echo "Waiting 90s for webapp startup..."
sleep 90

UAT_BASE_URL="${UAT_BASE_URL:-https://192.168.25.25}" python3 scripts/verify-golive-users.py --all
