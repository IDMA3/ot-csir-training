-- Add domain column to organizations table for email domain matching
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domain TEXT;

-- Set IDMA3's domain
UPDATE public.organizations SET domain = 'idma3.com' WHERE name = 'IDMA3';

-- Update handle_new_user function to auto-assign organization_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  user_email_domain TEXT;
BEGIN
  -- Extract email domain
  user_email_domain := LOWER(split_part(NEW.email, '@', 2));
  
  -- Try to find matching organization by name first
  SELECT id, name INTO org_record
  FROM public.organizations
  WHERE LOWER(name) = LOWER(COALESCE(NEW.raw_user_meta_data ->> 'organization', ''))
    AND active = true
  LIMIT 1;
  
  -- If no name match, try email domain match
  IF org_record.id IS NULL THEN
    SELECT id, name INTO org_record
    FROM public.organizations
    WHERE LOWER(domain) = user_email_domain
      AND active = true
    LIMIT 1;
  END IF;
  
  -- Insert profile with organization_id if found
  INSERT INTO public.profiles (id, first_name, last_name, organization, organization_id, job_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(org_record.name, NEW.raw_user_meta_data ->> 'organization'),
    org_record.id,
    NEW.raw_user_meta_data ->> 'job_role'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner');
  
  RETURN NEW;
END;
$$;

-- Fix existing users with matching organization name but null organization_id
UPDATE public.profiles p
SET organization_id = o.id
FROM public.organizations o
WHERE LOWER(p.organization) = LOWER(o.name)
  AND p.organization_id IS NULL
  AND o.active = true;