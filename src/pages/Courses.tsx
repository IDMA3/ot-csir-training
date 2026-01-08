import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CourseCard } from '@/components/CourseCard';
import { EmptyState } from '@/components/EmptyState';
import { CourseGridSkeleton } from '@/components/LoadingSkeleton';
import { useCourses, useEnrollments, useEnrollInCourse } from '@/hooks/useCourse';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Filter, Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

export default function Courses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const enrollMutation = useEnrollInCourse();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollMutation.mutateAsync({ courseId });
      toast({
        title: "You're enrolled!",
        description: "Start your first module to begin learning.",
      });
    } catch {
      toast({
        title: "Enrollment failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Get unique categories from courses
  const categories = useMemo(() => {
    const cats = courses
      .map(c => c.category)
      .filter((cat): cat is string => !!cat);
    return [...new Set(cats)].sort();
  }, [courses]);

  // Filter courses by selected category and search query
  const filteredCourses = useMemo(() => {
    let result = courses;
    
    if (selectedCategory) {
      result = result.filter(c => c.category === selectedCategory);
    }
    
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [courses, selectedCategory, debouncedSearch]);

  const hasFilters = selectedCategory || searchQuery;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container py-8 px-4" id="main-content">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Training Courses</h1>
            <p className="text-muted-foreground mt-1">
              Browse available courses and track your progress
            </p>
          </div>
          <CourseGridSkeleton count={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8 px-4" id="main-content">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Training Courses</h1>
          <p className="text-muted-foreground mt-1">
            Browse available courses and track your progress
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              aria-label="Search courses"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
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

          {/* Active filters indicator */}
          {hasFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {filteredCourses.length} of {courses.length} courses
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1">
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={BookOpen}
                title={hasFilters ? "No courses found" : "No courses available"}
                description={
                  hasFilters 
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "New training courses will appear here when available."
                }
                action={hasFilters ? {
                  label: "Clear all filters",
                  onClick: clearFilters,
                } : undefined}
              />
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
