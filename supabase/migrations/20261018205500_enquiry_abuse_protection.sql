-- Migration: 20261018205500_enquiry_abuse_protection.sql
-- Description: Revoke direct anonymous INSERT on public.enquiries and add persistent rate-limiting

-- 1. Revoke direct anon INSERT access on public.enquiries
REVOKE INSERT ON public.enquiries FROM anon;
DROP POLICY IF EXISTS "Anyone can submit an enquiry" ON public.enquiries;

-- 2. Ensure only authenticated staff and service_role can insert into public.enquiries directly
CREATE POLICY "Staff insert enquiries" ON public.enquiries FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));

-- 3. Create persistent rate-limit tracking table
CREATE TABLE IF NOT EXISTS public.enquiry_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abuse_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by abuse key and recent timestamp
CREATE INDEX IF NOT EXISTS enquiry_rate_limits_key_created_idx
  ON public.enquiry_rate_limits (abuse_key, created_at DESC);

-- Restrict rate limits table strictly to service_role (default deny via RLS)
ALTER TABLE public.enquiry_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enquiry_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.enquiry_rate_limits TO service_role;

-- 4. Atomic rate-limit check and record function
CREATE OR REPLACE FUNCTION public.check_and_record_enquiry_rate_limit(
  p_abuse_key text,
  p_max_requests int DEFAULT 5,
  p_window_seconds int DEFAULT 900,
  p_cooldown_seconds int DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - (p_window_seconds || ' seconds')::interval;
  v_cooldown_start timestamptz := v_now - (p_cooldown_seconds || ' seconds')::interval;
  v_count int;
  v_last_created timestamptz;
BEGIN
  -- Data retention policy: automatically prune entries older than 24 hours
  DELETE FROM public.enquiry_rate_limits WHERE created_at < v_now - interval '24 hours';

  -- Enforce minimum cooldown between consecutive submissions
  SELECT created_at INTO v_last_created
  FROM public.enquiry_rate_limits
  WHERE abuse_key = p_abuse_key
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_created IS NOT NULL AND v_last_created > v_cooldown_start THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after', GREATEST(1, EXTRACT(EPOCH FROM (v_last_created + (p_cooldown_seconds || ' seconds')::interval - v_now))::int)
    );
  END IF;

  -- Enforce sliding window count
  SELECT count(*) INTO v_count
  FROM public.enquiry_rate_limits
  WHERE abuse_key = p_abuse_key AND created_at >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'retry_after', GREATEST(1, EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::interval - v_now))::int)
    );
  END IF;

  -- Record this request atomically
  INSERT INTO public.enquiry_rate_limits (abuse_key, created_at)
  VALUES (p_abuse_key, v_now);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - (v_count + 1)
  );
END;
$$;

-- Restrict rate-limiting function to service_role only
REVOKE ALL ON FUNCTION public.check_and_record_enquiry_rate_limit(text, int, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_enquiry_rate_limit(text, int, int, int) TO service_role;
