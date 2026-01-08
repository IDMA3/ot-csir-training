import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Download, Search, Users, GraduationCap, Award, X, Shield, BookOpen, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LearnerReportTable, type LearnerReport } from '@/components/admin/LearnerReportTable';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { CourseAssignment } from '@/components/admin/CourseAssignment';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

interface Course {
  id: string;
  title: string;
}

export default function Admin() {
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  // Get unique organizations for filter dropdown
  const organizations = useMemo(() => {
    const orgs = learners
      .map(l => l.organization)
      .filter((org): org is string => !!org);
    return [...new Set(orgs)].sort();
  }, [learners]);

  // Apply all filters
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      // Name filter
      if (nameFilter) {
        const nameLower = nameFilter.toLowerCase();
        const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
        if (!fullName.includes(nameLower)) return false;
      }
      
      // Organization filter
      if (organizationFilter && organizationFilter !== 'all') {
        if (l.organization !== organizationFilter) return false;
      }
      
      // Date range filter
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
  }, [learners, nameFilter, organizationFilter, startDate, endDate]);

  const hasActiveFilters = nameFilter || organizationFilter !== 'all' || courseFilter !== 'all' || startDate || endDate;

  const clearFilters = () => {
    setNameFilter('');
    setOrganizationFilter('all');
    setCourseFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Export to CSV
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

  // Stats
  const totalLearners = filteredLearners.length;
  const completedLearners = filteredLearners.filter(l => l.completion_percentage === 100).length;
  const certificatesIssued = filteredLearners.filter(l => l.certificate_id).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage learners, reports, and administrator access</p>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="reports" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Learner Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="h-4 w-4" />
              Admin Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
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
                <CardDescription>Filter learners by name, organization, course, or completion date range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Name Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Organization Dropdown */}
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

                    {/* Course Dropdown */}
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
                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Completed between:</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-[140px]", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground">–</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-[140px]", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "MMM d, yyyy") : "End"}
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
                          Clear filters
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

            {/* Learners Table */}
            <Card>
              <CardHeader>
                <CardTitle>Learners</CardTitle>
                <CardDescription>
                  {filteredLearners.length} learner{filteredLearners.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LearnerReportTable 
                  learners={filteredLearners} 
                  isLoading={isLoading} 
                  courseFilter={courseFilter}
                  courses={courses}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <CourseAssignment />
            <CourseManagement />
          </TabsContent>

          <TabsContent value="admins">
            <AdminUserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
