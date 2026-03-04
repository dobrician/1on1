-- Add analytics ingestion tracking column to session table
ALTER TABLE session ADD COLUMN analytics_ingested_at TIMESTAMPTZ;
