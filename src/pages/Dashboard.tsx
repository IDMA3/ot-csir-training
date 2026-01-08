import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { ModuleContent } from '@/components/ModuleContent';
import { MobileModuleDrawer } from '@/components/MobileModuleDrawer';
import { useCourse, useModules, useQuestions, useProgress, useUpdateProgress, useSubmitAttempt, isModuleUnlocked, calculateProgressPercentage } from '@/hooks/useCourse';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);
  const { data: progress = [] } = useProgress(courseId);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  
  const currentModule = modules.find(m => m.id === currentModuleId);
  const { data: questions = [] } = useQuestions(currentModuleId || undefined);
  const updateProgress = useUpdateProgress();
  const submitAttempt = useSubmitAttempt();

  // Set initial module
  useEffect(() => {
    if (modules.length > 0 && !currentModuleId) {
      // Find first incomplete module, or first module
      const firstIncomplete = modules.find(m => 
        !progress.some(p => p.module_id === m.id && p.completed) &&
        isModuleUnlocked(m, modules, progress)
      );
      setCurrentModuleId(firstIncomplete?.id || modules[0].id);
    }
  }, [modules, progress, currentModuleId]);

  const checkUnlocked = (module: typeof modules[0]) => isModuleUnlocked(module, modules, progress);
  const progressPercentage = calculateProgressPercentage(modules, progress);
  const isCompleted = progress.some(p => p.module_id === currentModuleId && p.completed);

  const handleComplete = async (answers: Record<string, string>, passed: boolean) => {
    if (!currentModule) return;
    
    await submitAttempt.mutateAsync({
      moduleId: currentModule.id,
      answers,
      questions,
      isExam: currentModule.type === 'exam',
    });

    if (passed) {
      await updateProgress.mutateAsync({ moduleId: currentModule.id, completed: true });
    }
  };

  const handleContinue = () => {
    if (!currentModule || !courseId) return;
    const nextModule = modules.find(m => m.sequence === currentModule.sequence + 1);
    if (nextModule) {
      setCurrentModuleId(nextModule.id);
    } else if (currentModule.type === 'exam') {
      navigate(`/courses/${courseId}/certificate`);
    }
  };

  if (courseLoading || modulesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const hasNextModule = currentModule ? modules.some(m => m.sequence === currentModule.sequence + 1) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <ModuleSidebar
            modules={modules}
            progress={progress}
            currentModuleId={currentModuleId}
            onSelectModule={setCurrentModuleId}
            isModuleUnlocked={checkUnlocked}
            progressPercentage={progressPercentage}
            courseDuration={course?.duration_minutes || 15}
            courseTitle={course?.title}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-2 p-4 border-b">
            <MobileModuleDrawer
              modules={modules}
              progress={progress}
              currentModuleId={currentModuleId}
              onSelectModule={setCurrentModuleId}
              isModuleUnlocked={checkUnlocked}
              progressPercentage={progressPercentage}
              courseDuration={course?.duration_minutes || 15}
            />
            <span className="font-medium">{currentModule?.title}</span>
          </div>

          {currentModule && (
            <ModuleContent
              title={currentModule.title}
              bodyHtml={currentModule.body_html}
              questions={questions}
              isExam={currentModule.type === 'exam'}
              isCompleted={isCompleted}
              onComplete={handleComplete}
              onContinue={handleContinue}
              hasNextModule={hasNextModule}
            />
          )}
        </main>
      </div>
    </div>
  );
}
