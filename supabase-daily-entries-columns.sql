-- ============================================================
-- PoultryOS — Daily entries: egg grades + death cause
-- Run in Supabase SQL Editor after your base schema exists.
--
-- ID convention: daily_entries.id and daily_entries.flock_id are TEXT (see
-- DATABASE_SCHEMA.md). This file only adds non-key columns.
--
-- Base table (expected): daily_entries with at least
--   id (text), flock_id (text), date, eggs_collected, deaths, feed_consumed,
--   notes, created_at
-- This migration adds optional breakdown columns used by the app UI.
-- ============================================================

ALTER TABLE public.daily_entries
  ADD COLUMN IF NOT EXISTS eggs_grade_a integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eggs_grade_b integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eggs_cracked integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_cause text;

COMMENT ON COLUMN public.daily_entries.eggs_collected IS
  'Total eggs; app keeps this equal to eggs_grade_a + eggs_grade_b + eggs_cracked when grade columns exist.';

-- Optional: enforce one row per flock per calendar day (uncomment if no duplicates)
-- CREATE UNIQUE INDEX IF NOT EXISTS daily_entries_flock_id_date_uidx
--   ON public.daily_entries (flock_id, date);
