import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
        {/* Bulk Enroll - Multi-select */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={() => setSelectedCourseIds(new Set())}
            >
              <BookPlus className="h-4 w-4 mr-2" />
              Enroll in Courses
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[80vh] flex flex-col">
            <AlertDialogHeader>
              <AlertDialogTitle>Enroll Users in Courses</AlertDialogTitle>
              <AlertDialogDescription>
                Select one or more courses to enroll {selectedCount} {selectedCount === 1 ? 'user' : 'users'} in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2 max-h-60 overflow-auto flex-1">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses available.</p>
              ) : (
                courses.map(course => (
                  <label 
                    key={course.id} 
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCourseIds.has(course.id)}
                      onCheckedChange={() => toggleCourseSelection(course.id, selectedCourseIds, setSelectedCourseIds)}
                    />
                    <span className="text-sm">{course.title}</span>
                  </label>
                ))
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedCourseIds(new Set())}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={selectedCourseIds.size === 0}
                onClick={() => {
                  onBulkEnroll(Array.from(selectedCourseIds));
                  setSelectedCourseIds(new Set());
                }}
              >
                Enroll in {selectedCourseIds.size} course{selectedCourseIds.size !== 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Unenroll - Multi-select */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={() => setUnenrollCourseIds(new Set())}
            >
              <BookMinus className="h-4 w-4 mr-2" />
              Remove from Courses
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[80vh] flex flex-col">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Users from Courses</AlertDialogTitle>
              <AlertDialogDescription>
                Select one or more courses to remove {selectedCount} {selectedCount === 1 ? 'user' : 'users'} from.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2 max-h-60 overflow-auto flex-1">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses available.</p>
              ) : (
                courses.map(course => (
                  <label 
                    key={course.id} 
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={unenrollCourseIds.has(course.id)}
                      onCheckedChange={() => toggleCourseSelection(course.id, unenrollCourseIds, setUnenrollCourseIds)}
                    />
                    <span className="text-sm">{course.title}</span>
                  </label>
                ))
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUnenrollCourseIds(new Set())}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={unenrollCourseIds.size === 0}
                onClick={() => {
                  onBulkUnenroll(Array.from(unenrollCourseIds));
                  setUnenrollCourseIds(new Set());
                }}
              >
                Remove from {unenrollCourseIds.size} course{unenrollCourseIds.size !== 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Assign Organization - Super admin only */}
        {showOrgAssignment && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Assign Org
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Assign to Organization</AlertDialogTitle>
                <AlertDialogDescription>
                  Select an organization for {selectedCount} {selectedCount === 1 ? 'user' : 'users'}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4 space-y-2">
                <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Remove from organization</span>
                    </SelectItem>
                    {organizations.map(org => {
                      const limitInfo = org.max_users 
                        ? `(${org.userCount}/${org.max_users} users)` 
                        : `(${org.userCount} users)`;
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
                  <p className="text-sm text-destructive">
                    Warning: This would exceed the organization's user limit of {selectedOrg?.max_users}.
                  </p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAssignOrgId('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!assignOrgId || wouldExceedLimit}
                  onClick={() => {
                    onBulkAssignOrg(assignOrgId === 'none' ? null : assignOrgId);
                    setAssignOrgId('');
                  }}
                >
                  {assignOrgId === 'none' ? 'Remove from Organization' : 'Assign to Organization'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Bulk Reset Progress */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Progress
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset User Progress</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset training progress for {selectedCount} {selectedCount === 1 ? 'user' : 'users'}.
                You can choose to reset progress for all courses or a specific course.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
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
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setResetCourseId('all')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onBulkResetProgress(resetCourseId === 'all' ? undefined : resetCourseId);
                  setResetCourseId('all');
                }}
              >
                Reset Progress
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete */}
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
