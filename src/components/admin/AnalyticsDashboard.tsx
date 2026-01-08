import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, differenceInDays, differenceInHours } from 'date-fns';
import { Loader2, TrendingUp, Clock, Target, Users, Award, BookOpen } from 'lucide-react';

export function AnalyticsDashboard() {
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

  // KPI Metrics
  const kpiMetrics = useMemo(() => {
    if (!analyticsData) return null;

    // Average exam score
    const examAttempts = analyticsData.attempts.filter(a => a.score !== null);
    const avgScore = examAttempts.length > 0
      ? examAttempts.reduce((sum, a) => sum + Number(a.score), 0) / examAttempts.length
      : 0;

    // Time to completion (enrollment to certificate)
    const completionTimes: number[] = [];
    analyticsData.certificates.forEach(cert => {
      const enrollment = analyticsData.enrollments.find(
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

    // Completion rate
    const uniqueEnrollments = new Set(analyticsData.enrollments.map(e => `${e.user_id}-${e.course_id}`)).size;
    const completedCourses = analyticsData.certificates.length;
    const completionRate = uniqueEnrollments > 0 ? (completedCourses / uniqueEnrollments) * 100 : 0;

    // Active learners (enrolled in last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const activeLearners = new Set(
      analyticsData.enrollments
        .filter(e => new Date(e.enrolled_at) >= sevenDaysAgo)
        .map(e => e.user_id)
    ).size;

    // Pass rate
    const passRate = analyticsData.attempts.length > 0
      ? (analyticsData.attempts.filter(a => a.passed).length / analyticsData.attempts.length) * 100
      : 0;

    // Modules completed per user (engagement)
    const userModuleCompletions = new Map<string, number>();
    analyticsData.progress.filter(p => p.completed).forEach(p => {
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
      totalAttempts: analyticsData.attempts.length,
      totalCertificates: analyticsData.certificates.length,
    };
  }, [analyticsData]);

  // Enrollments by course
  const enrollmentsByCourseData = useMemo(() => {
    if (!analyticsData) return [];
    
    const courseMap = new Map<string, { name: string; count: number }>();
    analyticsData.courses.forEach(c => courseMap.set(c.id, { name: c.title, count: 0 }));
    
    analyticsData.enrollments.forEach(e => {
      const course = courseMap.get(e.course_id);
      if (course) course.count++;
    });

    return Array.from(courseMap.values())
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analyticsData]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    if (!analyticsData) return [];
    
    const ranges = [
      { range: '0-59%', min: 0, max: 59, count: 0, fill: 'hsl(var(--destructive))' },
      { range: '60-69%', min: 60, max: 69, count: 0, fill: 'hsl(var(--warning))' },
      { range: '70-79%', min: 70, max: 79, count: 0, fill: 'hsl(var(--accent))' },
      { range: '80-89%', min: 80, max: 89, count: 0, fill: 'hsl(var(--primary))' },
      { range: '90-100%', min: 90, max: 100, count: 0, fill: 'hsl(var(--success))' },
    ];

    analyticsData.attempts.forEach(a => {
      const score = Number(a.score);
      const bucket = ranges.find(r => score >= r.min && score <= r.max);
      if (bucket) bucket.count++;
    });

    return ranges;
  }, [analyticsData]);

  // Pass/Fail rates
  const passFailData = useMemo(() => {
    if (!analyticsData) return [];
    
    const passed = analyticsData.attempts.filter(a => a.passed).length;
    const failed = analyticsData.attempts.filter(a => !a.passed).length;
    
    if (passed === 0 && failed === 0) return [];
    
    return [
      { name: 'Passed', value: passed, fill: 'hsl(var(--success))' },
      { name: 'Failed', value: failed, fill: 'hsl(var(--destructive))' },
    ];
  }, [analyticsData]);

  // Completions over time (last 30 days)
  const completionsOverTime = useMemo(() => {
    if (!analyticsData) return [];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM d'),
        fullDate: date,
        completions: 0,
        enrollments: 0,
        certificates: 0,
      };
    });

    analyticsData.progress
      .filter(p => p.completed && p.completed_at)
      .forEach(p => {
        const completedDate = new Date(p.completed_at!);
        const dayIndex = last30Days.findIndex(d => 
          completedDate >= startOfDay(d.fullDate) && completedDate <= endOfDay(d.fullDate)
        );
        if (dayIndex >= 0) {
          last30Days[dayIndex].completions++;
        }
      });

    analyticsData.enrollments.forEach(e => {
      const enrolledDate = new Date(e.enrolled_at);
      const dayIndex = last30Days.findIndex(d => 
        enrolledDate >= startOfDay(d.fullDate) && enrolledDate <= endOfDay(d.fullDate)
      );
      if (dayIndex >= 0) {
        last30Days[dayIndex].enrollments++;
      }
    });

    analyticsData.certificates.forEach(c => {
      const issuedDate = new Date(c.issued_at);
      const dayIndex = last30Days.findIndex(d => 
        issuedDate >= startOfDay(d.fullDate) && issuedDate <= endOfDay(d.fullDate)
      );
      if (dayIndex >= 0) {
        last30Days[dayIndex].certificates++;
      }
    });

    return last30Days;
  }, [analyticsData]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics Overview</h2>
        <p className="text-muted-foreground">Training platform performance metrics</p>
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
              <span className="text-sm text-muted-foreground">Active (7d)</span>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Assessment scores by range</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreDistribution.every(s => s.count === 0) ? (
              <p className="text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={scoreDistribution} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis />
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
          <CardContent>
            {enrollmentsByCourseData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No enrollment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={enrollmentsByCourseData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
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
          <CardContent>
            {passFailData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Certificates Issued */}
        <Card>
          <CardHeader>
            <CardTitle>Certificates Issued</CardTitle>
            <CardDescription>{kpiMetrics?.totalCertificates} total certificates</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.certificates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No certificates issued yet</p>
            ) : (
              <div className="space-y-4 py-4">
                {analyticsData?.courses.map(course => {
                  const count = analyticsData.certificates.filter(c => c.course_id === course.id).length;
                  const enrollmentCount = analyticsData.enrollments.filter(e => e.course_id === course.id).length;
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
            <CardDescription>Enrollments, completions, and certificates in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={completionsOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis />
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
