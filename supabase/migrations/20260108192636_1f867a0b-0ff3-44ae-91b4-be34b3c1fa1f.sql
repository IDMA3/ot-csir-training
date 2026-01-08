-- Create a storage bucket for module content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-images', 'module-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Admins can upload module images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'module-images' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow anyone to view module images (they're part of training content)
CREATE POLICY "Anyone can view module images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'module-images');

-- Allow admins to delete module images
CREATE POLICY "Admins can delete module images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'module-images' 
  AND public.has_role(auth.uid(), 'admin')
);