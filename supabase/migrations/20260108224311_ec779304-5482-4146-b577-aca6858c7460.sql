-- Allow org admins to manage their own organization's course assignments
CREATE POLICY "Org admins can manage their org course assignments"
ON public.organization_courses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN profiles p ON p.id = auth.uid()
    JOIN organizations o ON o.id = organization_courses.organization_id
    WHERE ap.user_id = auth.uid()
    AND ap.can_manage_courses = true
    AND p.organization_id = o.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN profiles p ON p.id = auth.uid()
    JOIN organizations o ON o.id = organization_courses.organization_id
    WHERE ap.user_id = auth.uid()
    AND ap.can_manage_courses = true
    AND p.organization_id = o.id
  )
);