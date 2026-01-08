import { Header } from '@/components/Header';
import { CourseCard } from '@/components/CourseCard';
import { useCourses, useEnrollments, useEnrollInCourse } from '@/hooks/useCourse';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Courses() {
  const { user } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const enrollMutation = useEnrollInCourse();

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate({ courseId });
  };

  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Training Courses</h1>
          <p className="text-muted-foreground mt-1">
            Browse available courses and track your progress
          </p>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No courses available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const enrollment = enrollments.find(e => e.course_id === course.id);
              const isEnrolled = !!enrollment;
              
              return (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  durationMinutes={course.duration_minutes}
                  moduleCount={course.module_count}
                  progressPercentage={course.progress_percentage}
                  hasCertificate={course.has_certificate}
                  isEnrolled={isEnrolled}
                  onEnroll={() => handleEnroll(course.id)}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
