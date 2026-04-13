-- ============================================================
-- PoultryOS — expenses (farm-scoped)
-- Requires: farms, user_can_access_farm() from supabase-rls-farm-workers.sql
-- All IDs are TEXT. Safe to re-run.
-- ============================================================

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes text;

-- Legacy column is often `date`; keep both and sync display column
UPDATE public.expenses
SET expense_date = COALESCE(expense_date, date, CURRENT_DATE)
WHERE expense_date IS NULL;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_scoped" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_scoped" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_scoped" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_scoped" ON public.expenses;

CREATE POLICY "expenses_select"
ON public.expenses FOR SELECT
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "expenses_insert"
ON public.expenses FOR INSERT
WITH CHECK (public.user_can_access_farm(farm_id));

CREATE POLICY "expenses_update"
ON public.expenses FOR UPDATE
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "expenses_delete"
ON public.expenses FOR DELETE
USING (public.user_can_access_farm(farm_id));
