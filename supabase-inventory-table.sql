-- ============================================================
-- PoultryOS — inventory + inventory_transactions (farm-scoped)
-- Requires: farms, user_can_access_farm() from supabase-rls-farm-workers.sql
-- All IDs are TEXT. Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id text NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'feed',
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  current_stock numeric(12, 2) NOT NULL DEFAULT 0,
  min_stock numeric(12, 2) NOT NULL DEFAULT 0,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  last_restocked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS type text DEFAULT 'feed';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS unit text DEFAULT 'kg';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS current_stock numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS min_stock numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS last_restocked_at timestamptz;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS inventory_farm_id_idx ON public.inventory (farm_id);
CREATE INDEX IF NOT EXISTS inventory_type_idx ON public.inventory (type);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select" ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete" ON public.inventory;
DROP POLICY IF EXISTS "inventory_select_org" ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert_org" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_org" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete_org" ON public.inventory;
DROP POLICY IF EXISTS "inventory_select_scoped" ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert_scoped" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_scoped" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete_scoped" ON public.inventory;

CREATE POLICY "inventory_select"
ON public.inventory FOR SELECT
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "inventory_insert"
ON public.inventory FOR INSERT
WITH CHECK (public.user_can_access_farm(farm_id));

CREATE POLICY "inventory_update"
ON public.inventory FOR UPDATE
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "inventory_delete"
ON public.inventory FOR DELETE
USING (public.user_can_access_farm(farm_id));

-- Backfill name for legacy empty rows (if any)
UPDATE public.inventory
SET name = COALESCE(NULLIF(trim(name), ''), 'Unnamed item')
WHERE name IS NULL OR trim(name) = '';

-- ─── Transactions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inventory_id text NOT NULL REFERENCES public.inventory (id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity numeric(12, 2) NOT NULL,
  reason text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_transactions_inventory_id_idx ON public.inventory_transactions (inventory_id);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_transactions_select" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_select"
ON public.inventory_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.inventory i
    WHERE i.id = inventory_transactions.inventory_id
      AND public.user_can_access_farm(i.farm_id)
  )
);

CREATE POLICY "inventory_transactions_insert"
ON public.inventory_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory i
    WHERE i.id = inventory_id
      AND public.user_can_access_farm(i.farm_id)
  )
);
