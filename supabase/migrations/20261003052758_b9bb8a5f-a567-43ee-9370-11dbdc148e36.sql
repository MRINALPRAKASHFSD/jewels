CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

-- Drop every policy depending on the public helpers
DROP POLICY "Staff manage categories" ON public.categories;
DROP POLICY "Staff manage collections" ON public.collections;
DROP POLICY "Staff manage products" ON public.products;
DROP POLICY "Staff manage product images" ON public.product_images;
DROP POLICY "Staff manage lookbook" ON public.lookbook_items;
DROP POLICY "Staff manage homepage" ON public.homepage_sections;
DROP POLICY "Admins manage settings" ON public.site_settings;
DROP POLICY "Admins delete enquiries" ON public.enquiries;
DROP POLICY "Staff read enquiries" ON public.enquiries;
DROP POLICY "Staff update enquiries" ON public.enquiries;
DROP POLICY "Own profile readable" ON public.profiles;
DROP POLICY "Own roles readable" ON public.user_roles;
DROP POLICY "Staff delete site images" ON storage.objects;
DROP POLICY "Staff update site images" ON storage.objects;
DROP POLICY "Staff upload site images" ON storage.objects;

DROP FUNCTION public.is_staff(uuid);
DROP FUNCTION public.has_role(uuid, public.app_role);

-- Profiles / roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Own or admin profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own or admin roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
-- No write policies on user_roles: roles are granted only by trusted server tooling.

-- Categories (admin only for writes)
CREATE POLICY "Staff read categories" ON public.categories FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Admins write categories" ON public.categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- Products
CREATE POLICY "Staff read products" ON public.products FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff create products" ON public.products FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update products" ON public.products FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION private.guard_archive()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.status = 'archived'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'archived')
     AND NOT private.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can archive' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_guard_archive BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION private.guard_archive();

-- Product images
CREATE POLICY "Staff read product images" ON public.product_images FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff add product images" ON public.product_images FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update product images" ON public.product_images FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete product images" ON public.product_images FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Collections: editors read/update; admins create/delete
CREATE POLICY "Staff read collections" ON public.collections FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Admins create collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff update collections" ON public.collections FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete collections" ON public.collections FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Lookbook
CREATE POLICY "Staff read lookbook" ON public.lookbook_items FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff create lookbook" ON public.lookbook_items FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update lookbook" ON public.lookbook_items FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete lookbook" ON public.lookbook_items FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Homepage content: editors read/update; admins create/delete
CREATE POLICY "Staff read homepage" ON public.homepage_sections FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Admins create homepage" ON public.homepage_sections FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff update homepage" ON public.homepage_sections FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete homepage" ON public.homepage_sections FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Settings: staff read, admins write
CREATE POLICY "Staff read settings" ON public.site_settings FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Admins create settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete settings" ON public.site_settings FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Enquiries
CREATE POLICY "Staff read enquiries" ON public.enquiries FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff update enquiries" ON public.enquiries FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Admins delete enquiries" ON public.enquiries FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Storage: staff upload/update, admins delete
CREATE POLICY "Staff upload site images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('products','collections','lookbook','brand','homepage') AND private.is_staff(auth.uid()));
CREATE POLICY "Staff update site images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('products','collections','lookbook','brand','homepage') AND private.is_staff(auth.uid()))
  WITH CHECK (bucket_id IN ('products','collections','lookbook','brand','homepage') AND private.is_staff(auth.uid()));
CREATE POLICY "Admins delete site images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('products','collections','lookbook','brand','homepage') AND private.has_role(auth.uid(),'admin'));

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  actor_email text,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff write own audit entries" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND private.is_staff(auth.uid()));