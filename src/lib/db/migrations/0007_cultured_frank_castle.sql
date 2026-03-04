DROP INDEX "private_note_session_author_idx";--> statement-breakpoint
DROP INDEX "session_answer_session_question_idx";--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "shared_notes" SET DATA TYPE jsonb USING
  CASE WHEN shared_notes IS NOT NULL
    THEN jsonb_build_object('general', shared_notes)
    ELSE NULL END;--> statement-breakpoint
ALTER TABLE "action_item" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "private_note" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "talking_point" ADD COLUMN "category" varchar(50);--> statement-breakpoint
CREATE UNIQUE INDEX "private_note_session_author_category_idx" ON "private_note" USING btree ("session_id","author_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "session_answer_session_question_unique_idx" ON "session_answer" USING btree ("session_id","question_id");