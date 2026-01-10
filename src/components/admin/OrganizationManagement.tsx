import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Building2, Users, Loader2, Settings, Upload, X, Palette, BookOpen, RefreshCw, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RecertificationSettings } from './RecertificationSettings';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  max_users: number | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationWithStats extends Organization {
  userCount: number;
  allowedCourseIds: string[];
}

interface Course {
  id: string;
  title: string;
}

interface FormData {
  name: string;
  description: string;
  domain: string;
  active: boolean;
  logo_url: string;
  primary_color: string;
  max_users: string;
  allowedCourseIds: string[];
}

interface OrganizationManagementProps {
  onNavigateToPeople?: (organizationName: string) => void;
}

export function OrganizationManagement({ onNavigateToPeople }: OrganizationManagementProps = {}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationWithStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    domain: '',
    active: true,
    logo_url: '',
    primary_color: '#3b82f6',
    max_users: '',
    allowedCourseIds: [],
  });
  
  const { isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch organizations with user counts and allowed courses
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;

      // Get user counts per organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('organization');

      if (profilesError) throw profilesError;

      // Get organization courses
      const { data: orgCourses, error: orgCoursesError } = await supabase
        .from('organization_courses')
        .select('organization_id, course_id');

      if (orgCoursesError) throw orgCoursesError;

      const orgCounts = new Map<string, number>();
      profiles?.forEach(p => {
        if (p.organization) {
          orgCounts.set(p.organization, (orgCounts.get(p.organization) || 0) + 1);
        }
      });

      const orgCourseMap = new Map<string, string[]>();
      orgCourses?.forEach(oc => {
        const existing = orgCourseMap.get(oc.organization_id) || [];
        existing.push(oc.course_id);
        orgCourseMap.set(oc.organization_id, existing);
      });

      return orgs.map(org => ({
        ...org,
        userCount: orgCounts.get(org.name) || 0,
        allowedCourseIds: orgCourseMap.get(org.id) || [],
      })) as OrganizationWithStats[];
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploaded');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Create organization
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: newOrg, error } = await supabase.from('organizations').insert({
        name: data.name.trim(),
        description: data.description.trim() || null,
        domain: data.domain.trim().toLowerCase() || null,
        active: data.active,
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || null,
        max_users: data.max_users ? parseInt(data.max_users) : null,
      }).select().single();
      
      if (error) throw error;

      // Add allowed courses
      if (data.allowedCourseIds.length > 0) {
        const { error: coursesError } = await supabase
          .from('organization_courses')
          .insert(data.allowedCourseIds.map(courseId => ({
            organization_id: newOrg.id,
            course_id: courseId,
          })));
        if (coursesError) throw coursesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('Organization created');
      resetForm();
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('An organization with this name already exists');
      } else {
        toast.error(`Failed to create organization: ${error.message}`);
      }
    },
  });

  // Update organization
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null,
          domain: data.domain.trim().toLowerCase() || null,
          active: data.active,
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || null,
          max_users: data.max_users ? parseInt(data.max_users) : null,
        })
        .eq('id', id);
      if (error) throw error;

      // Update allowed courses - delete existing and insert new
      await supabase.from('organization_courses').delete().eq('organization_id', id);
      
      if (data.allowedCourseIds.length > 0) {
        const { error: coursesError } = await supabase
          .from('organization_courses')
          .insert(data.allowedCourseIds.map(courseId => ({
            organization_id: id,
            course_id: courseId,
          })));
        if (coursesError) throw coursesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('Organization updated');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });

  // Delete organization
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('Organization deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete organization: ${error.message}`);
    },
  });

  // Toggle organization status inline
  const toggleOrgStatus = async (orgId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ active })
        .eq('id', orgId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success(`Organization ${active ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  // Filter organizations based on search and status
  const filteredOrganizations = organizations.filter(org => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!org.name.toLowerCase().includes(query) && 
          !(org.domain?.toLowerCase().includes(query)) &&
          !(org.description?.toLowerCase().includes(query))) {
        return false;
      }
    }
    if (statusFilter === 'active' && !org.active) return false;
    if (statusFilter === 'inactive' && org.active) return false;
    return true;
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      domain: '',
      active: true,
      logo_url: '',
      primary_color: '#3b82f6',
      max_users: '',
      allowedCourseIds: [],
    });
    setEditingOrg(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (org: OrganizationWithStats) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
      domain: org.domain || '',
      active: org.active,
      logo_url: org.logo_url || '',
      primary_color: org.primary_color || '#3b82f6',
      max_users: org.max_users?.toString() || '',
      allowedCourseIds: org.allowedCourseIds,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedCourseIds: prev.allowedCourseIds.includes(courseId)
        ? prev.allowedCourseIds.filter(id => id !== courseId)
        : [...prev.allowedCourseIds, courseId],
    }));
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only super admins can manage organizations.
        </CardContent>
      </Card>
    );
  }

  const activeOrgs = organizations.filter(o => o.active).length;
  const totalUsers = organizations.reduce((sum, o) => sum + o.userCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage organizations with branding, course access, and user limits</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
                    <DialogDescription>
                      {editingOrg ? 'Update organization settings' : 'Add a new organization with custom settings'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="general" className="mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="branding">Branding</TabsTrigger>
                      <TabsTrigger value="courses">Courses</TabsTrigger>
                      <TabsTrigger value="recertification" disabled={!editingOrg}>Recertification</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Acme Corporation"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of the organization"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="domain">Email Domain</Label>
                        <Input
                          id="domain"
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
                          placeholder="e.g., acme.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          Users signing up with this email domain will be auto-assigned to this organization
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_users">User Limit</Label>
                        <Input
                          id="max_users"
                          type="number"
                          min={0}
                          value={formData.max_users}
                          onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                          placeholder="Leave empty for unlimited"
                        />
                        <p className="text-xs text-muted-foreground">Maximum number of users allowed in this organization</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="active"
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                        <Label htmlFor="active">Organization is active</Label>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="branding" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Organization Logo</Label>
                        <div className="flex items-center gap-4">
                          {formData.logo_url ? (
                            <div className="relative">
                              <img 
                                src={formData.logo_url} 
                                alt="Logo preview" 
                                className="h-16 w-16 object-contain rounded border"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground"
                                onClick={() => setFormData({ ...formData, logo_url: '' })}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                              <Building2 className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              {uploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Upload Logo
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">Max 2MB, PNG or JPG</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="primary_color" className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Primary Color
                        </Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="primary_color"
                            value={formData.primary_color}
                            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                            className="h-10 w-14 rounded border cursor-pointer"
                          />
                          <Input
                            value={formData.primary_color}
                            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                            className="w-28"
                            placeholder="#3b82f6"
                          />
                          <div 
                            className="h-10 flex-1 rounded flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: formData.primary_color }}
                          >
                            Preview
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="courses" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Allowed Courses
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Select which courses users from this organization can access. 
                          Leave all unchecked to allow access to all courses.
                        </p>
                      </div>
                      <div className="border rounded-lg max-h-64 overflow-y-auto">
                        {courses.length === 0 ? (
                          <p className="text-center py-4 text-muted-foreground">No courses available</p>
                        ) : (
                          <div className="divide-y">
                            {courses.map((course) => (
                              <label 
                                key={course.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={formData.allowedCourseIds.includes(course.id)}
                                  onCheckedChange={() => toggleCourse(course.id)}
                                />
                                <span className="text-sm">{course.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {formData.allowedCourseIds.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formData.allowedCourseIds.length} course{formData.allowedCourseIds.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="recertification" className="mt-4">
                      {editingOrg && (
                        <RecertificationSettings 
                          organizationId={editingOrg.id} 
                          organizationName={editingOrg.name}
                        />
                      )}
                    </TabsContent>
                  </Tabs>

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingOrg ? 'Save Changes' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery || statusFilter !== 'all' ? 'No organizations match your filters.' : 'No organizations yet. Create your first organization to get started.'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img 
                            src={org.logo_url} 
                            alt={org.name} 
                            className="h-8 w-8 object-contain rounded"
                          />
                        ) : (
                          <div 
                            className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: org.primary_color || '#3b82f6' }}
                          >
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{org.name}</p>
                          {org.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{org.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.domain ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">@{org.domain}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="secondary" 
                          className={onNavigateToPeople ? "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" : ""}
                          onClick={() => onNavigateToPeople?.(org.name)}
                        >
                          {org.userCount}
                        </Badge>
                        {org.max_users && (
                          <span className="text-xs text-muted-foreground">/ {org.max_users}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.allowedCourseIds.length === 0 ? (
                        <Badge variant="outline">All courses</Badge>
                      ) : (
                        <Badge variant="secondary">{org.allowedCourseIds.length} courses</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={org.active}
                        onCheckedChange={(checked) => toggleOrgStatus(org.id, checked)}
                        aria-label={`Toggle ${org.name} status`}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(org.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(org)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        {org.userCount === 0 ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{org.name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(org.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button variant="ghost" size="sm" disabled title="Cannot delete organization with users">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
