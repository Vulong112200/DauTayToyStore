-- Enable Row Level Security (RLS) on every table in the `public` schema.
--
-- Why: Supabase exposes every `public` table through PostgREST's auto-generated
-- REST API, reachable with the public `anon` key. Without RLS, those tables are
-- readable/writable directly through that API, bypassing the NestJS/Prisma backend
-- entirely — hence Supabase's "RLS Disabled in Public" critical advisories on
-- (almost) every table.
--
-- This app never uses PostgREST / @supabase/supabase-js — all DB access goes through
-- Prisma, which connects as the table-owner role and therefore BYPASSES RLS (owners
-- bypass RLS unless FORCE ROW LEVEL SECURITY is set, which we deliberately do NOT set).
-- So enabling RLS with NO policies denies the public PostgREST paths (anon/authenticated)
-- while leaving the backend completely unaffected. That is exactly the lockdown we want.
--
-- The DO block loops over every base table in `public` — including Prisma's own
-- `_prisma_migrations` bookkeeping table, which Supabase also flags. Enabling RLS on it
-- is safe: the migrate engine connects as the owner role and bypasses RLS, so it can
-- still read/write its migration history. ENABLE (not FORCE) keeps that owner bypass
-- intact for both Prisma runtime queries and the migrate engine.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
