-- ============================================================
-- PoultryOS — RLS: farm workers only see assigned farms
--
-- Run AFTER supabase-farm-users-table.sql and existing RLS scripts.
-- This replaces org-wide SELECT for workers with:
--   ADMIN / SYSTEM_OWNER → all farms in their organization
--   FARM_USER            → only farms listed in farm_users
--
-- Also: only admins may INSERT/UPDATE/DELETE farms; flock INSERT/UPDATE/DELETE is for assigned workers.
-- Workers may CRUD daily_entries, sales, expenses on accessible farms.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (auth.uid())::text
      AND u.role IN ('ADMIN', 'SYSTEM_OWNER')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_farm(p_farm_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farms f
    WHERE f.id = p_farm_id
      AND f.organization_id = get_my_organization_id()
      AND (
        public.is_org_admin_user()
        OR EXISTS (
          SELECT 1 FROM public.farm_users fu
          WHERE fu.farm_id = p_farm_id
            AND fu.user_id = (auth.uid())::text
        )
      )
  );
$$;

/** True if the current user is explicitly assigned to this farm in farm_users (workers only). */
CREATE OR REPLACE FUNCTION public.user_is_assigned_farm_worker(p_farm_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = p_farm_id
      AND fu.user_id = (auth.uid())::text
  );
$$;

-- ─── FARMS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "farms_select_org" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_org" ON public.farms;
DROP POLICY IF EXISTS "farms_update_org" ON public.farms;
DROP POLICY IF EXISTS "farms_delete_org" ON public.farms;

CREATE POLICY "farms_select_scoped"
ON public.farms FOR SELECT
USING (public.user_can_access_farm(id));

CREATE POLICY "farms_insert_admin"
ON public.farms FOR INSERT
WITH CHECK (
  organization_id = get_my_organization_id()
  AND public.is_org_admin_user()
);

CREATE POLICY "farms_update_admin"
ON public.farms FOR UPDATE
USING (
  organization_id = get_my_organization_id()
  AND public.is_org_admin_user()
);

CREATE POLICY "farms_delete_admin"
ON public.farms FOR DELETE
USING (
  organization_id = get_my_organization_id()
  AND public.is_org_admin_user()
);

-- ─── FLOCKS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "flocks_select_org" ON public.flocks;
DROP POLICY IF EXISTS "flocks_insert_org" ON public.flocks;
DROP POLICY IF EXISTS "flocks_update_org" ON public.flocks;
DROP POLICY IF EXISTS "flocks_delete_org" ON public.flocks;

CREATE POLICY "flocks_select_scoped"
ON public.flocks FOR SELECT
USING (public.user_can_access_farm(farm_id));

-- Flock mutations: assigned farm workers only (admins keep SELECT via user_can_access_farm).
DROP POLICY IF EXISTS "flocks_mutate_admin" ON public.flocks;
DROP POLICY IF EXISTS "flocks_update_admin" ON public.flocks;
DROP POLICY IF EXISTS "flocks_delete_admin" ON public.flocks;

CREATE POLICY "flocks_insert_worker"
ON public.flocks FOR INSERT
WITH CHECK (public.user_is_assigned_farm_worker(farm_id));

CREATE POLICY "flocks_update_worker"
ON public.flocks FOR UPDATE
USING (public.user_is_assigned_farm_worker(farm_id));

CREATE POLICY "flocks_delete_worker"
ON public.flocks FOR DELETE
USING (public.user_is_assigned_farm_worker(farm_id));

-- ─── DAILY ENTRIES ─────────────────────────────────────────
DROP POLICY IF EXISTS "daily_entries_select_org" ON public.daily_entries;
DROP POLICY IF EXISTS "daily_entries_insert_org" ON public.daily_entries;
DROP POLICY IF EXISTS "daily_entries_update_org" ON public.daily_entries;
DROP POLICY IF EXISTS "daily_entries_delete_org" ON public.daily_entries;

CREATE POLICY "daily_entries_select_scoped"
ON public.daily_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flocks fl
    WHERE fl.id = daily_entries.flock_id
      AND public.user_can_access_farm(fl.farm_id)
  )
);

CREATE POLICY "daily_entries_insert_scoped"
ON public.daily_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flocks fl
    WHERE fl.id = daily_entries.flock_id
      AND public.user_can_access_farm(fl.farm_id)
  )
);

CREATE POLICY "daily_entries_update_scoped"
ON public.daily_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.flocks fl
    WHERE fl.id = daily_entries.flock_id
      AND public.user_can_access_farm(fl.farm_id)
  )
);

CREATE POLICY "daily_entries_delete_scoped"
ON public.daily_entries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.flocks fl
    WHERE fl.id = daily_entries.flock_id
      AND public.user_can_access_farm(fl.farm_id)
  )
);

-- ─── SALES & PAYMENTS ────────────────────────────────────────
-- RLS for `sales` and `payments` is defined in `supabase-sales-table.sql`
-- (policies `sales_*` and `payments_*`). Run that migration after this file.

-- ─── EXPENSES ──────────────────────────────────────────────
-- RLS for `expenses` is defined in `supabase-expenses-table.sql` (policies `expenses_*`).

-- ─── INVENTORY ─────────────────────────────────────────────
-- RLS for `inventory` and `inventory_transactions` is in `supabase-inventory-table.sql`.

-- ─── VACCINATIONS ──────────────────────────────────────────
-- RLS for `vaccinations` is in `supabase-vaccinations-table.sql`.

-- Optional: when you add more farm-scoped tables,
-- scope them with the same pattern:
--   USING (public.user_can_access_farm(farm_id))
