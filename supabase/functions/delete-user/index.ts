import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

interface DeletedCounts {
  certificates: number;
  attempts: number;
  progress: number;
  enrollments: number;
  adminPermissions: number;
  userRoles: number;
  profiles: number;
  authUsers: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user's auth - for permission checking
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client - for deletions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requesting user's permissions
    const { data: requesterPermissions } = await supabaseAdmin
      .from('admin_permissions')
      .select('*')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    const isRequesterSuperAdmin = requesterPermissions?.is_super_admin ?? false;
    const canRequesterManageUsers = requesterPermissions?.can_manage_users ?? false;
    const requesterOrgScope = requesterPermissions?.organization_scope;

    // Check if requester has permission to delete users
    if (!isRequesterSuperAdmin && !canRequesterManageUsers) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's info
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's permissions
    const { data: targetPermissions } = await supabaseAdmin
      .from('admin_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const isTargetSuperAdmin = targetPermissions?.is_super_admin ?? false;

    // Super admins cannot delete other super admins
    if (isTargetSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete a super admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Non-super admins can only delete users in their organization scope
    if (!isRequesterSuperAdmin) {
      if (requesterOrgScope && targetProfile.organization !== requesterOrgScope) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete users outside your organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Non-super admins cannot delete other admins
      if (targetPermissions) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete admin users. Contact a super admin.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Track deletion counts
    const deletedCounts: DeletedCounts = {
      certificates: 0,
      attempts: 0,
      progress: 0,
      enrollments: 0,
      adminPermissions: 0,
      userRoles: 0,
      profiles: 0,
      authUsers: 0,
    };

    console.log(`Starting deletion of user ${userId} by ${requestingUser.id}`);

    // Delete certificates
    const { data: deletedCerts } = await supabaseAdmin
      .from('certificates')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.certificates = deletedCerts?.length ?? 0;

    // Delete attempts
    const { data: deletedAttempts } = await supabaseAdmin
      .from('attempts')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.attempts = deletedAttempts?.length ?? 0;

    // Delete progress
    const { data: deletedProgress } = await supabaseAdmin
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.progress = deletedProgress?.length ?? 0;

    // Delete enrollments
    const { data: deletedEnrollments } = await supabaseAdmin
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.enrollments = deletedEnrollments?.length ?? 0;

    // Update user_invitations to clear invited_by reference
    await supabaseAdmin
      .from('user_invitations')
      .update({ invited_by: null })
      .eq('invited_by', userId);

    // Delete admin permissions (if exists)
    const { data: deletedPermissions } = await supabaseAdmin
      .from('admin_permissions')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.adminPermissions = deletedPermissions?.length ?? 0;

    // Delete user roles
    const { data: deletedRoles } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .select();
    deletedCounts.userRoles = deletedRoles?.length ?? 0;

    // Delete profile
    const { data: deletedProfiles } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
      .select();
    deletedCounts.profiles = deletedProfiles?.length ?? 0;

    // Delete from auth.users using admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user from auth system', 
          details: authDeleteError.message,
          partialDeletion: deletedCounts 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    deletedCounts.authUsers = 1;

    console.log(`Successfully deleted user ${userId}. Counts:`, deletedCounts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deleted: deletedCounts,
        deletedUser: {
          id: userId,
          email: targetProfile.first_name && targetProfile.last_name 
            ? `${targetProfile.first_name} ${targetProfile.last_name}`
            : userId,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in delete-user function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
