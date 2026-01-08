-- Create a trigger function to assign admin role for specific email
CREATE OR REPLACE FUNCTION public.assign_admin_for_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email should be an admin
  IF NEW.email = 'michael.maccri@idma3.com' THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run after user is created (after the handle_new_user trigger)
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_for_email();