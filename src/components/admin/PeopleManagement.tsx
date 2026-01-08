import { useState, useMemo } from 'react';
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
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
}

export function PeopleManagement() {
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  const { isSuperAdmin, organizationScope, canDeleteUsers } = useAdminPermissions();
  const queryClient = useQueryClient();

  // Fetch all courses for filter dropdown
  const { data: courses = [] } = useQuery({
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

  const exportCSV = () => {
    const selectedCourseName = courseFilter !== 'all' 
      ? courses.find(c => c.id === courseFilter)?.title || 'Unknown'
      : 'All Courses';
    
    const headers = ['Name', 'Email', 'Organization', 'Job Role', 'Course', 'Completion %', 'Exam Score', 'Certificate ID', 'Completion Date'];
    const rows = filteredLearners.map(l => [
      `${l.first_name} ${l.last_name}`,
      l.email || '',
      l.organization || '',
      l.job_role || '',
      selectedCourseName,
      `${l.completion_percentage}%`,
      l.best_exam_score !== null ? `${Math.round(l.best_exam_score * 100)}%` : 'N/A',
      l.certificate_id || '',
      l.completion_date ? format(new Date(l.completion_date), 'yyyy-MM-dd') : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const totalLearners = filteredLearners.length;
  const completedLearners = filteredLearners.filter(l => l.completion_percentage === 100).length;
  const certificatesIssued = filteredLearners.filter(l => l.certificate_id).length;

  return (
    <div className="space-y-6">
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
                <Button onClick={exportCSV} variant="outline" size="sm">
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
