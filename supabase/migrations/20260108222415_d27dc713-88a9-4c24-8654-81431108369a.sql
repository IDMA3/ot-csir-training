-- Add columns for admin invitation to user_invitations
ALTER TABLE public.user_invitations ADD COLUMN invited_role text NOT NULL DEFAULT 'learner';
ALTER TABLE public.user_invitations ADD COLUMN admin_permissions jsonb DEFAULT NULL;

-- Add check constraint for valid roles
ALTER TABLE public.user_invitations ADD CONSTRAINT valid_invited_role 
  CHECK (invited_role IN ('learner', 'org_admin', 'course_creator'));