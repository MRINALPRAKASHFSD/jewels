-- Phase 6: CMS publishing, content drafts, enquiry notes, trigger-based activity log.

-- 1. Collections & lookbook get the same draft/published/archived workflow as products.
ALTER TABLE public.collections ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived'));
UPDATE public.collections SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END;
ALTER TABLE public.lookbook_items ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived'));
ALTER TABLE public.lookbook_items ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.lookbook_items SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END;

DROP POLICY "Visible collections" ON public.collections;
DROP POLICY "Visible lookbook" ON public.lookbook_items;
CREATE POLICY "Visible collections" ON public.collections FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Visible lookbook" ON public.lookbook_items FOR SELECT TO anon, authenticated USING (status = 'published');
ALTER TABLE public.collections DROP COLUMN is_active;
ALTER TABLE public.lookbook_items DROP COLUMN is_active;

CREATE TRIGGER lookbook_updated_at BEFORE UPDATE ON public.lookbook_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER collections_guard_archive BEFORE INSERT OR UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION private.guard_archive();
CREATE TRIGGER lookbook_guard_archive BEFORE INSERT OR UPDATE ON public.lookbook_items FOR EACH ROW EXECUTE FUNCTION private.guard_archive();

-- 2. Exactly one primary image per product.
CREATE UNIQUE INDEX product_images_one_primary ON public.product_images (product_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images (product_id, sort_order);

-- 3. Homepage content: published content lives on homepage_sections; drafts are staff-only.
ALTER TABLE public.homepage_sections ADD COLUMN content jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.homepage_sections ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER homepage_sections_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.homepage_sections (section_key, sort_order, is_active, content) VALUES
 ('hero', 1, true, jsonb_build_object('eyebrow','The Art of Elegance','heading','Jewellery designed to become part of your story.','description','','primaryCta','Explore Collection','secondaryCta','Discover our story','image','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/hero/image.jpg')),
 ('collections', 2, true, jsonb_build_object('eyebrow','The Collections','heading','Pieces created for moments worth remembering.')),
 ('signature', 3, true, jsonb_build_object('eyebrow','Signature Pieces','heading','A study in proportion, light and detail.')),
 ('story', 4, true, jsonb_build_object('eyebrow','Our Story','heading','Jewellery is not simply worn. It becomes part of the moments we choose to remember.','body','Each Élan piece begins as a single drawing and ends in the hands of the master who made it. We work in small numbers, with ethically sourced gold and stones chosen one by one — so that what you wear carries the patience it was made with.','cta','Discover our story','image','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/story/image.jpg')),
 ('quote', 5, true, jsonb_build_object('quote','Some pieces are worn.','supporting','Some pieces become memories.')),
 ('craftsmanship', 6, true, jsonb_build_object('eyebrow','Craftsmanship','heading','Where every detail has a purpose.','description','Four stages, one pair of hands. Nothing leaves the atelier until it is right.','image','https://gwtuegmszbuvkzlcfpvy.supabase.co/storage/v1/object/public/homepage/craftsmanship/image.jpg',
   'step1','Every piece begins as a hand drawing, refined until each line feels inevitable.','step2','Stones are chosen one at a time for light, colour and character.','step3','A single karigar shapes, sets and assembles each piece by hand.','step4','Polished, inspected and hallmarked before it leaves the atelier.')),
 ('lookbook', 7, true, jsonb_build_object('eyebrow','The Lookbook','heading','Stories told in light, form and detail.')),
 ('appointment', 8, true, jsonb_build_object('eyebrow','Private Appointments','heading','Find your piece','body','Discover the jewellery that belongs to your story.'))
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content, sort_order = EXCLUDED.sort_order;

CREATE TABLE public.homepage_drafts (
  section_key text PRIMARY KEY REFERENCES public.homepage_sections(section_key) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_drafts TO authenticated;
GRANT ALL ON public.homepage_drafts TO service_role;
ALTER TABLE public.homepage_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read drafts" ON public.homepage_drafts FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff create drafts" ON public.homepage_drafts FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff update drafts" ON public.homepage_drafts FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff discard drafts" ON public.homepage_drafts FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));
CREATE TRIGGER homepage_drafts_updated_at BEFORE UPDATE ON public.homepage_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Internal enquiry notes (staff-only, never public).
CREATE TABLE public.enquiry_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_email text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiry_notes_enquiry_idx ON public.enquiry_notes (enquiry_id, created_at DESC);
GRANT SELECT, INSERT ON public.enquiry_notes TO authenticated;
GRANT ALL ON public.enquiry_notes TO service_role;
ALTER TABLE public.enquiry_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read notes" ON public.enquiry_notes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff add own notes" ON public.enquiry_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND private.is_staff(auth.uid()));

-- 5. Activity log written by triggers, so it can't be skipped by the client.
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource, resource_id, created_at DESC);
CREATE POLICY "Staff read enquiry activity" ON public.audit_logs FOR SELECT TO authenticated
  USING (resource = 'enquiry' AND private.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION private.write_audit(_action text, _resource text, _id text, _details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, resource, resource_id, details)
  VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()), _action, _resource, _id, COALESCE(_details, '{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION private.write_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.audit_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  kind text := upper(TG_ARGV[0]);
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := kind || '_CREATED';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    act := kind || CASE NEW.status WHEN 'published' THEN '_PUBLISHED' WHEN 'archived' THEN '_ARCHIVED' ELSE '_UNPUBLISHED' END;
  ELSE
    act := kind || '_UPDATED';
  END IF;
  PERFORM private.write_audit(act, TG_ARGV[0], NEW.id::text,
    jsonb_build_object('name', COALESCE(to_jsonb(NEW)->>'name', to_jsonb(NEW)->>'title'), 'status', NEW.status,
      'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER products_audit AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION private.audit_status_change('product');
CREATE TRIGGER collections_audit AFTER INSERT OR UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION private.audit_status_change('collection');
CREATE TRIGGER lookbook_audit AFTER INSERT OR UPDATE ON public.lookbook_items FOR EACH ROW EXECUTE FUNCTION private.audit_status_change('lookbook');

CREATE OR REPLACE FUNCTION private.audit_enquiry_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.write_audit('ENQUIRY_STATUS_CHANGED', 'enquiry', NEW.id::text,
      jsonb_build_object('previous_status', OLD.status, 'status', NEW.status));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_enquiry_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enquiries_audit AFTER UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION private.audit_enquiry_status();

CREATE OR REPLACE FUNCTION private.audit_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM private.write_audit(CASE WHEN TG_TABLE_NAME = 'homepage_sections' THEN 'CONTENT_PUBLISHED' ELSE 'CONTENT_UPDATED' END,
    'content', NEW.section_key, jsonb_build_object('section', NEW.section_key));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_content() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER homepage_sections_audit AFTER UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION private.audit_content();
CREATE TRIGGER homepage_drafts_audit AFTER INSERT OR UPDATE ON public.homepage_drafts FOR EACH ROW EXECUTE FUNCTION private.audit_content();