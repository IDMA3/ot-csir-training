import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Button } from '@/components/ui/button';
import { SkipLink } from '@/components/SkipLink';
import { Shield, BookOpen, Award, Clock, CheckCircle, Users, GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      
      {/* Hero */}
      <div className="gradient-primary text-primary-foreground py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-xl bg-white/20 mx-auto flex items-center justify-center mb-6">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            SCL OT CSIR Training
          </h1>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Operational Technology Cyber Security Incident Response micro-training for Seattle City Light personnel
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to={user ? '/courses' : '/auth'}>
              {user ? 'Browse Courses' : 'Get Started'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Dynamic Stats */}
      <div className="container max-w-5xl mx-auto py-16 px-4" id="main-content">
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{stats?.totalCourses || 0}</p>
            )}
            <p className="text-sm text-muted-foreground">Courses Available</p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-full bg-accent/10 mx-auto mb-3 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{stats?.totalLearners || 0}</p>
            )}
            <p className="text-sm text-muted-foreground">Learners Trained</p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-full bg-success/10 mx-auto mb-3 flex items-center justify-center">
              <Award className="w-6 h-6 text-success" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{stats?.certificatesIssued || 0}</p>
            )}
            <p className="text-sm text-muted-foreground">Certificates Issued</p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-full bg-warning/10 mx-auto mb-3 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{stats?.averageCourseDuration || 15}</p>
            )}
            <p className="text-sm text-muted-foreground">Avg. Minutes</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <Clock className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Self-Paced Learning</h3>
            <p className="text-muted-foreground">Micro-training designed for busy professionals with flexible scheduling</p>
          </div>
          <div className="text-center p-6">
            <GraduationCap className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Interactive Modules</h3>
            <p className="text-muted-foreground">Comprehensive coverage with quizzes and assessments</p>
          </div>
          <div className="text-center p-6">
            <Award className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Verifiable Certificates</h3>
            <p className="text-muted-foreground">Earn certificates upon completion with unique verification IDs</p>
          </div>
        </div>

        {/* Topics */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">What You'll Learn</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              'CSIR purpose and goals',
              'Event vs Incident classifications',
              'Severity and reportability concepts',
              'Six-phase CSIR workflow',
              'Evidence preservation best practices',
              'Roles and communications',
              'Regulatory reporting timelines',
              'Documentation requirements',
            ].map((topic, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Button asChild size="lg">
            <Link to={user ? '/courses' : '/auth'}>
              {user ? 'Browse Courses' : 'Start Training Now'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Seattle City Light OT CSIR Training</p>
        <Link to="/verify" className="text-primary hover:underline mt-2 inline-block">
          Verify a Certificate
        </Link>
      </footer>
    </div>
  );
};

export default Index;
