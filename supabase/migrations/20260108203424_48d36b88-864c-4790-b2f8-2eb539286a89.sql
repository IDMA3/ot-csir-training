-- Add settings columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN logo_url text,
ADD COLUMN primary_color text DEFAULT '#3b82f6',
ADD COLUMN max_users integer,
ADD COLUMN settings jsonb DEFAULT '{}';

-- Create junction table for allowed courses per organization
CREATE TABLE public.organization_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, course_id)
);

-- Enable RLS
ALTER TABLE public.organization_courses ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_courses
CREATE POLICY "Super admins can manage organization courses"
ON public.organization_courses FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization courses"
ON public.organization_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.organizations o ON p.organization = o.name
    WHERE p.id = auth.uid() AND o.id = organization_id
  )
);

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for organization logos
CREATE POLICY "Super admins can upload organization logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-logos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update organization logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-logos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete organization logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-logos' AND is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');