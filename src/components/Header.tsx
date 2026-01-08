import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkipLink } from '@/components/SkipLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, LogOut, BookOpen, Settings, Home } from 'lucide-react';

export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { isSuperAdmin, hasAdminAccess } = useAdminPermissions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  // Determine role badge
  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return <Badge variant="secondary" className="bg-primary/10 text-primary">Site Admin</Badge>;
    }
    if (hasAdminAccess) {
      return <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>;
    }
    return null;
  };

  return (
    <>
      <SkipLink />
      <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 focus-ring rounded-md">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">
              Training Portal
            </span>
          </Link>
          {getRoleBadge()}
        </div>

        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {user && (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex focus-ring">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex focus-ring">
                <Link to="/courses">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Courses
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative focus-ring"
                    aria-label="User menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{profile?.first_name} {profile?.last_name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link to="/">
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link to="/courses">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Courses
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          {!user && (
            <Button asChild className="focus-ring">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </nav>
      </header>
    </>
  );
}
