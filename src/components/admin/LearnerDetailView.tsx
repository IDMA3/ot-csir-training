import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, Clock, XCircle, BookOpen } from 'lucide-react';
import type { LearnerReport } from './LearnerReportTable';

interface LearnerDetailViewProps {
  userId: string;
  learner: LearnerReport;
}

interface Course {
  id: string;
  title: string;
}

interface ModuleWithProgress {
  id: string;
  title: string;
  sequence: number;
  type: string;
  course_id: string;
  completed: boolean;
  completed_at: string | null;
  last_viewed_at: string | null;
}

export function LearnerDetailView({ userId, learner }: LearnerDetailViewProps) {
  // Fetch courses and enrollments
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['admin-learner-courses', userId],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', userId);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map(e => e.course_id);
      
      const { data: courses } = await supabase
        .from('course')
        .select('id, title')
        .in('id', courseIds)
        .order('title');

      return courses as Course[] || [];
    },
  });

  // Fetch module progress details grouped by course
  const { data: moduleProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['admin-learner-progress', userId],
    queryFn: async () => {
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, sequence, type, course_id')
        .order('sequence');

      const { data: progress } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId);

      return modules?.map(mod => {
        const prog = progress?.find(p => p.module_id === mod.id);
        return {
          ...mod,
          completed: prog?.completed || false,
          completed_at: prog?.completed_at,
          last_viewed_at: prog?.last_viewed_at,
        };
      }) as ModuleWithProgress[] || [];
    },
  });

  // Fetch exam attempts grouped by course
  const { data: examAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['admin-learner-attempts', userId],
    queryFn: async () => {
      const { data: examModules } = await supabase
        .from('modules')
        .select('id, course_id')
        .eq('type', 'exam');

      if (!examModules || examModules.length === 0) return [];

      const examModuleIds = examModules.map(m => m.id);

      const { data: attempts } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .in('module_id', examModuleIds)
        .order('submitted_at', { ascending: false });

      return attempts?.map(attempt => {
        const module = examModules.find(m => m.id === attempt.module_id);
        return {
          ...attempt,
          course_id: module?.course_id,
        };
      }) || [];
    },
  });

  // Fetch certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['admin-learner-certificates', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId);
      return data || [];
    },
  });

  // Group modules by course
  const modulesByCourse = enrolledCourses.reduce((acc, course) => {
    acc[course.id] = moduleProgress.filter(m => m.course_id === course.id);
    return acc;
  }, {} as Record<string, ModuleWithProgress[]>);

  // Group attempts by course
  const attemptsByCourse = enrolledCourses.reduce((acc, course) => {
    acc[course.id] = examAttempts.filter(a => a.course_id === course.id);
    return acc;
  }, {} as Record<string, typeof examAttempts>);

  // Get certificate for a course
  const getCertificateForCourse = (courseId: string) => {
    return certificates.find(c => c.course_id === courseId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Email:</span>
          <p className="font-medium">{learner.email || '-'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Organization:</span>
          <p className="font-medium">{learner.organization || '-'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Job Role:</span>
          <p className="font-medium">{learner.job_role || '-'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Registered:</span>
          <p className="font-medium">{format(new Date(learner.created_at), 'MMM d, yyyy')}</p>
        </div>
      </div>

      {/* Enrolled Courses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Enrolled Courses ({enrolledCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledCourses.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">Not enrolled in any courses</div>
          ) : (
            <Accordion type="multiple" defaultValue={enrolledCourses.map(c => c.id)} className="w-full">
              {enrolledCourses.map(course => {
                const courseModules = modulesByCourse[course.id] || [];
                const completedModules = courseModules.filter(m => m.completed);
                const courseAttempts = attemptsByCourse[course.id] || [];
                const certificate = getCertificateForCourse(course.id);
                const progressPercent = courseModules.length > 0 
                  ? Math.round((completedModules.length / courseModules.length) * 100)
                  : 0;

                return (
                  <AccordionItem key={course.id} value={course.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-medium">{course.title}</span>
                        <Badge variant={progressPercent === 100 ? "default" : "secondary"}>
                          {progressPercent}% complete
                        </Badge>
                        {certificate && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Certified
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {/* Module Progress */}
                      {progressLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading...</div>
                      ) : courseModules.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No modules</div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Module</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Completed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {courseModules.map((mod) => (
                                <TableRow key={mod.id}>
                                  <TableCell className="font-medium">{mod.title}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                      {mod.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {mod.completed ? (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Completed</span>
                                      </div>
                                    ) : mod.last_viewed_at ? (
                                      <div className="flex items-center gap-1 text-amber-600">
                                        <Clock className="h-4 w-4" />
                                        <span>In Progress</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <XCircle className="h-4 w-4" />
                                        <span>Not Started</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {mod.completed_at 
                                      ? format(new Date(mod.completed_at), 'MMM d, yyyy h:mm a')
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Exam Attempts for this course */}
                      {courseAttempts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Exam Attempts</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Attempt</TableHead>
                                  <TableHead>Score</TableHead>
                                  <TableHead>Result</TableHead>
                                  <TableHead>Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {courseAttempts.map((attempt, index) => (
                                  <TableRow key={attempt.id}>
                                    <TableCell>#{courseAttempts.length - index}</TableCell>
                                    <TableCell>
                                      <Badge variant={attempt.passed ? "default" : "secondary"}>
                                        {Math.round(Number(attempt.score) * 100)}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {attempt.passed ? (
                                        <span className="text-green-600 font-medium">Passed</span>
                                      ) : (
                                        <span className="text-red-600 font-medium">Failed</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Certificate for this course */}
                      {certificate && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium mb-2">Certificate</h4>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-mono text-sm">
                              {certificate.certificate_id}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Issued on {format(new Date(certificate.issued_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
