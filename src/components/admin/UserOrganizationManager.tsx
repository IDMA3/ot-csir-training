import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Users, Building2, Loader2, ArrowRight, UserMinus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithOrg {
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  organization_id: string | null;
  job_role: string | null;
  created_at: string;
  enrolled_courses: number;
}

interface Organization {
  id: string;
  name: string;
  max_users: number | null;
  userCount: number;
}

interface Course {
  id: string;
  title: string;
}

export function UserOrganizationManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState<string>('');
  const [targetCourseIds, setTargetCourseIds] = useState<string[]>([]);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  
  const { isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();

  // Fetch users with organization data
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-with-orgs'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, organization, organization_id, job_role, created_at');
      
      if (profilesError) throw profilesError;

      // Get enrollment counts
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, course_id');

      const enrollmentCounts = new Map<string, number>();
      enrollments?.forEach(e => {
        enrollmentCounts.set(e.user_id, (enrollmentCounts.get(e.user_id) || 0) + 1);
      });

      return profiles.map(p => ({
        ...p,
        enrolled_courses: enrollmentCounts.get(p.id) || 0,
      })) as UserWithOrg[];
    },
  });

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['admin-organizations-list'],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, max_users')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;

      // Get user counts
      const { data: profiles } = await supabase
        .from('profiles')
        .select('organization_id');

      const counts = new Map<string, number>();
      profiles?.forEach(p => {
        if (p.organization_id) {
          counts.set(p.organization_id, (counts.get(p.organization_id) || 0) + 1);
        }
      });

      return orgs.map(o => ({
        ...o,
        userCount: counts.get(o.id) || 0,
      })) as Organization[];
    },
  });

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('id, title')
        .eq('active', true)
        .order('title');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Assign users to organization mutation
  const assignMutation = useMutation({
    mutationFn: async ({ userIds, orgId }: { userIds: string[]; orgId: string | null }) => {
      const org = organizations.find(o => o.id === orgId);
      const orgName = org?.name || null;

      // Check user limit
      if (org && org.max_users) {
        const newTotal = org.userCount + userIds.length;
        if (newTotal > org.max_users) {
          throw new Error(`Organization "${org.name}" has a limit of ${org.max_users} users. Current: ${org.userCount}`);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgId,
          organization: orgName,
        })
        .in('id', userIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-with-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success(`${selectedUsers.length} user(s) assigned to organization`);
      setSelectedUsers([]);
      setAssignDialogOpen(false);
      setTargetOrgId('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove users from organization mutation
  const removeMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null, organization: null })
        .in('id', userIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-with-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success(`${selectedUsers.length} user(s) removed from organization`);
      setSelectedUsers([]);
      setRemoveConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove users: ${error.message}`);
    },
  });

  // Bulk enroll users in courses mutation
  const enrollMutation = useMutation({
    mutationFn: async ({ userIds, courseIds }: { userIds: string[]; courseIds: string[] }) => {
      const enrollments = userIds.flatMap(userId => 
        courseIds.map(courseId => ({
          user_id: userId,
          course_id: courseId,
        }))
      );

      // Use upsert to avoid duplicates
      const { error } = await supabase
        .from('enrollments')
        .upsert(enrollments, { onConflict: 'user_id,course_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-with-orgs'] });
      toast.success(`${selectedUsers.length} user(s) enrolled in ${targetCourseIds.length} course(s)`);
      setSelectedUsers([]);
      setEnrollDialogOpen(false);
      setTargetCourseIds([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to enroll users: ${error.message}`);
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        if (!fullName.includes(query)) return false;
      }
      
      // Organization filter
      if (orgFilter === 'unassigned') {
        return !user.organization_id;
      } else if (orgFilter !== 'all') {
        return user.organization_id === orgFilter;
      }
      
      return true;
    });
  }, [users, searchQuery, orgFilter]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setTargetCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only super admins can manage user organizations.
        </CardContent>
      </Card>
    );
  }

  const unassignedCount = users.filter(u => !u.organization_id).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length - unassignedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Users</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Organization Assignment</CardTitle>
          <CardDescription>
            Select users to assign them to organizations or enroll in courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by org" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="unassigned">Unassigned only</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium self-center">
                {selectedUsers.length} selected
              </span>
              <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                <ArrowRight className="h-4 w-4 mr-1" />
                Assign to Org
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEnrollDialogOpen(true)}>
                <BookOpen className="h-4 w-4 mr-1" />
                Enroll in Courses
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRemoveConfirmOpen(true)}>
                <UserMinus className="h-4 w-4 mr-1" />
                Remove from Org
              </Button>
            </div>
          )}

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleAllUsers}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Job Role</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>
                        {user.organization ? (
                          <Badge variant="secondary">{user.organization}</Badge>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.job_role || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.enrolled_courses}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign to Organization Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Users to Organization</DialogTitle>
            <DialogDescription>
              Select an organization to assign {selectedUsers.length} selected user(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={targetOrgId} onValueChange={setTargetOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                    {org.max_users && (
                      <span className="text-muted-foreground ml-2">
                        ({org.userCount}/{org.max_users})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => assignMutation.mutate({ userIds: selectedUsers, orgId: targetOrgId })}
              disabled={!targetOrgId || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll in Courses Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Users in Courses</DialogTitle>
            <DialogDescription>
              Select courses to enroll {selectedUsers.length} selected user(s)
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {courses.map(course => (
              <label
                key={course.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
              >
                <Checkbox
                  checked={targetCourseIds.includes(course.id)}
                  onCheckedChange={() => toggleCourseSelection(course.id)}
                />
                <span className="text-sm">{course.title}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => enrollMutation.mutate({ userIds: selectedUsers, courseIds: targetCourseIds })}
              disabled={targetCourseIds.length === 0 || enrollMutation.isPending}
            >
              {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enroll in {targetCourseIds.length} Course(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Organization Confirmation */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedUsers.length} user(s) from their current organizations.
              They will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => removeMutation.mutate(selectedUsers)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
