-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Super admins can manage organizations"
ON public.organizations FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active organizations"
ON public.organizations FOR SELECT
USING (active = true);

-- Update trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_permissions_updated_at();

-- Migrate existing organizations from profiles
INSERT INTO public.organizations (name)
SELECT DISTINCT organization FROM public.profiles 
WHERE organization IS NOT NULL AND organization != ''
ON CONFLICT (name) DO NOTHING;