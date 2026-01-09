import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, Users, Award, TrendingUp, BookOpen, Target, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/csv-export';
import { format } from 'date-fns';

interface OrgMetrics {
  id: string;
  name: string;
  domain: string | null;
  userCount: number;
  maxUsers: number | null;
  enrollments: number;
  completedModules: number;
  totalModuleProgress: number;
  completionRate: number;
  avgScore: number;
  passRate: number;
  certificates: number;
  activeThisMonth: number;
}

export function OrganizationReports() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');

  // Fetch all data needed for organization reports
  const { data, isLoading } = useQuery({
    queryKey: ['organization-reports'],
    queryFn: async () => {
      const [orgsRes, profilesRes, enrollmentsRes, progressRes, attemptsRes, certificatesRes, modulesRes] = await Promise.all([
        supabase.from('organizations').select('id, name, max_users, domain').eq('active', true),
        supabase.from('profiles').select('id, organization_id, organization, created_at'),
        supabase.from('enrollments').select('id, user_id, course_id, enrolled_at'),
        supabase.from('progress').select('id, user_id, module_id, completed, completed_at'),
        supabase.from('attempts').select('id, user_id, module_id, passed, score, submitted_at'),
        supabase.from('certificates').select('id, user_id, course_id, issued_at'),
        supabase.from('modules').select('id, course_id'),
      ]);

      return {
        organizations: orgsRes.data || [],
        profiles: profilesRes.data || [],
        enrollments: enrollmentsRes.data || [],
        progress: progressRes.data || [],
        attempts: attemptsRes.data || [],
        certificates: certificatesRes.data || [],
        modules: modulesRes.data || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate metrics per organization
  const orgMetrics = useMemo(() => {
    if (!data) return [];

    const { organizations, profiles, enrollments, progress, attempts, certificates, modules } = data;

    // Create user to org mapping
    const userOrgMap = new Map<string, string>();
    profiles.forEach(p => {
      if (p.organization_id) {
        userOrgMap.set(p.id, p.organization_id);
      }
    });

    // Calculate last 30 days for "active" users
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics: OrgMetrics[] = organizations.map(org => {
      // Users in this org
      const orgUsers = profiles.filter(p => p.organization_id === org.id);
      const orgUserIds = new Set(orgUsers.map(u => u.id));

      // Enrollments for this org's users
      const orgEnrollments = enrollments.filter(e => orgUserIds.has(e.user_id));

      // Progress for this org's users
      const orgProgress = progress.filter(p => orgUserIds.has(p.user_id));
      const completedProgress = orgProgress.filter(p => p.completed);

      // Calculate completion rate (completed modules / total possible)
      const totalPossible = orgEnrollments.length * (modules.length / Math.max(1, new Set(modules.map(m => m.course_id)).size));
      const completionRate = totalPossible > 0 ? (completedProgress.length / totalPossible) * 100 : 0;

      // Attempts for this org's users
      const orgAttempts = attempts.filter(a => orgUserIds.has(a.user_id));
      const avgScore = orgAttempts.length > 0 
        ? orgAttempts.reduce((sum, a) => sum + Number(a.score), 0) / orgAttempts.length 
        : 0;
      const passRate = orgAttempts.length > 0 
        ? (orgAttempts.filter(a => a.passed).length / orgAttempts.length) * 100 
        : 0;

      // Certificates for this org's users
      const orgCertificates = certificates.filter(c => orgUserIds.has(c.user_id));

      // Active users (any progress or attempt in last 30 days)
      const recentProgress = orgProgress.filter(p => p.completed_at && new Date(p.completed_at) > thirtyDaysAgo);
      const recentAttempts = orgAttempts.filter(a => new Date(a.submitted_at) > thirtyDaysAgo);
      const activeUsers = new Set([
        ...recentProgress.map(p => p.user_id),
        ...recentAttempts.map(a => a.user_id),
      ]);

      return {
        id: org.id,
        name: org.name,
        domain: org.domain,
        userCount: orgUsers.length,
        maxUsers: org.max_users,
        enrollments: orgEnrollments.length,
        completedModules: completedProgress.length,
        totalModuleProgress: orgProgress.length,
        completionRate: Math.min(100, completionRate),
        avgScore,
        passRate,
        certificates: orgCertificates.length,
        activeThisMonth: activeUsers.size,
      };
    });

    return metrics.sort((a, b) => b.userCount - a.userCount);
  }, [data]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (orgMetrics.length === 0) return null;

    const filtered = selectedOrgId === 'all' 
      ? orgMetrics 
      : orgMetrics.filter(o => o.id === selectedOrgId);

    return {
      totalUsers: filtered.reduce((sum, o) => sum + o.userCount, 0),
      totalEnrollments: filtered.reduce((sum, o) => sum + o.enrollments, 0),
      totalCertificates: filtered.reduce((sum, o) => sum + o.certificates, 0),
      avgCompletionRate: filtered.length > 0 
        ? filtered.reduce((sum, o) => sum + o.completionRate, 0) / filtered.length 
        : 0,
      avgPassRate: filtered.length > 0 
        ? filtered.reduce((sum, o) => sum + o.passRate, 0) / filtered.length 
        : 0,
      totalActiveUsers: filtered.reduce((sum, o) => sum + o.activeThisMonth, 0),
    };
  }, [orgMetrics, selectedOrgId]);

  // Chart data - completion rates by org
  const completionChartData = useMemo(() => {
    const filtered = selectedOrgId === 'all' 
      ? orgMetrics.slice(0, 10) 
      : orgMetrics.filter(o => o.id === selectedOrgId);
    
    return filtered.map(org => ({
      name: org.name.length > 15 ? org.name.slice(0, 15) + '...' : org.name,
      fullName: org.name,
      completionRate: Math.round(org.completionRate),
      passRate: Math.round(org.passRate),
      fill: org.completionRate >= 80 ? 'hsl(var(--success))' 
          : org.completionRate >= 50 ? 'hsl(var(--primary))' 
          : 'hsl(var(--warning))',
    }));
  }, [orgMetrics, selectedOrgId]);

  const chartConfig = {
    completionRate: { label: 'Completion Rate', color: 'hsl(var(--primary))' },
    passRate: { label: 'Pass Rate', color: 'hsl(var(--success))' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orgMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No organizations found. Create organizations to see usage reports.
        </CardContent>
      </Card>
    );
  }

  const displayedMetrics = selectedOrgId === 'all' 
    ? orgMetrics 
    : orgMetrics.filter(o => o.id === selectedOrgId);

  const handleExportCSV = () => {
    const selectedOrgName = selectedOrgId === 'all' 
      ? 'all-organizations' 
      : orgMetrics.find(o => o.id === selectedOrgId)?.name || 'organization';
    
    exportToCSV({
      filename: `org-report-${selectedOrgName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`,
      headers: ['Organization', 'Domain', 'Users', 'Max Users', 'Active (30d)', 'Enrollments', 'Modules Completed', 'Completion Rate %', 'Avg Score %', 'Pass Rate %', 'Certificates'],
      rows: displayedMetrics.map(org => [
        org.name,
        org.domain || '',
        org.userCount,
        org.maxUsers || 'Unlimited',
        org.activeThisMonth,
        org.enrollments,
        org.completedModules,
        org.completionRate.toFixed(1),
        org.avgScore.toFixed(1),
        org.passRate.toFixed(1),
        org.certificates,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Organization Reports</h3>
          <p className="text-sm text-muted-foreground">Training metrics by organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {orgMetrics.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Enrollments</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.totalEnrollments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Avg Completion</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.avgCompletionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Pass Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.avgPassRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Certificates</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.totalCertificates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Active (30d)</span>
            </div>
            <p className="text-2xl font-bold mt-2">{summaryStats?.totalActiveUsers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Completion Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Rates by Organization</CardTitle>
            <CardDescription>
              {selectedOrgId === 'all' ? 'Top 10 organizations' : 'Selected organization'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completionChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={completionChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value}%`, name === 'completionRate' ? 'Completion Rate' : 'Pass Rate']}
                  />
                  <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                    {completionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Organization Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Breakdown</CardTitle>
            <CardDescription>Detailed metrics per organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedMetrics.map(org => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[120px]">{org.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.domain ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@{org.domain}</code>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {org.userCount}{org.maxUsers ? `/${org.maxUsers}` : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={org.completionRate} className="w-16 h-2" />
                          <span className="text-sm w-10 text-right">{org.completionRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={org.passRate >= 80 ? 'default' : org.passRate >= 50 ? 'secondary' : 'destructive'}
                        >
                          {org.passRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Organization Metrics</CardTitle>
          <CardDescription>All training data by organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Active (30d)</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                  <TableHead className="text-right">Modules Done</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-right">Certificates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMetrics.map(org => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.domain ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@{org.domain}</code>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {org.userCount}{org.maxUsers ? ` / ${org.maxUsers}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={org.activeThisMonth > 0 ? 'text-success' : 'text-muted-foreground'}>
                        {org.activeThisMonth}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{org.enrollments}</TableCell>
                    <TableCell className="text-right">{org.completedModules}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={org.completionRate >= 80 ? 'default' : org.completionRate >= 50 ? 'secondary' : 'outline'}
                      >
                        {org.completionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{org.avgScore.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={org.passRate >= 80 ? 'default' : org.passRate >= 50 ? 'secondary' : 'destructive'}
                      >
                        {org.passRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{org.certificates}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}