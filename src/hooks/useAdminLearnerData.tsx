import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LearnerReport } from '@/components/admin/LearnerReportTable';

interface Course {
  id: string;
  title: string;
}

export function useAdminCourses() {
  return useQuery({
    queryKey: ['admin-courses-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useAdminLearners(courseFilter: string) {
  return useQuery({
    queryKey: ['admin-learners', courseFilter],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Get enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, course_id');

      // Get modules (filtered by course if selected)
      let modulesQuery = supabase
        .from('modules')
        .select('id, course_id, type');
      
      if (courseFilter !== 'all') {
        modulesQuery = modulesQuery.eq('course_id', courseFilter);
      }
      
      const { data: modules } = await modulesQuery;
      const moduleIds = modules?.map(m => m.id) || [];
      const totalModules = modules?.length || 0;

      // Get all progress records (filtered to relevant modules)
      const { data: allProgress } = await supabase
        .from('progress')
        .select('*');

      // Filter progress to only relevant modules
      const relevantProgress = allProgress?.filter(p => moduleIds.includes(p.module_id)) || [];

      // Get all attempts (for exam scores)
      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('*');

      // Filter attempts to only relevant modules
      const relevantAttempts = allAttempts?.filter(a => moduleIds.includes(a.module_id)) || [];

      // Get all certificates
      let certificatesQuery = supabase.from('certificates').select('*');
      if (courseFilter !== 'all') {
        certificatesQuery = certificatesQuery.eq('course_id', courseFilter);
      }
      const { data: allCertificates } = await certificatesQuery;

      // Get exam modules
      const examModuleIds = modules?.filter(m => m.type === 'exam').map(m => m.id) || [];

      // Filter profiles by course enrollment if course filter is active
      let filteredProfiles = profiles;
      if (courseFilter !== 'all') {
        const enrolledUserIds = enrollments
          ?.filter(e => e.course_id === courseFilter)
          .map(e => e.user_id) || [];
        filteredProfiles = profiles?.filter(p => enrolledUserIds.includes(p.id));
      }

      // Build learner reports
      const reports: LearnerReport[] = filteredProfiles?.map(profile => {
        const userProgress = relevantProgress.filter(p => p.user_id === profile.id);
        const completedModules = userProgress.filter(p => p.completed);
        
        // Get best exam score from relevant exams
        const examAttempts = relevantAttempts.filter(
          a => a.user_id === profile.id && examModuleIds.includes(a.module_id)
        );
        const bestExamScore = examAttempts.length > 0
          ? Math.max(...examAttempts.map(a => Number(a.score)))
          : null;

        // Get certificate
        const userCert = allCertificates?.find(c => c.user_id === profile.id);
        
        // Get completion date (last module completed)
        const completionDates = completedModules
          .filter(p => p.completed_at)
          .map(p => new Date(p.completed_at!));
        const latestCompletion = completionDates.length > 0
          ? new Date(Math.max(...completionDates.map(d => d.getTime())))
          : null;

        // Get enrolled courses for this user
        const userEnrollments = enrollments?.filter(e => e.user_id === profile.id) || [];
        const enrolledCourseIds = userEnrollments.map(e => e.course_id);

        return {
          id: profile.id,
          email: '',
          first_name: profile.first_name,
          last_name: profile.last_name,
          organization: profile.organization,
          job_role: profile.job_role,
          created_at: profile.created_at,
          modules_completed: completedModules.length,
          total_modules: totalModules,
          completion_percentage: totalModules > 0 
            ? Math.round((completedModules.length / totalModules) * 100) 
            : 0,
          best_exam_score: bestExamScore,
          certificate_id: userCert?.certificate_id || null,
          completion_date: latestCompletion?.toISOString() || null,
          enrolled_courses: enrolledCourseIds,
        };
      }) || [];

      return reports;
    },
  });
}
