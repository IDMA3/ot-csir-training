import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCourse, useModules, useEnrollments, useEnrollInCourse, useProgress, calculateProgressPercentage } from '@/hooks/useCourse';
import { useCanAccessCourse } from '@/hooks/useOrganizationCourses';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Clock, BookOpen, GraduationCap, CheckCircle, Lock, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursePreview() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);
  const { data: enrollments = [] } = useEnrollments();
  const { data: progress = [] } = useProgress(courseId);
  const { data: canAccess, isLoading: accessLoading } = useCanAccessCourse(courseId);
  const enrollMutation = useEnrollInCourse();

  const isEnrolled = enrollments.some(e => e.course_id === courseId);
  const progressPercentage = calculateProgressPercentage(modules, progress);
  const completedModulesCount = progress.filter(p => p.completed).length;

  const handleEnroll = async () => {
    if (!courseId) return;
    await enrollMutation.mutateAsync({ courseId });
    navigate(`/courses/${courseId}`);
  };

  const handleContinue = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    }
  };

  if (courseLoading || modulesLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if user can't access this course
  if (user && canAccess === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Course Not Available</AlertTitle>
              <AlertDescription>
                This course is not available for your organization. Contact your administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
            <Button asChild>
              <Link to="/courses">Browse Available Courses</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h1>
            <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or is no longer available.</p>
            <Button asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const totalDuration = modules.reduce((sum, m) => sum + m.estimated_minutes, 0);
  const examModule = modules.find(m => m.type === 'exam');
  const lessonModules = modules.filter(m => m.type !== 'exam');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <div className="gradient-primary text-primary-foreground py-12 px-4">
          <div className="container max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 mb-4"
            >
              <Link to="/courses">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Link>
            </Button>
            
            {course.category && (
              <Badge variant="secondary" className="mb-3">
                {course.category}
              </Badge>
            )}
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
            
            {course.description && (
              <p className="text-lg text-primary-foreground/80 mb-6 max-w-2xl">
                {course.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{totalDuration || course.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{lessonModules.length} modules</span>
              </div>
              {examModule && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>Final exam included</span>
                </div>
              )}
            </div>

            {isEnrolled && (
              <div className="mt-6 max-w-md">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-primary-foreground/80">Your Progress</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-white/20" />
                <p className="text-xs text-primary-foreground/60 mt-1">
                  {completedModulesCount} of {modules.length} modules completed
                </p>
              </div>
            )}

            <div className="mt-8">
              {!user ? (
                <Button asChild size="lg" variant="secondary">
                  <Link to="/auth">Sign in to Enroll</Link>
                </Button>
              ) : isEnrolled ? (
                <Button onClick={handleContinue} size="lg" variant="secondary">
                  {progressPercentage > 0 ? 'Continue Training' : 'Start Training'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleEnroll} 
                  size="lg" 
                  variant="secondary"
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enroll Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Module List */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-6">Course Content</h2>
              
              <div className="space-y-3">
                {modules.map((module, index) => {
                  const isCompleted = progress.some(p => p.module_id === module.id && p.completed);
                  const isExam = module.type === 'exam';
                  
                  return (
                    <Card key={module.id} className={cn(isCompleted && "border-success/50 bg-success/5")}>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isCompleted ? "bg-success text-success-foreground" : "bg-muted"
                          )}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : isExam ? (
                              <GraduationCap className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground">
                              {isExam ? 'Final Exam' : module.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {module.estimated_minutes} min
                              {isExam && ' • 80% to pass'}
                            </p>
                          </div>

                          {isCompleted && (
                            <Badge variant="outline" className="border-success text-success">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{totalDuration || course.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modules</span>
                    <span className="font-medium">{lessonModules.length}</span>
                  </div>
                  {examModule && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assessment</span>
                      <span className="font-medium">Final Exam</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificate</span>
                    <span className="font-medium">Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">{course.version}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What You'll Learn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lessonModules.map((module) => (
                      <li key={module.id} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{module.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
