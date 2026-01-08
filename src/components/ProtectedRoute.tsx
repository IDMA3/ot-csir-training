import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
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

  return <>{children}</>;
}
