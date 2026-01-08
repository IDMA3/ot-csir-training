import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, CheckCircle, Mail, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

interface Organization {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
}

interface AdminPerms {
  can_view_users: boolean;
  can_manage_users: boolean;
  can_view_courses: boolean;
  can_manage_courses: boolean;
}

const inviteSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  job_role: z.string().trim().optional(),
});

export function SingleUserInvite() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [inviteComplete, setInviteComplete] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Role selection state
  const [invitedRole, setInvitedRole] = useState<string>('learner');
  const [adminPerms, setAdminPerms] = useState<AdminPerms>({
    can_view_users: true,
    can_manage_users: false,
    can_view_courses: true,
    can_manage_courses: false,
  });

  const { isSuperAdmin, organizationScope, canManageUsers } = useAdminPermissions();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch organizations (super admin sees all, org admin sees only their org)
  const { data: organizations = [] } = useQuery({
    queryKey: ['admin-organizations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Organization[];
    },
  });

  // For org admins, get their organization ID
  const { data: orgAdminOrgId } = useQuery({
    queryKey: ['org-admin-org-id', profile?.organization_id],
    queryFn: async () => {
      if (isSuperAdmin || !profile?.organization_id) return null;
      return profile.organization_id;
    },
    enabled: !isSuperAdmin && !!profile?.organization_id,
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

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      // Validate
      const result = inviteSchema.safeParse({ email, first_name: firstName, last_name: lastName, job_role: jobRole });
      if (!result.success) {
        throw new Error(result.error.errors[0].message);
      }

      let orgId: string | null = null;
      
      // Handle new organization creation (super admin only)
      if (isSuperAdmin && selectedOrgId === '__new__' && newOrgName.trim()) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: newOrgName.trim(), active: true })
          .select('id')
          .single();
        
        if (orgError) throw new Error('Failed to create organization: ' + orgError.message);
        orgId = newOrg.id;
      } else if (isSuperAdmin && selectedOrgId && selectedOrgId !== '__new__') {
        orgId = selectedOrgId;
      } else if (!isSuperAdmin && orgAdminOrgId) {
        orgId = orgAdminOrgId;
      }

      const invitation = {
        email: email.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        job_role: jobRole.trim() || null,
        organization_id: orgId,
        course_ids: selectedCourseIds,
        invited_by: user?.id,
        status: 'pending' as const,
        invited_role: invitedRole,
        admin_permissions: invitedRole !== 'learner' ? JSON.parse(JSON.stringify(adminPerms)) : null,
      };

      const { data, error } = await supabase
        .from('user_invitations')
        .insert([invitation])
        .select('id')
        .single();

      if (error) throw error;

      // Send invitation email
      if (data) {
        const appUrl = window.location.origin;
        try {
          const { error: emailError } = await supabase.functions.invoke('send-invitation', {
            body: { invitationIds: [data.id], appUrl },
          });
          if (emailError) {
            console.error('Failed to send invitation email:', emailError);
            toast.warning('Invitation created but email may not have been sent');
          }
        } catch (emailErr) {
          console.error('Error calling send-invitation function:', emailErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invitation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-list'] });
      toast.success('Invitation sent successfully!');
      setInviteComplete(true);
    },
    onError: (error: Error) => {
      setValidationError(error.message);
    },
  });

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setJobRole('');
    setSelectedOrgId('');
    setNewOrgName('');
    setSelectedCourseIds([]);
    setInviteComplete(false);
    setValidationError(null);
    setInvitedRole('learner');
    setAdminPerms({
      can_view_users: true,
      can_manage_users: false,
      can_view_courses: true,
      can_manage_courses: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    createInvitationMutation.mutate();
  };

  const canAccess = isSuperAdmin || canManageUsers;

  if (!canAccess) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          You don't have permission to invite users.
        </CardContent>
      </Card>
    );
  }

  if (inviteComplete) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-xl font-semibold mb-2">Invitation Sent!</h3>
          <p className="text-muted-foreground mb-2">
            An email has been sent to <strong>{email}</strong> with instructions to create their account.
          </p>
          {invitedRole !== 'learner' && (
            <p className="text-sm text-muted-foreground mb-4">
              They will be granted <strong>{invitedRole === 'org_admin' ? 'Organization Admin' : 'Course Creator'}</strong> permissions upon registration.
            </p>
          )}
          <Button onClick={resetForm}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Another User
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get org name for org admins
  const orgAdminOrgName = !isSuperAdmin && profile?.organization_id
    ? organizations.find(o => o.id === profile.organization_id)?.name
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite a User
        </CardTitle>
        <CardDescription>
          Send an email invitation to add a new user to the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Job Role */}
          <div className="space-y-2">
            <Label htmlFor="jobRole">Job Role</Label>
            <Input
              id="jobRole"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g., Safety Officer"
            />
          </div>

          {/* Organization - only for super admins */}
          {isSuperAdmin ? (
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      + Create New Organization
                    </span>
                  </SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* New Organization Name Input */}
              {selectedOrgId === '__new__' && (
                <div className="mt-3">
                  <Label htmlFor="newOrgName">New Organization Name *</Label>
                  <Input
                    id="newOrgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    required={selectedOrgId === '__new__'}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          ) : orgAdminOrgName && (
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input value={orgAdminOrgName} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">
                User will be added to your organization
              </p>
            </div>
          )}

          {/* Role Selection - Super Admin Only */}
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select value={invitedRole} onValueChange={setInvitedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learner">Regular User (Learner)</SelectItem>
                  <SelectItem value="org_admin">Organization Admin</SelectItem>
                  <SelectItem value="course_creator">Course Creator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admin Permission Toggles */}
          {isSuperAdmin && invitedRole !== 'learner' && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Permissions
              </h4>
              <p className="text-sm text-muted-foreground">
                Configure what this {invitedRole === 'org_admin' ? 'Organization Admin' : 'Course Creator'} can access
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={adminPerms.can_view_users} 
                    onCheckedChange={(c) => setAdminPerms({...adminPerms, can_view_users: !!c})}
                  />
                  <span className="text-sm">View Users</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={adminPerms.can_manage_users} 
                    onCheckedChange={(c) => setAdminPerms({...adminPerms, can_manage_users: !!c})}
                  />
                  <span className="text-sm">Manage Users</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={adminPerms.can_view_courses} 
                    onCheckedChange={(c) => setAdminPerms({...adminPerms, can_view_courses: !!c})}
                  />
                  <span className="text-sm">View Courses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={adminPerms.can_manage_courses} 
                    onCheckedChange={(c) => setAdminPerms({...adminPerms, can_manage_courses: !!c})}
                  />
                  <span className="text-sm">Manage Courses</span>
                </label>
              </div>
            </div>
          )}

          {/* Course Selection */}
          {courses.length > 0 && (
            <div className="space-y-2">
              <Label>Auto-enroll in Courses (optional)</Label>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {courses.map(course => (
                  <label
                    key={course.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedCourseIds.includes(course.id)}
                      onCheckedChange={() => toggleCourse(course.id)}
                    />
                    <span className="text-sm">{course.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {validationError}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={!email || createInvitationMutation.isPending || (selectedOrgId === '__new__' && !newOrgName.trim())}
            className="w-full md:w-auto"
          >
            {createInvitationMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
