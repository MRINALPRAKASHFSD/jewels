-- Ensure buckets exist and are explicitly set to private (public = false)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', false),
  ('collections', 'collections', false),
  ('lookbook', 'lookbook', false),
  ('brand', 'brand', false),
  ('homepage', 'homepage', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove anon access from storage.objects so unauthorized users cannot bypass signed URLs
DROP POLICY IF EXISTS "Public can view site images" ON storage.objects;

CREATE POLICY "Authenticated users can view site images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('products','collections','lookbook','brand','homepage'));
