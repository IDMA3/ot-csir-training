import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, BookPlus, X } from 'lucide-react';

interface Course {
  id: string;
  title: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkResetProgress: (courseId?: string) => void;
  onBulkEnroll: (courseId: string) => void;
  courses: Course[];
  canDeleteUsers: boolean;
  isProcessing: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkResetProgress,
  onBulkEnroll,
  courses,
  canDeleteUsers,
  isProcessing,
}: BulkActionsBarProps) {
  const [enrollCourseId, setEnrollCourseId] = useState<string>('');
  const [resetCourseId, setResetCourseId] = useState<string>('all');

  if (selectedCount === 0) return null;

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

      <div className="flex items-center gap-2">
        {/* Bulk Enroll */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              <BookPlus className="h-4 w-4 mr-2" />
              Enroll in Course
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enroll Users in Course</AlertDialogTitle>
              <AlertDialogDescription>
                Select a course to enroll {selectedCount} {selectedCount === 1 ? 'user' : 'users'} in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEnrollCourseId('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!enrollCourseId}
                onClick={() => {
                  onBulkEnroll(enrollCourseId);
                  setEnrollCourseId('');
                }}
              >
                Enroll Users
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
