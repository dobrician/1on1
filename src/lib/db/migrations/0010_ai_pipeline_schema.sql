-- AI Pipeline Schema Migration
-- Adds AI columns to session table and creates ai_nudge table

-- Create ai_status enum
DO $$ BEGIN
  CREATE TYPE "public"."ai_status" AS ENUM('pending', 'generating', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add AI columns to session table
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ai_summary" jsonb;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ai_manager_addendum" jsonb;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ai_suggestions" jsonb;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ai_status" "public"."ai_status" DEFAULT 'pending';
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ai_completed_at" timestamp with time zone;

-- Create ai_nudge table
CREATE TABLE IF NOT EXISTS "ai_nudge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "series_id" uuid NOT NULL REFERENCES "meeting_series"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "target_session_at" timestamp with time zone,
  "content" text NOT NULL,
  "reason" text,
  "priority" text DEFAULT 'medium',
  "source_session_id" uuid REFERENCES "session"("id"),
  "is_dismissed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "refreshed_at" timestamp with time zone
);

-- Create indexes on ai_nudge
CREATE INDEX IF NOT EXISTS "ai_nudge_series_target_idx" ON "ai_nudge" USING btree ("series_id", "target_session_at");
CREATE INDEX IF NOT EXISTS "ai_nudge_tenant_dismissed_idx" ON "ai_nudge" USING btree ("tenant_id", "is_dismissed");

-- Enable RLS on ai_nudge
ALTER TABLE "ai_nudge" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation
CREATE POLICY "tenant_isolation" ON "ai_nudge"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Grant permissions to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_nudge" TO app_user;
