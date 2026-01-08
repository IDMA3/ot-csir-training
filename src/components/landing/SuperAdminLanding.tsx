import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Users, 
  BookOpen, 
  Award,
  ArrowRight,
  UserCog,
  BarChart3,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subYears } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SuperAdminLanding() {
  const navigate = useNavigate();
  const oneYearAgo = subYears(new Date(), 1).toISOString();

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [orgsRes, usersRes, coursesRes, certsRes, adminsRes] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('course').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('certificates').select('id', { count: 'exact' }).gte('issued_at', oneYearAgo),
        supabase.from('admin_permissions').select('id', { count: 'exact' }),
      ]);

      return {
        organizations: orgsRes.count || 0,
        users: usersRes.count || 0,
        courses: coursesRes.count || 0,
        certificatesPastYear: certsRes.count || 0,
        admins: adminsRes.count || 0,
      };
    },
  });

  // Fetch organizations with admin and user counts
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ['super-admin-organizations'],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;

      // Get user counts per organization
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          const [usersRes, adminsRes, coursesRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', org.id),
            supabase.from('admin_permissions').select('user_id').eq('organization_scope', org.id),
            supabase.from('organization_courses').select('id', { count: 'exact' }).eq('organization_id', org.id),
          ]);

          return {
            ...org,
            userCount: usersRes.count || 0,
            adminCount: adminsRes.data?.length || 0,
            courseCount: coursesRes.count || 0,
          };
        })
      );

      return orgsWithCounts;
    },
  });

  // Fetch recent certificates
  const { data: recentCerts, isLoading: certsLoading } = useQuery({
    queryKey: ['super-admin-recent-certs'],
    queryFn: async () => {
      const { data: certs, error } = await supabase
        .from('certificates')
        .select('id, certificate_id, user_id, course_id, issued_at')
        .gte('issued_at', oneYearAgo)
        .order('issued_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Enrich with user and course data
      const enriched = await Promise.all(
        (certs || []).map(async (cert) => {
          const [profileRes, courseRes] = await Promise.all([
            supabase.from('profiles').select('first_name, last_name, organization_id').eq('id', cert.user_id).single(),
            supabase.from('course').select('title').eq('id', cert.course_id).single(),
          ]);

          let orgName = 'Unknown';
          if (profileRes.data?.organization_id) {
            const orgRes = await supabase
              .from('organizations')
              .select('name')
              .eq('id', profileRes.data.organization_id)
              .single();
            orgName = orgRes.data?.name || 'Unknown';
          }

          return {
            ...cert,
            userName: profileRes.data ? `${profileRes.data.first_name} ${profileRes.data.last_name}` : 'Unknown',
            courseName: courseRes.data?.title || 'Unknown',
            organizationName: orgName,
          };
        })
      );

      return enriched;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Site Admin
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Site Administration</h1>
          <p className="text-muted-foreground mt-1">Platform-wide overview and management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.organizations}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Admins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.admins}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
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
              <CardDescription>Active Courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.courses}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Certs (Past Year)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-bold">{stats?.certificatesPastYear}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=organizations')}
          >
            <Building2 className="h-5 w-5" />
            <span>Manage Organizations</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=people')}
          >
            <Users className="h-5 w-5" />
            <span>Manage Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=courses')}
          >
            <BookOpen className="h-5 w-5" />
            <span>Manage Courses</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin?tab=analytics')}
          >
            <BarChart3 className="h-5 w-5" />
            <span>View Analytics</span>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Organizations List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Organizations</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=organizations')}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Active organizations and their stats</CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : organizations?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No organizations found</p>
              ) : (
                <div className="space-y-3">
                  {organizations?.slice(0, 5).map((org) => (
                    <div
                      key={org.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{org.name}</span>
                        <Badge variant="outline">{org.courseCount} courses</Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{org.adminCount} admins</span>
                        <span>{org.userCount} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Certificates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Certificates</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=people')}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Certificates issued in the past year</CardDescription>
            </CardHeader>
            <CardContent>
              {certsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentCerts?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No certificates issued recently</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCerts?.slice(0, 5).map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.userName}</TableCell>
                        <TableCell className="text-muted-foreground">{cert.courseName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(cert.issued_at), 'MMM d, yyyy')}
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
