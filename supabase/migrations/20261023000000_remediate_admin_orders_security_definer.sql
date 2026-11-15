-- ============================================================
-- Migration: Remediate public.admin_orders SECURITY DEFINER finding
--
-- Security Advisory: View public.admin_orders is defined with the
-- SECURITY DEFINER property (PostgreSQL default without security_invoker = true).
--
-- Security Impact:
-- In PostgreSQL 15+, views without `security_invoker = true` run with the
-- permissions of the view owner (postgres / table owner), effectively
-- bypassing Row Level Security (RLS) on underlying tables (`public.orders`
-- and `public.payments`). Any user with SELECT permissions on the view could
-- read all customer orders, PII (name, email, phone), and payment details.
--
-- Remediation:
-- 1. Enforce `security_invoker = true` on `public.admin_orders`. When set,
--    PostgreSQL evaluates queries using the querying user's RLS context.
--    The underlying `staff_read_orders` and `staff_read_payments` policies
--    (`private.is_staff(auth.uid())`) are therefore strictly enforced.
-- 2. Revoke all permissions on `public.admin_orders` from `PUBLIC` and `anon`.
-- 3. Grant `SELECT` strictly to `authenticated` users (RLS-guarded) and `service_role`.
-- ============================================================

DO $$
BEGIN
  -- If the view already exists (e.g. created by payment migration), alter it
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'admin_orders'
  ) THEN
    ALTER VIEW public.admin_orders SET (security_invoker = true);
    REVOKE ALL ON public.admin_orders FROM PUBLIC, anon;
    GRANT SELECT ON public.admin_orders TO authenticated, service_role;

  -- If underlying tables exist but view does not, create it with security_invoker = true
  ELSIF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'orders'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'payments'
  ) THEN
    CREATE OR REPLACE VIEW public.admin_orders WITH (security_invoker = true) AS
      SELECT
        o.id, o.customer_name, o.customer_email, o.customer_phone,
        o.amount, o.currency, o.status AS order_status, o.cf_order_id,
        o.notes, o.created_at, o.updated_at,
        p.status AS payment_status, p.payment_method, p.gateway_payment_id
      FROM public.orders o
      LEFT JOIN public.payments p ON p.order_id = o.id;

    REVOKE ALL ON public.admin_orders FROM PUBLIC, anon;
    GRANT SELECT ON public.admin_orders TO authenticated, service_role;
  END IF;
END $$;
