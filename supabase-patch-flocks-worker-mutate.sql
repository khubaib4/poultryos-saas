-- Patch: allow assigned farm workers to INSERT/UPDATE/DELETE flocks (admins read-only at DB).
-- Run in Supabase SQL Editor if you already applied an older supabase-rls-farm-workers.sql
-- that restricted flock mutations to admins only.

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

DROP POLICY IF EXISTS "flocks_mutate_admin" ON public.flocks;
DROP POLICY IF EXISTS "flocks_update_admin" ON public.flocks;
DROP POLICY IF EXISTS "flocks_delete_admin" ON public.flocks;
DROP POLICY IF EXISTS "flocks_insert_worker" ON public.flocks;
DROP POLICY IF EXISTS "flocks_update_worker" ON public.flocks;
DROP POLICY IF EXISTS "flocks_delete_worker" ON public.flocks;

CREATE POLICY "flocks_insert_worker"
ON public.flocks FOR INSERT
WITH CHECK (public.user_is_assigned_farm_worker(farm_id));

CREATE POLICY "flocks_update_worker"
ON public.flocks FOR UPDATE
USING (public.user_is_assigned_farm_worker(farm_id));

CREATE POLICY "flocks_delete_worker"
ON public.flocks FOR DELETE
USING (public.user_is_assigned_farm_worker(farm_id));
