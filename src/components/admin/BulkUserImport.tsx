import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedUser {
  email: string;
  first_name: string;
  last_name: string;
  organization?: string;
  job_role?: string;
  valid: boolean;
  error?: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
}

export function BulkUserImport() {
  const [importMethod, setImportMethod] = useState<'csv' | 'manual'>('csv');
  const [csvContent, setCsvContent] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<'input' | 'preview' | 'complete'>('input');
  
  const { isSuperAdmin } = useAdminPermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['admin-organizations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Organization[];
    },
  });

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('id, title')
        .eq('active', true)
        .order('title');
      if (error) throw error;
      return data as Course[];
    },
  });

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseCSV = useCallback((content: string): ParsedUser[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const firstNameIndex = headers.findIndex(h => h.includes('first'));
    const lastNameIndex = headers.findIndex(h => h.includes('last'));
    const orgIndex = headers.findIndex(h => h.includes('org'));
    const jobIndex = headers.findIndex(h => h.includes('job') || h.includes('role'));

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const email = emailIndex >= 0 ? values[emailIndex] : '';
      const first_name = firstNameIndex >= 0 ? values[firstNameIndex] : '';
      const last_name = lastNameIndex >= 0 ? values[lastNameIndex] : '';
      const organization = orgIndex >= 0 ? values[orgIndex] : undefined;
      const job_role = jobIndex >= 0 ? values[jobIndex] : undefined;

      const valid = validateEmail(email) && first_name.length > 0;
      const error = !validateEmail(email) 
        ? 'Invalid email' 
        : first_name.length === 0 
          ? 'First name required' 
          : undefined;

      return { email, first_name, last_name, organization, job_role, valid, error };
    }).filter(u => u.email.length > 0);
  }, []);

  const parseManualEmails = useCallback((content: string): ParsedUser[] => {
    const emails = content.split(/[\n,;]/).map(e => e.trim()).filter(e => e.length > 0);
    
    return emails.map(email => {
      const valid = validateEmail(email);
      return {
        email,
        first_name: '',
        last_name: '',
        valid,
        error: valid ? undefined : 'Invalid email format',
      };
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      const parsed = parseCSV(content);
      setParsedUsers(parsed);
      setImportStep('preview');
    };
    reader.readAsText(file);
  };

  const handleParseManual = () => {
    if (importMethod === 'csv') {
      const parsed = parseCSV(csvContent);
      setParsedUsers(parsed);
    } else {
      const parsed = parseManualEmails(manualEmails);
      setParsedUsers(parsed);
    }
    setImportStep('preview');
  };

  // Create invitations mutation
  const createInvitationsMutation = useMutation({
    mutationFn: async (users: ParsedUser[]) => {
      const org = organizations.find(o => o.id === selectedOrgId);
      
      const invitations = users.filter(u => u.valid).map(u => ({
        email: u.email,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        job_role: u.job_role || null,
        organization_id: selectedOrgId || null,
        course_ids: selectedCourseIds,
        invited_by: user?.id,
        status: 'pending',
      }));

      const { data, error } = await supabase
        .from('user_invitations')
        .insert(invitations)
        .select('id');

      if (error) throw error;
      
      // Send invitation emails
      if (data && data.length > 0) {
        const invitationIds = data.map(inv => inv.id);
        const appUrl = window.location.origin;
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-invitation', {
            body: { invitationIds, appUrl },
          });
          
          if (emailError) {
            console.error('Failed to send invitation emails:', emailError);
            toast.warning('Invitations created but some emails may not have been sent');
          }
        } catch (emailErr) {
          console.error('Error calling send-invitation function:', emailErr);
        }
      }
      
      return invitations.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success(`${count} invitation(s) created and emails sent`);
      setImportStep('complete');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invitations: ${error.message}`);
    },
  });

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const downloadTemplate = () => {
    const template = 'email,first_name,last_name,organization,job_role\njohn@example.com,John,Doe,Acme Corp,Developer';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setCsvContent('');
    setManualEmails('');
    setParsedUsers([]);
    setSelectedOrgId('');
    setSelectedCourseIds([]);
    setImportStep('input');
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only super admins can import users.
        </CardContent>
      </Card>
    );
  }

  const validUsers = parsedUsers.filter(u => u.valid);
  const invalidUsers = parsedUsers.filter(u => !u.valid);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bulk User Import
          </CardTitle>
          <CardDescription>
            Import multiple users at once using CSV or by pasting emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importStep === 'input' && (
            <Tabs value={importMethod} onValueChange={(v) => setImportMethod(v as 'csv' | 'manual')}>
              <TabsList className="mb-4">
                <TabsTrigger value="csv">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV Import
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Mail className="h-4 w-4 mr-2" />
                  Paste Emails
                </TabsTrigger>
              </TabsList>

              <TabsContent value="csv" className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
                
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Drop CSV file here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports: email, first_name, last_name, organization, job_role columns
                    </p>
                  </label>
                </div>

                <div className="space-y-2">
                  <Label>Or paste CSV content:</Label>
                  <Textarea
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="email,first_name,last_name,organization,job_role&#10;john@example.com,John,Doe,Acme Corp,Developer"
                    rows={6}
                  />
                </div>

                {csvContent && (
                  <Button onClick={handleParseManual}>
                    Parse & Preview
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter email addresses (one per line or comma-separated):</Label>
                  <Textarea
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    Users will receive an email invitation to set up their account
                  </p>
                </div>

                {manualEmails && (
                  <Button onClick={handleParseManual}>
                    Parse & Preview
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          )}

          {importStep === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex gap-4">
                <Badge variant="default" className="text-lg py-1 px-3">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {validUsers.length} Valid
                </Badge>
                {invalidUsers.length > 0 && (
                  <Badge variant="destructive" className="text-lg py-1 px-3">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {invalidUsers.length} Invalid
                  </Badge>
                )}
              </div>

              {/* Organization Selection */}
              <div className="space-y-2">
                <Label>Assign to Organization (optional)</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Selection */}
              <div className="space-y-2">
                <Label>Auto-enroll in Courses (optional)</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {courses.map(course => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedCourseIds.includes(course.id)}
                        onCheckedChange={() => toggleCourse(course.id)}
                      />
                      <span className="text-sm">{course.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      {importMethod === 'csv' && <TableHead>Organization</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.slice(0, 50).map((user, idx) => (
                      <TableRow key={idx} className={user.valid ? '' : 'bg-destructive/10'}>
                        <TableCell>
                          {user.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="flex items-center gap-1 text-destructive text-sm">
                              <AlertCircle className="h-4 w-4" />
                              {user.error}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.first_name || '-'}</TableCell>
                        <TableCell>{user.last_name || '-'}</TableCell>
                        {importMethod === 'csv' && <TableCell>{user.organization || '-'}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedUsers.length > 50 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    Showing 50 of {parsedUsers.length} users
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetImport}>
                  Back
                </Button>
                <Button
                  onClick={() => createInvitationsMutation.mutate(parsedUsers)}
                  disabled={validUsers.length === 0 || createInvitationsMutation.isPending}
                >
                  {createInvitationsMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create {validUsers.length} Invitation(s)
                </Button>
              </div>
            </div>
          )}

          {importStep === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
              <p className="text-muted-foreground mb-6">
                {validUsers.length} invitation(s) have been created. Users will receive an email to set up their account.
              </p>
              <Button onClick={resetImport}>Import More Users</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
