-- Add sequence column to questions table for ordering
ALTER TABLE public.questions ADD COLUMN sequence integer;

-- Set initial sequence values based on created_at order per module
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY module_id ORDER BY created_at) as seq
  FROM public.questions
)
UPDATE public.questions q
SET sequence = n.seq
FROM numbered n
WHERE q.id = n.id;

-- Make sequence NOT NULL after setting values
ALTER TABLE public.questions ALTER COLUMN sequence SET NOT NULL;

-- Set default for new questions
ALTER TABLE public.questions ALTER COLUMN sequence SET DEFAULT 1;