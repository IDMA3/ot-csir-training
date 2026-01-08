import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Award, CheckCircle } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  moduleCount: number;
  progressPercentage: number;
  hasCertificate: boolean;
  isEnrolled: boolean;
  onEnroll?: () => void;
}

export function CourseCard({
  id,
  title,
  description,
  durationMinutes,
  moduleCount,
  progressPercentage,
  hasCertificate,
  isEnrolled,
  onEnroll,
}: CourseCardProps) {
  const isComplete = progressPercentage === 100;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{title}</CardTitle>
          {hasCertificate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              Certified
            </Badge>
          )}
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{moduleCount} modules</span>
          </div>
        </div>
        
        {isEnrolled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isEnrolled ? (
          <Button asChild className="w-full">
            <Link to={`/courses/${id}`}>
              {isComplete ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Course
                </>
              ) : (
                'Continue Training'
              )}
            </Link>
          </Button>
        ) : (
          <Button onClick={onEnroll} className="w-full">
            Start Course
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
