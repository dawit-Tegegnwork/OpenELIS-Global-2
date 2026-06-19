# Pathology template role verification

After deploy, run against production to confirm notebook template roles match
AHRI persona names:

```bash
psql -h <host> -U <user> -d clinlims -f scripts/ahri/verify-pathology-template-roles.sql
```

If results show only legacy roles (`Technician`, `Supervisor`) and not AHRI
personas (`Laboratory Technician`, etc.), either:

1. Update the **Pathology Laboratory** template in the admin UI (Access Control
   → allowed roles), or
2. Add a Liquibase backfill changeset mapping AHRI persona names for that
   template.

With this release, pathology staff can still save workflow type changes when
they hold an AHRI persona on the active department even if template
`allowed_roles` still list legacy names.
