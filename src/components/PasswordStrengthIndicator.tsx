import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements: Requirement[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    return (metCount / requirements.length) * 100;
  }, [requirements]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return '';
    if (strength <= 25) return 'Weak';
    if (strength <= 50) return 'Fair';
    if (strength <= 75) return 'Good';
    return 'Strong';
  }, [strength]);

  const strengthColor = useMemo(() => {
    if (strength <= 25) return 'bg-destructive';
    if (strength <= 50) return 'bg-warning';
    if (strength <= 75) return 'bg-accent';
    return 'bg-success';
  }, [strength]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength <= 25 && "text-destructive",
            strength > 25 && strength <= 50 && "text-warning",
            strength > 50 && strength <= 75 && "text-accent",
            strength > 75 && "text-success"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strengthColor)}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>
      
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li 
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              req.met ? "text-success" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
