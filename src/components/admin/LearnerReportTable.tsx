import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Trash2, X } from 'lucide-react';
import { LearnerDetailView } from './LearnerDetailView';
import { QuickEnrollPopover } from './QuickEnrollPopover';

export interface LearnerReport {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  job_role: string | null;
  created_at: string;
  modules_completed: number;
  total_modules: number;
  completion_percentage: number;
  best_exam_score: number | null;
  certificate_id: string | null;
  completion_date: string | null;
  enrolled_courses?: string[];
}

interface Course {
  id: string;
  title: string;
}

interface LearnerReportTableProps {
  learners: LearnerReport[];
  isLoading: boolean;
  courseFilter?: string;
  courses?: Course[];
  canDeleteUsers?: boolean;
  onDeleteUser?: (userId: string, userName: string) => void;
  deletingUserId?: string | null;
  selectedUserIds?: Set<string>;
  onSelectionChange?: (userId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  showSelection?: boolean;
  onEnrollUser?: (userId: string, courseIds: string[]) => Promise<void>;
  onUnenrollUser?: (userId: string, courseIds: string[]) => Promise<void>;
  showEnrollments?: boolean;
}

export function LearnerReportTable({ 
  learners, 
  isLoading, 
  courseFilter, 
  courses = [],
  canDeleteUsers = false,
  onDeleteUser,
  deletingUserId,
  selectedUserIds = new Set(),
  onSelectionChange,
  onSelectAll,
  showSelection = false,
  onEnrollUser,
  onUnenrollUser,
  showEnrollments = true,
}: LearnerReportTableProps) {
  const selectedCourseName = courseFilter && courseFilter !== 'all' 
    ? courses.find(c => c.id === courseFilter)?.title 
    : null;

  const allSelected = learners.length > 0 && learners.every(l => selectedUserIds.has(l.id));
  const someSelected = learners.some(l => selectedUserIds.has(l.id)) && !allSelected;

  // Get course title by ID
  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (learners.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No learners found</div>;
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={(checked) => onSelectAll?.(checked === true)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              {showEnrollments && <TableHead>Enrollments</TableHead>}
              <TableHead>Progress</TableHead>
              <TableHead>Exam Score</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {learners.map((learner) => {
              const isSelected = selectedUserIds.has(learner.id);
              const enrolledCourses = learner.enrolled_courses || [];
              const displayedCourses = enrolledCourses.slice(0, 2);
              const remainingCount = enrolledCourses.length - 2;

              return (
                <TableRow 
                  key={learner.id}
                  className={isSelected ? 'bg-muted/50' : undefined}
                >
                  {showSelection && (
                    <TableCell>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange?.(learner.id, checked === true)}
                        aria-label={`Select ${learner.first_name} ${learner.last_name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div>
                      {learner.first_name} {learner.last_name}
                      {learner.job_role && (
                        <span className="block text-xs text-muted-foreground">{learner.job_role}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">{learner.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{learner.organization || '-'}</TableCell>
                  {showEnrollments && (
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                        {displayedCourses.map(courseId => (
                          <Badge 
                            key={courseId} 
                            variant="secondary" 
                            className="text-xs gap-1 max-w-[140px]"
                          >
                            <span className="truncate">{getCourseTitle(courseId)}</span>
                            {onUnenrollUser && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnenrollUser(learner.id, [courseId]);
                                }}
                                className="hover:bg-destructive/20 rounded-full p-0.5 -mr-1"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {remainingCount > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                +{remainingCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                {enrolledCourses.slice(2).map(courseId => (
                                  <div key={courseId} className="text-xs">
                                    {getCourseTitle(courseId)}
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onEnrollUser && onUnenrollUser && (
                          <QuickEnrollPopover
                            userId={learner.id}
                            userName={`${learner.first_name} ${learner.last_name}`}
                            enrolledCourseIds={enrolledCourses}
                            availableCourses={courses}
                            onEnroll={onEnrollUser}
                            onUnenroll={onUnenrollUser}
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${learner.completion_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm">{learner.completion_percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {learner.best_exam_score !== null ? (
                      <Badge variant={learner.best_exam_score >= 0.8 ? "default" : "secondary"}>
                        {Math.round(learner.best_exam_score * 100)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {learner.certificate_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {learner.certificate_id}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {learner.completion_date ? (
                      format(new Date(learner.completion_date), 'MMM d, yyyy')
                    ) : (
                      <span className="text-muted-foreground">In progress</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {learner.first_name} {learner.last_name}
                            </DialogTitle>
                          </DialogHeader>
                          <LearnerDetailView userId={learner.id} learner={learner} />
                        </DialogContent>
                      </Dialog>
                      
                      {canDeleteUsers && onDeleteUser && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingUserId === learner.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>
                                  Are you sure you want to permanently delete{' '}
                                  <strong>{learner.first_name} {learner.last_name}</strong>?
                                </p>
                                <p className="text-sm">
                                  This will remove all their data including:
                                </p>
                                <ul className="text-sm list-disc list-inside">
                                  <li>Profile information</li>
                                  <li>Course progress ({learner.modules_completed} modules)</li>
                                  <li>Exam attempts</li>
                                  {learner.certificate_id && <li>Certificates</li>}
                                </ul>
                                <p className="text-destructive font-medium mt-2">
                                  This action cannot be undone.
                                </p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => onDeleteUser(learner.id, `${learner.first_name} ${learner.last_name}`)}
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
