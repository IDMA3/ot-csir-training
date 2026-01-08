import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Course {
  id: string;
  title: string;
  duration_minutes: number;
  version: string;
  active: boolean;
}

interface Module {
  id: string;
  course_id: string;
  sequence: number;
  title: string;
  type: 'module' | 'exam';
  estimated_minutes: number;
  body_html: string;
}

interface Question {
  id: string;
  module_id: string;
  prompt: string;
  choices: { id: string; text: string }[];
  correct_choice: string;
  rationale: string | null;
}

interface Progress {
  id: string;
  user_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  last_viewed_at: string | null;
}

interface Attempt {
  id: string;
  user_id: string;
  module_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  submitted_at: string;
}

interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_id: string;
  course_version: string;
  issued_at: string;
  pdf_url: string | null;
}

export function useCourse() {
  return useQuery({
    queryKey: ['course'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('*')
        .eq('active', true)
        .single();

      if (error) throw error;
      return data as Course;
    },
  });
}

export function useModules(courseId: string | undefined) {
  return useQuery({
    queryKey: ['modules', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence', { ascending: true });

      if (error) throw error;
      return data as Module[];
    },
    enabled: !!courseId,
  });
}

export function useQuestions(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['questions', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', moduleId);

      if (error) throw error;
      return data.map(q => ({
        ...q,
        choices: q.choices as { id: string; text: string }[],
      })) as Question[];
    },
    enabled: !!moduleId,
  });
}

export function useProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as Progress[];
    },
    enabled: !!user,
  });
}

export function useAttempts(moduleId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['attempts', user?.id, moduleId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(a => ({
        ...a,
        answers: a.answers as Record<string, string>,
      })) as Attempt[];
    },
    enabled: !!user,
  });
}

export function useCertificate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['certificate', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Certificate | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ moduleId, completed }: { moduleId: string; completed: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      
      const { data: existing } = await supabase
        .from('progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('progress')
          .update({
            completed,
            completed_at: completed ? now : null,
            last_viewed_at: now,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('progress')
          .insert({
            user_id: user.id,
            module_id: moduleId,
            completed,
            completed_at: completed ? now : null,
            last_viewed_at: now,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      moduleId,
      answers,
      questions,
      isExam,
    }: {
      moduleId: string;
      answers: Record<string, string>;
      questions: Question[];
      isExam: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_choice) {
          correctCount++;
        }
      });

      const score = questions.length > 0 ? correctCount / questions.length : 0;
      const passed = isExam ? score >= 0.8 : score === 1;

      // Insert attempt
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert({
          user_id: user.id,
          module_id: moduleId,
          score,
          passed,
          answers,
        });

      if (attemptError) throw attemptError;

      return { score, passed, correctCount, totalQuestions: questions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempts'] });
    },
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ courseId, courseVersion }: { courseId: string; courseVersion: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Generate certificate ID
      const randomBytes = crypto.getRandomValues(new Uint8Array(8));
      const certId = 'CSIR-' + Array.from(randomBytes)
        .map(b => b.toString(36).toUpperCase())
        .join('')
        .slice(0, 10);

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          course_id: courseId,
          certificate_id: certId,
          course_version: courseVersion,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate'] });
    },
  });
}

// Helper to check if a module is unlocked
export function isModuleUnlocked(
  module: Module,
  modules: Module[],
  progress: Progress[]
): boolean {
  if (module.sequence === 1) return true;

  const prevModule = modules.find(m => m.sequence === module.sequence - 1);
  if (!prevModule) return true;

  const prevProgress = progress.find(p => p.module_id === prevModule.id);
  return prevProgress?.completed === true;
}

// Calculate overall progress percentage
export function calculateProgressPercentage(
  modules: Module[],
  progress: Progress[]
): number {
  if (modules.length === 0) return 0;
  
  const completedCount = modules.filter(m => 
    progress.some(p => p.module_id === m.id && p.completed)
  ).length;

  return Math.round((completedCount / modules.length) * 100);
}
