import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

export function AnalyticsDashboard() {
  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      // Parallel fetch all required data
      const [coursesRes, enrollmentsRes, progressRes, attemptsRes, certificatesRes] = await Promise.all([
        supabase.from('course').select('id, title'),
        supabase.from('enrollments').select('id, course_id, enrolled_at'),
        supabase.from('progress').select('id, module_id, completed, completed_at'),
        supabase.from('attempts').select('id, module_id, passed, score, submitted_at'),
        supabase.from('certificates').select('id, course_id, issued_at'),
      ]);

      return {
        courses: coursesRes.data || [],
        enrollments: enrollmentsRes.data || [],
        progress: progressRes.data || [],
        attempts: attemptsRes.data || [],
        certificates: certificatesRes.data || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Enrollments by course
  const enrollmentsByCoursaData = useMemo(() => {
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

    return last30Days;
  }, [analyticsData]);

  const chartConfig = {
    completions: {
      label: 'Completions',
      color: 'hsl(var(--success))',
    },
    enrollments: {
      label: 'Enrollments',
      color: 'hsl(var(--primary))',
    },
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Enrollments by Course */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Course</CardTitle>
            <CardDescription>Top 5 courses by enrollment count</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsByCoursaData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No enrollment data available</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentsByCoursaData} layout="vertical" margin={{ left: 20, right: 20 }}>
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
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pass/Fail Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Results</CardTitle>
            <CardDescription>Overall pass/fail rates for all assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {passFailData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
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
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>Enrollments and module completions in the last 30 days</CardDescription>
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
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
