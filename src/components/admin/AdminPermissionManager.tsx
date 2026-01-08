import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Crown, Shield, BookOpen, Users, Trash2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithPermissions {
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  created_at: string;
  permissions: {
    id: string;
    is_super_admin: boolean;
    can_view_users: boolean;
    can_manage_users: boolean;
    can_view_courses: boolean;
    can_manage_courses: boolean;
    organization_scope: string | null;
  } | null;
}

interface PermissionFormData {
  is_super_admin: boolean;
  can_view_users: boolean;
  can_manage_users: boolean;
  can_view_courses: boolean;
  can_manage_courses: boolean;
  organization_scope: string;
}

export function AdminPermissionManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>({
    is_super_admin: false,
    can_view_users: false,
    can_manage_users: false,
    can_view_courses: false,
    can_manage_courses: false,
    organization_scope: '',
  });
  
  const { user: currentUser } = useAuth();
  const { isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();

  // Fetch all users with their permissions
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-permissions-all'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: permissions, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      return profiles.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        organization: profile.organization,
        created_at: profile.created_at,
        permissions: permissions?.find(p => p.user_id === profile.id) || null,
      })) as UserWithPermissions[];
    },
  });

  // Get unique organizations
  const organizations = [...new Set(users.map(u => u.organization).filter(Boolean))].sort() as string[];

  // Grant/update permissions
  const upsertMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: PermissionFormData }) => {
      const permissionData = {
        user_id: userId,
        is_super_admin: data.is_super_admin,
        can_view_users: data.can_view_users,
        can_manage_users: data.can_manage_users,
        can_view_courses: data.can_view_courses,
        can_manage_courses: data.can_manage_courses,
        organization_scope: data.organization_scope || null,
      };

      const { error } = await supabase
        .from('admin_permissions')
        .upsert(permissionData, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permissions updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update permissions');
      console.error(error);
    },
  });

  // Revoke all permissions
  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permissions revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke permissions');
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      is_super_admin: false,
      can_view_users: false,
      can_manage_users: false,
      can_view_courses: false,
      can_manage_courses: false,
      organization_scope: '',
    });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user: UserWithPermissions) => {
    setEditingUser(user);
    setFormData({
      is_super_admin: user.permissions?.is_super_admin ?? false,
      can_view_users: user.permissions?.can_view_users ?? false,
      can_manage_users: user.permissions?.can_manage_users ?? false,
      can_view_courses: user.permissions?.can_view_courses ?? false,
      can_manage_courses: user.permissions?.can_manage_courses ?? false,
      organization_scope: user.permissions?.organization_scope ?? user.organization ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleGrantNew = (user: UserWithPermissions) => {
    setEditingUser(user);
    setFormData({
      is_super_admin: false,
      can_view_users: false,
      can_manage_users: false,
      can_view_courses: false,
      can_manage_courses: false,
      organization_scope: user.organization ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!editingUser) return;
    upsertMutation.mutate({ userId: editingUser.id, data: formData });
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(query) ||
      u.last_name.toLowerCase().includes(query) ||
      u.organization?.toLowerCase().includes(query)
    );
  });

  const usersWithPermissions = filteredUsers.filter(u => u.permissions);
  const usersWithoutPermissions = filteredUsers.filter(u => !u.permissions);

  const getPermissionBadges = (user: UserWithPermissions) => {
    if (!user.permissions) return null;
    const badges = [];
    
    if (user.permissions.is_super_admin) {
      badges.push(
        <Badge key="super" variant="default" className="bg-amber-500 hover:bg-amber-600">
          <Crown className="h-3 w-3 mr-1" /> Super Admin
        </Badge>
      );
    }
    if (user.permissions.can_view_users || user.permissions.can_manage_users) {
      badges.push(
        <Badge key="users" variant="secondary">
          <Users className="h-3 w-3 mr-1" /> 
          {user.permissions.can_manage_users ? 'User Manager' : 'User Viewer'}
        </Badge>
      );
    }
    if (user.permissions.can_view_courses || user.permissions.can_manage_courses) {
      badges.push(
        <Badge key="courses" variant="outline">
          <BookOpen className="h-3 w-3 mr-1" />
          {user.permissions.can_manage_courses ? 'Course Creator' : 'Course Viewer'}
        </Badge>
      );
    }
    
    return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only super admins can manage permissions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.permissions?.is_super_admin).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organization Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.permissions && !u.permissions.is_super_admin && (u.permissions.can_view_users || u.permissions.can_manage_users)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Course Creators</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.permissions && !u.permissions.is_super_admin && u.permissions.can_manage_courses).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users with permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Permissions</CardTitle>
          <CardDescription>Manage granular admin access for users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : usersWithPermissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users with admin permissions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithPermissions.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.organization || '-'}</TableCell>
                    <TableCell>{getPermissionBadges(user)}</TableCell>
                    <TableCell>
                      {user.permissions?.is_super_admin ? (
                        <Badge variant="outline">All Organizations</Badge>
                      ) : (
                        user.permissions?.organization_scope || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id === currentUser?.id ? (
                        <span className="text-sm text-muted-foreground">Current user</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke All Permissions?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.first_name} {user.last_name} will lose all admin access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeMutation.mutate(user.id)}>
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users without permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Grant New Permissions</CardTitle>
          <CardDescription>Users without admin access</CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithoutPermissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              All users have been configured
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithoutPermissions.slice(0, 10).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.organization || '-'}</TableCell>
                    <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleGrantNew(user)}>
                        <Plus className="h-4 w-4 mr-1" /> Grant Access
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {usersWithoutPermissions.length > 10 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 10 of {usersWithoutPermissions.length} users. Use search to find specific users.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Permission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser?.permissions ? 'Edit Permissions' : 'Grant Permissions'}
            </DialogTitle>
            <DialogDescription>
              Configure admin access for {editingUser?.first_name} {editingUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Super Admin Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium">Super Admin</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full access to all features across all organizations
                </p>
              </div>
              <Switch
                checked={formData.is_super_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, is_super_admin: checked })}
              />
            </div>

            {!formData.is_super_admin && (
              <>
                {/* Organization Scope */}
                <div className="space-y-2">
                  <Label>Organization Scope</Label>
                  <Select
                    value={formData.organization_scope}
                    onValueChange={(value) => setFormData({ ...formData, organization_scope: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org} value={org}>{org}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This user will only see data from this organization
                  </p>
                </div>

                {/* User Permissions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> User Permissions
                  </Label>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="view-users"
                        checked={formData.can_view_users}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_view_users: checked })}
                      />
                      <Label htmlFor="view-users" className="text-sm">View users from their organization</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="manage-users"
                        checked={formData.can_manage_users}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_manage_users: checked })}
                      />
                      <Label htmlFor="manage-users" className="text-sm">Manage users from their organization</Label>
                    </div>
                  </div>
                </div>

                {/* Course Permissions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Course Permissions
                  </Label>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="view-courses"
                        checked={formData.can_view_courses}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_view_courses: checked })}
                      />
                      <Label htmlFor="view-courses" className="text-sm">View courses</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="manage-courses"
                        checked={formData.can_manage_courses}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_manage_courses: checked })}
                      />
                      <Label htmlFor="manage-courses" className="text-sm">Create and manage courses for their organization</Label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
