import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CourseCard } from '@/components/CourseCard';
import { useCourses, useEnrollments, useEnrollInCourse } from '@/hooks/useCourse';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, BookOpen, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Courses() {
  const { user } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const enrollMutation = useEnrollInCourse();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate({ courseId });
  };

  // Get unique categories from courses
  const categories = useMemo(() => {
    const cats = courses
      .map(c => c.category)
      .filter((cat): cat is string => !!cat);
    return [...new Set(cats)].sort();
  }, [courses]);

  // Filter courses by selected category
  const filteredCourses = useMemo(() => {
    if (!selectedCategory) return courses;
    return courses.filter(c => c.category === selectedCategory);
  }, [courses, selectedCategory]);

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

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedCategory 
                  ? `No courses found in the "${selectedCategory}" category.`
                  : 'No courses available yet.'}
              </p>
              {selectedCategory && (
                <Button 
                  variant="link" 
                  onClick={() => setSelectedCategory(null)}
                  className="mt-2"
                >
                  View all courses
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const enrollment = enrollments.find(e => e.course_id === course.id);
              const isEnrolled = !!enrollment;
              
              return (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  category={course.category}
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
