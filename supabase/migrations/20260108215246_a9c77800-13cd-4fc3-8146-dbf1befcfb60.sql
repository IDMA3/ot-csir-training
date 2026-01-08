-- Fix update_recertification_schedules_updated_at function search path
CREATE OR REPLACE FUNCTION update_recertification_schedules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;