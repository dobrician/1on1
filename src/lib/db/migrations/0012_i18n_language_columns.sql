-- Add UI language preference to users (per-user setting)
ALTER TABLE "user" ADD COLUMN "language" varchar(10) NOT NULL DEFAULT 'en';

-- Add content language to tenants (per-company setting)
ALTER TABLE "tenant" ADD COLUMN "content_language" varchar(10) NOT NULL DEFAULT 'en';
