#!/bin/bash
#
# populate-department-super-users.sh
#
# Creates one super-user per AHRI research lab with all six SRS lab-unit roles
# on that department's test section (Sample Collector through Biomedical Staff).
#
# Usage:
#   ./scripts/populate-department-super-users.sh
#   ./scripts/populate-department-super-users.sh --dry-run
#   ./scripts/populate-department-super-users.sh --clean
#   ./scripts/populate-department-super-users.sh --clean-install
#
# Production (requires sudo for docker):
#   cd /opt/OpenELIS-Docker
#   sudo bash scripts/populate-department-super-users.sh
#   sudo docker restart openelisglobal-webapp
#
# After seeding: users must log out and back in for session roles to refresh.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CONTAINER="${CONTAINER:-openelisglobal-database}"
DB_NAME="${DB_NAME:-clinlims}"
DB_USER="${DB_USER:-clinlims}"
CLEAN_ONLY=false
CLEAN_INSTALL=false
DRY_RUN=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

USER_ID_MIN=1120
USER_ID_MAX=1133

# username|user_id|first_name|password|test_section_name|notebook_title_hint
SUPER_USERS=(
  "newmntd|1120|MNTD Super|newmntdMNTD!|Malaria and Neglected Tropical Disease (MNTD) Laboratory|MNTD"
  "biorepository|1121|Biorepo Super|biorepositoryBIO!|Biorepository Laboratory|Biorepository"
  "tblab|1122|TB Super|tblabTB!|Tuberculosis Laboratory|Tuberculosis"
  "bacteriology|1123|Bacteriology Super|bacteriologyBACTERIOLOGY!|Bacteriology|Bacteriology"
  "bioanalytical|1124|Bioanalytical Super|bioanalyticalBIOANALYTICAL!|Bioanalytical Laboratory|Bioanalytical"
  "immunology|1125|Immunology Super|immunologyIMMUNOLOGY!|Immunology|Immunology"
  "pathology|1126|Pathology Super|pathologyPATHOLOGY!|Pathology Laboratory|Pathology"
  "pharma|1127|Pharma Super|pharmaPHARMA!|Pharmaceuticals Laboratory|Pharmaceuticals"
  "tmmd|1128|TradMed Super|tmmdTMMD!|Traditional & Modern Medicine Research Lab|Traditional"
  "viralvaccine|1129|Viral Vaccine Super|viralvaccineVIRAL!|Viral Vaccine|Viral Vaccine"
  "ctd|1130|CTD Super|ctdCTD!|CTD|CTD"
  "bioequivalence|1131|Bioequivalence Super|bioequivalenceBIOEQ!|Bioequivalence Laboratory|Bioequivalence"
  "genomics|1132|Genomics Super|genomicsGENOMICS!|Genomics & Bioinformatics Laboratory|Genomics"
  "virology|1133|Virology Super|virologyVIROLOGY!|Virology Laboratory|Virology"
)

SRS_LAB_ROLES=(
  "Sample Collector"
  "Laboratory Technician"
  "Junior Researcher"
  "Senior Researcher"
  "Lab Manager"
  "Biomedical Staff"
)

while [[ $# -gt 0 ]]; do
    case $1 in
        --container) CONTAINER="$2"; shift 2 ;;
        -d|--database) DB_NAME="$2"; shift 2 ;;
        -U|--user) DB_USER="$2"; shift 2 ;;
        -c|--clean) CLEAN_ONLY=true; shift ;;
        --clean-install) CLEAN_INSTALL=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help)
            head -25 "$0" | tail -22
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}" >&2; exit 1 ;;
    esac
done

if [ "$DRY_RUN" = false ]; then
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: docker not found${NC}" >&2
        exit 1
    fi
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
        echo -e "${RED}Error: container '${CONTAINER}' not running${NC}" >&2
        exit 1
    fi
fi

execute_sql() {
    if [ "$DRY_RUN" = true ]; then
        cat
    else
        docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
    fi
}

lookup_test_section_id() {
    local dept_name="$1"
    local dept_name_escaped
    dept_name_escaped="$(sql_escape "$dept_name")"
    execute_sql -t -A <<EOF | tr -d '[:space:]'
SELECT COALESCE(
    (SELECT id::text FROM clinlims.test_section WHERE name = '${dept_name_escaped}' LIMIT 1),
    (SELECT ts.id::text
     FROM clinlims.notebook n
     JOIN clinlims.notebook_departments nd ON nd.notebook_id = n.id
     JOIN clinlims.test_section ts ON ts.id = nd.test_section_id
     WHERE n.is_template = true
       AND (n.title = '${dept_name_escaped}' OR n.title ILIKE '${dept_name_escaped}%')
     LIMIT 1)
);
EOF
}

