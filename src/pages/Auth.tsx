import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { SkipLink } from '@/components/SkipLink';
import { Shield, Loader2, Mail, Building2, BookOpen, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_role: string | null;
  organization_id: string | null;
  course_ids: string[] | null;
  status: string;
  expires_at: string;
  token: string;
  organizations: { id: string; name: string } | null;
}

interface CourseInfo {
  id: string;
  title: string;
}

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [activeTab, setActiveTab] = useState('signin');
  
  // Invitation state
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [preEnrollCourses, setPreEnrollCourses] = useState<CourseInfo[]>([]);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const inviteToken = searchParams.get('invite');

  // Fetch invitation data when token is present
  useEffect(() => {
    if (inviteToken) {
      fetchInvitation(inviteToken);
    }
  }, [inviteToken]);

  const fetchInvitation = async (token: string) => {
    setInvitationLoading(true);
    setInvitationError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select(`
          id, email, first_name, last_name, job_role,
          organization_id, course_ids, status, expires_at, token,
          organizations(id, name)
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setInvitationError('Invalid invitation link. Please check the URL or contact support.');
        setInvitationLoading(false);
        return;
      }

      // Check if already accepted
      if (data.status === 'accepted') {
        setInvitationError('This invitation has already been used. Try signing in instead.');
        setInvitationLoading(false);
        return;
      }

      // Check if cancelled
      if (data.status === 'cancelled') {
        setInvitationError('This invitation has been cancelled. Please contact your administrator.');
        setInvitationLoading(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setInvitationError('This invitation has expired. Please contact your administrator for a new one.');
        setInvitationLoading(false);
        return;
      }

      setInvitationData(data as InvitationData);
      setActiveTab('signup'); // Auto-switch to signup tab

      // Fetch course names if there are pre-enrolled courses
      if (data.course_ids && data.course_ids.length > 0) {
        const { data: courses } = await supabase
          .from('course')
          .select('id, title')
          .in('id', data.course_ids);
        
        if (courses) {
          setPreEnrollCourses(courses);
        }
      }
    } catch (err) {
      setInvitationError('Failed to load invitation. Please try again.');
    } finally {
      setInvitationLoading(false);
    }
  };

  // Redirect if already logged in
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/courses';
    navigate(from, { replace: true });
    return null;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signIn(
      formData.get('email') as string,
      formData.get('password') as string
    );
    setIsLoading(false);
    if (error) {
      if (error.message?.includes('Invalid login')) {
        toast({ 
          title: 'Invalid credentials', 
          description: 'Please check your email and password and try again.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
      navigate('/courses');
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate password strength
    if (signupPassword.length < 8) {
      toast({ 
        title: 'Password too short', 
        description: 'Password must be at least 8 characters long.', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const email = invitationData?.email || formData.get('email') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const jobRole = formData.get('job_role') as string;
    const organization = invitationData?.organizations?.name || formData.get('organization') as string;

    const { error, data } = await signUp(
      email,
      signupPassword,
      {
        first_name: firstName,
        last_name: lastName,
        organization: organization || undefined,
        job_role: jobRole || undefined,
      }
    );
    
    if (error) {
      setIsLoading(false);
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      return;
    }

    // If this is an invitation-based signup, complete the invitation
    if (invitationData && data?.user) {
      try {
        const { error: acceptError } = await supabase.functions.invoke('accept-invitation', {
          body: { 
            token: invitationData.token, 
            userId: data.user.id 
          }
        });

        if (acceptError) {
          console.error('Failed to accept invitation:', acceptError);
          // Don't block the signup, just log the error
        }
      } catch (err) {
        console.error('Error calling accept-invitation:', err);
      }
    }

    setIsLoading(false);
    toast({ 
      title: 'Account created!', 
      description: invitationData 
        ? `Welcome to ${invitationData.organizations?.name || 'the training portal'}! Your courses are ready.`
        : 'Welcome to the training portal. Start your first course now.' 
    });
    navigate('/courses');
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('reset_email') as string;
    
    if (!email) {
      toast({ 
        title: 'Email required', 
        description: 'Please enter your email address.', 
        variant: 'destructive' 
      });
      setIsLoading(false);
      return;
    }
    
    const { error } = await resetPassword(email);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'Password reset link has been sent to your inbox.' });
    }
  };

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SkipLink />
      <Card className="w-full max-w-md" id="main-content">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded bg-primary mx-auto flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">SCL OT CSIR Training</CardTitle>
          <CardDescription>Operational Technology Cyber Security Incident Response</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invitation Error Alert */}
          {invitationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{invitationError}</AlertDescription>
            </Alert>
          )}

          {/* Invitation Welcome Banner */}
          {invitationData && !invitationError && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">You've been invited!</span>
              </div>
              
              {invitationData.organizations && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Organization: <strong>{invitationData.organizations.name}</strong></span>
                </div>
              )}
              
              {preEnrollCourses.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span>You'll have access to:</span>
                  </div>
                  <ul className="text-sm ml-6 space-y-1">
                    {preEnrollCourses.map(course => (
                      <li key={course.id} className="text-foreground">• {course.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input 
                    id="signin-email" 
                    name="email" 
                    type="email" 
                    required 
                    autoComplete="email"
                    aria-describedby="signin-email-hint"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input 
                    id="signin-password" 
                    name="password" 
                    type="password" 
                    required 
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign In
                </Button>
              </form>
              <form onSubmit={handleResetPassword} className="mt-4">
                <Label htmlFor="reset-email" className="sr-only">Email for password reset</Label>
                <Input 
                  id="reset-email"
                  name="reset_email" 
                  type="email" 
                  placeholder="Enter email to reset password" 
                  className="mb-2" 
                  autoComplete="email"
                />
                <Button type="submit" variant="link" className="p-0 h-auto" disabled={isLoading}>
                  Forgot password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="first_name" 
                      name="first_name" 
                      required 
                      autoComplete="given-name"
                      aria-required="true"
                      defaultValue={invitationData?.first_name || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="last_name" 
                      name="last_name" 
                      required 
                      autoComplete="family-name"
                      aria-required="true"
                      defaultValue={invitationData?.last_name || ''}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup_email">Email <span className="text-destructive">*</span></Label>
                  <Input 
                    id="signup_email" 
                    name="email" 
                    type="email" 
                    required 
                    autoComplete="email"
                    aria-required="true"
                    defaultValue={invitationData?.email || ''}
                    readOnly={!!invitationData}
                    className={invitationData ? 'bg-muted cursor-not-allowed' : ''}
                  />
                  {invitationData && (
                    <p className="text-xs text-muted-foreground">
                      Email is pre-filled from your invitation
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup_password">Password <span className="text-destructive">*</span></Label>
                  <Input 
                    id="signup_password" 
                    name="password" 
                    type="password" 
                    required 
                    minLength={8}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-describedby="password-requirements"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <PasswordStrengthIndicator password={signupPassword} />
                </div>
                {!invitationData && (
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input 
                      id="organization" 
                      name="organization" 
                      autoComplete="organization"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="job_role">Job Role</Label>
                  <Input 
                    id="job_role" 
                    name="job_role" 
                    autoComplete="organization-title"
                    defaultValue={invitationData?.job_role || ''}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {invitationData ? 'Complete Registration' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
