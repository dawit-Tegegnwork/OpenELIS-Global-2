# AHRI Go-Live Department User Credentials

Staff accounts for the four go-live departments with **all six SRS lab-unit
roles** on their department (All Permissions), plus **Principal Investigator**
(project role) and **Audit Trail** (global role) — matching production User Edit
configuration.

Seeded by
`[scripts/populate-golive-department-users.sh](../scripts/populate-golive-department-users.sh)`
(user IDs **1200–1215**).

**After seeding:** restart `openelisglobal-webapp` and each user must **log out
and log back in**.

## MNTD — Malaria and Neglected Tropical Disease (MNTD) Laboratory

| Name             | Username           | Password                  |
| ---------------- | ------------------ | ------------------------- |
| Tegbar           | `tegbar`           | `tegbarGoLive!`           |
| Amanuel Shimelis | `amanuel.shimelis` | `amanuel.shimelisGoLive!` |
| Saron Fekadu     | `saron.fekadu`     | `saron.fekaduGoLive!`     |

## Bacteriology

| Name              | Username            | Password                   |
| ----------------- | ------------------- | -------------------------- |
| Wubalech Temesgen | `wubalech.temesgen` | `wubalech.temesgenGoLive!` |
| Miraf Mekonnen    | `miraf.mekonnen`    | `miraf.mekonnenGoLive!`    |
| Rahel Gebeyehu    | `rahel.gebeyehu`    | `rahel.gebeyehuGoLive!`    |
| Mekdes Alemu      | `mekdes.alemu`      | `mekdes.alemuGoLive!`      |

## Pathology — Pathology Laboratory

| Name                    | Username              | Password                     |
| ----------------------- | --------------------- | ---------------------------- |
| Sofia Yimam             | `sofia.yimam`         | `sofia.yimamGoLive!`         |
| Endegena Abebe          | `endegena.abebe`      | `endegena.abebeGoLive!`      |
| Hana Beliye             | `hana.beliye`         | `hana.beliyeGoLive!`         |
| Ehite Getu              | `ehite.getu`          | `ehite.getuGoLive!`          |
| Guta Negewo             | `guta.negewo`         | `guta.negewoGoLive!`         |
| Dr. Bethelihem Nigussie | `bethelihem.nigussie` | `bethelihem.nigussieGoLive!` |
| Dr. Menal Hassen        | `menal.hassen`        | `menal.hassenGoLive!`        |

## Biorepository — Biorepository Laboratory

| Name         | Username       | Password              |
| ------------ | -------------- | --------------------- |
| Muhidin Awol | `muhidin.awol` | `muhidin.awolGoLive!` |
| Abay Atnafu  | `abay.atnafu`  | `abay.atnafuGoLive!`  |

## Lab-unit roles (all users)

Each account has all six SRS personas on **one** department:

- Sample Collector
- Laboratory Technician
- Junior Researcher
- Senior Researcher
- Lab Manager
- Biomedical Staff

## Project and global roles (all users)

Each account also has:

- **Project role:** Principal Investigator
- **Global role:** Audit Trail

In User Edit this appears as Principal Investigator checked under **Project
Roles** and Audit Trail checked under **Global Roles**.

## Server setup (via AnyDesk SSH only)

Scripts are **not** on the server by default. Copy them from your dev machine
using AnyDesk file transfer, or download after pushing this branch to
`demo/ethiopia`.

### Option A — AnyDesk file copy (works immediately)

1. On your **dev machine**, locate these files in the repo:

- `OpenELIS-Global-2/scripts/populate-golive-department-users.sh`
- `OpenELIS-Global-2/scripts/hash-password.py`
- `OpenELIS-Global-2/scripts/verify-golive-users.py` (optional, for testing)

2. Use **AnyDesk → File transfer** to copy them to
   `/opt/OpenELIS-Docker/scripts/` on the server.
3. On the server SSH session:

```bash
cd /opt/OpenELIS-Docker
mkdir -p scripts
chmod +x scripts/populate-golive-department-users.sh
python3 -c "import bcrypt" 2>/dev/null || pip3 install --user bcrypt

sudo bash scripts/populate-golive-department-users.sh
sudo docker restart openelisglobal-webapp
```

Wait 3–5 minutes for the webapp to start.

### Option B — curl from GitHub (after push to `demo/ethiopia`)

