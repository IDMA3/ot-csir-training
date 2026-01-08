import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { SuperAdminLanding } from '@/components/landing/SuperAdminLanding';
import { OrgAdminLanding } from '@/components/landing/OrgAdminLanding';
import { UserLanding } from '@/components/landing/UserLanding';
import { Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';

function NoOrganizationMessage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Organization Required</CardTitle>
            <CardDescription>
              You need to be assigned to an organization to access training courses.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Please contact your administrator to be assigned to an organization.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Index = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, hasAdminAccess, isLoading: permLoading } = useAdminPermissions();

  // Show loading while checking auth and permissions
  if (authLoading || (user && permLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super Admin - show site admin dashboard
  if (isSuperAdmin) {
    return <SuperAdminLanding />;
  }

  // Org Admin (has admin access but not super admin) - show org dashboard
  if (hasAdminAccess) {
    return <OrgAdminLanding />;
  }

  // User without organization - show message
  if (!profile?.organization_id) {
    return <NoOrganizationMessage />;
  }

  // Regular user with organization - show user dashboard
  return <UserLanding />;
};

export default Index;
