import { useState } from 'react';
import { Menu, Check, Lock, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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

interface MobileModuleDrawerProps {
  modules: Module[];
  progress: ModuleProgress[];
  currentModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  isModuleUnlocked: (module: Module) => boolean;
  progressPercentage: number;
  courseDuration: number;
}

export function MobileModuleDrawer({
  modules,
  progress,
  currentModuleId,
  onSelectModule,
  isModuleUnlocked,
  progressPercentage,
  courseDuration,
}: MobileModuleDrawerProps) {
  const [open, setOpen] = useState(false);

  const currentModule = modules.find(m => m.id === currentModuleId);

  const getModuleStatus = (module: Module) => {
    const isCompleted = progress.some(p => p.module_id === module.id && p.completed);
    const isUnlocked = isModuleUnlocked(module);
    const isActive = module.id === currentModuleId;
    return { isCompleted, isUnlocked, isActive };
  };

  const handleSelectModule = (moduleId: string) => {
    onSelectModule(moduleId);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open module menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-sidebar p-0">
        <SheetHeader className="p-6 border-b border-sidebar-border">
          <SheetTitle className="text-sidebar-foreground text-left">
            CSIR Training
          </SheetTitle>
          <p className="text-sm text-sidebar-foreground/70 text-left">
            {courseDuration} minute micro-training
          </p>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-sidebar-foreground/70">Progress</span>
              <span className="font-medium text-sidebar-primary">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-sidebar-accent" />
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {modules.map((module) => {
              const { isCompleted, isUnlocked, isActive } = getModuleStatus(module);

              return (
                <li key={module.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-auto py-3 px-4 text-left",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      !isActive && isUnlocked && "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      !isUnlocked && "text-sidebar-foreground/40 cursor-not-allowed hover:bg-transparent"
                    )}
                    onClick={() => isUnlocked && handleSelectModule(module.id)}
                    disabled={!isUnlocked}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        isCompleted && "bg-module-completed text-white",
                        isActive && !isCompleted && "bg-sidebar-primary text-sidebar-primary-foreground",
                        !isActive && !isCompleted && isUnlocked && "bg-sidebar-accent text-sidebar-accent-foreground",
                        !isUnlocked && "bg-sidebar-accent/50 text-sidebar-foreground/40"
                      )}
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

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {module.type === 'exam' ? 'Final Exam' : `${module.sequence}. ${module.title}`}
                      </p>
                      <p className="text-xs mt-0.5 opacity-70">
                        {module.estimated_minutes} min
                      </p>
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