```bash
cd /opt/OpenELIS-Docker
mkdir -p scripts
cd scripts

curl -fsSLO https://raw.githubusercontent.com/orbithealthplc/OpenELIS-Global-2/demo/ethiopia/scripts/populate-golive-department-users.sh
curl -fsSLO https://raw.githubusercontent.com/orbithealthplc/OpenELIS-Global-2/demo/ethiopia/scripts/hash-password.py

chmod +x populate-golive-department-users.sh
cd ..
sudo bash scripts/populate-golive-department-users.sh
sudo docker restart openelisglobal-webapp
```

## Mandatory login steps (every session)

Without step 2, notebook actions return **403** even with correct roles in the
database.

1. Log in at `https://192.168.25.25`
2. On the **landing page**, select your department **lab unit**:
   - MNTD = test section **177**
   - Bacteriology = **168**
   - Pathology = **176**
   - Biorepository = **182**
3. Open your department notebook
4. If an admin changed your roles: **log out and log back in**

## Workflow registry (fixes 403 on manifest preview / stages)

Notebook stage APIs require `ahri-workflows.csv`. On the server:

```bash
cd /opt/OpenELIS-Docker
bash scripts/ensure-workflow-registry.sh
# Or copy volume/configuration/backend/workflow-registry/ahri-workflows.csv manually
sudo docker restart openelisglobal-webapp
sudo docker logs openelisglobal-webapp 2>&1 | grep -i "Loaded.*workflow"
# Expect: Loaded 137 workflow stages from ahri-workflows.csv
```

## Deactivate legacy smoke/super users

Keeps only go-live accounts (1200–1215) active for testing:

```bash
sudo docker exec -i openelisglobal-database psql -U clinlims -d clinlims -f - \
  < scripts/deactivate-legacy-smoke-users.sql
```

## User Management — finding go-live users

The list shows **20 per page** sorted by login name. Search `tegbar` or paginate
— users are not missing.

## Troubleshooting 403

| Symptom                        | Fix                                                 |
| ------------------------------ | --------------------------------------------------- |
| Preview failed (403)           | Deploy workflow registry + select lab unit at login |
| Select active department first | Pick lab unit on landing page                       |
| User not in User Management    | Search by username; check page 2–3                  |

## Verification

### Database check (expect `lab_role_count=6`, `system_role_count=2`)

```bash
sudo docker exec -i openelisglobal-database psql -U clinlims -d clinlims -c "
SELECT su.login_name,
       COUNT(DISTINCT sr_lab.name) AS lab_role_count,
       (SELECT COUNT(*) FROM clinlims.system_user_role sur WHERE sur.system_user_id = su.id) AS system_role_count,
       (SELECT string_agg(sr_sys.name, ', ' ORDER BY sr_sys.name)
        FROM clinlims.system_user_role sur
        JOIN clinlims.system_role sr_sys ON sr_sys.id = sur.role_id
        WHERE sur.system_user_id = su.id) AS system_roles
FROM clinlims.system_user su
JOIN clinlims.lab_unit_roles lur ON lur.system_user_id = su.id
JOIN clinlims.lab_unit_role_map lurm ON lurm.lab_unit_role_map_id = lur.lab_unit_role_map_id
JOIN clinlims.lab_roles lr ON lr.lab_unit_role_map_id = lurm.lab_unit_role_map_id
JOIN clinlims.system_role sr_lab ON sr_lab.id::text = lr.role
WHERE su.id BETWEEN 1200 AND 1215
GROUP BY su.login_name, su.id
ORDER BY su.id;"
```

Expected `system_roles` for every user: `Audit Trail, Principal Investigator`.

### API / UAT script

```bash
# One per department with full workflow (create instance, pages, manifest where applicable)
UAT_BASE_URL=https://192.168.25.25 python3 scripts/verify-golive-users.py --spot-check

# All 16 users — basic login/roles/hierarchy only
UAT_BASE_URL=https://192.168.25.25 python3 scripts/verify-golive-users.py --all

# Single user with full workflow
UAT_BASE_URL=https://192.168.25.25 python3 scripts/verify-golive-users.py --user wubalech.temesgen
```

Spot-check in **User Edit** (`tegbar`): MNTD lab unit with all 6 roles,
Principal Investigator, Audit Trail. Then log in, select the correct **lab
unit** on the landing page, open the department notebook.
