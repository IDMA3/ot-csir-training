import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserPlus, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';

interface Course {
  id: string;
  title: string;
  active: boolean;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  organization_id: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export function CourseAssignment() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAdminPermissions();
  const { profile: currentUserProfile } = useAuth();
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [bulkRemoveCourse, setBulkRemoveCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);

  // Fetch courses - filtered for org admins
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses-for-assignment', isSuperAdmin, currentUserProfile?.organization_id],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Super admin sees all courses
        const { data, error } = await supabase
          .from('course')
          .select('id, title, active')
          .order('title');
        if (error) throw error;
        return data as Course[];
      } else if (currentUserProfile?.organization_id) {
        // Org admin sees assigned courses + courses created by their org
        const { data: orgCourses } = await supabase
          .from('organization_courses')
          .select('course_id')
          .eq('organization_id', currentUserProfile.organization_id);
        
        const assignedIds = orgCourses?.map(oc => oc.course_id) || [];
        
        // Build query - either creator org matches OR in assigned list
        let query = supabase
          .from('course')
          .select('id, title, active')
          .order('title');
        
        if (assignedIds.length > 0) {
          query = query.or(`creator_organization_id.eq.${currentUserProfile.organization_id},id.in.(${assignedIds.join(',')})`);
        } else {
          query = query.eq('creator_organization_id', currentUserProfile.organization_id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data as Course[];
      }
      return [];
    },
  });

  // Fetch profiles - filtered for org admins
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-assignment', isSuperAdmin, currentUserProfile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, organization, organization_id')
        .order('last_name');
      
      // Org admins only see their org's users
      if (!isSuperAdmin && currentUserProfile?.organization_id) {
        query = query.eq('organization_id', currentUserProfile.organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, enrolled_at');
      if (error) throw error;
      return data as Enrollment[];
    },
  });

  // Filter profiles by search
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter(p => 
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(query) ||
      (p.organization?.toLowerCase().includes(query) ?? false)
    );
  }, [profiles, searchQuery]);

  // Get enrolled course IDs for a user
  const getUserEnrollments = (userId: string) => {
    return enrollments
      .filter(e => e.user_id === userId)
      .map(e => e.course_id);
  };

  // Get users enrolled in the bulk remove course from the selected users
  const usersToRemove = useMemo(() => {
    if (!bulkRemoveCourse || selectedUsers.length === 0) return [];
    return selectedUsers.filter(userId => 
      enrollments.some(e => e.user_id === userId && e.course_id === bulkRemoveCourse)
    );
  }, [bulkRemoveCourse, selectedUsers, enrollments]);

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ userIds, courseId }: { userIds: string[]; courseId: string }) => {
      const existingEnrollments = enrollments
        .filter(e => e.course_id === courseId)
        .map(e => e.user_id);
      
      const usersToEnroll = userIds.filter(uid => !existingEnrollments.includes(uid));
      
      if (usersToEnroll.length === 0) {
        throw new Error('All selected users are already enrolled in this course');
      }

      const { error } = await supabase
        .from('enrollments')
        .insert(usersToEnroll.map(user_id => ({ user_id, course_id: courseId })));
      
      if (error) throw error;
      return usersToEnroll.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success(`Assigned course to ${count} user${count !== 1 ? 's' : ''}`);
      setSelectedUsers([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unassign single user mutation
  const unassignMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('User removed from course');
    },
    onError: () => {
      toast.error('Failed to remove user from course');
    },
  });

  // Bulk unassign mutation
  const bulkUnassignMutation = useMutation({
    mutationFn: async ({ userIds, courseId }: { userIds: string[]; courseId: string }) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId)
        .in('user_id', userIds);
      
      if (error) throw error;
      return userIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success(`Removed ${count} user${count !== 1 ? 's' : ''} from course`);
      setSelectedUsers([]);
      setBulkRemoveCourse('');
      setShowBulkRemoveDialog(false);
    },
    onError: () => {
      toast.error('Failed to remove users from course');
    },
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredProfiles.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredProfiles.map(p => p.id));
    }
  };

  const handleAssign = () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    assignMutation.mutate({ userIds: selectedUsers, courseId: selectedCourse });
  };

  const handleBulkRemove = () => {
    if (!bulkRemoveCourse) {
      toast.error('Please select a course to remove users from');
      return;
    }
    if (usersToRemove.length === 0) {
      toast.error('No selected users are enrolled in this course');
      return;
    }
    setShowBulkRemoveDialog(true);
  };

  const confirmBulkRemove = () => {
    bulkUnassignMutation.mutate({ userIds: usersToRemove, courseId: bulkRemoveCourse });
  };

  const allSelected = filteredProfiles.length > 0 && selectedUsers.length === filteredProfiles.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < filteredProfiles.length;
  const selectedCourseName = courses.find(c => c.id === bulkRemoveCourse)?.title;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isSuperAdmin ? 'Bulk Enrollment Management' : 'Enroll Users in Courses'}
        </CardTitle>
        <CardDescription>
          {isSuperAdmin 
            ? 'Assign or remove any learners from any courses'
            : 'Manage course enrollments for your organization'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Assignment Controls */}
        <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select course to assign" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {!course.active && ' (Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAssign}
              disabled={!selectedCourse || selectedUsers.length === 0 || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Assign {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <Select value={bulkRemoveCourse} onValueChange={setBulkRemoveCourse}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select course to remove from" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {!course.active && ' (Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="destructive"
              onClick={handleBulkRemove}
              disabled={!bulkRemoveCourse || usersToRemove.length === 0 || bulkUnassignMutation.isPending}
            >
              {bulkUnassignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Remove {usersToRemove.length} user{usersToRemove.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Enrolled Courses</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map(profile => {
                  const userEnrollments = getUserEnrollments(profile.id);
                  const enrolledCourses = courses.filter(c => userEnrollments.includes(c.id));
                  
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(profile.id)}
                          onCheckedChange={() => toggleUser(profile.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {profile.first_name} {profile.last_name}
                      </TableCell>
                      <TableCell>{profile.organization || '-'}</TableCell>
                      <TableCell>
                        {enrolledCourses.length === 0 ? (
                          <span className="text-muted-foreground">Not enrolled</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {enrolledCourses.map(course => (
                              <Badge 
                                key={course.id} 
                                variant="secondary" 
                                className="text-xs flex items-center gap-1"
                              >
                                {course.title}
                                <button
                                  onClick={() => unassignMutation.mutate({ 
                                    userId: profile.id, 
                                    courseId: course.id 
                                  })}
                                  className="ml-1 hover:text-destructive"
                                  title="Remove from course"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {selectedCourse && !userEnrollments.includes(selectedCourse) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => assignMutation.mutate({ 
                              userIds: [profile.id], 
                              courseId: selectedCourse 
                            })}
                            disabled={assignMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Bulk Remove Confirmation Dialog */}
      <AlertDialog open={showBulkRemoveDialog} onOpenChange={setShowBulkRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Users from Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {usersToRemove.length} user{usersToRemove.length !== 1 ? 's' : ''} from <strong>"{selectedCourseName}"</strong>? 
              This will unenroll them from the course and remove their progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkUnassignMutation.isPending}
            >
              {bulkUnassignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
