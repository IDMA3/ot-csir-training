import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mail, Clock, UserPlus, MailOpen } from 'lucide-react';
import { BulkUserImport } from './BulkUserImport';
import { UserInvitations } from './UserInvitations';
import { SingleUserInvite } from './SingleUserInvite';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

export function OnboardingCenter() {
  const [activeTab, setActiveTab] = useState('invite');
  const { isSuperAdmin, canManageUsers } = useAdminPermissions();

  // Check if user has access
  const canAccess = isSuperAdmin || canManageUsers;

  // Fetch invitation stats
  const { data: invitationStats } = useQuery({
    queryKey: ['invitation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('status');
      
      if (error) throw error;
      
      const pending = data?.filter(i => i.status === 'pending').length || 0;
      const accepted = data?.filter(i => i.status === 'accepted').length || 0;
      const expired = data?.filter(i => i.status === 'expired').length || 0;
      
      return { pending, accepted, expired, total: data?.length || 0 };
    },
    enabled: canAccess,
  });

  if (!canAccess) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          You don't have permission to manage user onboarding.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitationStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitationStats?.accepted || 0}</div>
            <p className="text-xs text-muted-foreground">Users onboarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitationStats?.expired || 0}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Users</CardTitle>
          <CardDescription>Invite users individually, import in bulk, or manage pending invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full mb-6 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="invite" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite User</span>
                <span className="sm:hidden">Invite</span>
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="bulk" className="gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Bulk</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="invitations" className="gap-2">
                <MailOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Invitations</span>
                <span className="sm:hidden">Manage</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="invite" className="mt-0">
              <SingleUserInvite />
            </TabsContent>
            
            {isSuperAdmin && (
              <TabsContent value="bulk" className="mt-0">
                <BulkUserImport />
              </TabsContent>
            )}
            
            <TabsContent value="invitations" className="mt-0">
              <UserInvitations />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
