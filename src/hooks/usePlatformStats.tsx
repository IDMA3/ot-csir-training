import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformStats {
  totalCourses: number;
  totalLearners: number;
  certificatesIssued: number;
  averageCourseDuration: number;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      // Fetch all stats in parallel
      const [coursesResult, profilesResult, certificatesResult] = await Promise.all([
        supabase.from('course').select('id, duration_minutes').eq('active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
      ]);

      const courses = coursesResult.data || [];
      const totalLearners = profilesResult.count || 0;
      const certificatesIssued = certificatesResult.count || 0;
      
      const averageCourseDuration = courses.length > 0
        ? Math.round(courses.reduce((sum, c) => sum + c.duration_minutes, 0) / courses.length)
        : 0;

      return {
        totalCourses: courses.length,
        totalLearners,
        certificatesIssued,
        averageCourseDuration,
      } as PlatformStats;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
