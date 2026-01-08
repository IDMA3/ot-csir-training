import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRecertificationSchedules,
  useManageRecertificationSchedule,
  useDeleteRecertificationSchedule,
  RecertificationSchedule,
} from '@/hooks/useRecertification';

interface RecertificationSettingsProps {
  organizationId: string;
  organizationName: string;
}

const SCHEDULE_TYPES = [
  { value: 'monthly', label: 'Monthly (30 days)', days: 30 },
  { value: 'quarterly', label: 'Quarterly (90 days)', days: 90 },
  { value: 'annually', label: 'Annually (365 days)', days: 365 },
  { value: 'custom', label: 'Custom', days: null },
] as const;

export function RecertificationSettings({ organizationId, organizationName }: RecertificationSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecertificationSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<RecertificationSchedule | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    schedule_type: 'annually' as 'monthly' | 'quarterly' | 'annually' | 'custom',
    custom_days: 365,
    enabled: true,
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useRecertificationSchedules(organizationId);
  const manageMutation = useManageRecertificationSchedule();
  const deleteMutation = useDeleteRecertificationSchedule();

  // Fetch courses available to this organization
  const { data: courses = [] } = useQuery({
    queryKey: ['org-courses-for-recert', organizationId],
    queryFn: async () => {
      // First check if org has specific course assignments
      const { data: orgCourses } = await supabase
        .from('organization_courses')
        .select('course_id')
        .eq('organization_id', organizationId);

      let query = supabase
        .from('course')
        .select('id, title')
        .eq('active', true)
        .order('title');

      // If org has specific courses, filter to those
      if (orgCourses && orgCourses.length > 0) {
        query = query.in('id', orgCourses.map(oc => oc.course_id));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setFormData({
      course_id: '',
      schedule_type: 'annually',
      custom_days: 365,
      enabled: true,
    });
    setEditingSchedule(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (schedule: RecertificationSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course_id: schedule.course_id,
      schedule_type: schedule.schedule_type,
      custom_days: schedule.custom_days || 365,
      enabled: schedule.enabled,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await manageMutation.mutateAsync({
        id: editingSchedule?.id,
        organization_id: organizationId,
        course_id: formData.course_id,
        schedule_type: formData.schedule_type,
        custom_days: formData.schedule_type === 'custom' ? formData.custom_days : null,
        enabled: formData.enabled,
      });
      toast.success(editingSchedule ? 'Schedule updated' : 'Recertification schedule created');
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save schedule');
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    
    try {
      await deleteMutation.mutateAsync(deletingSchedule.id);
      toast.success('Recertification schedule deleted');
      setDeletingSchedule(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  const getCourseName = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || 'Unknown Course';
  };

  const getScheduleLabel = (type: string, customDays: number | null) => {
    const scheduleType = SCHEDULE_TYPES.find(s => s.value === type);
    if (type === 'custom' && customDays) {
      return `Every ${customDays} days`;
    }
    return scheduleType?.label || type;
  };

  // Filter out courses that already have a schedule
  const availableCourses = editingSchedule 
    ? courses 
    : courses.filter(c => !schedules.some(s => s.course_id === c.id));

  if (schedulesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recertification Schedules
            </CardTitle>
            <CardDescription>
              Set up recurring training requirements for {organizationName}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} disabled={availableCourses.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Edit Recertification Schedule' : 'Add Recertification Schedule'}
                  </DialogTitle>
                  <DialogDescription>
                    Set how often users must recertify for this course
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Select
                      value={formData.course_id}
                      onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                      disabled={!!editingSchedule}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {(editingSchedule ? courses : availableCourses).map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="schedule_type">Recertification Frequency</Label>
                    <Select
                      value={formData.schedule_type}
                      onValueChange={(value: typeof formData.schedule_type) => 
                        setFormData({ ...formData, schedule_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.schedule_type === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_days">Custom Days</Label>
                      <Input
                        id="custom_days"
                        type="number"
                        min={1}
                        max={1095}
                        value={formData.custom_days}
                        onChange={(e) => setFormData({ ...formData, custom_days: parseInt(e.target.value) || 365 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Users will need to recertify every {formData.custom_days} days
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id="enabled"
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label htmlFor="enabled">Schedule is active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.course_id || manageMutation.isPending}>
                    {manageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recertification schedules configured.</p>
            <p className="text-sm mt-1">
              Add a schedule to require periodic recertification for courses.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {getCourseName(schedule.course_id)}
                  </TableCell>
                  <TableCell>
                    {getScheduleLabel(schedule.schedule_type, schedule.custom_days)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSchedule(schedule)}
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

      <AlertDialog open={!!deletingSchedule} onOpenChange={() => setDeletingSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recertification Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the recertification requirement for this course. 
              Users will no longer be prompted to recertify.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
