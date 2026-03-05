-- Add reminderHoursBefore column to meeting_series
ALTER TABLE "meeting_series" ADD COLUMN "reminder_hours_before" integer NOT NULL DEFAULT 24;
