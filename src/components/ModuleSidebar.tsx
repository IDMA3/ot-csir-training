import { Check, Lock, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Module {
  id: string;
  sequence: number;
  title: string;
  type: 'lesson' | 'exam';
  estimated_minutes: number;
}

interface ModuleProgress {
  module_id: string;
  completed: boolean;
}

interface ModuleSidebarProps {
  modules: Module[];
  progress: ModuleProgress[];
  currentModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  isModuleUnlocked: (module: Module) => boolean;
  progressPercentage: number;
  courseDuration: number;
  courseTitle?: string;
}

export function ModuleSidebar({
  modules,
  progress,
  currentModuleId,
  onSelectModule,
  isModuleUnlocked,
  progressPercentage,
  courseDuration,
  courseTitle = 'Course Training',
}: ModuleSidebarProps) {
  const getModuleStatus = (module: Module) => {
    const isCompleted = progress.some(p => p.module_id === module.id && p.completed);
    const isUnlocked = isModuleUnlocked(module);
    const isActive = module.id === currentModuleId;

    return { isCompleted, isUnlocked, isActive };
  };

  const completedCount = progress.filter(p => p.completed).length;
  const remainingCount = modules.length - completedCount;

  return (
    <aside 
      className="w-80 bg-sidebar flex flex-col h-full border-r border-sidebar-border"
      aria-label="Course navigation"
    >
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-1">
          {courseTitle}
        </h2>
        <p className="text-sm text-sidebar-foreground/70">
          {courseDuration} minute micro-training
        </p>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-sidebar-foreground/70">Progress</span>
            <span className="font-medium text-sidebar-primary">{progressPercentage}%</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-sidebar-accent" 
            aria-label={`Course progress: ${progressPercentage}%`}
          />
          {progressPercentage > 0 && progressPercentage < 100 && (
            <p className="text-xs text-sidebar-foreground/50 mt-1">
              {remainingCount} module{remainingCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto p-4" aria-label="Module list">
        <ul className="space-y-2" role="list">
          {modules.map((module) => {
            const { isCompleted, isUnlocked, isActive } = getModuleStatus(module);

            return (
              <li key={module.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3 px-4 text-left transition-all focus-ring",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    !isActive && isUnlocked && "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    !isUnlocked && "text-sidebar-foreground/40 cursor-not-allowed hover:bg-transparent"
                  )}
                  onClick={() => isUnlocked && onSelectModule(module.id)}
                  disabled={!isUnlocked}
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={!isUnlocked}
                >
                  {/* Status icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      isCompleted && "bg-module-completed text-white",
                      isActive && !isCompleted && "bg-sidebar-primary text-sidebar-primary-foreground",
                      !isActive && !isCompleted && isUnlocked && "bg-sidebar-accent text-sidebar-accent-foreground",
                      !isUnlocked && "bg-sidebar-accent/50 text-sidebar-foreground/40"
                    )}
                    aria-hidden="true"
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4" />
                    ) : module.type === 'exam' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>

                  {/* Module info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive && "text-sidebar-accent-foreground",
                      !isUnlocked && "text-sidebar-foreground/40"
                    )}>
                      {module.type === 'exam' ? 'Final Exam' : `${module.sequence}. ${module.title}`}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      isActive ? "text-sidebar-accent-foreground/70" : "text-sidebar-foreground/50"
                    )}>
                      {module.estimated_minutes} min
                      {module.type === 'exam' && ' • 80% to pass'}
                      {isCompleted && ' • Completed'}
                    </p>
                  </div>

                  {/* Arrow for active */}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-sidebar-primary" aria-hidden="true" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          {progressPercentage === 100 
            ? '🎉 Congratulations! View your certificate.'
            : 'Complete all modules to earn your certificate'}
        </p>
      </div>
    </aside>
  );
}
