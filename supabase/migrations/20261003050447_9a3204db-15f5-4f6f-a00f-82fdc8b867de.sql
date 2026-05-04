CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;

CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own profile editable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  tagline text,
  hero_image_url text,
  banner_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  price numeric(12,2),
  price_on_request boolean NOT NULL DEFAULT false,
  metal text,
  stone text,
  occasions text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'in-stock' CHECK (availability IN ('in-stock','made-to-order','sold-out')),
  weight text,
  dimensions text,
  certification text,
  care text,
  shipping text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_limited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lookbook_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  image_url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  heading text,
  subheading text,
  body text,
  image_url text,
  secondary_image_url text,
  cta_text text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  email text CHECK (email IS NULL OR char_length(email) <= 255),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  source text NOT NULL DEFAULT 'contact_form' CHECK (source IN ('whatsapp','contact_form','appointment','product_page')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','interested','converted','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories, public.collections, public.products, public.product_images, public.lookbook_items, public.homepage_sections, public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.collections, public.products, public.product_images, public.lookbook_items, public.homepage_sections, public.site_settings, public.enquiries TO authenticated;
GRANT INSERT ON public.enquiries TO anon;
GRANT ALL ON public.categories, public.collections, public.products, public.product_images, public.lookbook_items, public.homepage_sections, public.site_settings, public.enquiries TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Public reads active collections" ON public.collections FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Public reads published products" ON public.products FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_staff(auth.uid()));
CREATE POLICY "Public reads images of published products" ON public.product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status = 'published' OR public.is_staff(auth.uid()))));
CREATE POLICY "Public reads active lookbook" ON public.lookbook_items FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Public reads active homepage sections" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Public reads public settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (is_public OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage collections" ON public.collections FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage product images" ON public.product_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage lookbook" ON public.lookbook_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage homepage" ON public.homepage_sections FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit an enquiry" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
CREATE POLICY "Staff read enquiries" ON public.enquiries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update enquiries" ON public.enquiries FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete enquiries" ON public.enquiries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER enquiries_updated_at BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX products_collection_idx ON public.products (collection_id);
CREATE INDEX products_status_idx ON public.products (status);
CREATE INDEX products_featured_idx ON public.products (is_featured) WHERE is_featured;
CREATE INDEX products_new_idx ON public.products (is_new) WHERE is_new;
CREATE INDEX products_bestseller_idx ON public.products (is_bestseller) WHERE is_bestseller;
CREATE INDEX products_created_idx ON public.products (created_at DESC);
CREATE INDEX products_price_idx ON public.products (price);
CREATE INDEX product_images_product_idx ON public.product_images (product_id, sort_order);
CREATE INDEX enquiries_status_idx ON public.enquiries (status, created_at DESC);

INSERT INTO public.categories (name, slug, sort_order) VALUES
 ('Rings','rings',1),('Necklaces','necklaces',2),('Earrings','earrings',3),('Bracelets','bracelets',4),
 ('Bangles','bangles',5),('Pendants','pendants',6),('Bridal','bridal',7),('Men''s','mens',8);

INSERT INTO public.collections (name, slug, tagline, description, hero_image_url, banner_image_url, sort_order, is_featured) VALUES
 ('Celestial','celestial','Light, held in gold.','Fluid silhouettes and diamonds that catch the light.','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/celestial/hero.jpg','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/celestial/hero.jpg',1,true),
 ('Heritage','heritage','Where tradition meets modern form.','Temple motifs, polki and pearls, reconsidered.','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/heritage/hero.jpg','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/heritage/hero.jpg',2,true),
 ('Aurum','aurum','The quiet statement.','Sculptural gold, coloured stones, few words.','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/aurum/hero.jpg','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/collections/aurum/hero.jpg',3,true);

INSERT INTO public.site_settings (key, value) VALUES
 ('brand_name', '"Élan"'),
 ('whatsapp_number', '"910000000000"'),
 ('currency', '"INR"'),
 ('contact_email', '"hello@elan.example"'),
 ('social_links', '{"instagram": "#", "facebook": "#", "pinterest": "#"}');

INSERT INTO public.lookbook_items (title, image_url, storage_path, sort_order, is_featured) VALUES
 ('Lookbook I','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/lookbook/look-1/image.jpg','look-1/image.jpg',1,true),
 ('Lookbook II','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/lookbook/look-2/image.jpg','look-2/image.jpg',2,true),
 ('Lookbook III','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/lookbook/look-3/image.jpg','look-3/image.jpg',3,true);

INSERT INTO public.homepage_sections (section_key, heading, subheading, cta_text, cta_url, image_url, sort_order) VALUES
 ('hero','Jewellery designed to become part of your story.','The Art of Elegance','Explore Collection','/collections','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/hero/image.jpg',1),
 ('story','Jewellery is not simply worn. It becomes part of the moments we choose to remember.','Our Story',NULL,NULL,'https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/story/image.jpg',2),
 ('craftsmanship','Where every detail has a purpose.','Craftsmanship',NULL,NULL,'https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/craftsmanship/image.jpg',3);