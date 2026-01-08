import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, BookOpen, Loader2, Layers, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleEditor } from './ModuleEditor';
import { OrgCourseAccessManager } from './OrgCourseAccessManager';

const COURSE_CATEGORIES = [
  'Security',
  'Compliance',
  'Technical',
  'Management',
  'Foundations',
  'Other',
] as const;

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  version: string;
  active: boolean;
  created_at: string;
  organization: string | null;
  created_by: string | null;
  creator_organization_id: string | null;
}

interface CourseManagementProps {
  organizationScope?: string | null;
}

export function CourseManagement({ organizationScope }: CourseManagementProps) {
  const { user, profile } = useAuth();
  const { isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [managingModulesCourse, setManagingModulesCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    duration_minutes: 15,
    version: '1.0',
    active: true,
    organization: '',
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses', organizationScope, isSuperAdmin, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('course')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Super admins see all courses
      // Org admins see courses they created + courses assigned to their org
      if (!isSuperAdmin && profile?.organization_id) {
        // For org admins, we need to filter more carefully
        // Get courses created by their org OR assigned to their org
        const { data: orgCourses } = await supabase
          .from('organization_courses')
          .select('course_id')
          .eq('organization_id', profile.organization_id);
        
        const assignedCourseIds = orgCourses?.map(oc => oc.course_id) || [];
        
        const { data, error } = await supabase
          .from('course')
          .select('*')
          .or(`creator_organization_id.eq.${profile.organization_id},id.in.(${assignedCourseIds.join(',')})`)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as Course[];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Course[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Set creator info based on current user
      const creatorOrgId = isSuperAdmin ? null : profile?.organization_id;
      
      const { error } = await supabase.from('course').insert({
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        duration_minutes: data.duration_minutes,
        version: data.version,
        active: data.active,
        organization: data.organization || organizationScope || null,
        created_by: user?.id,
        creator_organization_id: creatorOrgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create course: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('course')
        .update({
          title: data.title,
          description: data.description || null,
          category: data.category || null,
          duration_minutes: data.duration_minutes,
          version: data.version,
          active: data.active,
          organization: data.organization || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update course: ${error.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (courseId: string) => {
      // 1. Fetch the original course
      const { data: originalCourse, error: courseError } = await supabase
        .from('course')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (courseError) throw courseError;

      // 2. Create the new course (as inactive draft)
      const { data: newCourse, error: newCourseError } = await supabase
        .from('course')
        .insert({
          title: `${originalCourse.title} (Copy)`,
          description: originalCourse.description,
          category: originalCourse.category,
          duration_minutes: originalCourse.duration_minutes,
          version: originalCourse.version,
          active: false, // Start as inactive draft
        })
        .select()
        .single();

      if (newCourseError) throw newCourseError;

      // 3. Fetch and duplicate modules
      const { data: originalModules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence');

      if (modulesError) throw modulesError;

      if (originalModules && originalModules.length > 0) {
        // Create mapping of old module IDs to new module IDs
        const moduleIdMap = new Map<string, string>();

        for (const module of originalModules) {
          const { data: newModule, error: newModuleError } = await supabase
            .from('modules')
            .insert({
              course_id: newCourse.id,
              title: module.title,
              body_html: module.body_html,
              sequence: module.sequence,
              type: module.type,
              estimated_minutes: module.estimated_minutes,
            })
            .select()
            .single();

          if (newModuleError) throw newModuleError;
          moduleIdMap.set(module.id, newModule.id);
        }

        // 4. Fetch and duplicate questions for all modules
        const { data: originalQuestions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .in('module_id', originalModules.map(m => m.id))
          .order('sequence');

        if (questionsError) throw questionsError;

        if (originalQuestions && originalQuestions.length > 0) {
          const newQuestions = originalQuestions.map(q => ({
            module_id: moduleIdMap.get(q.module_id)!,
            prompt: q.prompt,
            choices: q.choices,
            correct_choice: q.correct_choice,
            rationale: q.rationale,
            sequence: q.sequence,
          }));

          const { error: insertQuestionsError } = await supabase
            .from('questions')
            .insert(newQuestions);

          if (insertQuestionsError) throw insertQuestionsError;
        }
      }

      return newCourse;
    },
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success(`Course duplicated! "${newCourse.title}" created as inactive draft.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate course: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      // Delete questions first (via modules)
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);

      if (modules && modules.length > 0) {
        const moduleIds = modules.map(m => m.id);
        
        // Delete questions for all modules
        const { error: questionsError } = await supabase
          .from('questions')
          .delete()
          .in('module_id', moduleIds);
        
        if (questionsError) throw questionsError;
      }

      // Delete modules
      const { error: modulesError } = await supabase
        .from('modules')
        .delete()
        .eq('course_id', courseId);

      if (modulesError) throw modulesError;

      // Delete the course
      const { error: courseError } = await supabase
        .from('course')
        .delete()
        .eq('id', courseId);

      if (courseError) throw courseError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course deleted successfully');
      setDeletingCourse(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete course: ${error.message}`);
    },
  });

  const handleDeleteClick = async (course: Course) => {
    setDeletingCourse(course);
    setDeleteCheckLoading(true);
    
    // Check if course has enrollments
    const { count, error } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course.id);

    setDeleteCheckLoading(false);
    
    if (error) {
      toast.error('Failed to check enrollments');
      setDeletingCourse(null);
      return;
    }

    setEnrollmentCount(count || 0);
    setCanDelete((count || 0) === 0);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      duration_minutes: 15,
      version: '1.0',
      active: true,
      organization: organizationScope || '',
    });
    setEditingCourse(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      category: course.category || '',
      duration_minutes: course.duration_minutes,
      version: course.version,
      active: course.active,
      organization: course.organization || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If managing modules for a course, show the module editor
  if (managingModulesCourse) {
    return (
      <ModuleEditor
        courseId={managingModulesCourse.id}
        courseTitle={managingModulesCourse.title}
        onBack={() => setManagingModulesCourse(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Org admins see the global course access manager */}
      {!isSuperAdmin && <OrgCourseAccessManager />}
      
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Course Management</CardTitle>
            <CardDescription>Create and manage training courses</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
                  <DialogDescription>
                    {editingCourse ? 'Update course details' : 'Add a new training course'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., OT Cybersecurity Training"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the course"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="1.0"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Course is active and visible to learners</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingCourse ? 'Save Changes' : 'Create Course'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No courses yet. Create your first course to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.category ? (
                      <Badge variant="outline">{course.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{course.duration_minutes} min</TableCell>
                  <TableCell>{course.version}</TableCell>
                  <TableCell>
                    <Badge variant={course.active ? 'default' : 'secondary'}>
                      {course.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setManagingModulesCourse(course)}
                        title="Manage Modules"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => duplicateMutation.mutate(course.id)}
                        disabled={duplicateMutation.isPending}
                        title="Duplicate Course"
                      >
                        {duplicateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(course)} title="Edit Course">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteClick(course)}
                        title="Delete Course"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCourse} onOpenChange={(open) => !open && setDeletingCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteCheckLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking enrollments...
                  </div>
                ) : canDelete ? (
                  <p>
                    Are you sure you want to delete <strong>"{deletingCourse?.title}"</strong>? 
                    This will permanently remove the course and all its modules and questions. 
                    This action cannot be undone.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-destructive font-medium">
                      This course cannot be deleted.
                    </p>
                    <p>
                      <strong>"{deletingCourse?.title}"</strong> has {enrollmentCount} active enrollment{enrollmentCount !== 1 ? 's' : ''}. 
                      You must remove all enrollments before deleting this course.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {canDelete && !deleteCheckLoading && (
              <AlertDialogAction
                onClick={() => deletingCourse && deleteMutation.mutate(deletingCourse.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Course
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </div>
  );
}
