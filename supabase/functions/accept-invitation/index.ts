import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: 'Token and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch and validate the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('id, email, organization_id, course_ids, status, expires_at, invited_role, admin_permissions')
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      console.error('Failed to fetch invitation:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid invitation token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'This invitation has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if cancelled
    if (invitation.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'This invitation has been cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Accepting invitation ${invitation.id} for user ${userId}, role: ${invitation.invited_role}`);

    // 1. Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation status:', updateError);
      throw updateError;
    }

    // 2. Update user's organization_id in profile
    let organizationName: string | null = null;
    if (invitation.organization_id) {
      // Get the organization name for scoping
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();
      
      organizationName = orgData?.name || null;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: invitation.organization_id,
          organization: organizationName,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to update profile organization:', profileError);
        // Don't throw - continue with enrollment
      } else {
        console.log(`Updated user ${userId} organization to ${invitation.organization_id}`);
      }
    }

    // 3. Auto-enroll in specified courses
    if (invitation.course_ids && invitation.course_ids.length > 0) {
      const enrollments = invitation.course_ids.map((courseId: string) => ({
        user_id: userId,
        course_id: courseId,
      }));

      const { error: enrollError } = await supabase
        .from('enrollments')
        .upsert(enrollments, { 
          onConflict: 'user_id,course_id',
          ignoreDuplicates: true 
        });

      if (enrollError) {
        console.error('Failed to create enrollments:', enrollError);
        // Don't throw - the main acceptance succeeded
      } else {
        console.log(`Enrolled user ${userId} in ${invitation.course_ids.length} courses`);
      }
    }

    // 4. Grant admin permissions if invited as admin
    if (invitation.invited_role && invitation.invited_role !== 'learner') {
      const adminPerms = invitation.admin_permissions || {};
      
      const permissionData = {
        user_id: userId,
        is_super_admin: false, // Never grant super admin via invitation
        can_view_users: adminPerms.can_view_users || false,
        can_manage_users: adminPerms.can_manage_users || false,
        can_view_courses: adminPerms.can_view_courses || false,
        can_manage_courses: adminPerms.can_manage_courses || false,
        organization_scope: organizationName,
      };

      console.log('Creating admin permissions:', permissionData);

      const { error: permError } = await supabase
        .from('admin_permissions')
        .upsert(permissionData, { onConflict: 'user_id' });

      if (permError) {
        console.error('Failed to create admin permissions:', permError);
        // Don't throw - user still got the basics
      } else {
        console.log(`Granted admin permissions to user ${userId}`);
      }

      // Update user_roles to 'admin'
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (roleError) {
        console.error('Failed to update user role to admin:', roleError);
      } else {
        console.log(`Updated user ${userId} role to admin`);
      }
    }

    console.log(`Successfully accepted invitation ${invitation.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation accepted successfully',
        organization_id: invitation.organization_id,
        course_count: invitation.course_ids?.length || 0,
        invited_role: invitation.invited_role || 'learner',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to accept invitation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
