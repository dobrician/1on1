CREATE TYPE "public"."org_type" AS ENUM('for_profit', 'non_profit');--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "org_type" "org_type" DEFAULT 'for_profit' NOT NULL;