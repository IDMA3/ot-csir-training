import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface GlobalCourse {
  id: string;
  title: string;
  category: string | null;
  active: boolean;
  isAssigned: boolean;
}

export function OrgCourseAccessManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch global courses (created by super admins) and current assignments
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['org-course-access', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      // Get all global courses (those with null creator_organization_id)
      const { data: globalCourses, error: coursesError } = await supabase
        .from('course')
        .select('id, title, category, active')
        .is('creator_organization_id', null)
        .eq('active', true)
        .order('title');

      if (coursesError) throw coursesError;

      // Get currently assigned courses for this org
      const { data: assignments, error: assignmentsError } = await supabase
        .from('organization_courses')
        .select('course_id')
        .eq('organization_id', profile.organization_id);

      if (assignmentsError) throw assignmentsError;

      const assignedIds = new Set(assignments?.map(a => a.course_id) || []);

      return (globalCourses || []).map(course => ({
        ...course,
        isAssigned: assignedIds.has(course.id),
      })) as GlobalCourse[];
    },
    enabled: !!profile?.organization_id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ courseId, assign }: { courseId: string; assign: boolean }) => {
      if (!profile?.organization_id) throw new Error('No organization');

      if (assign) {
        const { error } = await supabase
          .from('organization_courses')
          .insert({
            organization_id: profile.organization_id,
            course_id: courseId,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_courses')
          .delete()
          .eq('organization_id', profile.organization_id)
          .eq('course_id', courseId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { assign }) => {
      queryClient.invalidateQueries({ queryKey: ['org-course-access'] });
      queryClient.invalidateQueries({ queryKey: ['organization-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success(assign ? 'Course added to organization' : 'Course removed from organization');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  if (!profile?.organization_id) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Available Global Courses
          </CardTitle>
          <CardDescription>
            Enable global courses for your organization's users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No global courses available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Available Global Courses
        </CardTitle>
        <CardDescription>
          Toggle which global courses are available to your organization's users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={course.isAssigned}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ courseId: course.id, assign: checked })
                  }
                  disabled={toggleMutation.isPending}
                />
                <div>
                  <p className="font-medium">{course.title}</p>
                  {course.category && (
                    <Badge variant="outline" className="mt-1">
                      {course.category}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant={course.isAssigned ? 'default' : 'secondary'}>
                {course.isAssigned ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
