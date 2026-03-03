CREATE TYPE "public"."action_item_status" AS ENUM('open', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."answer_type" AS ENUM('text', 'rating_1_5', 'rating_1_10', 'yes_no', 'multiple_choice', 'mood', 'scale_custom');--> statement-breakpoint
CREATE TYPE "public"."cadence" AS ENUM('weekly', 'biweekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."conditional_operator" AS ENUM('eq', 'neq', 'lt', 'gt', 'lte', 'gte');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('pre_meeting', 'agenda_prep', 'overdue_action', 'session_summary', 'missed_meeting', 'system');--> statement-breakpoint
CREATE TYPE "public"."period_type" AS ENUM('week', 'month', 'quarter', 'year');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."preferred_day" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri');--> statement-breakpoint
CREATE TYPE "public"."question_category" AS ENUM('check_in', 'wellbeing', 'engagement', 'performance', 'career', 'feedback', 'recognition', 'goals', 'custom');--> statement-breakpoint
CREATE TYPE "public"."series_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'missed');--> statement-breakpoint
CREATE TYPE "public"."team_member_role" AS ENUM('lead', 'member');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('check_in', 'career', 'performance', 'onboarding', 'custom');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'member');--> statement-breakpoint
CREATE TABLE "action_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignee_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"due_date" date,
	"status" "action_item_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"carried_to_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"series_id" uuid,
	"period_type" "period_type" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" numeric(8, 3) NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"cadence" "cadence" DEFAULT 'biweekly' NOT NULL,
	"cadence_custom_days" integer,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"default_template_id" uuid,
	"preferred_day" "preferred_day",
	"preferred_time" time,
	"status" "series_status" DEFAULT 'active' NOT NULL,
	"next_session_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject" varchar(500),
	"body" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "template_category" DEFAULT 'custom' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"answer_text" text,
	"answer_numeric" numeric(6, 2),
	"answer_json" jsonb,
	"skipped" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid,
	"session_number" integer NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"shared_notes" text,
	"duration_minutes" integer,
	"session_score" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talking_point" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer NOT NULL,
	"is_discussed" boolean DEFAULT false NOT NULL,
	"discussed_at" timestamp with time zone,
	"carried_from_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"manager_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"help_text" text,
	"category" "question_category" DEFAULT 'custom' NOT NULL,
	"answer_type" "answer_type" NOT NULL,
	"answer_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"conditional_on_question_id" uuid,
	"conditional_operator" "conditional_operator",
	"conditional_value" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logo_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"job_title" varchar(200),
	"avatar_url" varchar(500),
	"manager_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invited_at" timestamp with time zone,
	"invite_accepted_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_carried_to_session_id_session_id_fk" FOREIGN KEY ("carried_to_session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshot" ADD CONSTRAINT "analytics_snapshot_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshot" ADD CONSTRAINT "analytics_snapshot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshot" ADD CONSTRAINT "analytics_snapshot_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshot" ADD CONSTRAINT "analytics_snapshot_series_id_meeting_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."meeting_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_series" ADD CONSTRAINT "meeting_series_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_series" ADD CONSTRAINT "meeting_series_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_series" ADD CONSTRAINT "meeting_series_report_id_user_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_series" ADD CONSTRAINT "meeting_series_default_template_id_questionnaire_template_id_fk" FOREIGN KEY ("default_template_id") REFERENCES "public"."questionnaire_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_note" ADD CONSTRAINT "private_note_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_note" ADD CONSTRAINT "private_note_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_answer" ADD CONSTRAINT "session_answer_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_answer" ADD CONSTRAINT "session_answer_question_id_template_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."template_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_answer" ADD CONSTRAINT "session_answer_respondent_id_user_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_series_id_meeting_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."meeting_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_template_id_questionnaire_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."questionnaire_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talking_point" ADD CONSTRAINT "talking_point_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talking_point" ADD CONSTRAINT "talking_point_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talking_point" ADD CONSTRAINT "talking_point_carried_from_session_id_session_id_fk" FOREIGN KEY ("carried_from_session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_question" ADD CONSTRAINT "template_question_template_id_questionnaire_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."questionnaire_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_item_tenant_assignee_status_idx" ON "action_item" USING btree ("tenant_id","assignee_id","status");--> statement-breakpoint
CREATE INDEX "action_item_session_idx" ON "action_item" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "action_item_tenant_status_due_idx" ON "action_item" USING btree ("tenant_id","status","due_date");--> statement-breakpoint
CREATE INDEX "analytics_tenant_user_metric_idx" ON "analytics_snapshot" USING btree ("tenant_id","user_id","metric_name","period_start");--> statement-breakpoint
CREATE INDEX "analytics_tenant_team_metric_idx" ON "analytics_snapshot" USING btree ("tenant_id","team_id","metric_name","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_unique_snapshot_idx" ON "analytics_snapshot" USING btree ("tenant_id","user_id","team_id","series_id","period_type","period_start","metric_name");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_series_tenant_manager_report_idx" ON "meeting_series" USING btree ("tenant_id","manager_id","report_id");--> statement-breakpoint
CREATE INDEX "meeting_series_tenant_status_idx" ON "meeting_series" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "meeting_series_next_session_idx" ON "meeting_series" USING btree ("next_session_at");--> statement-breakpoint
CREATE INDEX "notification_status_scheduled_idx" ON "notification" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "notification_tenant_user_type_idx" ON "notification" USING btree ("tenant_id","user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "private_note_session_author_idx" ON "private_note" USING btree ("session_id","author_id");--> statement-breakpoint
CREATE INDEX "session_answer_session_question_idx" ON "session_answer" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "session_answer_question_respondent_idx" ON "session_answer" USING btree ("question_id","respondent_id","answered_at");--> statement-breakpoint
CREATE INDEX "session_answer_session_idx" ON "session_answer" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_series_scheduled_idx" ON "session" USING btree ("series_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "session_tenant_status_scheduled_idx" ON "session" USING btree ("tenant_id","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "session_tenant_scheduled_idx" ON "session" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_team_user_idx" ON "team_member" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tenant_email_idx" ON "user" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "user_tenant_manager_idx" ON "user" USING btree ("tenant_id","manager_id");--> statement-breakpoint
CREATE INDEX "user_tenant_role_idx" ON "user" USING btree ("tenant_id","role");