import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RotateCcw, BookPlus, BookMinus, X, Building2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
}

interface Organization {
  id: string;
  name: string;
  max_users: number | null;
  userCount: number;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkResetProgress: (courseId?: string) => void;
  onBulkEnroll: (courseIds: string[]) => void;
  onBulkUnenroll: (courseIds: string[]) => void;
  onBulkAssignOrg: (orgId: string | null) => void;
  courses: Course[];
  organizations: Organization[];
  canDeleteUsers: boolean;
  isProcessing: boolean;
  showOrgAssignment?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkResetProgress,
  onBulkEnroll,
  onBulkUnenroll,
  onBulkAssignOrg,
  courses,
  organizations,
  canDeleteUsers,
  isProcessing,
  showOrgAssignment = true,
}: BulkActionsBarProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [unenrollCourseIds, setUnenrollCourseIds] = useState<Set<string>>(new Set());
  const [resetCourseId, setResetCourseId] = useState<string>('all');
  const [assignOrgId, setAssignOrgId] = useState<string>('');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (selectedCount === 0) return null;

  const selectedOrg = assignOrgId && assignOrgId !== 'none' 
    ? organizations.find(o => o.id === assignOrgId) 
    : null;
  
  const wouldExceedLimit = selectedOrg?.max_users 
    ? (selectedOrg.userCount + selectedCount) > selectedOrg.max_users 
    : false;

  const toggleCourseSelection = (courseId: string, set: Set<string>, setFn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(courseId)) {
      next.delete(courseId);
    } else {
      next.add(courseId);
    }
    setFn(next);
  };

  const handleEnroll = () => {
    onBulkEnroll(Array.from(selectedCourseIds));
    setSelectedCourseIds(new Set());
    setEnrollOpen(false);
  };

  const handleUnenroll = () => {
    onBulkUnenroll(Array.from(unenrollCourseIds));
    setUnenrollCourseIds(new Set());
    setUnenrollOpen(false);
  };

  const handleAssignOrg = () => {
    onBulkAssignOrg(assignOrgId === 'none' ? null : assignOrgId);
    setAssignOrgId('');
    setOrgOpen(false);
  };

  const handleReset = () => {
    onBulkResetProgress(resetCourseId === 'all' ? undefined : resetCourseId);
    setResetCourseId('all');
    setResetOpen(false);
  };

  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg p-4 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? 'user' : 'users'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Bulk Enroll - Popover */}
        <Popover open={enrollOpen} onOpenChange={setEnrollOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={() => setSelectedCourseIds(new Set())}
            >
              <BookPlus className="h-4 w-4 mr-2" />
              Enroll
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-3 border-b">
              <p className="font-medium text-sm">Enroll in Courses</p>
              <p className="text-xs text-muted-foreground">
                Select courses for {selectedCount} {selectedCount === 1 ? 'user' : 'users'}
              </p>
            </div>
            <ScrollArea className="max-h-48">
              <div className="p-2 space-y-1">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No courses available</p>
                ) : (
                  courses.map(course => (
                    <label 
                      key={course.id} 
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCourseIds.has(course.id)}
                        onCheckedChange={() => toggleCourseSelection(course.id, selectedCourseIds, setSelectedCourseIds)}
                      />
                      <span className="text-sm truncate">{course.title}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t">
              <Button
                size="sm"
                className="w-full"
                disabled={selectedCourseIds.size === 0}
                onClick={handleEnroll}
              >
                Enroll in {selectedCourseIds.size || 0} course{selectedCourseIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk Unenroll - Popover */}
        <Popover open={unenrollOpen} onOpenChange={setUnenrollOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={() => setUnenrollCourseIds(new Set())}
            >
              <BookMinus className="h-4 w-4 mr-2" />
              Unenroll
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-3 border-b">
              <p className="font-medium text-sm">Remove from Courses</p>
              <p className="text-xs text-muted-foreground">
                Select courses to remove {selectedCount} {selectedCount === 1 ? 'user' : 'users'} from
              </p>
            </div>
            <ScrollArea className="max-h-48">
              <div className="p-2 space-y-1">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No courses available</p>
                ) : (
                  courses.map(course => (
                    <label 
                      key={course.id} 
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={unenrollCourseIds.has(course.id)}
                        onCheckedChange={() => toggleCourseSelection(course.id, unenrollCourseIds, setUnenrollCourseIds)}
                      />
                      <span className="text-sm truncate">{course.title}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t">
              <Button
                size="sm"
                className="w-full"
                variant="destructive"
                disabled={unenrollCourseIds.size === 0}
                onClick={handleUnenroll}
              >
                Remove from {unenrollCourseIds.size || 0} course{unenrollCourseIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk Assign Organization - Popover */}
        {showOrgAssignment && (
          <Popover open={orgOpen} onOpenChange={setOrgOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Assign Org
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <div className="p-3 border-b">
                <p className="font-medium text-sm">Assign to Organization</p>
                <p className="text-xs text-muted-foreground">
                  For {selectedCount} {selectedCount === 1 ? 'user' : 'users'}
                </p>
              </div>
              <div className="p-3 space-y-3">
                <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Remove from organization</span>
                    </SelectItem>
                    {organizations.map(org => {
                      const limitInfo = org.max_users 
                        ? `(${org.userCount}/${org.max_users})` 
                        : `(${org.userCount})`;
                      const atLimit = org.max_users && (org.userCount + selectedCount) > org.max_users;
                      return (
                        <SelectItem key={org.id} value={org.id}>
                          <span className={atLimit ? 'text-destructive' : ''}>
                            {org.name} {limitInfo} {atLimit && '⚠️'}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {wouldExceedLimit && (
                  <p className="text-xs text-destructive">
                    Warning: Exceeds limit of {selectedOrg?.max_users}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!assignOrgId || wouldExceedLimit}
                  onClick={handleAssignOrg}
                >
                  {assignOrgId === 'none' ? 'Remove from Org' : 'Assign'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Bulk Reset Progress - Popover */}
        <Popover open={resetOpen} onOpenChange={setResetOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-3 border-b">
              <p className="font-medium text-sm">Reset Progress</p>
              <p className="text-xs text-muted-foreground">
                For {selectedCount} {selectedCount === 1 ? 'user' : 'users'}
              </p>
            </div>
            <div className="p-3 space-y-3">
              <Select value={resetCourseId} onValueChange={setResetCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This will clear progress, attempts, and certificates.
              </p>
              <Button
                size="sm"
                className="w-full"
                variant="destructive"
                onClick={handleReset}
              >
                Reset Progress
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk Delete - Keep as AlertDialog for safety */}
        {canDeleteUsers && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} Users</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    Are you sure you want to permanently delete{' '}
                    <strong>{selectedCount} {selectedCount === 1 ? 'user' : 'users'}</strong>?
                  </p>
                  <p className="text-sm">
                    This will remove all their data including profiles, progress, exam attempts, and certificates.
                  </p>
                  <p className="text-destructive font-medium">
                    This action cannot be undone.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onBulkDelete}
                >
                  Delete {selectedCount} {selectedCount === 1 ? 'User' : 'Users'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
