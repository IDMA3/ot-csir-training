-- Add course creator tracking columns
ALTER TABLE course ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE course ADD COLUMN creator_organization_id uuid REFERENCES organizations(id);

-- Create recertification schedules table
CREATE TABLE recertification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  schedule_type text NOT NULL CHECK (schedule_type IN ('monthly', 'quarterly', 'annually', 'custom')),
  custom_days integer,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, course_id)
);

-- Enable RLS on recertification_schedules
ALTER TABLE recertification_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for recertification_schedules
CREATE POLICY "Super admins can manage all recertification schedules"
ON recertification_schedules
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view their org recertification schedules"
ON recertification_schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN organizations o ON o.id = recertification_schedules.organization_id
    JOIN profiles p ON p.organization_id = o.id
    WHERE ap.user_id = auth.uid()
    AND (ap.is_super_admin = true OR (ap.can_view_courses = true AND p.id = auth.uid()))
  )
);

CREATE POLICY "Org admins can manage their org recertification schedules"
ON recertification_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN organizations o ON o.id = recertification_schedules.organization_id
    JOIN profiles p ON p.organization = o.name
    WHERE ap.user_id = auth.uid()
    AND ap.can_manage_courses = true
    AND p.id = auth.uid()
  )
);

-- Create function to check if user can view a course
CREATE OR REPLACE FUNCTION can_view_course(user_uuid uuid, course_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_org_id uuid;
  course_creator_org uuid;
  has_restrictions boolean;
BEGIN
  -- Super admins can see all
  IF is_super_admin(user_uuid) THEN RETURN true; END IF;
  
  -- Get user's organization
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = user_uuid;
  
  -- Users without organization cannot see any courses
  IF user_org_id IS NULL THEN RETURN false; END IF;
  
  -- Get course creator's organization
  SELECT creator_organization_id INTO course_creator_org FROM course WHERE id = course_uuid;
  
  -- Check if course is assigned to user's organization
  IF EXISTS(SELECT 1 FROM organization_courses 
            WHERE organization_id = user_org_id AND course_id = course_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check if organization has any course restrictions
  SELECT EXISTS(SELECT 1 FROM organization_courses WHERE organization_id = user_org_id) INTO has_restrictions;
  
  -- If no restrictions exist for this org, allow courses created by super admins (null creator_org)
  IF NOT has_restrictions THEN
    IF course_creator_org IS NULL THEN RETURN true; END IF;
  END IF;
  
  -- Check if course was created by their org (org-specific courses)
  IF course_creator_org = user_org_id THEN RETURN true; END IF;
  
  RETURN false;
END;
$$;

-- Update course RLS policy to use new visibility function
DROP POLICY IF EXISTS "Anyone authenticated can view active courses" ON course;

CREATE POLICY "Users can view accessible active courses"
ON course
FOR SELECT
USING (
  active = true AND can_view_course(auth.uid(), id)
);

-- Update trigger for recertification_schedules updated_at
CREATE OR REPLACE FUNCTION update_recertification_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recertification_schedules_updated_at
BEFORE UPDATE ON recertification_schedules
FOR EACH ROW
EXECUTE FUNCTION update_recertification_schedules_updated_at();