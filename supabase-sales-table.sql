-- ============================================================
-- PoultryOS — sales (invoicing) + payments
-- Requires: farms, customers (optional FK), user_can_access_farm() from supabase-rls-farm-workers.sql
-- All IDs are TEXT. Safe to re-run (idempotent policies / IF NOT EXISTS).
-- ============================================================

-- ─── SALES: new installs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id text NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  customer_id text REFERENCES public.customers (id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_type text,
  discount_value numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0,
  balance_due numeric(12, 2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy column (older schema): keep for migration reads; dropped after backfill
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount numeric(12, 2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name text;

-- ─── SALES: upgrade from older minimal schema ────────────────
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id text REFERENCES public.customers (id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_value numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS total_amount numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS balance_due numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill totals from legacy `amount`
UPDATE public.sales
SET
  total_amount = COALESCE(NULLIF(total_amount, 0), amount, 0),
  subtotal = CASE WHEN subtotal = 0 AND COALESCE(amount, 0) <> 0 THEN COALESCE(amount, 0) ELSE subtotal END,
  paid_amount = COALESCE(paid_amount, 0),
  balance_due = GREATEST(
    COALESCE(NULLIF(total_amount, 0), amount, 0) - COALESCE(paid_amount, 0),
    0
  ),
  line_items = CASE
    WHEN
      COALESCE(NULLIF(BTRIM(line_items::text), ''), '[]')::jsonb = '[]'::jsonb
      AND COALESCE(amount, 0) <> 0
    THEN
      jsonb_build_array(
        jsonb_build_object(
          'type', 'Legacy',
          'quantity', 1,
          'unit_price', amount,
          'total', amount
        )
      )
    ELSE line_items::jsonb
  END,
  payment_status = CASE
    WHEN COALESCE(paid_amount, 0) >= COALESCE(NULLIF(total_amount, 0), amount, 0)
      AND COALESCE(NULLIF(total_amount, 0), amount, 0) > 0 THEN 'paid'
    WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
    ELSE COALESCE(payment_status, 'unpaid')
  END
WHERE amount IS NOT NULL OR total_amount IS NOT NULL;

-- Invoice numbers for rows still missing
WITH ranked AS (
  SELECT
    s.id,
    'INV-'
    || to_char(COALESCE(s.sale_date, (s.created_at)::date), 'YYYY')
    || '-'
    || lpad(
      row_number() OVER (
        PARTITION BY
          s.farm_id,
          date_part('year', COALESCE(s.sale_date, (s.created_at)::date))
        ORDER BY s.created_at
      )::text,
      3,
      '0'
    ) AS inv
  FROM public.sales s
  WHERE s.invoice_number IS NULL OR btrim(s.invoice_number) = ''
)
UPDATE public.sales s
SET invoice_number = ranked.inv
FROM ranked
WHERE s.id = ranked.id;

-- Fallback if still null
UPDATE public.sales
SET invoice_number = 'INV-'
  || to_char(CURRENT_DATE, 'YYYY')
  || '-'
  || lpad((floor(random() * 900 + 100))::int::text, 3, '0')
WHERE invoice_number IS NULL OR btrim(invoice_number) = '';

CREATE UNIQUE INDEX IF NOT EXISTS sales_farm_invoice_uq ON public.sales (farm_id, invoice_number);

CREATE INDEX IF NOT EXISTS sales_farm_id_idx ON public.sales (farm_id);
CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS sales_invoice_number_idx ON public.sales (invoice_number);
CREATE INDEX IF NOT EXISTS sales_sale_date_idx ON public.sales (sale_date);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select_org" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_org" ON public.sales;
DROP POLICY IF EXISTS "sales_update_org" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_org" ON public.sales;
DROP POLICY IF EXISTS "sales_select_scoped" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_scoped" ON public.sales;
DROP POLICY IF EXISTS "sales_update_scoped" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_scoped" ON public.sales;
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;

CREATE POLICY "sales_select"
ON public.sales FOR SELECT
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "sales_insert"
ON public.sales FOR INSERT
WITH CHECK (public.user_can_access_farm(farm_id));

CREATE POLICY "sales_update"
ON public.sales FOR UPDATE
USING (public.user_can_access_farm(farm_id));

CREATE POLICY "sales_delete"
ON public.sales FOR DELETE
USING (public.user_can_access_farm(farm_id));

-- Optional: drop legacy amount after app uses total_amount (uncomment when ready)
-- ALTER TABLE public.sales DROP COLUMN IF EXISTS amount;

-- ─── PAYMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id text NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_sale_id_idx ON public.payments (sale_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;

CREATE POLICY "payments_select"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = payments.sale_id
      AND public.user_can_access_farm(s.farm_id)
  )
);

CREATE POLICY "payments_insert"
ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND public.user_can_access_farm(s.farm_id)
  )
);

CREATE POLICY "payments_delete"
ON public.payments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = payments.sale_id
      AND public.user_can_access_farm(s.farm_id)
  )
);

CREATE POLICY "payments_update"
ON public.payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = payments.sale_id
      AND public.user_can_access_farm(s.farm_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND public.user_can_access_farm(s.farm_id)
  )
);

-- Enforce invoice # present after backfills (existing DBs)
ALTER TABLE public.sales
  ALTER COLUMN invoice_number SET NOT NULL;
