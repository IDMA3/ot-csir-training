-- Add description column to course table
ALTER TABLE public.course ADD COLUMN IF NOT EXISTS description text;

-- Create enrollments table for tracking course enrollment
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Enrollments RLS policies
CREATE POLICY "Users can view their own enrollments"
ON public.enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves"
ON public.enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
ON public.enrollments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all enrollments"
ON public.enrollments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));