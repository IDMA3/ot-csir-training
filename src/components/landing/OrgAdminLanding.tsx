import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  BookOpen, 
  Award,
  ArrowRight,
  UserPlus,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function OrgAdminLanding() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['org-admin-organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch organization stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['org-admin-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const [usersRes, coursesRes, certsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('organization_courses').select('id', { count: 'exact' }).eq('organization_id', organizationId),
        supabase
          .from('certificates')
          .select('id, user_id')
          .then(async (certsResult) => {
            if (certsResult.error) return { count: 0 };
            // Filter certificates by users in this organization
            const userIds = certsResult.data?.map((c) => c.user_id) || [];
            const uniqueUserIds = [...new Set(userIds)];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', organizationId)
              .in('id', uniqueUserIds);
            return { count: profiles?.length || 0 };
          }),
      ]);

      // Calculate completion rate
      const { data: progressData } = await supabase
        .from('progress')
        .select('user_id, completed')
        .eq('completed', true);

      const orgUserIds = new Set(
        (await supabase.from('profiles').select('id').eq('organization_id', organizationId)).data?.map((p) => p.id) || []
      );
      const completedByOrgUsers = progressData?.filter((p) => orgUserIds.has(p.user_id)).length || 0;
      const totalOrgProgress = progressData?.filter((p) => orgUserIds.has(p.user_id)).length || 1;
      const completionRate = Math.round((completedByOrgUsers / Math.max(totalOrgProgress, 1)) * 100);

      return {
        users: usersRes.count || 0,
        courses: coursesRes.count || 0,
        certificates: certsRes.count || 0,
        completionRate,
      };
    },
    enabled: !!organizationId,
  });

  // Fetch organization courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['org-admin-courses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get assigned courses
      const { data: assignedCourses } = await supabase
        .from('organization_courses')
        .select('course_id')
        .eq('organization_id', organizationId);

      const courseIds = assignedCourses?.map((c) => c.course_id) || [];

      if (courseIds.length === 0) {
        // If no specific assignments, get all active courses created by super admin
        const { data } = await supabase
          .from('course')
          .select('id, title, active, duration_minutes')
          .eq('active', true)
          .is('creator_organization_id', null)
          .order('title')
          .limit(5);
        return data || [];
      }

      const { data } = await supabase
        .from('course')
        .select('id, title, active, duration_minutes')
        .in('id', courseIds)
        .eq('active', true)
        .order('title')
        .limit(5);

      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch recent users
  const { data: recentUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['org-admin-recent-users', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Organization Admin
            </Badge>
          </div>
          {orgLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="text-3xl font-bold text-foreground">{organization?.name}</h1>
          )}
          <p className="text-muted-foreground mt-1">Organization dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.users}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.courses || courses?.length || 0}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.certificates}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completion Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.completionRate}%</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=onboard')}
          >
            <UserPlus className="h-5 w-5" />
            <span>Invite Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=people')}
          >
            <Users className="h-5 w-5" />
            <span>View Reports</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=analytics')}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Courses List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Courses</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=courses')}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Courses available to your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : courses?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No courses assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {courses?.map((course) => (
                    <div
                      key={course.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">{course.title}</span>
                      <Badge variant="outline">{course.duration_minutes} min</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Users</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=people')}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Recently joined users</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentUsers?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
