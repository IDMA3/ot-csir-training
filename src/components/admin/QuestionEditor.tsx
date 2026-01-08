import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, HelpCircle, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  module_id: string;
  prompt: string;
  choices: Record<string, string>;
  correct_choice: string;
  rationale: string | null;
  created_at: string;
}

interface QuestionEditorProps {
  moduleId: string;
  moduleTitle: string;
  onBack: () => void;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionEditor({ moduleId, moduleTitle, onBack }: QuestionEditorProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    prompt: '',
    choices: { A: '', B: '', C: '', D: '' } as Record<string, string>,
    correct_choice: 'A',
    rationale: '',
  });
  const [choiceCount, setChoiceCount] = useState(4);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['admin-questions', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Question[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Filter out empty choices
      const filteredChoices: Record<string, string> = {};
      Object.entries(data.choices).forEach(([key, value]) => {
        if (value.trim()) {
          filteredChoices[key] = value.trim();
        }
      });

      const { error } = await supabase.from('questions').insert({
        module_id: moduleId,
        prompt: data.prompt,
        choices: filteredChoices,
        correct_choice: data.correct_choice,
        rationale: data.rationale || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', moduleId] });
      toast.success('Question created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create question: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      // Filter out empty choices
      const filteredChoices: Record<string, string> = {};
      Object.entries(data.choices).forEach(([key, value]) => {
        if (value.trim()) {
          filteredChoices[key] = value.trim();
        }
      });

      const { error } = await supabase
        .from('questions')
        .update({
          prompt: data.prompt,
          choices: filteredChoices,
          correct_choice: data.correct_choice,
          rationale: data.rationale || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', moduleId] });
      toast.success('Question updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update question: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', moduleId] });
      toast.success('Question deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (question: Question) => {
      const { error } = await supabase.from('questions').insert({
        module_id: moduleId,
        prompt: `${question.prompt} (Copy)`,
        choices: question.choices,
        correct_choice: question.correct_choice,
        rationale: question.rationale,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', moduleId] });
      toast.success('Question duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate question: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      prompt: '',
      choices: { A: '', B: '', C: '', D: '' },
      correct_choice: 'A',
      rationale: '',
    });
    setChoiceCount(4);
    setEditingQuestion(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    const choices = question.choices as Record<string, string>;
    const choiceKeys = Object.keys(choices);
    setChoiceCount(Math.max(choiceKeys.length, 2));
    
    // Ensure all choice slots up to choiceCount are filled
    const normalizedChoices: Record<string, string> = {};
    CHOICE_LETTERS.slice(0, Math.max(choiceKeys.length, 4)).forEach(letter => {
      normalizedChoices[letter] = choices[letter] || '';
    });
    
    setFormData({
      prompt: question.prompt,
      choices: normalizedChoices,
      correct_choice: question.correct_choice,
      rationale: question.rationale || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least 2 choices
    const filledChoices = Object.values(formData.choices).filter(v => v.trim());
    if (filledChoices.length < 2) {
      toast.error('Please provide at least 2 answer choices');
      return;
    }

    // Validate correct choice has content
    if (!formData.choices[formData.correct_choice]?.trim()) {
      toast.error('The correct answer choice cannot be empty');
      return;
    }

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (question: Question) => {
    if (confirm(`Are you sure you want to delete this question? This action cannot be undone.`)) {
      deleteMutation.mutate(question.id);
    }
  };

  const updateChoice = (letter: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      choices: { ...prev.choices, [letter]: value }
    }));
  };

  const addChoice = () => {
    if (choiceCount < 6) {
      const newLetter = CHOICE_LETTERS[choiceCount];
      setChoiceCount(prev => prev + 1);
      setFormData(prev => ({
        ...prev,
        choices: { ...prev.choices, [newLetter]: '' }
      }));
    }
  };

  const removeChoice = (letter: string) => {
    if (choiceCount > 2) {
      // If removing the correct choice, reset to A
      const newCorrect = formData.correct_choice === letter ? 'A' : formData.correct_choice;
      
      // Rebuild choices without the removed one
      const newChoices: Record<string, string> = {};
      let newIndex = 0;
      CHOICE_LETTERS.slice(0, choiceCount).forEach(l => {
        if (l !== letter) {
          newChoices[CHOICE_LETTERS[newIndex]] = formData.choices[l] || '';
          newIndex++;
        }
      });
      
      setChoiceCount(prev => prev - 1);
      setFormData(prev => ({
        ...prev,
        choices: newChoices,
        correct_choice: newCorrect
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Modules
          </Button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <CardTitle>Questions for: {moduleTitle}</CardTitle>
            <CardDescription>Create and manage quiz questions with multiple choice answers</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Question
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
                  <DialogDescription>
                    {editingQuestion ? 'Update question details' : 'Add a new quiz question'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Question Prompt</Label>
                    <Textarea
                      id="prompt"
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      placeholder="Enter the question..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer Choices</Label>
                      {choiceCount < 6 && (
                        <Button type="button" variant="outline" size="sm" onClick={addChoice}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Choice
                        </Button>
                      )}
                    </div>
                    
                    <RadioGroup
                      value={formData.correct_choice}
                      onValueChange={(value) => setFormData({ ...formData, correct_choice: value })}
                    >
                      {CHOICE_LETTERS.slice(0, choiceCount).map((letter) => (
                        <div key={letter} className="flex items-center gap-2">
                          <RadioGroupItem value={letter} id={`choice-${letter}`} />
                          <Label 
                            htmlFor={`choice-${letter}`} 
                            className="w-6 font-medium text-center"
                          >
                            {letter}
                          </Label>
                          <Input
                            value={formData.choices[letter] || ''}
                            onChange={(e) => updateChoice(letter, e.target.value)}
                            placeholder={`Answer choice ${letter}`}
                            className="flex-1"
                          />
                          {choiceCount > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChoice(letter)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Select the radio button next to the correct answer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rationale">
                      Rationale (Optional)
                      <span className="text-xs text-muted-foreground ml-2">
                        Explanation shown after the learner answers
                      </span>
                    </Label>
                    <Textarea
                      id="rationale"
                      value={formData.rationale}
                      onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                      placeholder="Explain why the correct answer is correct..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingQuestion ? 'Save Changes' : 'Create Question'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No questions yet. Create your first question to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => {
              const choices = question.choices as Record<string, string>;
              return (
                <Card key={question.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0">
                            Q{index + 1}
                          </Badge>
                          <p className="font-medium">{question.prompt}</p>
                        </div>
                        <div className="grid gap-1 ml-8">
                          {Object.entries(choices).map(([letter, text]) => (
                            <div
                              key={letter}
                              className={`flex items-center gap-2 text-sm ${
                                letter === question.correct_choice
                                  ? 'text-green-600 dark:text-green-400 font-medium'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {letter === question.correct_choice && (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              )}
                              <span className={letter !== question.correct_choice ? 'ml-6' : ''}>
                                {letter}. {text}
                              </span>
                            </div>
                          ))}
                        </div>
                        {question.rationale && (
                          <div className="ml-8 mt-2 p-2 bg-muted/50 rounded text-sm">
                            <span className="font-medium">Rationale:</span> {question.rationale}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(question)}
                          disabled={duplicateMutation.isPending}
                          title="Duplicate question"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(question)}
                          title="Edit question"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(question)}
                          disabled={deleteMutation.isPending}
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
