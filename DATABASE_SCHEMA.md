# PoultryOS database schema (reference)

This document describes the **intended** PostgreSQL schema for PoultryOS. All primary keys and foreign keys that reference those keys use **`text`**, not `uuid`. Values are typically `gen_random_uuid()::text` (canonical UUID string form) so they align with **Supabase Auth** (`auth.users.id` is uuid in the auth schema, but stored as **text** in `public.users` and everywhere else).

---

## ID convention

| Rule | Example |
|------|--------|
| Primary key | `id text PRIMARY KEY DEFAULT gen_random_uuid()::text` |
| Foreign key to `farms` | `farm_id text NOT NULL REFERENCES public.farms (id)` |
| Compare to JWT subject in RLS | `id = (auth.uid())::text` |

Do **not** use the PostgreSQL `uuid` type for application IDs in this project unless you intentionally diverge from this convention.

---

## Tables and columns

### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | Same string as `auth.users.id` |
| `email` | `text` | |
| `name` | `text` | |
| `phone` | `text` nullable | |
| `role` | `text` | `SYSTEM_OWNER`, `ADMIN`, `FARM_USER` |
| `status` | `text` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `organization_id` | `text` FK → `organizations.id` nullable | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` nullable | |

### `organizations`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | `DEFAULT gen_random_uuid()::text` |
| `name` | `text` | |
| `admin_id` | `text` FK → `users.id` | |
| `plan` | `text` | |
| `plan_status` | `text` | |
| `max_farms` | `integer` | |
| `max_users` | `integer` | |
| `created_at` | `timestamptz` | |

### `farms`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `organization_id` | `text` FK → `organizations.id` | |
| `name` | `text` | |
| `location` | `text` nullable | |
| `status` | `text` | e.g. `ACTIVE` / `INACTIVE` |
| `created_at` | `timestamptz` | |

### `flocks`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `farm_id` | `text` FK → `farms.id` | |
| `batch_number` | `text` | |
| `breed` | `text` | |
| `initial_count` | `integer` | |
| `current_count` | `integer` | |
| `age_at_arrival` | `integer` | |
| `arrival_date` | `date` | |
| `status` | `text` | `active`, `sold`, `archived` |
| `notes` | `text` nullable | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` nullable | |

### `daily_entries`

Rows belong to a **flock** (not directly to a farm). The farm is implied via `flocks.farm_id`.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `flock_id` | `text` FK → `flocks.id` | |
| `date` | `date` | |
| `eggs_collected` | `integer` | Total; may match sum of grades |
| `eggs_grade_a` | `integer` default 0 | Optional (see `supabase-daily-entries-columns.sql`) |
| `eggs_grade_b` | `integer` default 0 | |
| `eggs_cracked` | `integer` default 0 | |
| `deaths` | `integer` | |
| `death_cause` | `text` nullable | |
| `feed_consumed` | `numeric` nullable | |
| `notes` | `text` nullable | |
| `created_at` | `timestamptz` | |

There is **no** `farm_id` on `daily_entries` in the current app model; resolve farm through `flocks`.

### `sales`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `farm_id` | `text` FK → `farms.id` | |
| `sale_date` | `date` | |
| `amount` | `numeric` | |
| `customer_name` | `text` nullable | |
| `customer_id` | `text` FK → `customers.id` nullable | When customers table exists |
| `notes` | `text` nullable | |
| `created_at` | `timestamptz` | |

### `expenses`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `farm_id` | `text` FK → `farms.id` | |
| `date` | `date` | |
| `amount` | `numeric` | |
| `category` | `text` nullable | |
| `description` | `text` nullable | |
| `created_at` | `timestamptz` | |

### `farm_users`

Worker ↔ farm assignments.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | `DEFAULT gen_random_uuid()::text` |
| `user_id` | `text` FK → `users.id` | |
| `farm_id` | `text` FK → `farms.id` | |
| `created_at` | `timestamptz` | |
| | | Unique `(user_id, farm_id)` |

### `customers` (planned / optional)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `farm_id` | `text` FK → `farms.id` | Or `organization_id` depending on product rules |
| … | | Add fields when the module is implemented |

### `payments` (planned / optional)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `sale_id` | `text` FK → `sales.id` nullable | Or other linkage |
| … | | |

### `inventory` (planned / optional)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `farm_id` | `text` FK → `farms.id` | |
| … | | |

### `vaccinations` (planned / optional)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `text` PK | |
| `flock_id` or `farm_id` | `text` FK | Depends on modeling choice |
| … | | |

---

## Foreign key relationships (summary)

```
users.organization_id  → organizations.id
organizations.admin_id → users.id

farms.organization_id → organizations.id

flocks.farm_id → farms.id

daily_entries.flock_id → flocks.id

sales.farm_id → farms.id
sales.customer_id → customers.id (when present)

expenses.farm_id → farms.id

farm_users.user_id → users.id
farm_users.farm_id → farms.id
```

---

## SQL & RLS helpers

- `get_my_organization_id()` returns **`text`** (the caller’s `users.organization_id`).
- `user_can_access_farm(p_farm_id text)` takes a **text** farm id (see `supabase-rls-farm-workers.sql`).

In policies, compare Supabase Auth user to text ids with **`(auth.uid())::text`**.

---

## Repo SQL files

| File | Purpose |
|------|--------|
| `supabase-rls-farms.sql` | Base RLS; `get_my_organization_id` as `text` |
| `supabase-rls-farm-workers.sql` | Farm-worker scoped policies; `user_can_access_farm(text)` |
| `supabase-farm-users-table.sql` | `farm_users` with text ids |
| `supabase-daily-entries-columns.sql` | Extra columns on `daily_entries` |
| `supabase-seed.sql` | Sample seed; variables as `text` for public tables |

---

## TypeScript

`src/types/database.ts` models ids as `string`, which matches **text** in Postgres.
