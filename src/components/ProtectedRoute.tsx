import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOrganization?: boolean;
}

function NoOrganizationMessage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
  );
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireOrganization = false,
}: ProtectedRouteProps) {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasAdminAccess, isLoading: permissionsLoading } = useAdminPermissions();
  const location = useLocation();

  const isLoading = authLoading || (requireAdmin && permissionsLoading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check organization requirement for course-related routes
  if (requireOrganization && !profile?.organization_id) {
    return <NoOrganizationMessage />;
  }

  return <>{children}</>;
}
