import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { LearnerReport } from './LearnerReportTable';

interface LearnerDetailViewProps {
  userId: string;
  learner: LearnerReport;
}

export function LearnerDetailView({ userId, learner }: LearnerDetailViewProps) {
  // Fetch module progress details
  const { data: moduleProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['admin-learner-progress', userId],
    queryFn: async () => {
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, sequence, type')
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
      }) || [];
    },
  });

  // Fetch exam attempts
  const { data: examAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['admin-learner-attempts', userId],
    queryFn: async () => {
      const { data: examModule } = await supabase
        .from('modules')
        .select('id')
        .eq('type', 'exam')
        .single();

      if (!examModule) return [];

      const { data: attempts } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', examModule.id)
        .order('submitted_at', { ascending: false });

      return attempts || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Email:</span>
          <p className="font-medium">{learner.email}</p>
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

      {/* Module Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Module Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : (
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
                {moduleProgress.map((mod) => (
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
          )}
        </CardContent>
      </Card>

      {/* Exam Attempts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exam Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attemptsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : examAttempts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No exam attempts</div>
          ) : (
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
                {examAttempts.map((attempt, index) => (
                  <TableRow key={attempt.id}>
                    <TableCell>#{examAttempts.length - index}</TableCell>
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
          )}
        </CardContent>
      </Card>

      {/* Certificate Info */}
      {learner.certificate_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="font-mono text-sm">
                {learner.certificate_id}
              </Badge>
              {learner.completion_date && (
                <span className="text-sm text-muted-foreground">
                  Issued on {format(new Date(learner.completion_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
