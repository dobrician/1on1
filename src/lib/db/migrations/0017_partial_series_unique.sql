-- Replace the unconditional unique constraint with a partial one that allows
-- re-creating a series for the same manager+report pair after archiving.
DROP INDEX IF EXISTS "meeting_series_tenant_manager_report_idx";
CREATE UNIQUE INDEX "meeting_series_tenant_manager_report_idx"
  ON "meeting_series" ("tenant_id", "manager_id", "report_id")
  WHERE status != 'archived';
