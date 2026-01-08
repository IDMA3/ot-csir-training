import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminPermissions {
  id: string;
  user_id: string;
  is_super_admin: boolean;
  can_view_users: boolean;
  can_manage_users: boolean;
  can_view_courses: boolean;
  can_manage_courses: boolean;
  organization_scope: string | null;
}

export function useAdminPermissions() {
  const { user, profile } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['admin-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin permissions:', error);
        return null;
      }

      return data as AdminPermissions | null;
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = permissions?.is_super_admin ?? false;
  const canViewUsers = permissions?.can_view_users ?? false;
  const canManageUsers = permissions?.can_manage_users ?? false;
  const canViewCourses = permissions?.can_view_courses ?? false;
  const canManageCourses = permissions?.can_manage_courses ?? false;
  const organizationScope = permissions?.organization_scope ?? profile?.organization ?? null;

  // Check if user has any admin access
  const hasAdminAccess = isSuperAdmin || canViewUsers || canManageUsers || canViewCourses || canManageCourses;

  // Tab visibility helpers
  const canAccessLearnerReports = isSuperAdmin || canViewUsers;
  const canAccessAnalytics = isSuperAdmin || canViewUsers;
  const canAccessCourses = isSuperAdmin || canManageCourses;
  const canAccessAdminManagement = isSuperAdmin;

  return {
    permissions,
    isLoading,
    isSuperAdmin,
    canViewUsers,
    canManageUsers,
    canViewCourses,
    canManageCourses,
    organizationScope,
    hasAdminAccess,
    canAccessLearnerReports,
    canAccessAnalytics,
    canAccessCourses,
    canAccessAdminManagement,
  };
}
