-- ============================================================
-- PoultryOS — vaccinations (farm-scoped, per flock)
-- Requires: farms, flocks, user_can_access_farm() from supabase-rls-farm-workers.sql
-- All IDs are TEXT. Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccinations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id text NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  flock_id text NOT NULL REFERENCES public.flocks (id) ON DELETE CASCADE,
  vaccine_name text,
  scheduled_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'scheduled',
  dosage text,
  method text,
  administered_by text,
  batch_number text,
  notes text,
  skipped_reason text,
  inventory_id text,
  quantity_used numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS vaccine_name text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS completed_date date;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS dosage text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS administered_by text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS skipped_reason text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS inventory_id text;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS quantity_used numeric(12, 2);
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Optional FK to inventory (run after supabase-inventory-table.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vaccinations_inventory_id_fkey'
  ) THEN
    ALTER TABLE public.vaccinations
      ADD CONSTRAINT vaccinations_inventory_id_fkey
      FOREIGN KEY (inventory_id) REFERENCES public.inventory (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vaccinations_farm_id_idx ON public.vaccinations (farm_id);
CREATE INDEX IF NOT EXISTS vaccinations_flock_id_idx ON public.vaccinations (flock_id);
CREATE INDEX IF NOT EXISTS vaccinations_scheduled_date_idx ON public.vaccinations (scheduled_date);
CREATE INDEX IF NOT EXISTS vaccinations_status_idx ON public.vaccinations (status);

ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccinations_select" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_insert" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_update" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_delete" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_select_org" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_insert_org" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_update_org" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_delete_org" ON public.vaccinations;

CREATE POLICY "vaccinations_select" ON public.vaccinations FOR SELECT USING (user_can_access_farm(farm_id));
CREATE POLICY "vaccinations_insert" ON public.vaccinations FOR INSERT WITH CHECK (user_can_access_farm(farm_id));
CREATE POLICY "vaccinations_update" ON public.vaccinations FOR UPDATE USING (user_can_access_farm(farm_id));
CREATE POLICY "vaccinations_delete" ON public.vaccinations FOR DELETE USING (user_can_access_farm(farm_id));
