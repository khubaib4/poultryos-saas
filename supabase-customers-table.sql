-- ============================================================
-- PoultryOS — customers (per farm)
-- Requires: farms, user_can_access_farm() from supabase-rls-farm-workers.sql
-- All IDs are TEXT (see DATABASE_SCHEMA.md).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id text NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  business_name text,
  address text,
  category text NOT NULL DEFAULT 'Individual',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_farm_id_idx ON public.customers (farm_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Safe to re-run: replace policies if they already exist
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select"
ON public.customers FOR SELECT
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "customers_insert"
ON public.customers FOR INSERT
WITH CHECK (public.user_can_access_farm(farm_id));

CREATE POLICY "customers_update"
ON public.customers FOR UPDATE
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "customers_delete"
ON public.customers FOR DELETE
USING (public.user_can_access_farm(farm_id));

-- Optional: link sales rows to customers for stats/history (safe if column already exists)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id text REFERENCES public.customers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON public.sales (customer_id);

-- ─── Existing databases only ─────────────────────────────────────────────────
-- `CREATE TABLE IF NOT EXISTS` does not add new columns to an already-created
-- table. Run this block once if you see errors like "column customers.notes does not exist".

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS notes text;
