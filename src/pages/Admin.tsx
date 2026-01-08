import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Download, Search, Users, GraduationCap, Award, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearnerReport {
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  job_role: string | null;
  created_at: string;
  modules_completed: number;
  total_modules: number;
  completion_percentage: number;
  best_exam_score: number | null;
  certificate_id: string | null;
  completion_date: string | null;
}

export default function Admin() {
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch all learners with their progress
  const { data: learners = [], isLoading } = useQuery({
    queryKey: ['admin-learners', startDate, endDate],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Get total modules count
      const { data: modules } = await supabase
        .from('modules')
        .select('id');
      
      const totalModules = modules?.length || 0;

      // Get all progress records
      const { data: allProgress } = await supabase
        .from('progress')
        .select('*');

      // Get all attempts (for exam scores)
      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('*');

      // Get all certificates
      const { data: allCertificates } = await supabase
        .from('certificates')
        .select('*');

      // Get exam module id
      const { data: examModule } = await supabase
        .from('modules')
        .select('id')
        .eq('type', 'exam')
        .single();

      // Build learner reports
      const reports: LearnerReport[] = profiles?.map(profile => {
        const userProgress = allProgress?.filter(p => p.user_id === profile.id) || [];
        const completedModules = userProgress.filter(p => p.completed);
        
        // Get best exam score
        const examAttempts = allAttempts?.filter(
          a => a.user_id === profile.id && a.module_id === examModule?.id
        ) || [];
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

        return {
          id: profile.id,
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

  const hasActiveFilters = nameFilter || organizationFilter !== 'all' || startDate || endDate;

  const clearFilters = () => {
    setNameFilter('');
    setOrganizationFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Name', 'Organization', 'Job Role', 'Completion %', 'Exam Score', 'Certificate ID', 'Completion Date'];
    const rows = filteredLearners.map(l => [
      `${l.first_name} ${l.last_name}`,
      l.organization || '',
      l.job_role || '',
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
          <p className="text-muted-foreground mt-1">Training completion reporting and learner management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter learners by name, organization, or completion date range</CardDescription>
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
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredLearners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No learners found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Exam Score</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLearners.map((learner) => (
                      <TableRow key={learner.id}>
                        <TableCell className="font-medium">
                          {learner.first_name} {learner.last_name}
                          {learner.job_role && (
                            <span className="block text-xs text-muted-foreground">{learner.job_role}</span>
                          )}
                        </TableCell>
                        <TableCell>{learner.organization || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${learner.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{learner.completion_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {learner.best_exam_score !== null ? (
                            <Badge variant={learner.best_exam_score >= 0.8 ? "default" : "secondary"}>
                              {Math.round(learner.best_exam_score * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {learner.certificate_id ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {learner.certificate_id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {learner.completion_date ? (
                            format(new Date(learner.completion_date), 'MMM d, yyyy')
                          ) : (
                            <span className="text-muted-foreground">In progress</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
