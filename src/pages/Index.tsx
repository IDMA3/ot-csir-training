import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, BookOpen, Award, Clock, CheckCircle } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
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
            <Link to={user ? '/dashboard' : '/auth'}>
              {user ? 'Continue Training' : 'Get Started'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="container max-w-5xl mx-auto py-16 px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <Clock className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">15 Minutes</h3>
            <p className="text-muted-foreground">Self-paced micro-training designed for busy professionals</p>
          </div>
          <div className="text-center p-6">
            <BookOpen className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">6 Modules + Exam</h3>
            <p className="text-muted-foreground">Comprehensive coverage of CSIR fundamentals with quizzes</p>
          </div>
          <div className="text-center p-6">
            <Award className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Certificate</h3>
            <p className="text-muted-foreground">Earn a verifiable certificate upon completion</p>
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
            <Link to={user ? '/dashboard' : '/auth'}>
              {user ? 'Continue Training' : 'Start Training Now'}
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
