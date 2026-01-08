import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Award, CheckCircle, Eye, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { RecertificationStatus } from '@/hooks/useRecertification';

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  durationMinutes: number;
  moduleCount: number;
  progressPercentage: number;
  hasCertificate: boolean;
  isEnrolled: boolean;
  onEnroll?: () => void;
  recertificationStatus?: RecertificationStatus;
  recertificationDueDate?: Date | null;
  onRecertify?: () => void;
}

export function CourseCard({
  id,
  title,
  description,
  category,
  durationMinutes,
  moduleCount,
  progressPercentage,
  hasCertificate,
  isEnrolled,
  onEnroll,
  recertificationStatus,
  recertificationDueDate,
  onRecertify,
}: CourseCardProps) {
  const isComplete = progressPercentage === 100;
  const needsRecertification = recertificationStatus === 'due' || recertificationStatus === 'overdue';

  const getRecertificationBadge = () => {
    if (!recertificationStatus || recertificationStatus === 'none' || recertificationStatus === 'current') {
      return null;
    }

    const variants: Record<RecertificationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      upcoming: { variant: 'secondary', label: 'Recert Soon' },
      due: { variant: 'default', label: 'Recert Due' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      current: { variant: 'outline', label: '' },
      none: { variant: 'outline', label: '' },
    };

    const { variant, label } = variants[recertificationStatus];
    if (!label) return null;

    return (
      <Badge variant={variant} className="flex items-center gap-1 shrink-0">
        {recertificationStatus === 'overdue' ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        {label}
      </Badge>
    );
  };

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl line-clamp-2">{title}</CardTitle>
            {category && (
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
          {hasCertificate && (
            <Badge className="bg-success text-success-foreground flex items-center gap-1 shrink-0">
              <Award className="h-3 w-3" />
              Certified
            </Badge>
          )}
          {getRecertificationBadge()}
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{moduleCount} modules</span>
          </div>
        </div>
        
        {isEnrolled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" aria-label={`Course progress: ${progressPercentage}%`} />
          </div>
        )}

        {recertificationDueDate && recertificationStatus !== 'none' && (
          <div className="mt-3 text-xs text-muted-foreground">
            {recertificationStatus === 'overdue' ? (
              <span className="text-destructive">Was due {format(recertificationDueDate, 'MMM d, yyyy')}</span>
            ) : recertificationStatus === 'due' ? (
              <span className="text-warning">Due now</span>
            ) : recertificationStatus === 'upcoming' ? (
              <span>Due {format(recertificationDueDate, 'MMM d, yyyy')}</span>
            ) : null}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {needsRecertification && onRecertify ? (
          <Button onClick={onRecertify} className="flex-1 focus-ring" variant="destructive">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Recertify Now
          </Button>
        ) : isEnrolled ? (
          <>
            <Button asChild className="flex-1 focus-ring">
              <Link to={`/courses/${id}`}>
                {isComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Review Course
                  </>
                ) : progressPercentage > 0 ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Start Training
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                )}
              </Link>
            </Button>
            {hasCertificate && (
              <Button variant="outline" size="icon" asChild className="focus-ring" aria-label="View certificate">
                <Link to={`/courses/${id}/certificate`}>
                  <Award className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" asChild className="flex-1 focus-ring">
              <Link to={`/courses/${id}/preview`}>
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                View Details
              </Link>
            </Button>
            <Button onClick={onEnroll} className="flex-1 focus-ring">
              Enroll Now
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
