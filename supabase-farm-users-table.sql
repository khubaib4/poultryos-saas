-- ============================================================
-- PoultryOS — farm_users (worker ↔ farm assignments)
-- Run in Supabase SQL Editor after core tables exist.
--
-- ID convention: all primary keys and FKs use TEXT (Supabase Auth UUID as text).
--   id text PRIMARY KEY DEFAULT gen_random_uuid()::text
--
-- If you already have farm_users, DROP below will remove data. Skip DROP for
-- manual ALTER migrations.
-- ============================================================

DROP TABLE IF EXISTS public.farm_users CASCADE;

CREATE TABLE public.farm_users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  farm_id text NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, farm_id)
);

CREATE INDEX farm_users_user_id_idx ON public.farm_users (user_id);
CREATE INDEX farm_users_farm_id_idx ON public.farm_users (farm_id);

ALTER TABLE public.farm_users ENABLE ROW LEVEL SECURITY;

-- Workers see their own assignments (auth.uid() is uuid; compare as text)
CREATE POLICY "farm_users_select_own"
ON public.farm_users FOR SELECT
USING (user_id = (auth.uid())::text);

-- Admins (same org as the farm) manage assignments
CREATE POLICY "farm_users_admin_insert"
ON public.farm_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.farms f
    JOIN public.users u ON u.organization_id = f.organization_id
    WHERE f.id = farm_id
      AND u.id = (auth.uid())::text
      AND u.role IN ('ADMIN', 'SYSTEM_OWNER')
  )
);

CREATE POLICY "farm_users_admin_update"
ON public.farm_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.farms f
    JOIN public.users u ON u.organization_id = f.organization_id
    WHERE f.id = farm_id
      AND u.id = (auth.uid())::text
      AND u.role IN ('ADMIN', 'SYSTEM_OWNER')
  )
);

CREATE POLICY "farm_users_admin_delete"
ON public.farm_users FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.farms f
    JOIN public.users u ON u.organization_id = f.organization_id
    WHERE f.id = farm_id
      AND u.id = (auth.uid())::text
      AND u.role IN ('ADMIN', 'SYSTEM_OWNER')
  )
);