lookup_role_id() {
    local role_name="$1"
    execute_sql -t -A <<EOF | tr -d '[:space:]'
SELECT id FROM clinlims.system_role WHERE name = '${role_name}' LIMIT 1;
EOF
}

hash_password() {
    local password="$1"
    python3 "${SCRIPT_DIR}/hash-password.py" "$password"
}

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

do_clean() {
    echo -e "${YELLOW}Removing department super-users (ids ${USER_ID_MIN}-${USER_ID_MAX})...${NC}"
    execute_sql <<EOF
DELETE FROM clinlims.system_user_section WHERE system_user_id BETWEEN ${USER_ID_MIN} AND ${USER_ID_MAX};
DELETE FROM clinlims.system_user_role WHERE system_user_id BETWEEN ${USER_ID_MIN} AND ${USER_ID_MAX};
DELETE FROM clinlims.lab_unit_roles WHERE system_user_id BETWEEN ${USER_ID_MIN} AND ${USER_ID_MAX};
DELETE FROM clinlims.user_lab_unit_roles WHERE system_user_id BETWEEN ${USER_ID_MIN} AND ${USER_ID_MAX};
EOF
    echo -e "${GREEN}Cleanup complete.${NC}"
}

create_super_user() {
    local username="$1"
    local user_id="$2"
    local first_name="$3"
    local password="$4"
    local test_section_id="$5"
    local pw_hash
    local role_ids=()
    local role_id
    local role_name
    local roles_sql=""

    pw_hash="$(hash_password "$password")"
    pw_hash_escaped="$(sql_escape "$pw_hash")"
    username_escaped="$(sql_escape "$username")"
    first_name_escaped="$(sql_escape "$first_name")"

    for role_name in "${SRS_LAB_ROLES[@]}"; do
        role_id="$(lookup_role_id "$role_name")"
        if [ -z "$role_id" ]; then
            echo -e "${RED}SRS role not found: ${role_name} (user ${username})${NC}" >&2
            exit 1
        fi
        roles_sql="${roles_sql}
        INSERT INTO clinlims.lab_roles (lab_unit_role_map_id, role)
        VALUES (v_map_id, '${role_id}');"
    done

    echo -e "${CYAN}User: ${username}${NC} (department test_section_id=${test_section_id}, all SRS lab roles)"

    execute_sql <<EOF
DO \$\$
DECLARE
    v_map_id INTEGER;
BEGIN
    INSERT INTO clinlims.login_user (id, login_name, password, password_expired_dt, account_locked, account_disabled, is_admin, user_time_out)
    VALUES (${user_id}, '${username_escaped}', '${pw_hash_escaped}', '2027-12-31', 'N', 'N', 'N', '480')
    ON CONFLICT (id) DO UPDATE SET
        login_name = EXCLUDED.login_name,
        password = EXCLUDED.password,
        account_locked = 'N',
        account_disabled = 'N';

    INSERT INTO clinlims.system_user (id, login_name, first_name, last_name, initials, is_active, is_employee, lastupdated)
    VALUES (${user_id}, '${username_escaped}', '${first_name_escaped}', 'Super', UPPER(LEFT('${username_escaped}', 3)), 'Y', 'Y', NOW())
    ON CONFLICT (id) DO UPDATE SET
        login_name = EXCLUDED.login_name,
        first_name = EXCLUDED.first_name,
        is_active = 'Y';

    DELETE FROM clinlims.system_user_role WHERE system_user_id = ${user_id};
    DELETE FROM clinlims.lab_unit_roles WHERE system_user_id = ${user_id};
    DELETE FROM clinlims.user_lab_unit_roles WHERE system_user_id = ${user_id};

    INSERT INTO clinlims.lab_unit_role_map (lab_unit)
    VALUES ('${test_section_id}')
    RETURNING lab_unit_role_map_id INTO v_map_id;
${roles_sql}

    INSERT INTO clinlims.user_lab_unit_roles (system_user_id, last_updated)
    VALUES (${user_id}, NOW())
    ON CONFLICT (system_user_id) DO UPDATE SET last_updated = NOW();

    INSERT INTO clinlims.lab_unit_roles (system_user_id, lab_unit_role_map_id)
    VALUES (${user_id}, v_map_id);
END \$\$;
EOF
}

echo -e "${GREEN}=== AHRI Department Super-Users (${USER_ID_MIN}-${USER_ID_MAX}) ===${NC}"

