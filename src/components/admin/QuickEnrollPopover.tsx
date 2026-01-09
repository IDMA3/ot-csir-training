import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
}

interface QuickEnrollPopoverProps {
  userId: string;
  userName: string;
  enrolledCourseIds: string[];
  availableCourses: Course[];
  onEnroll: (userId: string, courseIds: string[]) => Promise<void>;
  onUnenroll: (userId: string, courseIds: string[]) => Promise<void>;
}

export function QuickEnrollPopover({
  userId,
  userName,
  enrolledCourseIds,
  availableCourses,
  onEnroll,
  onUnenroll,
}: QuickEnrollPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggle = async (courseId: string, isCurrentlyEnrolled: boolean) => {
    setIsProcessing(true);
    try {
      if (isCurrentlyEnrolled) {
        await onUnenroll(userId, [courseId]);
      } else {
        await onEnroll(userId, [courseId]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <p className="font-medium text-sm">Manage Enrollments</p>
          <p className="text-xs text-muted-foreground mt-0.5">{userName}</p>
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {availableCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No courses available</p>
            ) : (
              availableCourses.map(course => {
                const isEnrolled = enrolledCourseIds.includes(course.id);
                return (
                  <label
                    key={course.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={isEnrolled}
                      disabled={isProcessing}
                      onCheckedChange={() => handleToggle(course.id, isEnrolled)}
                    />
                    <span className="text-sm flex-1 truncate">{course.title}</span>
                    {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
