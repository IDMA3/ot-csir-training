import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface VerifyResult {
  valid: boolean;
  initials?: string;
  completionDate?: string;
  courseVersion?: string;
}

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [certId, setCertId] = useState(searchParams.get('certificate_id') || '');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!certId.trim()) return;
    setIsLoading(true);
    setResult(null);

    const { data } = await supabase
      .from('certificates')
      .select('issued_at, course_version, user_id')
      .eq('certificate_id', certId.trim().toUpperCase())
      .maybeSingle();

    if (data) {
      // Get user initials
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', data.user_id)
        .maybeSingle();

      setResult({
        valid: true,
        initials: profile ? `${profile.first_name.charAt(0)}.${profile.last_name.charAt(0)}.` : 'N/A',
        completionDate: format(new Date(data.issued_at), 'MMMM d, yyyy'),
        courseVersion: data.course_version,
      });
    } else {
      setResult({ valid: false });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded bg-primary mx-auto flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle>Verify Certificate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Enter Certificate ID (e.g., CSIR-XXXXXXXXXX)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            <Button onClick={handleVerify} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${result.valid ? 'bg-success/10 border border-success' : 'bg-destructive/10 border border-destructive'}`}>
              <div className="flex items-center gap-3 mb-2">
                {result.valid ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
                <span className="font-semibold">
                  {result.valid ? 'Valid Certificate' : 'Certificate Not Found'}
                </span>
              </div>
              {result.valid && (
                <div className="text-sm text-muted-foreground space-y-1 ml-9">
                  <p>Holder: {result.initials}</p>
                  <p>Completed: {result.completionDate}</p>
                  <p>Version: {result.courseVersion}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
