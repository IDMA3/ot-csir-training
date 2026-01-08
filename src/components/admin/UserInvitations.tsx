import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Mail, Clock, CheckCircle, XCircle, Loader2, RefreshCw, Trash2, MailOpen, Shield, BookOpen, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
  organization_name?: string;
  course_ids: string[];
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  invited_role: string;
}

export function UserInvitations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const { isSuperAdmin, canManageUsers } = useAdminPermissions();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Check if user can view invitations
  const canViewInvitations = isSuperAdmin || canManageUsers;
  const canDeleteInvitations = isSuperAdmin; // Only super admins can delete

  // Fetch invitations - scoped to org for org admins
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['admin-invitations', isSuperAdmin, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Scope to organization for org admins
      if (!isSuperAdmin && profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;

      // Get organization names
      const orgIds = [...new Set(data.map(i => i.organization_id).filter(Boolean))];
      let orgMap = new Map<string, string>();
      
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        
        orgs?.forEach(o => orgMap.set(o.id, o.name));
      }

      return data.map(inv => ({
        ...inv,
        organization_name: inv.organization_id ? orgMap.get(inv.organization_id) : undefined,
      })) as Invitation[];
    },
    enabled: canViewInvitations,
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success(`${selectedInvitations.length} invitation(s) cancelled`);
      setSelectedInvitations([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  // Delete invitation mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success(`${selectedInvitations.length} invitation(s) deleted`);
      setSelectedInvitations([]);
      setDeleteConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Resend invitation mutation (extends expiry and resets status, then sends email)
  const resendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'pending',
          expires_at: newExpiry.toISOString(),
        })
        .in('id', ids);
      
      if (error) throw error;

      // Send invitation emails
      const appUrl = window.location.origin;
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: { invitationIds: ids, appUrl },
        });
        
        if (emailError) {
          console.error('Failed to send invitation emails:', emailError);
          throw new Error('Failed to send invitation emails');
        }
      } catch (emailErr) {
        console.error('Error calling send-invitation function:', emailErr);
        throw emailErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success(`${selectedInvitations.length} invitation(s) renewed and emails sent`);
      setSelectedInvitations([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend: ${error.message}`);
    },
  });

  // Filter invitations
  const filteredInvitations = invitations.filter(inv => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = `${inv.first_name || ''} ${inv.last_name || ''}`.toLowerCase();
      if (!inv.email.toLowerCase().includes(query) && !name.includes(query)) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        return inv.status === 'pending' && isPast(new Date(inv.expires_at));
      }
      return inv.status === statusFilter;
    }
    
    return true;
  });

  const toggleSelection = (id: string) => {
    setSelectedInvitations(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedInvitations.length === filteredInvitations.length) {
      setSelectedInvitations([]);
    } else {
      setSelectedInvitations(filteredInvitations.map(i => i.id));
    }
  };

  const getStatusBadge = (inv: Invitation) => {
    if (inv.status === 'accepted') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (inv.status === 'cancelled') {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    if (inv.status === 'pending' && isPast(new Date(inv.expires_at))) {
      return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (!canViewInvitations) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          You don't have permission to view invitations.
        </CardContent>
      </Card>
    );
  }

  const pendingCount = invitations.filter(i => i.status === 'pending' && !isPast(new Date(i.expires_at))).length;
  const acceptedCount = invitations.filter(i => i.status === 'accepted').length;
  const expiredCount = invitations.filter(i => i.status === 'pending' && isPast(new Date(i.expires_at))).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailOpen className="h-5 w-5" />
            User Invitations
          </CardTitle>
          <CardDescription>
            Manage pending and past invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedInvitations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium self-center">
                {selectedInvitations.length} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => resendMutation.mutate(selectedInvitations)}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Resend/Renew
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => cancelMutation.mutate(selectedInvitations)}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              {canDeleteInvitations && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invitations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedInvitations.length === filteredInvitations.length && filteredInvitations.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvitations.includes(inv.id)}
                          onCheckedChange={() => toggleSelection(inv.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        {inv.first_name || inv.last_name 
                          ? `${inv.first_name || ''} ${inv.last_name || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {inv.invited_role === 'org_admin' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />Org Admin
                          </Badge>
                        ) : inv.invited_role === 'course_creator' ? (
                          <Badge variant="outline" className="gap-1">
                            <BookOpen className="h-3 w-3" />Course Creator
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />Learner
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {inv.organization_name ? (
                          <Badge variant="secondary">{inv.organization_name}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(inv)}</TableCell>
                      <TableCell>
                        {format(new Date(inv.expires_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inv.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedInvitations.length} invitation(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedInvitations)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
