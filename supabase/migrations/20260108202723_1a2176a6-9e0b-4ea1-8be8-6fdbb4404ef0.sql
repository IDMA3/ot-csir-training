-- Create admin_permissions table for granular permissions
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_super_admin boolean NOT NULL DEFAULT false,
  can_view_users boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  can_view_courses boolean NOT NULL DEFAULT false,
  can_manage_courses boolean NOT NULL DEFAULT false,
  organization_scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add organization column to courses
ALTER TABLE public.course ADD COLUMN organization text;

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id AND is_super_admin = true
  )
$$;

-- Check if user can view users in an organization
CREATE OR REPLACE FUNCTION public.can_view_org_users(check_user_id uuid, check_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
    AND (is_super_admin = true OR (can_view_users = true AND (organization_scope = check_org OR check_org IS NULL)))
  )
$$;

-- Check if user can manage courses for an organization
CREATE OR REPLACE FUNCTION public.can_manage_org_courses(check_user_id uuid, check_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
    AND (is_super_admin = true OR (can_manage_courses = true AND (organization_scope = check_org OR check_org IS NULL)))
  )
$$;

-- Check if user has any admin permissions
CREATE OR REPLACE FUNCTION public.has_admin_access(check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
    AND (is_super_admin = true OR can_view_users = true OR can_manage_users = true OR can_view_courses = true OR can_manage_courses = true)
  )
$$;

-- RLS policies for admin_permissions
CREATE POLICY "Super admins can view all permissions"
ON public.admin_permissions FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own permissions"
ON public.admin_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can insert permissions"
ON public.admin_permissions FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update permissions"
ON public.admin_permissions FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete permissions"
ON public.admin_permissions FOR DELETE
USING (is_super_admin(auth.uid()));

-- Seed Michael.Macri@idma3.com as super admin (case-insensitive)
INSERT INTO public.admin_permissions (user_id, is_super_admin, can_view_users, can_manage_users, can_view_courses, can_manage_courses)
SELECT id, true, true, true, true, true
FROM auth.users
WHERE LOWER(email) = LOWER('michael.macri@idma3.com')
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true, can_view_users = true, can_manage_users = true, can_view_courses = true, can_manage_courses = true;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_admin_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_permissions_updated_at();