if [ "$CLEAN_ONLY" = true ]; then
    do_clean
    exit 0
fi

if [ "$CLEAN_INSTALL" = true ]; then
    do_clean
    echo ""
fi

echo -e "${CYAN}Normalizing legacy department labels (Virology, CTD)...${NC}"
execute_sql <<'EOF'
UPDATE clinlims.test_section
SET name = 'Virology Laboratory',
    description = 'Virology Laboratory Department',
    is_active = 'Y',
    lastupdated = NOW()
WHERE id = 76 OR name IN ('Virologie', 'Virology Laboratory');

UPDATE clinlims.localization loc
SET english = 'Virology Laboratory',
    french = COALESCE(NULLIF(TRIM(loc.french), ''), 'Virology Laboratory'),
    lastupdated = NOW()
WHERE loc.id IN (
    SELECT name_localization_id FROM clinlims.test_section WHERE id = 76
);

UPDATE clinlims.test_section
SET name = 'CTD', description = 'CTD Department', is_active = 'Y', lastupdated = NOW()
WHERE id = 181 OR name = 'Medical Laboratory';

UPDATE clinlims.localization loc
SET english = 'CTD',
    french = COALESCE(NULLIF(TRIM(loc.french), ''), 'CTD'),
    lastupdated = NOW()
WHERE loc.id IN (
    SELECT name_localization_id FROM clinlims.test_section WHERE name = 'CTD' OR id = 181
);
EOF

echo -e "${CYAN}Ensuring SamplePatientEntry module grants for SRS lab roles...${NC}"
execute_sql <<'EOF'
INSERT INTO clinlims.system_role_module
    (id, has_select, has_add, has_update, has_delete, system_role_id, system_module_id)
SELECT nextval('clinlims.system_role_module_seq'), 'Y', 'Y', 'Y', 'Y', role_row.id, module_row.id
FROM clinlims.system_role role_row
CROSS JOIN clinlims.system_module module_row
WHERE module_row.name = 'SamplePatientEntry'
  AND role_row.name IN (
      'Sample Collector',
      'Laboratory Technician',
      'Lab Manager',
      'Junior Researcher',
      'Senior Researcher'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM clinlims.system_role_module existing
      WHERE existing.system_role_id = role_row.id
        AND existing.system_module_id = module_row.id
  );
EOF

echo ""
echo -e "${YELLOW}Creating department super-users...${NC}"
for entry in "${SUPER_USERS[@]}"; do
    IFS='|' read -r username user_id first_name password dept_name _hint <<< "$entry"
    test_section_id="$(lookup_test_section_id "$dept_name")"
    if [ -z "$test_section_id" ]; then
        echo -e "${RED}Department not found: ${dept_name} (user ${username})${NC}" >&2
        exit 1
    fi
    create_super_user "$username" "$user_id" "$first_name" "$password" "$test_section_id"
done

execute_sql <<EOF
SELECT setval('clinlims.login_user_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM clinlims.login_user)::bigint, ${USER_ID_MAX}::bigint) + 1, false);
SELECT setval('clinlims.system_user_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM clinlims.system_user)::bigint, ${USER_ID_MAX}::bigint) + 1, false);
EOF

echo ""
echo -e "${GREEN}=== Department super-users ready ===${NC}"
if [ "$DRY_RUN" = false ]; then
    execute_sql -c "
SELECT su.login_name AS username,
       ts.name AS department,
       COUNT(DISTINCT sr_lab.name) AS lab_role_count,
       STRING_AGG(DISTINCT sr_lab.name, ', ' ORDER BY sr_lab.name) AS lab_roles
FROM clinlims.system_user su
JOIN clinlims.lab_unit_roles lur ON lur.system_user_id = su.id
JOIN clinlims.lab_unit_role_map lurm ON lurm.lab_unit_role_map_id = lur.lab_unit_role_map_id
JOIN clinlims.lab_roles lr ON lr.lab_unit_role_map_id = lurm.lab_unit_role_map_id
JOIN clinlims.system_role sr_lab ON sr_lab.id::text = lr.role
JOIN clinlims.test_section ts ON ts.id = CASE
    WHEN lurm.lab_unit ~ '^[0-9]+$' THEN lurm.lab_unit::integer
    ELSE NULL
END
WHERE su.id BETWEEN ${USER_ID_MIN} AND ${USER_ID_MAX}
GROUP BY su.login_name, ts.name
ORDER BY MIN(su.id);
"
fi

echo ""
echo "See docs/department-super-user-credentials.md for usernames and passwords."
echo "Restart openelisglobal-webapp and have users log out/in after seeding."
