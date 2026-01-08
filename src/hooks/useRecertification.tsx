import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { addDays, isPast, differenceInDays } from 'date-fns';

export interface RecertificationSchedule {
  id: string;
  organization_id: string;
  course_id: string;
  schedule_type: 'monthly' | 'quarterly' | 'annually' | 'custom';
  custom_days: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type RecertificationStatus = 'current' | 'upcoming' | 'due' | 'overdue' | 'none';

function getScheduleDays(scheduleType: string, customDays: number | null): number {
  switch (scheduleType) {
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'annually': return 365;
    case 'custom': return customDays || 365;
    default: return 365;
  }
}

export function getRecertificationDueDate(
  certificateIssuedAt: Date,
  scheduleType: string,
  customDays?: number | null
): Date {
  const days = getScheduleDays(scheduleType, customDays ?? null);
  return addDays(certificateIssuedAt, days);
}

export function getRecertificationStatus(
  dueDate: Date,
  warningDays: number = 30
): RecertificationStatus {
  const now = new Date();
  const daysUntilDue = differenceInDays(dueDate, now);

  if (isPast(dueDate)) return 'overdue';
  if (daysUntilDue <= 0) return 'due';
  if (daysUntilDue <= warningDays) return 'upcoming';
  return 'current';
}

export function useRecertificationSchedules(organizationId?: string) {
  return useQuery({
    queryKey: ['recertification-schedules', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('recertification_schedules')
        .select('*')
        .eq('enabled', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RecertificationSchedule[];
    },
    enabled: !!organizationId,
  });
}

export function useUserRecertificationStatus(courseId?: string) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['user-recertification-status', user?.id, courseId],
    queryFn: async () => {
      if (!user || !courseId || !profile?.organization_id) {
        return null;
      }

      // Get the user's certificate for this course
      const { data: certificate } = await supabase
        .from('certificates')
        .select('issued_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!certificate) {
        return null;
      }

      // Get recertification schedule for this course and organization
      const { data: schedule } = await supabase
        .from('recertification_schedules')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('course_id', courseId)
        .eq('enabled', true)
        .maybeSingle();

      if (!schedule) {
        return { status: 'none' as RecertificationStatus, dueDate: null };
      }

      const dueDate = getRecertificationDueDate(
        new Date(certificate.issued_at),
        schedule.schedule_type,
        schedule.custom_days
      );

      const status = getRecertificationStatus(dueDate);

      return {
        status,
        dueDate,
        schedule,
        certificateIssuedAt: new Date(certificate.issued_at),
      };
    },
    enabled: !!user && !!courseId && !!profile?.organization_id,
  });
}

export function useResetForRecertification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Get all modules for this course
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);

      if (modulesError) throw modulesError;

      if (modules && modules.length > 0) {
        const moduleIds = modules.map(m => m.id);

        // Delete user's progress for these modules
        const { error: progressError } = await supabase
          .from('progress')
          .delete()
          .eq('user_id', user.id)
          .in('module_id', moduleIds);

        if (progressError) throw progressError;
      }

      return { courseId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['organization-courses'] });
      queryClient.invalidateQueries({ queryKey: ['user-recertification-status'] });
    },
  });
}

export function useManageRecertificationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id?: string;
      organization_id: string;
      course_id: string;
      schedule_type: 'monthly' | 'quarterly' | 'annually' | 'custom';
      custom_days?: number | null;
      enabled: boolean;
    }) => {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('recertification_schedules')
          .update({
            schedule_type: data.schedule_type,
            custom_days: data.custom_days,
            enabled: data.enabled,
          })
          .eq('id', data.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('recertification_schedules')
          .insert({
            organization_id: data.organization_id,
            course_id: data.course_id,
            schedule_type: data.schedule_type,
            custom_days: data.custom_days,
            enabled: data.enabled,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recertification-schedules'] });
    },
  });
}

export function useDeleteRecertificationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('recertification_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recertification-schedules'] });
    },
  });
}
