-- ============================================================
-- PoultryOS Test Seed
-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com → SQL Editor → New Query
--
-- IMPORTANT: Run STEP 1 first, then STEP 2.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- STEP 1 — Create the Supabase Auth user
-- Run this block first and note the returned user ID.
-- ════════════════════════════════════════════════════════════

SELECT auth.sign_up(
  'admin@test.com',
  'Password123!'
);

-- After running Step 1, run this to get the user's UUID:
-- SELECT id FROM auth.users WHERE email = 'admin@test.com';


-- ════════════════════════════════════════════════════════════
-- STEP 2 — Seed the application tables
-- Replace <USER_ID> with the UUID from Step 1.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- Cast auth UUID to text for public.users / organizations (TEXT id columns)
  v_user_id   text;
  v_org_id    text;
BEGIN
  -- Resolve auth user
  SELECT id::text INTO v_user_id
    FROM auth.users
   WHERE email = 'admin@test.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found. Run Step 1 first.';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, admin_id, plan, plan_status, max_farms, max_users)
  VALUES ('Test Poultry Farm', v_user_id, 'PREMIUM', 'ACTIVE', 10, 50)
  RETURNING id INTO v_org_id;

  -- Create the user profile row
  INSERT INTO users (id, email, name, phone, role, status, organization_id)
  VALUES (
    v_user_id,
    'admin@test.com',
    'Test Admin',
    '+92 300 0000000',
    'ADMIN',
    'ACTIVE',
    v_org_id
  )
  ON CONFLICT (id) DO UPDATE
    SET role            = 'ADMIN',
        status          = 'ACTIVE',
        organization_id = v_org_id;

  RAISE NOTICE 'Seeded: user_id=%, org_id=%', v_user_id, v_org_id;
END $$;


-- ════════════════════════════════════════════════════════════
-- OPTIONAL — Create a SYSTEM_OWNER account
-- ════════════════════════════════════════════════════════════

-- 1. Create auth user:
-- SELECT auth.sign_up('owner@test.com', 'Password123!');

-- 2. Then run:
-- DO $$
-- DECLARE v_user_id text;
-- BEGIN
--   SELECT id::text INTO v_user_id FROM auth.users WHERE email = 'owner@test.com';
--   INSERT INTO users (id, email, name, role, status)
--   VALUES (v_user_id, 'owner@test.com', 'System Owner', 'SYSTEM_OWNER', 'ACTIVE')
--   ON CONFLICT (id) DO UPDATE SET role = 'SYSTEM_OWNER', status = 'ACTIVE';
-- END $$;


-- ════════════════════════════════════════════════════════════
-- OPTIONAL — Create a FARM_USER under the same organization
-- ════════════════════════════════════════════════════════════

-- 1. Create auth user:
-- SELECT auth.sign_up('worker@test.com', 'Password123!');

-- 2. Then run:
-- DO $$
-- DECLARE v_user_id text; v_org_id text;
-- BEGIN
--   SELECT id::text INTO v_user_id FROM auth.users WHERE email = 'worker@test.com';
--   SELECT id INTO v_org_id FROM organizations WHERE name = 'Test Poultry Farm' LIMIT 1;
--   INSERT INTO users (id, email, name, role, status, organization_id)
--   VALUES (v_user_id, 'worker@test.com', 'Farm Worker', 'FARM_USER', 'ACTIVE', v_org_id)
--   ON CONFLICT (id) DO UPDATE SET role = 'FARM_USER', status = 'ACTIVE', organization_id = v_org_id;
-- END $$;


-- ════════════════════════════════════════════════════════════
-- Verify the seed
-- ════════════════════════════════════════════════════════════
SELECT u.id, u.name, u.email, u.role, u.status, o.name AS organization
FROM   users u
LEFT JOIN organizations o ON o.id = u.organization_id;
