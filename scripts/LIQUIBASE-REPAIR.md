# Liquibase repair playbook (OpenELIS AHRI)

Use this when the webapp fails to start after deploy and logs mention
`liquibase`, `Validation Failed`, or `checksum`.

## 1. Diagnose first

From the repo root (local) or `/opt/OpenELIS-Docker` (server):

```bash
bash scripts/diagnose-liquibase-deploy.sh
```

Save the full output. Check:

- **Checksum validation** — `was: 8:... but is now: 8:...`
- **Duplicate key** — often `053-seed-notebook-demo-stock` on prod
- **Unique constraint** — `notebook_page` / `page_order` (076)
- **Lock** — `databasechangeloglock.locked = true`

## 2. Checksum drift (already-applied changeset edited)

**Symptom:** App won't start; log shows `Validation Failed` with two checksums.

**Fix in code (preferred):** Add `<validCheckSum>` for **both** the old and new
hash on that changeset, rebuild WAR, redeploy.

**Do not** edit changesets that already ran without either:

- a new changeset (077, 078, …), or
- `<validCheckSum>` entries for every hash the DB may have stored.

**Emergency (DB only, if WAR already deployed):**

```sql
UPDATE clinlims.databasechangelog
SET md5sum = '<new-checksum-from-log-is-now>'
WHERE id = '<changeset-id>' AND author = '<author>';
DELETE FROM clinlims.databasechangeloglock WHERE locked = true;
```

Then restart the webapp once.

## 3. Production: 053 demo seed already present

**Symptom:** Startup fails on `053-seed-notebook-demo-stock` (duplicate
inventory).

**Fix:**

```bash
docker exec -i openelisglobal-database psql -U clinlims -d clinlims \
  < scripts/repair-liquibase-053-seed-skip.sql
docker restart openelisglobal-webapp
```

This marks the seed changeset `MARK_RAN` so Liquibase continues to 074+.

## 4. Production: 076 page order collision

**Symptom:** Startup fails on `076-reorder-biorepository-retention-to-end`
(unique on `notebook_id`, `page_order`).

**Diagnose:**

```sql
SELECT notebook_id, page_order, COUNT(*)
FROM clinlims.notebook_page
GROUP BY notebook_id, page_order
HAVING COUNT(*) > 1;
```

**Fix (only if 076 failed and is NOT in `databasechangelog` as EXECUTED):**

```bash
docker exec -i openelisglobal-database psql -U clinlims -d clinlims \
  < scripts/repair-liquibase-076-page-order.sql
docker restart openelisglobal-webapp
```

## 5. Stale Liquibase lock

**Symptom:** Hang or lock exception; `databasechangeloglock.locked = true`.

```sql
DELETE FROM clinlims.databasechangeloglock WHERE locked = true;
```

Restart webapp.

## 6. Deploy checklist

1. `pg_dump` backup before deploy
2. Build WAR from the release git commit: `mvn package -DskipTests`
3. Copy WAR to server / mount in compose; `docker restart openelisglobal-webapp`
4. Run `bash scripts/diagnose-liquibase-deploy.sh`
5. Confirm new changesets show `EXECUTED` or `MARK_RAN` in `databasechangelog`
6. Smoke-test login and one notebook page

## 7. Local dev

```bash
mvn package -DskipTests
docker restart openelisglobal-webapp
# frontend dev (separate terminal):
cd frontend && npm start   # needs src/setupProxy.js → https://localhost:8443
```

For UI-only label changes, use frontend i18n — not edits to old Liquibase
notebook inserts.
