-- ============================================================
-- PoultryOS — egg_categories (per-farm sale line presets)
-- Run in Supabase SQL Editor after farms + RLS helpers exist
-- (get_my_organization_id, user_can_access_farm, is_org_admin_user, user_is_assigned_farm_worker).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.egg_categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id text NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_price numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, name)
);

CREATE INDEX IF NOT EXISTS egg_categories_farm_id_idx ON public.egg_categories (farm_id);
CREATE INDEX IF NOT EXISTS egg_categories_farm_active_idx ON public.egg_categories (farm_id, is_active);

ALTER TABLE public.egg_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egg_categories_select"
ON public.egg_categories FOR SELECT
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "egg_categories_insert_worker"
ON public.egg_categories FOR INSERT
WITH CHECK (public.user_is_assigned_farm_worker(farm_id));

CREATE POLICY "egg_categories_update_worker"
ON public.egg_categories FOR UPDATE
USING (public.user_is_assigned_farm_worker(farm_id));

-- Deactivate via UPDATE (is_active = false); no hard DELETE from the app.

-- Org admins can insert defaults when creating a farm (no farm_users row yet).
CREATE POLICY "egg_categories_insert_admin"
ON public.egg_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.farms f
    WHERE f.id = farm_id
      AND f.organization_id = public.get_my_organization_id()
      AND public.is_org_admin_user()
  )
);
