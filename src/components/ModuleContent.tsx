import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, X, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
  correct_choice: string;
  rationale: string | null;
}

interface ModuleContentProps {
  title: string;
  bodyHtml: string;
  questions: Question[];
  isExam: boolean;
  isCompleted: boolean;
  onComplete: (answers: Record<string, string>, passed: boolean) => void;
  onContinue: () => void;
  hasNextModule: boolean;
}

export function ModuleContent({
  title,
  bodyHtml,
  questions,
  isExam,
  isCompleted,
  onComplete,
  onContinue,
  hasNextModule,
}: ModuleContentProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    passed: boolean;
    correctCount: number;
  } | null>(null);

  // Reset state when module changes
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
  }, [title]);

  const handleSubmit = () => {
    // Calculate results
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_choice) {
        correctCount++;
      }
    });

    const score = questions.length > 0 ? correctCount / questions.length : 1;
    const passed = isExam ? score >= 0.8 : score === 1;

    setResults({ score, passed, correctCount });
    setSubmitted(true);
    onComplete(answers, passed);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  const allQuestionsAnswered = questions.every(q => answers[q.id]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 animate-fade-in">
      {/* Module title */}
      <h1 className="text-3xl font-bold text-foreground mb-8">{title}</h1>

      {/* Module content */}
      <div 
        className="module-content prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
      />

      {/* Questions section */}
      {questions.length > 0 && (
        <div className="mt-12 space-y-8">
          <div className="border-t border-border pt-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {isExam ? 'Final Assessment' : 'Knowledge Check'}
            </h2>
          </div>

          {questions.map((question, index) => {
            const isCorrect = submitted && answers[question.id] === question.correct_choice;
            const isWrong = submitted && answers[question.id] !== question.correct_choice;

            return (
              <Card 
                key={question.id}
                className={cn(
                  "transition-colors",
                  submitted && isCorrect && "border-success bg-success/5",
                  submitted && isWrong && "border-destructive bg-destructive/5"
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="text-foreground font-medium leading-relaxed">
                      {question.prompt}
                    </p>
                  </div>

                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => {
                      if (!submitted) {
                        setAnswers(prev => ({ ...prev, [question.id]: value }));
                      }
                    }}
                    disabled={submitted}
                    className="ml-10 space-y-3"
                  >
                    {question.choices.map((choice) => {
                      const isSelected = answers[question.id] === choice.id;
                      const isCorrectChoice = choice.id === question.correct_choice;
                      const showCorrect = submitted && isCorrectChoice;
                      const showWrong = submitted && isSelected && !isCorrectChoice;

                      return (
                        <div
                          key={choice.id}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                            !submitted && "hover:bg-muted cursor-pointer",
                            !submitted && isSelected && "bg-primary/10 border-primary",
                            showCorrect && "bg-success/10 border-success",
                            showWrong && "bg-destructive/10 border-destructive"
                          )}
                        >
                          <RadioGroupItem value={choice.id} id={`${question.id}-${choice.id}`} />
                          <Label 
                            htmlFor={`${question.id}-${choice.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {choice.text}
                          </Label>
                          {showCorrect && <Check className="w-5 h-5 text-success" />}
                          {showWrong && <X className="w-5 h-5 text-destructive" />}
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {/* Rationale */}
                  {submitted && question.rationale && (
                    <div className={cn(
                      "mt-4 ml-10 p-4 rounded-lg",
                      isCorrect ? "bg-success/10" : "bg-muted"
                    )}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{question.rationale}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Results summary for exam */}
          {submitted && results && isExam && (
            <Card className={cn(
              "border-2",
              results.passed ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
            )}>
              <CardContent className="py-6">
                <div className="text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
                    results.passed ? "bg-success text-white" : "bg-destructive text-white"
                  )}>
                    {results.passed ? (
                      <Check className="w-8 h-8" />
                    ) : (
                      <X className="w-8 h-8" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {results.passed ? 'Congratulations!' : 'Not Quite'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You scored {results.correctCount} out of {questions.length} ({Math.round(results.score * 100)}%)
                    {isExam && ` — ${results.passed ? 'Pass' : 'Fail'}`}
                  </p>
                  {!results.passed && (
                    <p className="text-sm text-muted-foreground">
                      You need 80% (4 out of 5) to pass. Review the content and try again.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-4 pt-4">
            {!submitted && (
              <Button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered}
                size="lg"
              >
                Submit {isExam ? 'Exam' : 'Answer'}
              </Button>
            )}

            {submitted && !results?.passed && (
              <Button onClick={handleRetry} variant="outline" size="lg">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}

            {submitted && results?.passed && hasNextModule && (
              <Button onClick={onContinue} size="lg">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {submitted && results?.passed && !hasNextModule && isExam && (
              <Button onClick={onContinue} size="lg" className="gradient-accent">
                View Certificate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Continue button for modules without questions */}
      {questions.length === 0 && (
        <div className="mt-12 flex justify-end">
          <Button onClick={onContinue} size="lg">
            {hasNextModule ? 'Continue' : 'Finish'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
