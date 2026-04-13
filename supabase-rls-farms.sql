-- ============================================================
-- PoultryOS — Row Level Security Policies
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- HELPER: look up the calling user's organization_id
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM   public.users
  WHERE  id = (auth.uid())::text
  LIMIT  1;
$$;


-- ════════════════════════════════════════════════════════════
-- USERS TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Own row: full access (users.id is text; auth.uid() is uuid)
CREATE POLICY "users_select_own"  ON public.users FOR SELECT  USING (id = (auth.uid())::text);
CREATE POLICY "users_insert_own"  ON public.users FOR INSERT  WITH CHECK (id = (auth.uid())::text);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE  USING (id = (auth.uid())::text);

-- Admins can see all users in their organization
CREATE POLICY "users_select_same_org"
ON public.users FOR SELECT
USING (
  organization_id = get_my_organization_id()
  AND id != (auth.uid())::text   -- not duplicating own-row policy
);


-- ════════════════════════════════════════════════════════════
-- ORGANIZATIONS TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Only the admin (creator) of the organization can see and manage it
CREATE POLICY "orgs_select_member"
ON public.organizations FOR SELECT
USING (id = get_my_organization_id());

CREATE POLICY "orgs_insert_own"
ON public.organizations FOR INSERT
WITH CHECK (admin_id = (auth.uid())::text);

CREATE POLICY "orgs_update_own"
ON public.organizations FOR UPDATE
USING (admin_id = (auth.uid())::text);


-- ════════════════════════════════════════════════════════════
-- FARMS TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- SELECT: any member of the organization can view farms
CREATE POLICY "farms_select_org"
ON public.farms FOR SELECT
USING (organization_id = get_my_organization_id());

-- INSERT: only org members, and only into their own org
CREATE POLICY "farms_insert_org"
ON public.farms FOR INSERT
WITH CHECK (organization_id = get_my_organization_id());

-- UPDATE: only org members
CREATE POLICY "farms_update_org"
ON public.farms FOR UPDATE
USING (organization_id = get_my_organization_id());

-- DELETE: only org members
CREATE POLICY "farms_delete_org"
ON public.farms FOR DELETE
USING (organization_id = get_my_organization_id());


-- ════════════════════════════════════════════════════════════
-- FLOCKS TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.flocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flocks_select_org"
ON public.flocks FOR SELECT
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "flocks_insert_org"
ON public.flocks FOR INSERT
WITH CHECK (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "flocks_update_org"
ON public.flocks FOR UPDATE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "flocks_delete_org"
ON public.flocks FOR DELETE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);


-- ════════════════════════════════════════════════════════════
-- DAILY ENTRIES TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_entries_select_org"
ON public.daily_entries FOR SELECT
USING (
  flock_id IN (
    SELECT f.id FROM public.flocks f
    JOIN public.farms fm ON fm.id = f.farm_id
    WHERE fm.organization_id = get_my_organization_id()
  )
);

CREATE POLICY "daily_entries_insert_org"
ON public.daily_entries FOR INSERT
WITH CHECK (
  flock_id IN (
    SELECT f.id FROM public.flocks f
    JOIN public.farms fm ON fm.id = f.farm_id
    WHERE fm.organization_id = get_my_organization_id()
  )
);

CREATE POLICY "daily_entries_update_org"
ON public.daily_entries FOR UPDATE
USING (
  flock_id IN (
    SELECT f.id FROM public.flocks f
    JOIN public.farms fm ON fm.id = f.farm_id
    WHERE fm.organization_id = get_my_organization_id()
  )
);

CREATE POLICY "daily_entries_delete_org"
ON public.daily_entries FOR DELETE
USING (
  flock_id IN (
    SELECT f.id FROM public.flocks f
    JOIN public.farms fm ON fm.id = f.farm_id
    WHERE fm.organization_id = get_my_organization_id()
  )
);


-- ════════════════════════════════════════════════════════════
-- SALES TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_org"
ON public.sales FOR SELECT
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "sales_insert_org"
ON public.sales FOR INSERT
WITH CHECK (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "sales_update_org"
ON public.sales FOR UPDATE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "sales_delete_org"
ON public.sales FOR DELETE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);


-- ════════════════════════════════════════════════════════════
-- EXPENSES TABLE
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_org"
ON public.expenses FOR SELECT
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "expenses_insert_org"
ON public.expenses FOR INSERT
WITH CHECK (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "expenses_update_org"
ON public.expenses FOR UPDATE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);

CREATE POLICY "expenses_delete_org"
ON public.expenses FOR DELETE
USING (
  farm_id IN (
    SELECT id FROM public.farms
    WHERE organization_id = get_my_organization_id()
  )
);


-- ════════════════════════════════════════════════════════════
-- Verify: list all policies created
-- ════════════════════════════════════════════════════════════
SELECT schemaname, tablename, policyname, cmd
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, policyname;
