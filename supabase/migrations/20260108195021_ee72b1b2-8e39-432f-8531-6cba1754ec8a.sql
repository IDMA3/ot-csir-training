-- Add category column to course table
ALTER TABLE public.course
ADD COLUMN category text;

-- Create an index for faster filtering
CREATE INDEX idx_course_category ON public.course(category);

-- Add some default categories as a comment for reference
COMMENT ON COLUMN public.course.category IS 'Course category for filtering. Suggested values: Security, Compliance, Technical, Management, Foundations';