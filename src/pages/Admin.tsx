import { useState } from 'react';
import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, BarChart3, Crown, Building2, UserPlus, LayoutDashboard } from 'lucide-react';
import { AdminPermissionManager } from '@/components/admin/AdminPermissionManager';
import { OrganizationManagement } from '@/components/admin/OrganizationManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { CourseAssignment } from '@/components/admin/CourseAssignment';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview';
import { PeopleManagement } from '@/components/admin/PeopleManagement';
import { OnboardingCenter } from '@/components/admin/OnboardingCenter';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  const { 
    isSuperAdmin, 
    organizationScope, 
    canAccessLearnerReports, 
    canAccessAnalytics, 
    canAccessCourses, 
    canAccessAdminManagement,
  } = useAdminPermissions();

  // Handle navigation from dashboard overview
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage people, courses, and organizations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            {canAccessLearnerReports && (
              <TabsTrigger value="people" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">People</span>
              </TabsTrigger>
            )}
            {canAccessAdminManagement && (
              <TabsTrigger value="onboard" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Onboard</span>
              </TabsTrigger>
            )}
            {canAccessCourses && (
              <TabsTrigger value="courses" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Courses</span>
              </TabsTrigger>
            )}
            {canAccessAdminManagement && (
              <TabsTrigger value="organizations" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Organizations</span>
              </TabsTrigger>
            )}
            {canAccessAnalytics && (
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            )}
            {canAccessAdminManagement && (
              <TabsTrigger value="settings" className="gap-2">
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <AdminDashboardOverview onNavigate={handleNavigate} />
          </TabsContent>

          {/* People */}
          <TabsContent value="people" className="space-y-6">
            <PeopleManagement />
          </TabsContent>

          {/* Onboard */}
          <TabsContent value="onboard" className="space-y-6">
            <OnboardingCenter />
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses" className="space-y-6">
            {isSuperAdmin && <CourseAssignment />}
            <CourseManagement organizationScope={isSuperAdmin ? null : organizationScope} />
          </TabsContent>

          {/* Organizations */}
          <TabsContent value="organizations" className="space-y-6">
            <OrganizationManagement />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Settings (Admin Permissions) */}
          <TabsContent value="settings" className="space-y-6">
            <AdminPermissionManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
