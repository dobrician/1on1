-- Add AI chat history and version history JSONB columns to questionnaire_template
ALTER TABLE "questionnaire_template"
  ADD COLUMN "ai_chat_history" jsonb,
  ADD COLUMN "ai_version_history" jsonb;
