import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Download, Search, Users, GraduationCap, Award, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LearnerReportTable, type LearnerReport } from '@/components/admin/LearnerReportTable';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csv-export';

interface Course {
  id: string;
  title: string;
}

interface OrganizationWithCount {
  id: string;
  name: string;
  max_users: number | null;
  userCount: number;
}

interface PeopleManagementProps {
  initialOrganizationFilter?: string;
  onClearInitialFilter?: () => void;
}

export function PeopleManagement({ initialOrganizationFilter, onClearInitialFilter }: PeopleManagementProps = {}) {
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  const { isSuperAdmin, organizationScope, canDeleteUsers } = useAdminPermissions();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Apply initial organization filter when navigating from Organizations tab
  useEffect(() => {
    if (initialOrganizationFilter) {
      setOrganizationFilter(initialOrganizationFilter);
      onClearInitialFilter?.();
    }
  }, [initialOrganizationFilter, onClearInitialFilter]);

  // Fetch courses - filtered for org admins
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses-filter', isSuperAdmin, profile?.organization_id],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Super admin sees all courses
        const { data, error } = await supabase
          .from('course')
          .select('id, title')
          .order('title');
        if (error) throw error;
        return data as Course[];
      } else if (profile?.organization_id) {
        // Org admin: get courses assigned to their org + courses created by their org
        const { data: orgCourses } = await supabase
          .from('organization_courses')
          .select('course_id')
          .eq('organization_id', profile.organization_id);
        
        const assignedIds = orgCourses?.map(oc => oc.course_id) || [];
        
        // Build OR filter for courses
        const filters: string[] = [];
        if (assignedIds.length > 0) {
          filters.push(`id.in.(${assignedIds.join(',')})`);
        }
        filters.push(`creator_organization_id.eq.${profile.organization_id}`);
        
        const { data, error } = await supabase
          .from('course')
          .select('id, title')
          .or(filters.join(','))
          .order('title');
        
        if (error) throw error;
        return data as Course[];
      }
      return [];
    },
  });

  // Fetch organizations with user counts for bulk assignment
  const { data: organizationsForBulk = [] } = useQuery({
    queryKey: ['admin-organizations-bulk'],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, max_users')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;

      // Get user counts per organization
      const { data: profiles } = await supabase
        .from('profiles')
        .select('organization_id');

      const orgCounts = new Map<string, number>();
      profiles?.forEach(p => {
        if (p.organization_id) {
          orgCounts.set(p.organization_id, (orgCounts.get(p.organization_id) || 0) + 1);
        }
      });

      return (orgs || []).map(org => ({
        id: org.id,
        name: org.name,
        max_users: org.max_users,
        userCount: orgCounts.get(org.id) || 0,
      })) as OrganizationWithCount[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch all learners with their progress
  const { data: learners = [], isLoading } = useQuery({
    queryKey: ['admin-learners', courseFilter],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, course_id');

      let modulesQuery = supabase
        .from('modules')
        .select('id, course_id, type');
      
      if (courseFilter !== 'all') {
        modulesQuery = modulesQuery.eq('course_id', courseFilter);
      }
      
      const { data: modules } = await modulesQuery;
      const moduleIds = modules?.map(m => m.id) || [];
      const totalModules = modules?.length || 0;

      const { data: allProgress } = await supabase
        .from('progress')
        .select('*');

      const relevantProgress = allProgress?.filter(p => moduleIds.includes(p.module_id)) || [];

      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('*');

      const relevantAttempts = allAttempts?.filter(a => moduleIds.includes(a.module_id)) || [];

      let certificatesQuery = supabase.from('certificates').select('*');
      if (courseFilter !== 'all') {
        certificatesQuery = certificatesQuery.eq('course_id', courseFilter);
      }
      const { data: allCertificates } = await certificatesQuery;

      const examModuleIds = modules?.filter(m => m.type === 'exam').map(m => m.id) || [];

      let filteredProfiles = profiles;
      if (courseFilter !== 'all') {
        const enrolledUserIds = enrollments
          ?.filter(e => e.course_id === courseFilter)
          .map(e => e.user_id) || [];
        filteredProfiles = profiles?.filter(p => enrolledUserIds.includes(p.id));
      }

      const reports: LearnerReport[] = filteredProfiles?.map(profile => {
        const userProgress = relevantProgress.filter(p => p.user_id === profile.id);
        const completedModules = userProgress.filter(p => p.completed);
        
        const examAttempts = relevantAttempts.filter(
          a => a.user_id === profile.id && examModuleIds.includes(a.module_id)
        );
        const bestExamScore = examAttempts.length > 0
          ? Math.max(...examAttempts.map(a => Number(a.score)))
          : null;

        const userCert = allCertificates?.find(c => c.user_id === profile.id);
        
        const completionDates = completedModules
          .filter(p => p.completed_at)
          .map(p => new Date(p.completed_at!));
        const latestCompletion = completionDates.length > 0
          ? new Date(Math.max(...completionDates.map(d => d.getTime())))
          : null;

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

  // Filter learners by organization scope for non-super admins
  const scopedLearners = useMemo(() => {
    if (isSuperAdmin || !organizationScope) return learners;
    return learners.filter(l => l.organization === organizationScope);
  }, [learners, isSuperAdmin, organizationScope]);

  // Get unique organizations for filter dropdown
  const organizations = useMemo(() => {
    const orgs = scopedLearners
      .map(l => l.organization)
      .filter((org): org is string => !!org);
    return [...new Set(orgs)].sort();
  }, [scopedLearners]);

  // Apply all filters
  const filteredLearners = useMemo(() => {
    return scopedLearners.filter(l => {
      if (nameFilter) {
        const nameLower = nameFilter.toLowerCase();
        const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
        if (!fullName.includes(nameLower)) return false;
      }
      
      if (organizationFilter && organizationFilter !== 'all') {
        if (l.organization !== organizationFilter) return false;
      }
      
      if (startDate || endDate) {
        if (!l.completion_date) return false;
        const completionDate = new Date(l.completion_date);
        if (startDate && completionDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (completionDate > endOfDay) return false;
        }
      }
      
      return true;
    });
  }, [scopedLearners, nameFilter, organizationFilter, startDate, endDate]);

  const hasActiveFilters = nameFilter || organizationFilter !== 'all' || courseFilter !== 'all' || startDate || endDate;

  const clearFilters = () => {
    setNameFilter('');
    setOrganizationFilter('all');
    setCourseFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleExportCSV = () => {
    const selectedCourseName = courseFilter !== 'all' 
      ? courses.find(c => c.id === courseFilter)?.title || 'Unknown'
      : 'All Courses';
    
    exportToCSV({
      filename: `training-report-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Name', 'Email', 'Organization', 'Job Role', 'Course', 'Completion %', 'Exam Score', 'Certificate ID', 'Completion Date'],
      rows: filteredLearners.map(l => [
        `${l.first_name} ${l.last_name}`,
        l.email || '',
        l.organization || '',
        l.job_role || '',
        selectedCourseName,
        `${l.completion_percentage}%`,
        l.best_exam_score !== null ? `${Math.round(l.best_exam_score * 100)}%` : 'N/A',
        l.certificate_id || '',
        l.completion_date ? format(new Date(l.completion_date), 'yyyy-MM-dd') : '',
      ]),
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user', { description: error.message });
        return;
      }

      if (data?.error) {
        toast.error('Failed to delete user', { description: data.error });
        return;
      }

      toast.success(`User "${userName}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Selection handlers
  const handleSelectionChange = (userId: string, selected: boolean) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUserIds(new Set(filteredLearners.map(l => l.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    setIsProcessingBulk(true);
    const userIds = Array.from(selectedUserIds);
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId },
        });

        if (error || data?.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} user${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user${failCount > 1 ? 's' : ''}`);
    }

    setSelectedUserIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    setIsProcessingBulk(false);
  };

  const handleBulkResetProgress = async (courseId?: string) => {
    setIsProcessingBulk(true);
    const userIds = Array.from(selectedUserIds);
    
    try {
      // Get modules for the course filter
      let moduleIds: string[] = [];
      if (courseId) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId);
        moduleIds = modules?.map(m => m.id) || [];
      }

      // Delete progress records
      let progressQuery = supabase.from('progress').delete().in('user_id', userIds);
      if (moduleIds.length > 0) {
        progressQuery = progressQuery.in('module_id', moduleIds);
      }
      await progressQuery;

      // Delete attempt records
      let attemptsQuery = supabase.from('attempts').delete().in('user_id', userIds);
      if (moduleIds.length > 0) {
        attemptsQuery = attemptsQuery.in('module_id', moduleIds);
      }
      await attemptsQuery;

      // Delete certificates if resetting specific course
      if (courseId) {
        await supabase.from('certificates').delete().in('user_id', userIds).eq('course_id', courseId);
      } else {
        await supabase.from('certificates').delete().in('user_id', userIds);
      }

      toast.success(`Reset progress for ${userIds.length} user${userIds.length > 1 ? 's' : ''}`);
      setSelectedUserIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error resetting progress:', err);
      toast.error('Failed to reset progress');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkEnroll = async (courseIds: string[]) => {
    setIsProcessingBulk(true);
    const userIds = Array.from(selectedUserIds);
    
    try {
      let totalEnrolled = 0;
      let totalAlreadyEnrolled = 0;

      for (const courseId of courseIds) {
        // Get existing enrollments to avoid duplicates
        const { data: existingEnrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', courseId)
          .in('user_id', userIds);

        const existingUserIds = new Set(existingEnrollments?.map(e => e.user_id) || []);
        const newEnrollments = userIds
          .filter(id => !existingUserIds.has(id))
          .map(user_id => ({ user_id, course_id: courseId }));

        if (newEnrollments.length > 0) {
          const { error } = await supabase.from('enrollments').insert(newEnrollments);
          if (error) throw error;
          totalEnrolled += newEnrollments.length;
        }
        totalAlreadyEnrolled += (userIds.length - newEnrollments.length);
      }

      if (totalEnrolled > 0) {
        toast.success(`Enrolled users in ${courseIds.length} course${courseIds.length > 1 ? 's' : ''}`);
      }
      if (totalAlreadyEnrolled > 0 && totalEnrolled === 0) {
        toast.info('Users were already enrolled in selected courses');
      }

      setSelectedUserIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error enrolling users:', err);
      toast.error('Failed to enroll users');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkUnenroll = async (courseIds: string[]) => {
    setIsProcessingBulk(true);
    const userIds = Array.from(selectedUserIds);
    
    try {
      for (const courseId of courseIds) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('course_id', courseId)
          .in('user_id', userIds);
        
        if (error) throw error;
      }

      toast.success(`Removed users from ${courseIds.length} course${courseIds.length > 1 ? 's' : ''}`);
      setSelectedUserIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error removing users from courses:', err);
      toast.error('Failed to remove users from courses');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Single user enroll handler for inline actions
  const handleEnrollUser = async (userId: string, courseIds: string[]) => {
    try {
      for (const courseId of courseIds) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('enrollments')
            .insert({ user_id: userId, course_id: courseId });
          if (error) throw error;
        }
      }
      toast.success('Enrolled successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error enrolling user:', err);
      toast.error('Failed to enroll user');
    }
  };

  // Single user unenroll handler for inline actions
  const handleUnenrollUser = async (userId: string, courseIds: string[]) => {
    try {
      for (const courseId of courseIds) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('user_id', userId)
          .eq('course_id', courseId);
        if (error) throw error;
      }
      toast.success('Removed from course');
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
    } catch (err) {
      console.error('Error unenrolling user:', err);
      toast.error('Failed to remove from course');
    }
  };

  const handleBulkAssignOrg = async (orgId: string | null) => {
    setIsProcessingBulk(true);
    const userIds = Array.from(selectedUserIds);
    
    try {
      // Get org name if assigning to an organization
      const orgName = orgId ? organizationsForBulk.find(o => o.id === orgId)?.name : null;

      // Update profiles with new organization
      const { error } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgId, 
          organization: orgName 
        })
        .in('id', userIds);

      if (error) throw error;

      if (orgId) {
        toast.success(`Assigned ${userIds.length} user${userIds.length > 1 ? 's' : ''} to ${orgName}`);
      } else {
        toast.success(`Removed ${userIds.length} user${userIds.length > 1 ? 's' : ''} from organization`);
      }

      setSelectedUserIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-learners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-bulk'] });
    } catch (err) {
      console.error('Error assigning organization:', err);
      toast.error('Failed to assign organization');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const totalLearners = filteredLearners.length;
  const completedLearners = filteredLearners.filter(l => l.completion_percentage === 100).length;
  const certificatesIssued = filteredLearners.filter(l => l.certificate_id).length;

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedUserIds.size}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkResetProgress={handleBulkResetProgress}
        onBulkEnroll={handleBulkEnroll}
        onBulkUnenroll={handleBulkUnenroll}
        onBulkAssignOrg={handleBulkAssignOrg}
        courses={courses}
        organizations={organizationsForBulk}
        canDeleteUsers={canDeleteUsers}
        isProcessing={isProcessingBulk}
        showOrgAssignment={isSuperAdmin}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLearners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Training</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLearners}</div>
            <p className="text-xs text-muted-foreground">
              {totalLearners > 0 ? Math.round((completedLearners / totalLearners) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificates Issued</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificatesIssued}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by name, organization, course, or completion date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org} value={org}>{org}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Completed:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-[130px]", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-[130px]", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex gap-2 ml-auto">
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="ghost" size="sm">
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
                <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People Table */}
      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>
            {filteredLearners.length} {filteredLearners.length === 1 ? 'person' : 'people'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LearnerReportTable 
            learners={filteredLearners} 
            isLoading={isLoading} 
            courseFilter={courseFilter}
            courses={courses}
            canDeleteUsers={canDeleteUsers}
            onDeleteUser={handleDeleteUser}
            deletingUserId={deletingUserId}
            selectedUserIds={selectedUserIds}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            showSelection={true}
            onEnrollUser={handleEnrollUser}
            onUnenrollUser={handleUnenrollUser}
            showEnrollments={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
