import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitationIds: string[];
  appUrl: string;
}

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  token: string;
  organization_id: string | null;
  expires_at: string;
}

interface Organization {
  id: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invitationIds, appUrl }: InvitationRequest = await req.json();
    
    console.log(`Processing ${invitationIds.length} invitation(s)`);

    if (!invitationIds || invitationIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No invitation IDs provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch invitations
    const { data: invitations, error: invError } = await supabase
      .from("user_invitations")
      .select("id, email, first_name, last_name, token, organization_id, expires_at")
      .in("id", invitationIds);

    if (invError) {
      console.error("Error fetching invitations:", invError);
      throw invError;
    }

    if (!invitations || invitations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No invitations found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch organization names
    const orgIds = [...new Set(invitations.map(i => i.organization_id).filter(Boolean))];
    let orgMap = new Map<string, string>();
    
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      
      orgs?.forEach((o: Organization) => orgMap.set(o.id, o.name));
    }

    // Send emails
    const results = [];
    const errors = [];

    for (const invitation of invitations as Invitation[]) {
      const signupUrl = `${appUrl}/auth?invite=${invitation.token}`;
      const orgName = invitation.organization_id ? orgMap.get(invitation.organization_id) : null;
      const userName = invitation.first_name || "there";
      const expiresDate = new Date(invitation.expires_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        console.log(`Sending invitation email to ${invitation.email}`);
        
        const emailResponse = await resend.emails.send({
          from: "Training Platform <onboarding@resend.dev>",
          to: [invitation.email],
          subject: orgName 
            ? `You've been invited to join ${orgName}'s training platform` 
            : "You've been invited to join our training platform",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Training Platform Invitation</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                              ${orgName ? `Welcome to ${orgName}` : "You're Invited!"}
                            </h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                              Hi ${userName},
                            </p>
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                              You've been invited to join ${orgName ? `<strong>${orgName}'s</strong>` : "our"} training platform. Click the button below to create your account and get started with your courses.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                              <tr>
                                <td align="center">
                                  <a href="${signupUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                    Accept Invitation & Sign Up
                                  </a>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                              Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0 0 20px; color: #3b82f6; font-size: 14px; word-break: break-all;">
                              ${signupUrl}
                            </p>
                            
                            <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px;">
                              This invitation expires on <strong>${expiresDate}</strong>. If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                              © ${new Date().getFullYear()} Training Platform. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
        });

        console.log(`Email sent successfully to ${invitation.email}:`, emailResponse);
        results.push({ id: invitation.id, email: invitation.email, success: true });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${invitation.email}:`, emailError);
        errors.push({ id: invitation.id, email: invitation.email, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.length, 
        failed: errors.length,
        results,
        errors 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
