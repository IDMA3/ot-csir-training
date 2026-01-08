-- Add organization_id to profiles for proper FK relationship
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Migrate existing data: match organization text to organizations.name
UPDATE public.profiles p
SET organization_id = o.id
FROM public.organizations o
WHERE p.organization = o.name AND p.organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Create user_invitations table for bulk onboarding
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text,
  last_name text,
  job_role text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_ids uuid[] DEFAULT '{}',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage invitations"
ON public.user_invitations
FOR ALL
USING (is_super_admin(auth.uid()));

-- Org admins can view invitations for their org
CREATE POLICY "Org admins can view their org invitations"
ON public.user_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_permissions ap
    WHERE ap.user_id = auth.uid()
    AND (ap.is_super_admin = true OR (ap.can_view_users = true AND ap.organization_scope = (
      SELECT name FROM organizations WHERE id = user_invitations.organization_id
    )))
  )
);

-- Anyone can view invitation by token (for signup flow)
CREATE POLICY "Anyone can view invitation by token"
ON public.user_invitations
FOR SELECT
USING (true);

-- Add RLS policy for super admins to update any profile's organization
CREATE POLICY "Super admins can update any profile organization"
ON public.profiles
FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create index on invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_organization ON public.user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);