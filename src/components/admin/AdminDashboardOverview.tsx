import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, BookOpen, Award, UserPlus, PlusCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface AdminDashboardOverviewProps {
  onNavigate: (tab: string, subtab?: string) => void;
}

export function AdminDashboardOverview({ onNavigate }: AdminDashboardOverviewProps) {
  // Fetch overview stats
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: async () => {
      const [profiles, orgs, courses, certificates, recentProfiles] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('course').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, first_name, last_name, organization, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      return {
        totalUsers: profiles.count || 0,
        activeOrganizations: orgs.count || 0,
        activeCourses: courses.count || 0,
        certificatesIssued: certificates.count || 0,
        recentSignups: recentProfiles.data || [],
      };
    },
  });

  // Fetch recent certificates
  const { data: recentCertificates = [] } = useQuery({
    queryKey: ['admin-recent-certificates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_id,
          issued_at,
          course_id,
          user_id
        `)
        .order('issued_at', { ascending: false })
        .limit(5);

      if (!data) return [];

      // Get user names
      const userIds = data.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      // Get course names
      const courseIds = data.map(c => c.course_id);
      const { data: courses } = await supabase
        .from('course')
        .select('id, title')
        .in('id', courseIds);

      return data.map(cert => ({
        ...cert,
        userName: profiles?.find(p => p.id === cert.user_id)
          ? `${profiles.find(p => p.id === cert.user_id)?.first_name} ${profiles.find(p => p.id === cert.user_id)?.last_name}`
          : 'Unknown',
        courseName: courses?.find(c => c.id === cert.course_id)?.title || 'Unknown Course',
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('people')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered learners</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('organizations')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('courses')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeCourses || 0}</div>
            <p className="text-xs text-muted-foreground">Active courses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.certificatesIssued || 0}</div>
            <p className="text-xs text-muted-foreground">Issued to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate('onboard')} variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Users
            </Button>
            <Button onClick={() => onNavigate('people')} variant="outline">
              <Users className="h-4 w-4 mr-2" />
              View People
            </Button>
            <Button onClick={() => onNavigate('courses')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Manage Courses
            </Button>
            <Button onClick={() => onNavigate('organizations')} variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Organizations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Signups</CardTitle>
              <CardDescription>Latest user registrations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('people')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recentSignups && stats.recentSignups.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSignups.map((profile: any) => (
                  <div key={profile.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                      <p className="text-xs text-muted-foreground">{profile.organization || 'No organization'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(profile.created_at), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent signups</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Certificates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Certificates</CardTitle>
              <CardDescription>Latest certifications earned</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('people')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentCertificates.length > 0 ? (
              <div className="space-y-3">
                {recentCertificates.map((cert: any) => (
                  <div key={cert.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{cert.userName}</p>
                      <p className="text-xs text-muted-foreground">{cert.courseName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(cert.issued_at), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No certificates issued yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
