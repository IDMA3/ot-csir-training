import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OrganizationCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  version: string;
  module_count: number;
  progress_percentage: number;
  has_certificate: boolean;
}

export function useOrganizationCourses() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['organization-courses', user?.id, profile?.organization_id],
    queryFn: async () => {
      if (!user) return [];

      // Users without organization cannot see any courses
      if (!profile?.organization_id) {
        return [];
      }

      // RLS now handles visibility via can_view_course function
      // Just fetch all active courses - the DB will filter appropriately
      const { data: courses, error: coursesError } = await supabase
        .from('course')
        .select('*')
        .eq('active', true)
        .order('title');

      if (coursesError) throw coursesError;

      // Get modules count per course
      const { data: modules } = await supabase
        .from('modules')
        .select('id, course_id');

      // Get user's progress
      const { data: progress } = await supabase
        .from('progress')
        .select('module_id, completed')
        .eq('user_id', user.id);

      // Get user's certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('course_id')
        .eq('user_id', user.id);

      const certificateSet = new Set(certificates?.map(c => c.course_id) || []);
      const progressMap = new Map(progress?.map(p => [p.module_id, p.completed]) || []);

      return (courses || []).map(course => {
        const courseModules = modules?.filter(m => m.course_id === course.id) || [];
        const completedModules = courseModules.filter(m => progressMap.get(m.id));
        const moduleCount = courseModules.length;
        const progressPercentage = moduleCount > 0 
          ? Math.round((completedModules.length / moduleCount) * 100)
          : 0;

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          duration_minutes: course.duration_minutes,
          version: course.version,
          module_count: moduleCount,
          progress_percentage: progressPercentage,
          has_certificate: certificateSet.has(course.id),
        } as OrganizationCourse;
      });
    },
    enabled: !!user,
  });
}

export function useCanAccessCourse(courseId: string | undefined) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['can-access-course', user?.id, courseId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !courseId) return false;

      // Users without organization cannot access any courses
      if (!profile?.organization_id) return false;

      // Try to fetch the course - RLS will determine if accessible
      const { data: course, error } = await supabase
        .from('course')
        .select('id')
        .eq('id', courseId)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking course access:', error);
        return false;
      }

      return !!course;
    },
    enabled: !!user && !!courseId,
  });
}

export function useHasOrganization() {
  const { profile, isLoading } = useAuth();
  
  return {
    hasOrganization: !!profile?.organization_id,
    isLoading,
  };
}
