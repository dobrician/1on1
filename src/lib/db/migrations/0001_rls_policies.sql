-- Custom migration: Enable RLS and create tenant isolation policies
-- This migration must be run as a superuser (postgres) as it creates
-- RLS policies and grants privileges to the app_user role.

-- =============================================================
-- 1. Enable RLS on all tenant-scoped tables (including tenant)
-- =============================================================

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE team ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE team_member ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE questionnaire_template ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE template_question ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE meeting_series ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE session ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE session_answer ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE private_note ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE talking_point ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE action_item ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE analytics_snapshot ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================
-- 2. Tenant isolation policies for tables with tenant_id
-- =============================================================

-- TENANT: self-access policy
CREATE POLICY tenant_self_access ON tenant
  USING (id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- USER
CREATE POLICY tenant_isolation ON "user"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- TEAM
CREATE POLICY tenant_isolation ON team
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- QUESTIONNAIRE_TEMPLATE (tenant_id nullable for system templates)
CREATE POLICY tenant_isolation ON questionnaire_template
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR tenant_id IS NULL);--> statement-breakpoint

-- MEETING_SERIES
CREATE POLICY tenant_isolation ON meeting_series
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- SESSION
CREATE POLICY tenant_isolation ON session
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- ACTION_ITEM
CREATE POLICY tenant_isolation ON action_item
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- NOTIFICATION
CREATE POLICY tenant_isolation ON notification
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- ANALYTICS_SNAPSHOT
CREATE POLICY tenant_isolation ON analytics_snapshot
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- =============================================================
-- 3. Policies for junction/child tables (no own tenant_id)
-- =============================================================

-- TEAM_MEMBER: joins through team
CREATE POLICY tenant_isolation ON team_member
  USING (team_id IN (
    SELECT id FROM team
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));--> statement-breakpoint

-- TEMPLATE_QUESTION: joins through questionnaire_template (includes system templates)
CREATE POLICY tenant_isolation ON template_question
  USING (template_id IN (
    SELECT id FROM questionnaire_template
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
       OR tenant_id IS NULL
  ));--> statement-breakpoint

-- SESSION_ANSWER: joins through session
CREATE POLICY tenant_isolation ON session_answer
  USING (session_id IN (
    SELECT id FROM session
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));--> statement-breakpoint

-- TALKING_POINT: joins through session
CREATE POLICY tenant_isolation ON talking_point
  USING (session_id IN (
    SELECT id FROM session
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));--> statement-breakpoint

-- =============================================================
-- 4. Private note: RESTRICTIVE tenant + author-only policies
-- =============================================================

-- Force RLS even for table owner
ALTER TABLE private_note FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Restrictive tenant isolation (must pass AND other policies)
CREATE POLICY tenant_isolation ON private_note AS RESTRICTIVE
  USING (session_id IN (
    SELECT id FROM session
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));--> statement-breakpoint

-- Author-only SELECT
CREATE POLICY author_only_select ON private_note
  FOR SELECT
  USING (author_id = current_setting('app.current_user_id')::uuid);--> statement-breakpoint

-- Author-only INSERT
CREATE POLICY author_only_insert ON private_note
  FOR INSERT
  WITH CHECK (author_id = current_setting('app.current_user_id')::uuid);--> statement-breakpoint

-- Author-only UPDATE
CREATE POLICY author_only_update ON private_note
  FOR UPDATE
  USING (author_id = current_setting('app.current_user_id')::uuid);--> statement-breakpoint

-- Author-only DELETE
CREATE POLICY author_only_delete ON private_note
  FOR DELETE
  USING (author_id = current_setting('app.current_user_id')::uuid);--> statement-breakpoint

-- =============================================================
-- 5. Grant privileges to app_user role
-- =============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint

-- Grant CRUD on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint

-- Grant usage on sequences (for any future serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;--> statement-breakpoint

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
