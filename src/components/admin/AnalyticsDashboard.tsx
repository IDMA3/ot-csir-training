import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, differenceInHours, eachDayOfInterval } from 'date-fns';
import { Loader2, TrendingUp, Clock, Target, Users, Award, BookOpen, CalendarIcon, X, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/lib/csv-export';

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null },
];

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<number | null>(30);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes, progressRes, attemptsRes, certificatesRes, modulesRes] = await Promise.all([
        supabase.from('course').select('id, title'),
        supabase.from('enrollments').select('id, course_id, user_id, enrolled_at'),
        supabase.from('progress').select('id, module_id, user_id, completed, completed_at'),
        supabase.from('attempts').select('id, module_id, user_id, passed, score, submitted_at'),
        supabase.from('certificates').select('id, course_id, user_id, issued_at'),
        supabase.from('modules').select('id, course_id, type'),
      ]);

      return {
        courses: coursesRes.data || [],
        enrollments: enrollmentsRes.data || [],
        progress: progressRes.data || [],
        attempts: attemptsRes.data || [],
        certificates: certificatesRes.data || [],
        modules: modulesRes.data || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!analyticsData) return null;
    
    const startDate = dateRange?.from ? startOfDay(dateRange.from) : null;
    const endDate = dateRange?.to ? endOfDay(dateRange.to) : null;

    const filterByDate = <T extends { [key: string]: any }>(items: T[], dateField: string): T[] => {
      if (!startDate && !endDate) return items;
      return items.filter(item => {
        const itemDate = item[dateField] ? new Date(item[dateField]) : null;
        if (!itemDate) return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    };

    return {
      courses: analyticsData.courses,
      modules: analyticsData.modules,
      enrollments: filterByDate(analyticsData.enrollments, 'enrolled_at'),
      progress: filterByDate(analyticsData.progress.filter(p => p.completed), 'completed_at'),
      attempts: filterByDate(analyticsData.attempts, 'submitted_at'),
      certificates: filterByDate(analyticsData.certificates, 'issued_at'),
      // Keep original for time-to-completion calculation
      allEnrollments: analyticsData.enrollments,
    };
  }, [analyticsData, dateRange]);

  // KPI Metrics
  const kpiMetrics = useMemo(() => {
    if (!filteredData) return null;

    // Average exam score
    const examAttempts = filteredData.attempts.filter(a => a.score !== null);
    const avgScore = examAttempts.length > 0
      ? examAttempts.reduce((sum, a) => sum + Number(a.score), 0) / examAttempts.length
      : 0;

    // Time to completion (enrollment to certificate)
    const completionTimes: number[] = [];
    filteredData.certificates.forEach(cert => {
      const enrollment = filteredData.allEnrollments.find(
        e => e.user_id === cert.user_id && e.course_id === cert.course_id
      );
      if (enrollment) {
        const hours = differenceInHours(new Date(cert.issued_at), new Date(enrollment.enrolled_at));
        if (hours > 0) completionTimes.push(hours);
      }
    });
    const avgCompletionHours = completionTimes.length > 0
      ? completionTimes.reduce((sum, h) => sum + h, 0) / completionTimes.length
      : 0;

    // Completion rate (within filtered period)
    const uniqueEnrollments = new Set(filteredData.enrollments.map(e => `${e.user_id}-${e.course_id}`)).size;
    const completedCourses = filteredData.certificates.length;
    const completionRate = uniqueEnrollments > 0 ? (completedCourses / uniqueEnrollments) * 100 : 0;

    // Active learners (in date range)
    const activeLearners = new Set(filteredData.enrollments.map(e => e.user_id)).size;

    // Pass rate
    const passRate = filteredData.attempts.length > 0
      ? (filteredData.attempts.filter(a => a.passed).length / filteredData.attempts.length) * 100
      : 0;

    // Modules completed per user (engagement)
    const userModuleCompletions = new Map<string, number>();
    filteredData.progress.forEach(p => {
      const count = userModuleCompletions.get(p.user_id) || 0;
      userModuleCompletions.set(p.user_id, count + 1);
    });
    const avgModulesPerUser = userModuleCompletions.size > 0
      ? Array.from(userModuleCompletions.values()).reduce((sum, c) => sum + c, 0) / userModuleCompletions.size
      : 0;

    return {
      avgScore,
      avgCompletionHours,
      completionRate,
      activeLearners,
      passRate,
      avgModulesPerUser,
      totalAttempts: filteredData.attempts.length,
      totalCertificates: filteredData.certificates.length,
    };
  }, [filteredData]);

  // Enrollments by course
  const enrollmentsByCourseData = useMemo(() => {
    if (!filteredData) return [];
    
    const courseMap = new Map<string, { name: string; count: number }>();
    filteredData.courses.forEach(c => courseMap.set(c.id, { name: c.title, count: 0 }));
    
    filteredData.enrollments.forEach(e => {
      const course = courseMap.get(e.course_id);
      if (course) course.count++;
    });

    return Array.from(courseMap.values())
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredData]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    if (!filteredData) return [];
    
    const ranges = [
      { range: '0-59%', min: 0, max: 59, count: 0, fill: 'hsl(var(--destructive))' },
      { range: '60-69%', min: 60, max: 69, count: 0, fill: 'hsl(var(--warning))' },
      { range: '70-79%', min: 70, max: 79, count: 0, fill: 'hsl(var(--accent))' },
      { range: '80-89%', min: 80, max: 89, count: 0, fill: 'hsl(var(--primary))' },
      { range: '90-100%', min: 90, max: 100, count: 0, fill: 'hsl(var(--success))' },
    ];

    filteredData.attempts.forEach(a => {
      const score = Number(a.score);
      const bucket = ranges.find(r => score >= r.min && score <= r.max);
      if (bucket) bucket.count++;
    });

    return ranges;
  }, [filteredData]);

  // Pass/Fail rates
  const passFailData = useMemo(() => {
    if (!filteredData) return [];
    
    const passed = filteredData.attempts.filter(a => a.passed).length;
    const failed = filteredData.attempts.filter(a => !a.passed).length;
    
    if (passed === 0 && failed === 0) return [];
    
    return [
      { name: 'Passed', value: passed, fill: 'hsl(var(--success))' },
      { name: 'Failed', value: failed, fill: 'hsl(var(--destructive))' },
    ];
  }, [filteredData]);

  // Completions over time (based on date range)
  const completionsOverTime = useMemo(() => {
    if (!filteredData || !dateRange?.from || !dateRange?.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    const timelineData = days.map(date => ({
      date: format(date, 'MMM d'),
      fullDate: date,
      completions: 0,
      enrollments: 0,
      certificates: 0,
    }));

    filteredData.progress.forEach(p => {
      if (!p.completed_at) return;
      const completedDate = new Date(p.completed_at);
      const dayIndex = timelineData.findIndex(d => 
        completedDate >= startOfDay(d.fullDate) && completedDate <= endOfDay(d.fullDate)
      );
      if (dayIndex >= 0) {
        timelineData[dayIndex].completions++;
      }
    });

    filteredData.enrollments.forEach(e => {
      const enrolledDate = new Date(e.enrolled_at);
      const dayIndex = timelineData.findIndex(d => 
        enrolledDate >= startOfDay(d.fullDate) && enrolledDate <= endOfDay(d.fullDate)
      );
      if (dayIndex >= 0) {
        timelineData[dayIndex].enrollments++;
      }
    });

    filteredData.certificates.forEach(c => {
      const issuedDate = new Date(c.issued_at);
      const dayIndex = timelineData.findIndex(d => 
        issuedDate >= startOfDay(d.fullDate) && issuedDate <= endOfDay(d.fullDate)
      );
      if (dayIndex >= 0) {
        timelineData[dayIndex].certificates++;
      }
    });

    // If more than 60 days, aggregate to weekly
    if (days.length > 60) {
      const weeklyData: typeof timelineData = [];
      for (let i = 0; i < timelineData.length; i += 7) {
        const week = timelineData.slice(i, i + 7);
        weeklyData.push({
          date: format(week[0].fullDate, 'MMM d'),
          fullDate: week[0].fullDate,
          completions: week.reduce((sum, d) => sum + d.completions, 0),
          enrollments: week.reduce((sum, d) => sum + d.enrollments, 0),
          certificates: week.reduce((sum, d) => sum + d.certificates, 0),
        });
      }
      return weeklyData;
    }

    return timelineData;
  }, [filteredData, dateRange]);

  const chartConfig = {
    completions: { label: 'Module Completions', color: 'hsl(var(--success))' },
    enrollments: { label: 'Enrollments', color: 'hsl(var(--primary))' },
    certificates: { label: 'Certificates', color: 'hsl(var(--accent))' },
    count: { label: 'Count', color: 'hsl(var(--primary))' },
    value: { label: 'Count', color: 'hsl(var(--primary))' },
  };

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const handlePresetClick = (days: number | null) => {
    setActivePreset(days);
    if (days === null) {
      setDateRange(undefined);
    } else {
      setDateRange({
        from: subDays(new Date(), days),
        to: new Date(),
      });
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setActivePreset(null);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setActivePreset(null);
  };

  const getDateRangeLabel = () => {
    if (activePreset !== null) {
      return activePreset === null ? 'All time' : `Last ${activePreset} days`;
    }
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    return 'All time';
  };

  const exportKPIs = () => {
    if (!kpiMetrics) return;
    exportToCSV({
      filename: `analytics-kpis-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Metric', 'Value', 'Date Range'],
      rows: [
        ['Average Score', `${kpiMetrics.avgScore.toFixed(1)}%`, getDateRangeLabel()],
        ['Avg Time to Complete', formatTime(kpiMetrics.avgCompletionHours), getDateRangeLabel()],
        ['Completion Rate', `${kpiMetrics.completionRate.toFixed(1)}%`, getDateRangeLabel()],
        ['Active Learners', kpiMetrics.activeLearners, getDateRangeLabel()],
        ['Pass Rate', `${kpiMetrics.passRate.toFixed(1)}%`, getDateRangeLabel()],
        ['Modules per User', kpiMetrics.avgModulesPerUser.toFixed(1), getDateRangeLabel()],
        ['Total Attempts', kpiMetrics.totalAttempts, getDateRangeLabel()],
        ['Total Certificates', kpiMetrics.totalCertificates, getDateRangeLabel()],
      ],
    });
  };

  const exportTimeline = () => {
    if (completionsOverTime.length === 0) return;
    exportToCSV({
      filename: `analytics-timeline-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Date', 'Enrollments', 'Module Completions', 'Certificates Issued'],
      rows: completionsOverTime.map(d => [
        d.date,
        d.enrollments,
        d.completions,
        d.certificates,
      ]),
    });
  };

  const exportCourseEnrollments = () => {
    if (enrollmentsByCourseData.length === 0) return;
    exportToCSV({
      filename: `analytics-enrollments-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Course', 'Enrollments'],
      rows: enrollmentsByCourseData.map(c => [c.name, c.count]),
    });
  };

  const exportScoreDistribution = () => {
    if (scoreDistribution.every(s => s.count === 0)) return;
    exportToCSV({
      filename: `analytics-scores-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Score Range', 'Count'],
      rows: scoreDistribution.map(s => [s.range, s.count]),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Overview</h2>
          <p className="text-muted-foreground">Training platform performance metrics</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_RANGES.map((preset) => (
            <Button
              key={preset.label}
              variant={activePreset === preset.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activePreset === null && dateRange ? 'default' : 'outline'}
                size="sm"
                className={cn('gap-2', activePreset === null && dateRange && 'pr-2')}
              >
                <CalendarIcon className="h-4 w-4" />
                {activePreset === null && dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Custom'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(dateRange || activePreset !== null) && (
            <Button variant="ghost" size="sm" onClick={clearDateRange}>
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportKPIs}>
                Export Summary KPIs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTimeline} disabled={completionsOverTime.length === 0}>
                Export Timeline Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCourseEnrollments} disabled={enrollmentsByCourseData.length === 0}>
                Export Course Enrollments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportScoreDistribution} disabled={scoreDistribution.every(s => s.count === 0)}>
                Export Score Distribution
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Score</span>
            </div>
            <p className="text-2xl font-bold mt-2">{kpiMetrics?.avgScore.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Time to Complete</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatTime(kpiMetrics?.avgCompletionHours || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{kpiMetrics?.completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Learners</span>
            </div>
            <p className="text-2xl font-bold mt-2">{kpiMetrics?.activeLearners}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Pass Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{kpiMetrics?.passRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Modules/User</span>
            </div>
            <p className="text-2xl font-bold mt-2">{kpiMetrics?.avgModulesPerUser.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Assessment scores by range</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {scoreDistribution.every(s => s.count === 0) ? (
              <p className="text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={scoreDistribution} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis width={35} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Enrollments by Course */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Course</CardTitle>
            <CardDescription>Top 5 courses by enrollment count</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {enrollmentsByCourseData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No enrollment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={enrollmentsByCourseData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={110}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 16 ? `${value.slice(0, 16)}...` : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pass/Fail Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Results</CardTitle>
            <CardDescription>Overall pass/fail rates ({kpiMetrics?.totalAttempts} attempts)</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {passFailData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Certificates Issued */}
        <Card>
          <CardHeader>
            <CardTitle>Certificates Issued</CardTitle>
            <CardDescription>{kpiMetrics?.totalCertificates} certificates in period</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData?.certificates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No certificates issued in this period</p>
            ) : (
              <div className="space-y-4 py-4">
                {filteredData?.courses.map(course => {
                  const count = filteredData.certificates.filter(c => c.course_id === course.id).length;
                  const enrollmentCount = filteredData.enrollments.filter(e => e.course_id === course.id).length;
                  const rate = enrollmentCount > 0 ? (count / enrollmentCount) * 100 : 0;
                  if (count === 0) return null;
                  return (
                    <div key={course.id} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[150px]" title={course.title}>{course.title}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full" 
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>Enrollments, completions, and certificates in selected period</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={completionsOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis width={35} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="enrollments" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="certificates" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
