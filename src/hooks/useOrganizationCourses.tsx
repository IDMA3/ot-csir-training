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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's profile to find organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Get all active courses
      const { data: courses, error: coursesError } = await supabase
        .from('course')
        .select('*')
        .eq('active', true)
        .order('title');

      if (coursesError) throw coursesError;

      let allowedCourseIds: string[] | null = null;

      // If user has an organization, check for course restrictions
      if (profile?.organization_id) {
        const { data: orgCourses } = await supabase
          .from('organization_courses')
          .select('course_id')
          .eq('organization_id', profile.organization_id);

        // If organization has specific course assignments, filter to those
        if (orgCourses && orgCourses.length > 0) {
          allowedCourseIds = orgCourses.map(oc => oc.course_id);
        }
        // If no assignments, all courses are allowed (null means no restriction)
      }

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

      // Filter courses if organization has restrictions
      const filteredCourses = allowedCourseIds 
        ? courses?.filter(c => allowedCourseIds!.includes(c.id))
        : courses;

      return (filteredCourses || []).map(course => {
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-access-course', user?.id, courseId],
    queryFn: async () => {
      if (!user || !courseId) return false;

      // Get user's profile to find organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // If no organization, allow all courses
      if (!profile?.organization_id) return true;

      // Check if organization has any course restrictions
      const { data: orgCourses } = await supabase
        .from('organization_courses')
        .select('course_id')
        .eq('organization_id', profile.organization_id);

      // If no restrictions, allow all courses
      if (!orgCourses || orgCourses.length === 0) return true;

      // Check if course is in allowed list
      return orgCourses.some(oc => oc.course_id === courseId);
    },
    enabled: !!user && !!courseId,
  });
}
