import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { LearnerDetailView } from './LearnerDetailView';

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
}

interface LearnerReportTableProps {
  learners: LearnerReport[];
  isLoading: boolean;
}

export function LearnerReportTable({ learners, isLoading }: LearnerReportTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (learners.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No learners found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Exam Score</TableHead>
            <TableHead>Certificate</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead className="w-[80px]">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((learner) => (
            <TableRow key={learner.id}>
              <TableCell className="font-medium">
                {learner.first_name} {learner.last_name}
                {learner.job_role && (
                  <span className="block text-xs text-muted-foreground">{learner.job_role}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{learner.email}</TableCell>
              <TableCell>{learner.organization || '-'}</TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
