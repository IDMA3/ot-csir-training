import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationCourses } from '@/hooks/useOrganizationCourses';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Award,
  ArrowRight,
  Download,
  Clock,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function UserLanding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Fetch organization details
  const { data: organization } = useQuery({
    queryKey: ['user-organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch courses with progress
  const { data: courses, isLoading: coursesLoading } = useOrganizationCourses();

  // Fetch user certificates
  const { data: certificates, isLoading: certsLoading } = useQuery({
    queryKey: ['user-certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: certs, error } = await supabase
        .from('certificates')
        .select('id, certificate_id, course_id, issued_at')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      // Enrich with course data
      const enriched = await Promise.all(
        (certs || []).map(async (cert) => {
          const { data: course } = await supabase
            .from('course')
            .select('title')
            .eq('id', cert.course_id)
            .single();

          return {
            ...cert,
            courseName: course?.title || 'Unknown Course',
          };
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const stats = {
    available: courses?.length || 0,
    inProgress: courses?.filter((c) => c.progress_percentage > 0 && c.progress_percentage < 100).length || 0,
    completed: courses?.filter((c) => c.progress_percentage === 100).length || 0,
    certificates: certificates?.length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.first_name}
          </h1>
          {organization && (
            <p className="text-muted-foreground mt-1">{organization.name}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.available}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.completed}</span>
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
                <span className="text-2xl font-bold">{stats.certificates}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* My Courses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Courses</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Your training courses</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : courses?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No courses available</p>
              ) : (
                <div className="space-y-4">
                  {courses?.slice(0, 4).map((course) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{course.title}</span>
                        {course.progress_percentage === 100 ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : course.progress_percentage > 0 ? (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Start
                          </Badge>
                        )}
                      </div>
                      <Progress value={course.progress_percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {course.progress_percentage}% complete • {course.duration_minutes} min
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Certificates */}
          <Card>
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>Your earned certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {certsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : certificates?.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No certificates earned yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete a course to earn your first certificate
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates?.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 rounded-lg border bg-card flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{cert.courseName}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued {format(new Date(cert.issued_at), 'MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {cert.certificate_id}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Find the course to navigate to certificate page
                          const course = courses?.find((c) => c.id === cert.course_id);
                          if (course) {
                            navigate(`/courses/${course.id}/certificate`);
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
