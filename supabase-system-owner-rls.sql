-- ============================================================
-- PoultryOS — System owner RLS helpers & policies
-- Run after supabase-rls-farms.sql (users / organizations base policies exist).
-- Allows SYSTEM_OWNER to read (and manage) platform-wide data.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (auth.uid())::text
      AND u.role = 'SYSTEM_OWNER'
      AND u.status = 'ACTIVE'
  );
$$;

-- Optional: operational status for suspend/activate (separate from plan_status)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';

COMMENT ON COLUMN public.organizations.status IS 'ACTIVE | INACTIVE (suspended)';

-- ─── ORGANIZATIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS "orgs_select_system_owner" ON public.organizations;
CREATE POLICY "orgs_select_system_owner"
ON public.organizations FOR SELECT
USING (public.is_system_owner());

DROP POLICY IF EXISTS "orgs_update_system_owner" ON public.organizations;
CREATE POLICY "orgs_update_system_owner"
ON public.organizations FOR UPDATE
USING (public.is_system_owner());

DROP POLICY IF EXISTS "orgs_insert_system_owner" ON public.organizations;
CREATE POLICY "orgs_insert_system_owner"
ON public.organizations FOR INSERT
WITH CHECK (public.is_system_owner());

-- ─── USERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_system_owner" ON public.users;
CREATE POLICY "users_select_system_owner"
ON public.users FOR SELECT
USING (public.is_system_owner());

DROP POLICY IF EXISTS "users_update_system_owner" ON public.users;
CREATE POLICY "users_update_system_owner"
ON public.users FOR UPDATE
USING (public.is_system_owner());

DROP POLICY IF EXISTS "users_insert_system_owner" ON public.users;
CREATE POLICY "users_insert_system_owner"
ON public.users FOR INSERT
WITH CHECK (public.is_system_owner());

-- ─── FARMS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "farms_select_system_owner" ON public.farms;
CREATE POLICY "farms_select_system_owner"
ON public.farms FOR SELECT
USING (public.is_system_owner());

-- ─── FLOCKS (read-only for system owner) ─────────────────────
DROP POLICY IF EXISTS "flocks_select_system_owner" ON public.flocks;
CREATE POLICY "flocks_select_system_owner"
ON public.flocks FOR SELECT
USING (public.is_system_owner());

-- ─── SALES (read-only) ───────────────────────────────────────
DROP POLICY IF EXISTS "sales_select_system_owner" ON public.sales;
CREATE POLICY "sales_select_system_owner"
ON public.sales FOR SELECT
USING (public.is_system_owner());
