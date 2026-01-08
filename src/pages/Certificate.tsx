import { Header } from '@/components/Header';
import { useCourse, useCertificate, useIssueCertificate, useProgress, useModules } from '@/hooks/useCourse';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Download, Loader2, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { Link, useParams } from 'react-router-dom';

export default function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const { data: course } = useCourse(courseId);
  const { data: modules = [] } = useModules(courseId);
  const { data: progress = [] } = useProgress(courseId);
  const { data: certificate, isLoading } = useCertificate(courseId);
  const issueCertificate = useIssueCertificate();

  const allCompleted = modules.length > 0 && modules.every(m => 
    progress.some(p => p.module_id === m.id && p.completed)
  );

  // Auto-issue certificate when all modules completed
  useEffect(() => {
    if (allCompleted && !certificate && course && !issueCertificate.isPending) {
      issueCertificate.mutate({ courseId: course.id, courseVersion: course.version });
    }
  }, [allCompleted, certificate, course]);

  const handleDownloadPDF = () => {
    if (!certificate || !profile || !course) return;
    
    // Create a simple PDF-like HTML for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${profile.first_name} ${profile.last_name}</title>
        <style>
          body { font-family: Georgia, serif; text-align: center; padding: 60px; background: #fff; }
          .border { border: 8px double #1e3a5f; padding: 60px; margin: 20px; }
          h1 { color: #1e3a5f; font-size: 36px; margin-bottom: 10px; }
          h2 { color: #0d9488; font-size: 28px; margin: 30px 0; }
          p { font-size: 18px; color: #333; margin: 15px 0; }
          .name { font-size: 32px; font-weight: bold; color: #1e3a5f; margin: 30px 0; }
          .cert-id { font-size: 14px; color: #666; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="border">
          <h1>Certificate of Completion</h1>
          <p>This certifies that</p>
          <p class="name">${profile.first_name} ${profile.last_name}</p>
          <p>has successfully completed</p>
          <h2>${course.title}</h2>
          <p>Version: ${certificate.course_version}</p>
          <p>Completed on: ${format(new Date(certificate.issued_at), 'MMMM d, yyyy')}</p>
          <p class="cert-id">Certificate ID: ${certificate.certificate_id}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-12 px-4">
        {!allCompleted && !certificate ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Certificate Locked</h2>
              <p className="text-muted-foreground mb-6">Complete all training modules to earn your certificate.</p>
              <Button asChild>
                <Link to={courseId ? `/courses/${courseId}` : '/courses'}>
                  Continue Training
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : certificate ? (
          <Card className="border-2 border-primary">
            <CardContent className="py-12 text-center">
              <Award className="w-20 h-20 text-accent mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-2">Certificate of Completion</h1>
              <p className="text-muted-foreground mb-8">This certifies that</p>
              <p className="text-2xl font-bold text-primary mb-8">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-muted-foreground mb-2">has successfully completed</p>
              <h2 className="text-xl font-semibold text-foreground mb-6">{course?.title}</h2>
              <div className="space-y-1 text-sm text-muted-foreground mb-8">
                <p>Version: {certificate.course_version}</p>
                <p>Completed: {format(new Date(certificate.issued_at), 'MMMM d, yyyy \'at\' h:mm a')} UTC</p>
                <p className="font-mono">Certificate ID: {certificate.certificate_id}</p>
              </div>
              <Button onClick={handleDownloadPDF} size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-4">Issuing your certificate...</p>
          </div>
        )}
      </main>
    </div>
  );
}
