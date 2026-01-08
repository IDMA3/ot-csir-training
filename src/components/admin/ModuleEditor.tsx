import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, GripVertical, Loader2, ArrowLeft, FileText, ClipboardList, Copy, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from './RichTextEditor';
import { QuestionEditor } from './QuestionEditor';

interface Module {
  id: string;
  course_id: string;
  title: string;
  body_html: string;
  type: 'module' | 'exam';
  sequence: number;
  estimated_minutes: number;
  created_at: string;
}

interface ModuleEditorProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

export function ModuleEditor({ courseId, courseTitle, onBack }: ModuleEditorProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [managingQuestionsModule, setManagingQuestionsModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body_html: '',
    type: 'module' as 'module' | 'exam',
    estimated_minutes: 5,
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['admin-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence', { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const nextSequence = modules.length > 0 
        ? Math.max(...modules.map(m => m.sequence)) + 1 
        : 1;
      
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title: data.title,
        body_html: data.body_html,
        type: data.type,
        sequence: nextSequence,
        estimated_minutes: data.estimated_minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Module created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create module: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('modules')
        .update({
          title: data.title,
          body_html: data.body_html,
          type: data.type,
          estimated_minutes: data.estimated_minutes,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Module updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update module: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Module deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete module: ${error.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (module: Module) => {
      const nextSequence = modules.length > 0 
        ? Math.max(...modules.map(m => m.sequence)) + 1 
        : 1;
      
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title: `${module.title} (Copy)`,
        body_html: module.body_html,
        type: module.type,
        sequence: nextSequence,
        estimated_minutes: module.estimated_minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Module duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate module: ${error.message}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ moduleId, newSequence }: { moduleId: string; newSequence: number }) => {
      const moduleToMove = modules.find(m => m.id === moduleId);
      if (!moduleToMove) return;

      const oldSequence = moduleToMove.sequence;
      const updates: { id: string; sequence: number }[] = [];

      modules.forEach(m => {
        if (m.id === moduleId) {
          updates.push({ id: m.id, sequence: newSequence });
        } else if (newSequence < oldSequence) {
          // Moving up: shift modules between newSequence and oldSequence down
          if (m.sequence >= newSequence && m.sequence < oldSequence) {
            updates.push({ id: m.id, sequence: m.sequence + 1 });
          }
        } else if (newSequence > oldSequence) {
          // Moving down: shift modules between oldSequence and newSequence up
          if (m.sequence > oldSequence && m.sequence <= newSequence) {
            updates.push({ id: m.id, sequence: m.sequence - 1 });
          }
        }
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('modules')
          .update({ sequence: update.sequence })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder modules: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      body_html: '',
      type: 'module',
      estimated_minutes: 5,
    });
    setEditingModule(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      body_html: module.body_html,
      type: module.type,
      estimated_minutes: module.estimated_minutes,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingModule) {
      updateMutation.mutate({ id: editingModule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (module: Module) => {
    if (confirm(`Are you sure you want to delete "${module.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(module.id);
    }
  };

  const handleMoveUp = (module: Module) => {
    if (module.sequence > 1) {
      reorderMutation.mutate({ moduleId: module.id, newSequence: module.sequence - 1 });
    }
  };

  const handleMoveDown = (module: Module) => {
    const maxSequence = Math.max(...modules.map(m => m.sequence));
    if (module.sequence < maxSequence) {
      reorderMutation.mutate({ moduleId: module.id, newSequence: module.sequence + 1 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If managing questions for a module, show the question editor
  if (managingQuestionsModule) {
    return (
      <QuestionEditor
        moduleId={managingQuestionsModule.id}
        moduleTitle={managingQuestionsModule.title}
        onBack={() => setManagingQuestionsModule(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <CardTitle>Modules for: {courseTitle}</CardTitle>
            <CardDescription>Create and manage training modules with rich content</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Module
            </Button>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingModule ? 'Edit Module' : 'Create New Module'}</DialogTitle>
                  <DialogDescription>
                    {editingModule ? 'Update module details and content' : 'Add a new training module'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Module Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Introduction to OT Security"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Module Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'module' | 'exam') => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="module">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Lesson Module
                            </div>
                          </SelectItem>
                          <SelectItem value="exam">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4" />
                              Exam
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
                      <Input
                        id="estimated_minutes"
                        type="number"
                        min={1}
                        value={formData.estimated_minutes}
                        onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Module Content</Label>
                    <RichTextEditor
                      content={formData.body_html}
                      onChange={(html) => setFormData({ ...formData, body_html: html })}
                    />
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
                    {editingModule ? 'Save Changes' : 'Create Module'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No modules yet. Create your first module to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module, index) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveUp(module)}
                          disabled={index === 0 || reorderMutation.isPending}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveDown(module)}
                          disabled={index === modules.length - 1 || reorderMutation.isPending}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>
                      <span className="text-muted-foreground">{module.sequence}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{module.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {module.body_html.replace(/<[^>]*>/g, '').substring(0, 50)}...
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={module.type === 'exam' ? 'destructive' : 'secondary'}>
                      {module.type === 'exam' ? 'Exam' : 'Lesson'}
                    </Badge>
                  </TableCell>
                  <TableCell>{module.estimated_minutes} min</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setManagingQuestionsModule(module)}
                        title="Manage questions"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => duplicateMutation.mutate(module)}
                        disabled={duplicateMutation.isPending}
                        title="Duplicate module"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(module)} title="Edit module">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(module)}
                        disabled={deleteMutation.isPending}
                        title="Delete module"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
