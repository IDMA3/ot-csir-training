-- Create function to check if a user can access a course based on their organization
CREATE OR REPLACE FUNCTION public.user_can_access_course(user_uuid uuid, course_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
  has_restrictions boolean;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = user_uuid;
  
  -- If no organization, allow all courses
  IF user_org_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if organization has any course restrictions
  SELECT EXISTS(SELECT 1 FROM organization_courses WHERE organization_id = user_org_id) INTO has_restrictions;
  
  -- If no restrictions, allow all courses
  IF NOT has_restrictions THEN
    RETURN true;
  END IF;
  
  -- Check if course is in allowed list
  RETURN EXISTS(
    SELECT 1 FROM organization_courses 
    WHERE organization_id = user_org_id AND course_id = course_uuid
  );
END;
$$;