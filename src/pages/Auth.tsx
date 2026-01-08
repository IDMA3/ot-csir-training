import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { SkipLink } from '@/components/SkipLink';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

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
    const { error } = await signUp(
      formData.get('email') as string,
      signupPassword,
      {
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        organization: formData.get('organization') as string || undefined,
        job_role: formData.get('job_role') as string || undefined,
      }
    );
    setIsLoading(false);
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Account created!', 
        description: 'Welcome to the training portal. Start your first course now.' 
      });
      navigate('/courses');
    }
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
          <Tabs defaultValue="signin">
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
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input 
                    id="organization" 
                    name="organization" 
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_role">Job Role</Label>
                  <Input 
                    id="job_role" 
                    name="job_role" 
                    autoComplete="organization-title"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
