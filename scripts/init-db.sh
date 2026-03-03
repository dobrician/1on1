#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  -- Create databases for blue-green setup
  CREATE DATABASE oneonone_stable;
  CREATE DATABASE oneonone_dev;

  -- Create dedicated app role (NO BYPASSRLS -- critical for RLS enforcement)
  CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';

  -- Grant on stable database
  \c oneonone_stable
  GRANT CONNECT ON DATABASE oneonone_stable TO app_user;
  GRANT USAGE, CREATE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;

  -- Grant on dev database
  \c oneonone_dev
  GRANT CONNECT ON DATABASE oneonone_dev TO app_user;
  GRANT USAGE, CREATE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
EOSQL
