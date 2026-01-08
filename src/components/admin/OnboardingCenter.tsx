import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mail, Clock } from 'lucide-react';
import { BulkUserImport } from './BulkUserImport';
import { UserInvitations } from './UserInvitations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function OnboardingCenter() {
  const [activeTab, setActiveTab] = useState('import');

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
  });

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

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Users</CardTitle>
          <CardDescription>Import users via CSV, send email invitations, or manage pending invites</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="import" className="gap-2">
                <Upload className="h-4 w-4" />
                Import Users
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Mail className="h-4 w-4" />
                Invitations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="import" className="mt-0">
              <BulkUserImport />
            </TabsContent>
            
            <TabsContent value="invitations" className="mt-0">
              <UserInvitations />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
